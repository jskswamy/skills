import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { DEFAULT_TIMEOUT_MS } from "../lib/hook-runner.mjs";
import { ensureDir, readJson, removeDir, writeJson } from "../../scripts/lib/fs-utils.mjs";
import { mapAgent } from "../../scripts/lib/transforms/agents.mjs";
import { commandToSkill } from "../../scripts/lib/transforms/command-to-skill.mjs";
import { parseDocument } from "../../scripts/lib/transforms/frontmatter.mjs";
import { pluginRootPaths, rewritePluginRoot } from "../../scripts/lib/transforms/paths.mjs";
import { carryHooks } from "../../scripts/lib/transforms/policy.mjs";
import { matchesClaude, rewriteMatcher } from "../../scripts/lib/transforms/tools.mjs";
import { copyLayout, copyRuntime, wrapperLayout } from "../../scripts/lib/layout.mjs";

// One native plugin per registry plugin under dist/antigravity/plugins/.
// `agy plugin install dist/antigravity` installs them all. agy copies a
// plugin as is and reads only a root hooks.json in its own schema, so hooks
// are emitted here and run through a shim that speaks agy's hook contract.
export const id = "antigravity";

export const capabilities = {
  skills: { mode: "native" },
  commands: { mode: "as-skill" },
  agents: { mode: "native" },
  hooks: { mode: "shim", events: ["session-start", "pre-tool", "post-tool", "stop"] },
};

// One folder per plugin under this; changed-plugins and eval read it.
export const pluginsDir = "dist/antigravity/plugins";
// Plugins must not need node at runtime: the shim is bash + jq, and the tool
// table it maps names through is plain JSON shared with this adapter.
const RUNTIME = {
  "harnesses/antigravity/hook-shim.sh": "runtime/antigravity/hook-shim.sh",
  "harnesses/antigravity/tools.json": "runtime/antigravity/tools.json",
};
const SHIM = "bash runtime/antigravity/hook-shim.sh";
const MANIFEST = "runtime/antigravity/hooks.manifest.json";
const ROOT_TOKEN = '"${ANTIGRAVITY_PLUGIN_ROOT}"';
// agy 1.4.1 tool names and argument fields, keyed by Claude tool name. Only
// tools whose declaration name matches a CORTEX_STEP_TYPE_* step are listed,
// because hook matchers see the step-derived name. write_to_file and
// replace_file_content have no step of that name (they look like
// code_action), so Write and Edit stay unmapped until a hook is seen firing
// for them. MCP calls are steps of type mcp_tool; how a hook sees their server
// and tool name is unknown, so there is no mcp rule and MCP matchers are
// unmappable.
const AGY_TOOLS = JSON.parse(readFileSync(new URL("./tools.json", import.meta.url), "utf8"));
const AGY_EVENTS = { "session-start": "SessionStart", "pre-tool": "PreToolUse", "post-tool": "PostToolUse", stop: "Stop" };

// What of the Claude contract agy cannot deliver, per event.
const EVENT_LIMITS = {
  "pre-tool": "agy PreToolUse cannot inject context; only exit 2 (deny) is carried",
  "post-tool": "agy ignores PostToolUse output; exit 2 and context only reach the log",
};
const UNVERIFIED = "agy 1.4.1 ran no JSON hooks without a signed-in account; carried per its documented contract, unverified at runtime";

export async function generateRoot({ outRoot }) {
  // Rebuilt whole, so a plugin that loses the harness loses its tree.
  await removeDir(join(outRoot, pluginsDir));
}

