import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { parseFrontmatter } from "./skills.mjs";

// One plugin's resources, resolved against the canonical root directories.
// Paths are repo-relative so adapters can join them onto repoRoot.
export async function loadPluginModel({ repoRoot, plugin }) {
  const resources = plugin.resources ?? {};
  const markdown = async (base, entry) => {
    const path = `${base}/${entry}`;
    const model = { name: basename(entry, ".md"), path };
    if (entry.endsWith(".md")) model.frontmatter = parseFrontmatter(await readFile(join(repoRoot, path), "utf8")) ?? {};
    return model;
  };

  return {
    name: plugin.name,
    version: plugin.version,
    description: plugin.description,
    author: plugin.author,
    category: plugin.category,
    tags: plugin.tags ?? [],
    harnesses: plugin.harnesses ?? {},
    skills: await Promise.all(
      (resources.skills ?? []).map(async (name) => ({
        name,
        path: `skills/${name}`,
        frontmatter: parseFrontmatter(await readFile(join(repoRoot, "skills", name, "SKILL.md"), "utf8")) ?? {},
      })),
    ),
    commands: await Promise.all((resources.commands ?? []).map((entry) => markdown("commands", entry))),
    agents: await Promise.all((resources.agents ?? []).map((entry) => markdown("agents", entry))),
    hooks: (resources.hooks ?? []).map((entry) => ({ path: `hooks/${entry}` })),
    templates: (resources.templates ?? []).map((entry) => ({ path: `templates/${entry}` })),
    extra: (resources.extra ?? []).map((extra) => (typeof extra === "string" ? { from: extra, to: extra } : extra)),
  };
}
