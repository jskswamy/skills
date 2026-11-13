import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ensureDir, pathExists, readJson, removeDir, writeJson } from "../../scripts/lib/fs-utils.mjs";
import { writeDocument } from "../../scripts/lib/transforms/frontmatter.mjs";
import { mapAgent } from "../../scripts/lib/transforms/agents.mjs";
import { derivedId, referencePairs, rewriteReferences, wrapperText } from "../../scripts/lib/transforms/names.mjs";
import { canonicalPluginPaths, rewritePluginRoot } from "../../scripts/lib/transforms/paths.mjs";
import { carryHooks } from "../../scripts/lib/transforms/policy.mjs";
import { rewriteMatcher } from "../../scripts/lib/transforms/tools.mjs";
import { copyLayout, copyRewrittenSkills, copyRuntime, wrapperLayout } from "../../scripts/lib/layout.mjs";
import { OMP_TOOLS } from "./tools.mjs";

// One plugin per folder under dist/omp/plugins/<name>/, installed from the
// root .omp-plugin/marketplace.json. omp reads Claude-shaped trees, so the
// layout is Claude's minus .claude-plugin/ and hooks.json (omp never reads
// it): skills and agents named <plugin>-<name>, a commands/<skill>.md
// wrapper per runnable skill (omp registers it as /<plugin>:<skill>), and
// .mcp.json as is (omp substitutes ${CLAUDE_PLUGIN_ROOT}).
export const id = "omp";

export const capabilities = {
  skills: { mode: "native" },
  agents: { mode: "native" },
  hooks: { mode: "shim", events: ["session-start", "subagent-start", "pre-tool", "post-tool", "stop"] },
};

// One folder per plugin under this; changed-plugins and eval read it.
export const pluginsDir = "dist/omp/plugins";
const CATALOG = ".omp-plugin/marketplace.json";
const MANIFEST = "runtime/omp/hooks.manifest.json";
const EXTENSION = "./runtime/omp/runtime.mjs";
// The runtime sets this to the package root, dist/omp/plugins/<plugin>.
const ROOT_TOKEN = '"${OMP_PLUGIN_ROOT}"';
// Package paths keep the runtime's relative imports intact.
const RUNTIME = {
  "harnesses/omp/runtime.mjs": "runtime/omp/runtime.mjs",
  "harnesses/omp/tools.mjs": "runtime/omp/tools.mjs",
  "harnesses/lib/hook-runner.mjs": "runtime/lib/hook-runner.mjs",
  "harnesses/lib/hook-input.mjs": "runtime/lib/hook-input.mjs",
};

// omp prefers this catalog over .claude-plugin/marketplace.json, so a stale
// or partial copy would hide plugins: delete it first and write it only when
// some plugin enables omp (the registry allows all or none).
export async function generateRoot({ outRoot, registry, plugins }) {
  await removeDir(join(outRoot, ".omp-plugin"));
  if (plugins.length > 0) {
    await writeJson(join(outRoot, CATALOG), {
      name: registry.marketplace.name,
      owner: registry.marketplace.owner,
      metadata: { description: registry.marketplace.description },
      plugins: plugins.map((plugin) => ({
        name: plugin.name,
        description: plugin.description,
        version: plugin.version,
        author: plugin.author,
        source: `./${pluginsDir}/${plugin.name}`,
        category: plugin.category,
        tags: plugin.tags ?? [],
      })),
    });
  }
  return { pairs: referencePairs(registry) };
}