export async function generate({ repoRoot, outRoot, model, report }) {
  const pluginRoot = join(outRoot, pluginsDir, model.name);
  await writeJson(join(pluginRoot, ".antigravity-plugin", "plugin.json"), {
    name: model.name,
    version: model.version,
    description: model.description,
  });

  // agy ignores commands/ and reads hooks only from the root hooks.json;
  // agents are mapped below.
  const layout = wrapperLayout(model).filter(
    ({ kind, from }) => !["commands", "agents"].includes(kind) && !(kind === "hooks" && from.endsWith("hooks.json")),
  );
  await copyLayout({ repoRoot, layout, to: pluginRoot });

  for (const command of model.commands) {
    const skill = commandToSkill(
      { name: command.name, text: await readFile(join(repoRoot, command.path), "utf8") },
      { name: commandSkillName(model.name, command.name) },
    );
    await ensureDir(join(pluginRoot, "skills", skill.name));
    await writeFile(join(pluginRoot, "skills", skill.name, "SKILL.md"), skill.content);
  }

  for (const agent of model.agents) {
    const text = await readFile(join(repoRoot, agent.path), "utf8");
    await ensureDir(join(pluginRoot, "agents"));
    await writeFile(join(pluginRoot, "agents", `${agent.name}.md`), antigravityAgent({ text, agent, plugin: model.name, report }));
  }

  await generateHooks({ repoRoot, model, pluginRoot, report });
}

// agy's own conversion of a Claude plugin uses this scheme, so a plugin
// installed either way exposes the same skills. It cannot collide with a
// plugin's skills (craft has command backlog and skill craft-backlog) or with
// another plugin's commands (jot and study both have setup).
export function commandSkillName(plugin, command) {
  return `${plugin}-cmd-${command}`;
}

// agy silently skips an agent without name and description, or whose tools
// is not a list (tools: "*"). Claude tool names mean nothing to agy and would
// restrict the agent to tools that do not exist, so tools is dropped and the
// agent gets agy's defaults, as Claude's "*" intends.
function antigravityAgent({ text, agent, plugin, report }) {
  const { frontmatter } = parseDocument(text);
  const set = {};
  if (!frontmatter.name) set.name = agent.name;
  if (!frontmatter.description) {
    set.description = `The ${agent.name} agent of the ${plugin} plugin.`;
    report.add({ kind: "agents", resource: agent.name, status: "degraded", reason: "no description in frontmatter; a generic one was generated" });
  }
  return mapAgent(text, { keep: ["name", "description"], set });
}

async function generateHooks({ repoRoot, model, pluginRoot, report }) {
  const carried = await carryHooks({ repoRoot, model, harness: id, canCarry, report, prepare: splitMatcher });

  const hooksJson = {};
  const manifest = {};
  for (const entry of carried) {
    const missing = pluginRootPaths(entry.command).find((path) => !existsSync(join(pluginRoot, path)));
    if (missing !== undefined) {
      report.add({ kind: "hooks", resource: entry.id, status: "error", reason: `no file for \${CLAUDE_PLUGIN_ROOT}/${missing}` });
      continue;
    }
    let key = entry.id;
    for (let n = 2; key in manifest; n++) key = `${entry.id}#${n}`;
    manifest[key] = { event: entry.event, command: rewritePluginRoot(entry.command, ROOT_TOKEN), timeoutMs: entry.timeoutMs };
    hooksJson[`${model.name}/${key}`] = { [AGY_EVENTS[entry.event]]: agyHandlers(entry, key) };
    if (EVENT_LIMITS[entry.event]) report.add({ kind: "hooks", resource: entry.id, status: "degraded", reason: EVENT_LIMITS[entry.event] });
  }
  if (carried.length === 0) return;

  report.add({ kind: "hooks", resource: "hooks.json", status: "degraded", reason: UNVERIFIED });
  await writeJson(join(pluginRoot, "hooks.json"), hooksJson);
  await writeJson(join(pluginRoot, MANIFEST), { entries: manifest });
  await copyRuntime({ files: RUNTIME, to: pluginRoot });
}

function agyHandlers(entry, key) {
  // agy timeouts are seconds and must outlast the shim's own kill timer.
  const handler = {
    type: "command",
    command: `${SHIM} ${key}`,
    timeout: Math.ceil((entry.timeoutMs ?? DEFAULT_TIMEOUT_MS) / 1000) + 5,
  };
  if (entry.event !== "pre-tool" && entry.event !== "post-tool") return [handler];
  return [{ matcher: agyMatcher(entry.matcher), hooks: [handler] }];
}

