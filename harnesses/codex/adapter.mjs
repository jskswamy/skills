import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { commandSkillName } from "../antigravity/adapter.mjs";
import { ensureDir, pathExists, readJson, removeDir, writeJson } from "../../scripts/lib/fs-utils.mjs";
import { copyLayout, wrapperLayout } from "../../scripts/lib/layout.mjs";
import { commandToSkill } from "../../scripts/lib/transforms/command-to-skill.mjs";
import { canonicalPluginPaths } from "../../scripts/lib/transforms/paths.mjs";
import { carryHooks } from "../../scripts/lib/transforms/policy.mjs";
import { CLAUDE_EVENTS, rewriteMatcher } from "../../scripts/lib/transforms/tools.mjs";

// One folder per plugin under this; changed-plugins and eval read it.
export const pluginsDir = "dist/plugins";
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
  commands: { mode: "as-skill" },
  agents: { mode: "none" },
  hooks: { mode: "native", events: ["session-start", "pre-tool", "post-tool", "stop"] },
};

// The marketplace lists every plugin with codex enabled. Codex CLI and
// Skillshare read .agents/plugins/marketplace.json at the root.
export async function generateRoot({ outRoot, registry, plugins }) {
  await removeDir(join(outRoot, "dist/codex"));
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
}

export async function generate({ repoRoot, outRoot, model, report }) {
  const pluginRoot = join(outRoot, pluginsDir, model.name);

  // Codex reads codex-skills/, codex-hooks.json, and optional .mcp.json/.app.json;
  // commands are converted into skills below, while agents are not supported.
  const hasShared = await pathExists(join(pluginRoot, ".claude-plugin/plugin.json"));
  const fullLayout = wrapperLayout(model);
  const layout = fullLayout
    .filter(({ kind, from }) =>
      hasShared
        ? kind === "skills"
        : !["commands", "agents"].includes(kind) && !(kind === "hooks" && from.endsWith("hooks.json")),
    )
    .map((entry) => (entry.kind === "skills" ? { ...entry, to: entry.to.replace(/^skills\//, `${SKILLS_DIR}/`) } : entry));
  await copyLayout({ repoRoot, layout, to: pluginRoot });

  for (const command of model.commands) {
    const skill = commandToSkill(
      { name: command.name, text: await readFile(join(repoRoot, command.path), "utf8") },
      { name: commandSkillName(model.name, command.name) },
    );
    await ensureDir(join(pluginRoot, SKILLS_DIR, skill.name));
    await writeFile(join(pluginRoot, SKILLS_DIR, skill.name, "SKILL.md"), skill.content);
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
  for (const field of ["name", "version", "description"]) {
    if (typeof manifest[field] !== "string" || manifest[field].trim() === "") {
      errors.push(`${label}: .codex-plugin/plugin.json missing ${field}`);
    }
  }
  for (const skill of plugin.resources?.skills ?? []) {
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
