import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { commandSkillName } from "../antigravity/adapter.mjs";
import { ensureDir, pathExists, readJson, removeDir, writeJson } from "../../scripts/lib/fs-utils.mjs";
import { copyLayout, wrapperLayout } from "../../scripts/lib/layout.mjs";
import { commandToSkill } from "../../scripts/lib/transforms/command-to-skill.mjs";
import { carryHooks } from "../../scripts/lib/transforms/policy.mjs";

// One folder per plugin under this; changed-plugins and eval read it.
export const pluginsDir = "dist/codex";

export const id = "codex";

export const capabilities = {
  skills: { mode: "native" },
  commands: { mode: "as-skill" },
  agents: { mode: "none" },
  hooks: { mode: "none", events: [] },
};

// The marketplace lists every plugin with codex enabled. Codex CLI and
// Skillshare read .agents/plugins/marketplace.json at the root.
export async function generateRoot({ outRoot, registry, plugins }) {
  await removeDir(join(outRoot, pluginsDir));
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
  await writeJson(join(pluginRoot, ".codex-plugin", "plugin.json"), {
    name: model.name,
    version: model.version,
    description: model.description,
    author: model.author,
    keywords: model.tags,
  });

  // Codex reads skills/ and optional .mcp.json/.app.json; commands are
  // converted into skills below, while agents and hooks are not supported.
  const layout = wrapperLayout(model).filter(({ kind }) => !["commands", "agents", "hooks"].includes(kind));
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
    report.add({ kind: "agents", resource: agent.name, status: "degraded", reason: "Codex plugins do not support sub-agents" });
  }

  await carryHooks({ repoRoot, model, harness: id, canCarry, report });
}

export function canCarry() {
  return { notApplicable: "Codex plugins do not support lifecycle hooks" };
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
    if (!(await pathExists(join(out, "skills", skill, "SKILL.md")))) {
      errors.push(`${label}: missing skills/${skill}/SKILL.md`);
    }
  }
  return errors;
}