export async function generate({ repoRoot, outRoot, model, state, report }) {
  const out = join(outRoot, pluginsDir, model.name);
  const fullLayout = wrapperLayout(model);
  const layout = fullLayout.filter(
    ({ kind, from }) => !["skills", "agents"].includes(kind) && !(kind === "hooks" && from.endsWith("hooks.json")),
  );
  await copyLayout({ repoRoot, layout, to: out });
  // /plugin:skill stays: the command wrappers below provide that slash name. A hidden skill
  // (disable-model-invocation) gets no wrapper, so references to it become /skill:<plugin>-<skill>.
  // shortcut: hidden set is this plugin's only; a cross-plugin reference would need the registry-wide set.
  const hidden = new Set(model.skills.filter((s) => s.hidden).map((s) => `${model.name}:${s.name}`));
  await copyRewrittenSkills({ repoRoot, model, to: out, pairs: state.pairs, keepSlash: true, hidden });

  for (const skill of model.skills.filter(({ userInvocable, hidden }) => userInvocable && !hidden)) {
    const frontmatter = { description: skill.pickerLine ?? skill.frontmatter.description };
    if (skill.frontmatter["argument-hint"] !== undefined) frontmatter["argument-hint"] = skill.frontmatter["argument-hint"];
    await ensureDir(join(out, "commands"));
    await writeFile(
      join(out, "commands", `${skill.name}.md`),
      writeDocument({ frontmatter, body: wrapperText(derivedId(model.name, skill.name)) }),
    );
  }

  // omp dispatches agents by frontmatter name, so ids get the plugin prefix;
  // model and tools are Claude's, so only the description is kept.
  for (const agent of model.agents) {
    const text = mapAgent(await readFile(join(repoRoot, agent.path), "utf8"), {
      keep: ["description"],
      set: { name: derivedId(model.name, agent.name) },
    });
    await ensureDir(join(out, "agents"));
    await writeFile(
      join(out, "agents", agent.path.split("/").at(-1)),
      rewriteReferences(text, state.pairs, { join: "-", keepSlash: true, hidden }),
    );
  }

  const carried = await carryHooks({ repoRoot, model, harness: id, canCarry, report });
  const hooks = [];
  for (const entry of carried) {
    try {
      canonicalPluginPaths(entry.command, fullLayout, "");
      const { statusMessage: _, ...rest } = entry;
      hooks.push({ plugin: model.name, ...rest, command: rewritePluginRoot(entry.command, ROOT_TOKEN) });
    } catch (error) {
      report.add({ kind: "hooks", resource: entry.id, status: "error", reason: error.message });
    }
  }
  if (hooks.length > 0) {
    await copyRuntime({ files: RUNTIME, to: out });
    await writeJson(join(out, MANIFEST), { entries: hooks });
  }

  await writeJson(join(out, ".omp-plugin", "plugin.json"), {
    name: model.name,
    version: model.version,
    description: model.description,
    author: model.author,
    keywords: model.tags,
  });
  await writeJson(join(out, "package.json"), {
    name: model.name,
    version: model.version,
    private: true,
    type: "module",
    description: model.description,
    ...(hooks.length > 0 && { omp: { extensions: [EXTENSION] } }),
  });
}

// Every Claude SessionStart source has an omp event (session_start,
// session_switch, session_compact), SubagentStart runs in subagent sessions
// and Stop on session_stop; only a matcher naming a tool omp lacks fails.
export function canCarry(entry) {
  if ((entry.event === "pre-tool" || entry.event === "post-tool") && rewriteMatcher(entry.matcher, OMP_TOOLS) === null) {
    return { unsupported: `matcher "${entry.matcher}" names a tool omp does not have` };
  }
  return { ok: true };
}

export async function validate({ repoRoot, outRoot = repoRoot, plugin }) {
  const registry = await readJson(join(repoRoot, "registry.json")).catch(() => undefined);
  const out = join(outRoot, pluginsDir, plugin.name);
  const label = `omp ${plugin.name}`;
  const errors = [];
  if (!(await pathExists(join(out, ".omp-plugin", "plugin.json")))) errors.push(`${label}: missing .omp-plugin/plugin.json; run npm run build`);
  if (await pathExists(join(out, ".claude-plugin"))) errors.push(`${label}: ships .claude-plugin/`);
  if (await pathExists(join(out, "hooks", "hooks.json"))) errors.push(`${label}: ships hooks/hooks.json, which omp never runs`);
  const pkg = await readJson(join(out, "package.json")).catch(() => undefined);
  if (!pkg) errors.push(`${label}: missing package.json`);
  else {
    if ("pi" in pkg) errors.push(`${label}: package.json has a pi key`);
    for (const entry of pkg.omp?.extensions ?? []) {
      if (!(await pathExists(join(out, entry)))) errors.push(`${label}: omp extension ${entry} is missing`);
    }
  }

  const manifest = await readJson(join(out, MANIFEST)).catch(() => undefined);
  for (const entry of manifest?.entries ?? []) {
    for (const [, path] of entry.command.matchAll(/"\$\{OMP_PLUGIN_ROOT\}"\/([^\s"';|&]+)/g)) {
      if (!(await pathExists(join(out, path)))) errors.push(`${label}: hook ${entry.id} runs missing ${path}`);
    }
  }

  const catalog = await readJson(join(outRoot, CATALOG)).catch(() => undefined);
  if (!catalog) errors.push(`${label}: missing ${CATALOG}`);
  else {
    const expected = (registry?.plugins ?? [])
      .filter((entry) => entry.harnesses?.[id]?.enabled === true)
      .map((entry) => entry.name)
      .sort();
    const listed = catalog.plugins.map((entry) => entry.name).sort();
    if (registry && JSON.stringify(listed) !== JSON.stringify(expected)) {
      errors.push(`${label}: ${CATALOG} lists ${listed.join(", ")}; expected ${expected.join(", ")}`);
    }
    for (const entry of catalog.plugins) {
      if (!String(entry.source).startsWith(`./${pluginsDir}/`)) errors.push(`${label}: catalog source ${entry.source} is outside ${pluginsDir}`);
    }
  }
  return errors;
}
