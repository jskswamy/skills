import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pathExists, readJson, writeJson } from "../../scripts/lib/fs-utils.mjs";
import { copyLayout, rewriteTree, wrapperLayout } from "../../scripts/lib/layout.mjs";
import { referencePairs } from "../../scripts/lib/transforms/names.mjs";
import { canonicalPluginPaths } from "../../scripts/lib/transforms/paths.mjs";
import { carryHooks } from "../../scripts/lib/transforms/policy.mjs";
import { CLAUDE_EVENTS, rewriteMatcher } from "../../scripts/lib/transforms/tools.mjs";

// One folder per plugin under this; changed-plugins and eval read it. Codex
// gets its own bundle because it turns a plugin's commands/ into skills at
// install, which would list every command twice next to ours.
export const pluginsDir = "dist/codex/plugins";
const SKILLS_DIR = "codex-skills";
const HOOKS_FILE = "codex-hooks.json";

const CODEX_TOOLS = {
  tools: {
    Bash: { name: "Bash" },
  },
  mcp: {
    toClaude: (name) => (name.startsWith("mcp__") ? name : null),
    pattern: (claudePattern) => claudePattern,
  },
};

export const id = "codex";

export const capabilities = {
  skills: { mode: "native" },
  agents: { mode: "none" },
  hooks: { mode: "native", events: ["session-start", "pre-tool", "post-tool", "stop"] },
};