function agyMatcher(matcher) {
  if (!matcher || matcher === "*") return "*";
  return `^(?:${rewriteMatcher(matcher, AGY_TOOLS)})$`;
}

// Bash|mcp__.*git.*commit has a part agy can match and a part it cannot.
// Splitting keeps the run_command guard while the MCP part goes through the
// hook policy under the same id, so it is reported rather than dropped.
export function splitMatcher(entry) {
  if ((entry.event !== "pre-tool" && entry.event !== "post-tool") || !entry.matcher || entry.matcher === "*") return [entry];
  const alternatives = entry.matcher.split("|");
  const mapped = alternatives.filter((alternative) => rewriteMatcher(alternative, AGY_TOOLS) !== null);
  if (mapped.length === 0 || mapped.length === alternatives.length) return [entry];
  const unmapped = alternatives.filter((alternative) => !mapped.includes(alternative));
  return [
    { ...entry, matcher: mapped.join("|") },
    { ...entry, matcher: unmapped.join("|") },
  ];
}

export function canCarry(entry) {
  if (entry.event === "subagent-start") return { notApplicable: "Antigravity has no SubagentStart event" };
  // agy's SessionStart has no matcher and the shim reports every start as
  // "startup", so only a hook that would run at startup is faithful.
  if (entry.event === "session-start" && !matchesClaude(entry.matcher, "startup")) {
    return { unsupported: `session-start matcher "${entry.matcher}" excludes startup, and agy SessionStart has no source` };
  }
  if ((entry.event === "pre-tool" || entry.event === "post-tool") && entry.matcher && entry.matcher !== "*") {
    if (rewriteMatcher(entry.matcher, AGY_TOOLS) === null) {
      return { unsupported: `matcher "${entry.matcher}" names a tool with no known Antigravity name` };
    }
  }
  return { ok: true };
}

// Runs agy's own validator when agy is installed. It drops a malformed
// hooks.json silently (hooks: 0, no findings), so the counts are checked too.
export async function validate({ repoRoot, outRoot = repoRoot, plugin }) {
  if (!onPath("agy")) return [];
  const dir = join(outRoot, pluginsDir, plugin.name);
  const label = `antigravity ${plugin.name}`;
  if (!existsSync(join(dir, ".antigravity-plugin", "plugin.json"))) return [`${label}: not generated; run npm run build`];

  const expected = {
    skills: (await readdir(join(dir, "skills"), { withFileTypes: true }).catch(() => [])).filter((e) => e.isDirectory()).length,
    agents: (await readdir(join(dir, "agents")).catch(() => [])).filter((name) => name.endsWith(".md")).length,
    // One named hook per manifest entry; hooks.json itself is what is checked.
    hooks: Object.keys((await readJson(join(dir, MANIFEST)).catch(() => ({}))).entries ?? {}).length,
  };

  // agy writes state under HOME, so it gets a throwaway one.
  const home = await mkdtemp(join(tmpdir(), "agy-validate-"));
  try {
    const env = { ...process.env, HOME: home };
    for (const name of ["CONFIG", "DATA", "CACHE", "STATE"]) env[`XDG_${name}_HOME`] = join(home, name.toLowerCase());
    const run = spawnSync("agy", ["plugin", "validate", dir, "--json", "--strict"], { env, encoding: "utf8" });
    let result;
    try {
      result = JSON.parse(run.stdout);
    } catch {
      return [`${label}: agy plugin validate failed: ${(run.stderr || run.stdout || "").trim()}`];
    }
    const errors = (result.findings ?? []).map((finding) => `${label}: ${typeof finding === "string" ? finding : JSON.stringify(finding)}`);
    for (const [kind, count] of Object.entries(expected)) {
      const found = result.components?.[kind] ?? 0;
      if (found !== count) errors.push(`${label}: agy sees ${found} ${kind}, expected ${count}`);
    }
    return errors;
  } finally {
    await rm(home, { recursive: true, force: true });
  }
}

function onPath(command) {
  return (process.env.PATH ?? "").split(delimiter).some((dir) => dir && existsSync(join(dir, command)));
}
