import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { payloadErrors, stripFrontmatter } from "./runtime.mjs";
import { OPENCODE_TOOLS } from "./tools.mjs";
import { ensureDir, pathExists, readJson, removeDir, writeJson } from "../../scripts/lib/fs-utils.mjs";
import { mapAgent } from "../../scripts/lib/transforms/agents.mjs";
import { parseDocument } from "../../scripts/lib/transforms/frontmatter.mjs";
import { canonicalPluginPaths, rewritePluginRoot } from "../../scripts/lib/transforms/paths.mjs";
import { carryHooks } from "../../scripts/lib/transforms/policy.mjs";
import { derivedId, referencePairs, rewriteReferences, wrapperText } from "../../scripts/lib/transforms/names.mjs";
import { rewriteMatcher } from "../../scripts/lib/transforms/tools.mjs";
import { copyLayout, copyRewrittenSkills, copyRuntime, wrapperLayout } from "../../scripts/lib/layout.mjs";

// One self-contained OpenCode V2 package per plugin: the Claude wrapper
// layout (hook scripts find their skills through it), a copy of the shared
// runtime, and the manifests the runtime registers at load time.
export const id = "opencode";

export const capabilities = {
  skills: { mode: "native" },
  agents: { mode: "native" },
  hooks: { mode: "shim", events: ["session-start", "subagent-start", "pre-tool", "post-tool", "stop"] },
};

// One folder per plugin under this; changed-plugins and eval read it.
export const pluginsDir = "dist/opencode/plugins";
// Mapped agents; agents/ keeps the canonical copies.
const AGENTS = "opencode-agents";
const MANIFEST = "runtime/opencode/hooks.manifest.json";
const ROOT_TOKEN = '"${OPENCODE_PLUGIN_ROOT}"';
// Package paths keep the runtime's relative imports intact.
const RUNTIME = {
  "harnesses/opencode/runtime.mjs": "runtime/opencode/runtime.mjs",
  "harnesses/opencode/tools.mjs": "runtime/opencode/tools.mjs",
  "harnesses/lib/hook-runner.mjs": "runtime/lib/hook-runner.mjs",
  "harnesses/lib/hook-input.mjs": "runtime/lib/hook-input.mjs",
};

