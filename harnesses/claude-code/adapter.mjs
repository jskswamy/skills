import { join } from "node:path";
import { removeDir, writeJson } from "../../scripts/lib/fs-utils.mjs";
import { copyLayout, wrapperLayout } from "../../scripts/lib/layout.mjs";

// One folder per plugin under this; changed-plugins and eval read it.
export const pluginsDir = "dist/plugins";

export const id = "claude-code";

export const capabilities = {
  skills: { mode: "native" },
  commands: { mode: "native" },
  agents: { mode: "native" },
  hooks: { mode: "native", events: ["session-start", "subagent-start", "pre-tool", "post-tool", "stop"] },
};

// The marketplace lists every plugin with claude-code enabled. Claude reads
// it only from .claude-plugin/ at the root; its sources point into dist/.
export async function generateRoot({ outRoot, registry, plugins }) {
  await removeDir(join(outRoot, "dist/claude-code"));
  await writeJson(join(outRoot, ".claude-plugin", "marketplace.json"), {
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

export async function generate({ repoRoot, outRoot, model }) {
  const pluginRoot = join(outRoot, pluginsDir, model.name);
  await writeJson(join(pluginRoot, ".claude-plugin", "plugin.json"), {
    name: model.name,
    version: model.version,
    description: model.description,
    author: model.author,
    keywords: model.tags,
  });

  await copyLayout({ repoRoot, layout: wrapperLayout(model), to: pluginRoot });
}

export async function validate() {
  return [];
}
