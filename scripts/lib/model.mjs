import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { isRunnable, parseFrontmatter, pickerLine } from "./skills.mjs";

// harnesses.<id>.exclude maps an agent path to the reason it is left out of that harness only.
// Returns the model unchanged when nothing is excluded.
export function applyExclude(model, plugin, harnessId) {
  const exclude = plugin.harnesses?.[harnessId]?.exclude ?? {};
  const excluded = model.agents.filter((agent) => agent.path in exclude).map(({ path }) => ({ path, reason: exclude[path] }));
  if (excluded.length === 0) return { model, excluded };
  return { model: { ...model, agents: model.agents.filter((agent) => !(agent.path in exclude)) }, excluded };
}

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
    // a registry skill entry is "<plugin>/<skill>"; the skill is its last segment
    skills: await Promise.all(
      (resources.skills ?? []).map(async (entry) => {
        const frontmatter = parseFrontmatter(await readFile(join(repoRoot, "skills", entry, "SKILL.md"), "utf8")) ?? {};
        return {
          name: entry.split("/").at(-1),
          plugin: plugin.name,
          path: `skills/${entry}`,
          frontmatter,
          userInvocable: isRunnable(frontmatter),
          // parseFrontmatter returns strings, so compare as one
          hidden: String(frontmatter["disable-model-invocation"]) === "true",
          pickerLine: pickerLine(frontmatter),
        };
      }),
    ),
    agents: await Promise.all((resources.agents ?? []).map((entry) => markdown("agents", entry))),
    hooks: (resources.hooks ?? []).map((entry) => ({ path: `hooks/${entry}` })),
    templates: (resources.templates ?? []).map((entry) => ({ path: `templates/${entry}` })),
    extra: (resources.extra ?? []).map((extra) => (typeof extra === "string" ? { from: extra, to: extra } : extra)),
  };
}
