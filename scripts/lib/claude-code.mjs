import { basename, dirname, join, relative } from "node:path";
import { copyResourceTree, ensureDir, removeDir, writeJson } from "./fs-utils.mjs";

const GENERATED_DIRS = [".claude-plugin", "skills", "commands", "agents", "hooks", "templates"];

export async function generateClaudeCode({ repoRoot, registry }) {
  const plugins = registry.plugins.filter((plugin) => plugin.harnesses?.["claude-code"]?.enabled !== false);

  await writeJson(join(repoRoot, ".claude-plugin", "marketplace.json"), {
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
      source: `./plugins/${plugin.name}`,
      category: plugin.category,
      tags: plugin.tags ?? [],
    })),
  });

  for (const plugin of plugins) {
    await generatePluginWrapper({ repoRoot, plugin });
  }
}

async function generatePluginWrapper({ repoRoot, plugin }) {
  const pluginRoot = join(repoRoot, "plugins", plugin.name);
  for (const dir of GENERATED_DIRS) {
    await removeDir(join(pluginRoot, dir));
  }

  await writeJson(join(pluginRoot, ".claude-plugin", "plugin.json"), {
    name: plugin.name,
    version: plugin.version,
    description: plugin.description,
    author: plugin.author,
    keywords: plugin.tags ?? [],
  });

  const resources = normalizeResources(plugin.resources);

  for (const skill of resources.skills) {
    await copyResourceTree({
      from: join(repoRoot, "skills", skill),
      to: join(pluginRoot, "skills", skill),
    });
  }

  for (const command of resources.commands) {
    await copyResourceTree({
      from: join(repoRoot, "commands", command),
      to: join(pluginRoot, "commands", basename(command)),
    });
  }

  for (const agent of resources.agents) {
    await copyResourceTree({
      from: join(repoRoot, "agents", agent),
      to: join(pluginRoot, "agents", basename(agent)),
    });
  }

  for (const hook of resources.hooks) {
    await copyResourceTree({
      from: join(repoRoot, "hooks", hook),
      to: join(pluginRoot, "hooks", stripLeadingGroup(hook, plugin.name)),
    });
  }

  for (const template of resources.templates) {
    await copyResourceTree({
      from: join(repoRoot, "templates", template),
      to: join(pluginRoot, "templates", stripLeadingGroup(template, plugin.name)),
    });
  }

  for (const extra of resources.extra) {
    const mapping = typeof extra === "string" ? { from: extra, to: extra } : extra;
    await copyResourceTree({
      from: join(repoRoot, mapping.from),
      to: join(pluginRoot, mapping.to),
    });
  }

  await ensureDir(dirname(join(pluginRoot, ".generated")));
}

function normalizeResources(resources = {}) {
  return {
    skills: resources.skills ?? [],
    commands: resources.commands ?? [],
    agents: resources.agents ?? [],
    hooks: resources.hooks ?? [],
    templates: resources.templates ?? [],
    extra: resources.extra ?? [],
  };
}

function stripLeadingGroup(path, group) {
  const prefix = `${group}/`;
  return path.startsWith(prefix) ? path.slice(prefix.length) : path;
}