// Skillshare reads .plugin/marketplace.json at the repo root to discover
// OpenCode packages under dist/opencode/plugins/<name>/.
export async function generateRoot({ outRoot, registry, plugins }) {
  await removeDir(join(outRoot, "dist/opencode"));
  await writeJson(join(outRoot, ".plugin", "marketplace.json"), {
    name: registry.marketplace.name,
    owner: registry.marketplace.owner,
    metadata: {
      description: registry.marketplace.description,
    },
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
  return { pairs: referencePairs(registry) };
}

export async function generate({ repoRoot, outRoot, model, state, report }) {
  const out = join(outRoot, pluginsDir, model.name);
  const layout = wrapperLayout(model);

  // Canonical agents are copied too: a skill may read one as a spec file. The skills are copied
  // after the rest, so their references can be rewritten together with agents, templates and hooks.
  await copyLayout({ repoRoot, layout: layout.filter(({ kind }) => kind !== "skills"), to: out });
  await copyRewrittenSkills({ repoRoot, model, to: out, pairs: state.pairs });
  for (const { to } of layout.filter(({ to }) => to.endsWith(".mcp.json"))) {
    report.add({ kind: "extra", resource: to, status: "degraded", reason: "OpenCode does not read .mcp.json; add the server to opencode.json" });
  }
  await copyRuntime({ files: RUNTIME, to: out });

  const resources = { skills: [], commands: [], agents: [] };
  // Checked here because OpenCode disables the whole plugin on one bad payload.
  // An invalid agent is skipped rather than failing the build: Claude Code
  // cannot load one without a description either.
  const accept = (kind, entry, payload) => {
    const errors = payloadErrors(kind, payload);
    if (errors.length === 0) resources[kind].push(entry);
    for (const reason of errors) {
      report.add({ kind, resource: entry.id ?? entry.name, status: kind === "agents" ? "degraded" : "error", reason });
    }
    return errors.length === 0;
  };

  for (const skill of model.skills) {
    const skillId = derivedId(model.name, skill.name);
    const path = `skills/${skill.name}/SKILL.md`;
    // the registered description comes from the source, so it needs the same rewrite as the file
    const description = rewriteText(skill.frontmatter.description, state.pairs);
    const entry = { id: skillId, name: skillId, description, path };
    if (String(skill.frontmatter["disable-model-invocation"]) === "true") entry.autoinvoke = false;
    accept("skills", entry, { ...entry, content: stripFrontmatter(await readFile(join(out, path), "utf8")) });
  }

  // A runnable skill gets a command of the same id, OpenCode's own slash entry.
  for (const skill of model.skills.filter(({ userInvocable }) => userInvocable)) {
    const commandId = derivedId(model.name, skill.name);
    const path = `runtime/opencode/commands/${commandId}.md`;
    await ensureDir(join(out, "runtime/opencode/commands"));
    await writeFile(join(out, path), wrapperText(commandId));
    // the picker line replaces the skill description in phase 3
    const entry = { name: commandId, description: rewriteText(skill.pickerLine ?? skill.frontmatter.description, state.pairs), path };
    accept("commands", entry, { ...entry, template: stripFrontmatter(await readFile(join(out, path), "utf8")) });
  }

  // Plugin-prefixed ids: agent names are global and two plugins may share one.
  for (const agent of model.agents) {
    const agentId = derivedId(model.name, agent.name);
    const text = rewriteReferences(
      mapAgent(await readFile(join(repoRoot, agent.path), "utf8"), {
        keep: ["description"],
        set: { mode: "subagent" },
        trimExamples: true,
      }),
      state.pairs,
      { join: "-" },
    );
    const entry = { id: agentId, description: parseDocument(text).frontmatter.description, path: `${AGENTS}/${agentId}.md` };
    if (accept("agents", entry, { ...entry, system: stripFrontmatter(text) })) {
      await ensureDir(join(out, AGENTS));
      await writeFile(join(out, entry.path), text);
    }
  }

  const carried = await carryHooks({ repoRoot, model, harness: id, canCarry, report });
  const hooks = [];
  for (const entry of carried) {
    try {
      canonicalPluginPaths(entry.command, layout, ""); // throws when a script is not in the package
      const { statusMessage: _, ...rest } = entry;
      hooks.push({ ...rest, command: rewritePluginRoot(entry.command, ROOT_TOKEN) });
    } catch (error) {
      report.add({ kind: "hooks", resource: entry.id, status: "error", reason: error.message });
    }
  }

  await writeJson(join(out, "resources.json"), resources);
  await writeJson(join(out, MANIFEST), { entries: hooks });
  const pkgPath = join(out, "package.json");
  const existing = await readJson(pkgPath).catch(() => ({}));
  const keywords = [...new Set([...(existing.keywords ?? []), "opencode-plugin", ...(model.tags ?? [])])];
  await writeJson(pkgPath, {
    ...existing,
    name: model.name,
    version: model.version,
    description: model.description,
    type: "module",
    main: ".opencode/plugins/index.js",
    exports: { ".": "./index.js" },
    keywords,
  });
  await writeFile(
    join(out, "index.js"),
    `// Generated by npm run build from registry.json; do not edit.\n` +
      `import { createPlugin } from "./runtime/opencode/runtime.mjs";\n\n` +
      `export default createPlugin({ id: ${JSON.stringify(model.name)}, root: new URL(".", import.meta.url) });\n`,
  );
  await ensureDir(join(out, ".opencode/plugins"));
  await writeFile(join(out, ".opencode/plugins/index.js"), 'export { default } from "../../index.js";\n');
}

// A missing description stays missing so payloadErrors reports it.
const rewriteText = (text, pairs) => (typeof text === "string" ? rewriteReferences(text, pairs, { join: "-" }) : text);

export function canCarry(entry) {
  if (entry.event !== "pre-tool" && entry.event !== "post-tool") return { ok: true };
  if (!entry.matcher || entry.matcher === "*") return { ok: true };
  if (rewriteMatcher(entry.matcher, OPENCODE_TOOLS) === null) {
    return { unsupported: `matcher "${entry.matcher}" names a tool OpenCode does not have` };
  }
  return { ok: true };
}

export async function validate({ repoRoot, outRoot = repoRoot, plugin }) {
  const out = join(outRoot, pluginsDir, plugin.name);
  const errors = [];
  const label = `opencode ${plugin.name}`;
  const exists = (path) => pathExists(join(out, path));
  const json = async (path) => {
    try {
      return await readJson(join(out, path));
    } catch {
      errors.push(`${label}: cannot read ${path}`);
      return undefined;
    }
  };

  const pkg = await json("package.json");
  if (!pkg) return errors;
  for (const path of [pkg.main, ...Object.values(RUNTIME)]) {
    if (!path || !(await exists(path))) errors.push(`${label}: missing ${path ?? "package.json main"}`);
  }

  const resources = (await json("resources.json")) ?? {};
  for (const [kind, field] of [["skills", "content"], ["commands", "template"], ["agents", "system"]]) {
    for (const entry of resources[kind] ?? []) {
      const text = await readFile(join(out, entry.path), "utf8").catch(() => undefined);
      if (text === undefined) errors.push(`${label}: missing ${entry.path}`);
      else errors.push(...payloadErrors(kind, { ...entry, [field]: stripFrontmatter(text) }).map((e) => `${label}: ${e}`));
    }
  }

  for (const entry of (await json(MANIFEST))?.entries ?? []) {
    for (const [, path] of entry.command.matchAll(/"\$\{OPENCODE_PLUGIN_ROOT\}"\/([^\s"';|&]+)/g)) {
      if (!(await exists(path))) errors.push(`${label}: hook ${entry.id} runs missing ${path}`);
    }
  }
  return errors;
}
