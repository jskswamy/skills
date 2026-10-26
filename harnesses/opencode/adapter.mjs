import { readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { BUILTIN_COMMANDS, payloadErrors, stripFrontmatter } from "./runtime.mjs";
import { OPENCODE_TOOLS } from "./tools.mjs";
import { ensureDir, pathExists, readJson, removeDir, writeJson } from "../../scripts/lib/fs-utils.mjs";
import { mapAgent } from "../../scripts/lib/transforms/agents.mjs";
import { parseDocument } from "../../scripts/lib/transforms/frontmatter.mjs";
import { canonicalPluginPaths, rewritePluginRoot } from "../../scripts/lib/transforms/paths.mjs";
import { carryHooks } from "../../scripts/lib/transforms/policy.mjs";
import { commandNames } from "../../scripts/lib/transforms/names.mjs";
import { rewriteMatcher } from "../../scripts/lib/transforms/tools.mjs";
import { copyLayout, copyRuntime, wrapperLayout } from "../../scripts/lib/layout.mjs";

// One self-contained OpenCode V2 package per plugin: the Claude wrapper
// layout (hook scripts find their skills through it), a copy of the shared
// runtime, and the manifests the runtime registers at load time.
export const id = "opencode";

export const capabilities = {
  skills: { mode: "native" },
  commands: { mode: "native" },
  agents: { mode: "native" },
  hooks: { mode: "shim", events: ["session-start", "subagent-start", "pre-tool", "post-tool", "stop"] },
};

// One folder per plugin under this; changed-plugins and eval read it.
export const pluginsDir = "dist/opencode";
// Mapped agents; agents/ keeps the canonical copies.
const AGENTS = "opencode-agents";
const ROOT_TOKEN = '"${OPENCODE_PLUGIN_ROOT}"';
// Package paths keep the runtime's relative imports intact.
const RUNTIME = {
  "harnesses/opencode/runtime.mjs": "runtime/opencode/runtime.mjs",
  "harnesses/opencode/tools.mjs": "runtime/opencode/tools.mjs",
  "harnesses/lib/hook-runner.mjs": "runtime/lib/hook-runner.mjs",
  "harnesses/lib/hook-input.mjs": "runtime/lib/hook-input.mjs",
};

export async function generateRoot({ outRoot, plugins }) {
  await removeDir(join(outRoot, pluginsDir));

  // OpenCode command names are global, including its built-in ones.
  return { commandName: commandNames(plugins, BUILTIN_COMMANDS) };
}

export async function generate({ repoRoot, outRoot, model, state, report }) {
  const out = join(outRoot, pluginsDir, model.name);
  const layout = wrapperLayout(model);

  // Canonical agents are copied too: a skill may read one as a spec file.
  await copyLayout({ repoRoot, layout, to: out });
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
    const path = `skills/${skill.name}/SKILL.md`;
    const entry = { id: skill.name, name: skill.frontmatter.name ?? skill.name, description: skill.frontmatter.description, path };
    if (String(skill.frontmatter["disable-model-invocation"]) === "true") entry.autoinvoke = false;
    accept("skills", entry, { ...entry, content: stripFrontmatter(await readFile(join(out, path), "utf8")) });
  }

  for (const command of model.commands) {
    const path = `commands/${basename(command.path)}`;
    const entry = { name: state.commandName(model.name, command.name), description: command.frontmatter?.description, path };
    accept("commands", entry, { ...entry, template: stripFrontmatter(await readFile(join(out, path), "utf8")) });
  }

  // Plugin-prefixed ids: agent names are global and two plugins may share one.
  for (const agent of model.agents) {
    const agentId = agent.name.startsWith(`${model.name}-`) ? agent.name : `${model.name}-${agent.name}`;
    const text = mapAgent(await readFile(join(repoRoot, agent.path), "utf8"), {
      keep: ["description"],
      set: { mode: "subagent" },
      trimExamples: true,
    });
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
      hooks.push({ ...entry, command: rewritePluginRoot(entry.command, ROOT_TOKEN) });
    } catch (error) {
      report.add({ kind: "hooks", resource: entry.id, status: "error", reason: error.message });
    }
  }

  await writeJson(join(out, "resources.json"), resources);
  await writeJson(join(out, "hooks.manifest.json"), { entries: hooks });
  await writeJson(join(out, "package.json"), {
    name: `@jskswamy/opencode-${model.name}`,
    version: model.version,
    description: model.description,
    type: "module",
    main: "./index.js",
    exports: { ".": "./index.js" },
    keywords: ["opencode-plugin", ...model.tags],
  });
  await writeFile(
    join(out, "index.js"),
    `// Generated by npm run build from registry.json; do not edit.\n` +
      `import { createPlugin } from "./runtime/opencode/runtime.mjs";\n\n` +
      `export default createPlugin({ id: ${JSON.stringify(model.name)}, root: new URL(".", import.meta.url) });\n`,
  );
}

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

  for (const entry of (await json("hooks.manifest.json"))?.entries ?? []) {
    for (const [, path] of entry.command.matchAll(/"\$\{OPENCODE_PLUGIN_ROOT\}"\/([^\s"';|&]+)/g)) {
      if (!(await exists(path))) errors.push(`${label}: hook ${entry.id} runs missing ${path}`);
    }
  }
  return errors;
}