// The marketplace lists every plugin with codex enabled. Codex CLI and
// Skillshare read .agents/plugins/marketplace.json at the root.
export async function generateRoot({ outRoot, registry, plugins }) {
  await writeJson(join(outRoot, ".agents", "plugins", "marketplace.json"), {
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

export async function generate({ repoRoot, outRoot, model, report, state }) {
  const pluginRoot = join(outRoot, pluginsDir, model.name);

  // Codex reads codex-skills/, codex-hooks.json, and optional .mcp.json/.app.json;
  // agents are not supported. A commands/ folder here would make Codex convert it
  // into skills, so none is ever shipped.
  const fullLayout = wrapperLayout(model);
  const layout = fullLayout
    .filter(({ kind, from }) => kind !== "agents" && !(kind === "hooks" && from.endsWith("hooks.json")))
    .map((entry) => (entry.kind === "skills" ? { ...entry, to: entry.to.replace(/^skills\//, `${SKILLS_DIR}/`) } : entry));
  await copyLayout({ repoRoot, layout, to: pluginRoot });

  // Codex runs a skill as $plugin:skill, so a /plugin:skill in text becomes $plugin:skill.
  // Hook scripts are not rewritten: a leading $ would be expanded by the shell.
  for (const dir of [SKILLS_DIR, "templates", "README.md"]) {
    await rewriteTree(join(pluginRoot, dir), { pairs: state.pairs, join: ":", sigil: "$", exts: [".md", ".yaml"] });
  }

  // A hidden skill leaves the listing through agents/openai.yaml ($plugin:skill still runs it).
  // Written after rewriteTree so the yaml stays literal.
  for (const skill of model.skills.filter(({ hidden }) => hidden)) {
    const dir = join(pluginRoot, SKILLS_DIR, skill.name, "agents");
    if (await pathExists(join(repoRoot, skill.path, "agents", "openai.yaml"))) {
      report.add({ kind: "skills", resource: skill.name, status: "error", reason: `${skill.name} already ships agents/openai.yaml; merge allow_implicit_invocation: false into it by hand` });
      continue;
    }
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "openai.yaml"), "policy:\n  allow_implicit_invocation: false\n");
  }

  for (const agent of model.agents) {
    report.add({ kind: "agents", resource: agent.name, status: "degraded", reason: "Codex plugins do not support sub-agents" });
  }

  const carried = await carryHooks({ repoRoot, model, harness: id, canCarry, report });
  const hooks = {};
  for (const entry of carried) {
    try {
      canonicalPluginPaths(entry.command, fullLayout, "");
      let statusMessage = entry.statusMessage;
      if (typeof statusMessage !== "string" || statusMessage.trim() === "") {
        statusMessage = `${model.name} ${entry.id}`;
        report.add({ kind: "hooks", resource: entry.id, status: "degraded", reason: "no statusMessage on hook; a generic one was generated" });
      }
      const claudeEvent = CLAUDE_EVENTS[entry.event];
      const handler = { type: "command", command: entry.command };
      if (entry.timeoutMs !== undefined) handler.timeout = entry.timeoutMs / 1000;
      handler.statusMessage = statusMessage;
      const matcher =
        entry.event === "pre-tool" || entry.event === "post-tool"
          ? rewriteMatcher(entry.matcher, CODEX_TOOLS)
          : entry.matcher;
      const group = matcher !== undefined ? { matcher, hooks: [handler] } : { hooks: [handler] };
      (hooks[claudeEvent] ??= []).push(group);
    } catch (error) {
      report.add({ kind: "hooks", resource: entry.id, status: "error", reason: error.message });
    }
  }

  // Always point .codex-plugin/plugin.json at ./codex-hooks.json when a plugin
  // defines hooks so Codex never falls back to Claude Code's hooks/hooks.json.
  const hasHooks = model.hooks.length > 0;
  if (hasHooks) {
    await writeJson(join(pluginRoot, HOOKS_FILE), { hooks });
  }

  await writeJson(join(pluginRoot, ".codex-plugin", "plugin.json"), {
    name: model.name,
    version: model.version,
    description: model.description,
    author: model.author,
    keywords: model.tags,
    skills: `./${SKILLS_DIR}`,
    ...(hasHooks ? { hooks: `./${HOOKS_FILE}` } : {}),
  });
}

export function canCarry(entry) {
  if (entry.event === "subagent-start") return { notApplicable: "Codex has no SubagentStart event" };
  if ((entry.event === "pre-tool" || entry.event === "post-tool") && entry.matcher && entry.matcher !== "*") {
    if (rewriteMatcher(entry.matcher, CODEX_TOOLS) === null) {
      return { unsupported: `matcher "${entry.matcher}" names a tool Codex does not have` };
    }
  }
  return { ok: true };
}

export async function validate({ repoRoot, outRoot = repoRoot, plugin }) {
  const out = join(outRoot, pluginsDir, plugin.name);
  const label = `codex ${plugin.name}`;
  const manifest = await readJson(join(out, ".codex-plugin", "plugin.json")).catch(() => undefined);
  if (!manifest) return [`${label}: missing .codex-plugin/plugin.json; run npm run build`];

  const errors = [];
  if (await pathExists(join(out, "commands"))) {
    errors.push(`${label}: commands/ must not ship; Codex would convert it into duplicate source-command-* skills`);
  }
  for (const field of ["name", "version", "description"]) {
    if (typeof manifest[field] !== "string" || manifest[field].trim() === "") {
      errors.push(`${label}: .codex-plugin/plugin.json missing ${field}`);
    }
  }
  for (const entry of plugin.resources?.skills ?? []) {
    const skill = entry.split("/").at(-1);
    if (!(await pathExists(join(out, SKILLS_DIR, skill, "SKILL.md")))) {
      errors.push(`${label}: missing ${SKILLS_DIR}/${skill}/SKILL.md`);
    }
  }
  if ((plugin.resources?.hooks ?? []).length > 0) {
    if (manifest.hooks !== `./${HOOKS_FILE}`) {
      errors.push(`${label}: .codex-plugin/plugin.json hooks must be ./${HOOKS_FILE}`);
    }
    const hooksJson = await readJson(join(out, HOOKS_FILE)).catch(() => undefined);
    if (!hooksJson || typeof hooksJson.hooks !== "object" || hooksJson.hooks === null) {
      errors.push(`${label}: missing or invalid ${HOOKS_FILE}`);
    } else {
      for (const groups of Object.values(hooksJson.hooks)) {
        for (const group of groups) {
          for (const hook of group.hooks ?? []) {
            if (typeof hook.statusMessage !== "string" || hook.statusMessage.trim() === "") {
              errors.push(`${label}: hook "${hook.command}" missing statusMessage in ${HOOKS_FILE}`);
            }
            for (const [, path] of (hook.command ?? "").matchAll(/\$\{?CLAUDE_PLUGIN_ROOT\}?\/([^\s"';|&]+)/g)) {
              if (!(await pathExists(join(out, path)))) {
                errors.push(`${label}: hook runs missing ${path}`);
              }
            }
          }
        }
      }
    }
  }
  return errors;
}
