import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { loadRegistry } from "../../scripts/lib/registry.mjs";
import { derivedId } from "../../scripts/lib/transforms/names.mjs";

// A one-release guard for the v3 renames (MIGRATION-v3.md): no file outside the records below may
// still name an old skill. Remove it in the release after v3.
const EXCLUDED = [
  "CHANGELOG.md",
  "MIGRATION-v2.md",
  "MIGRATION-v3.md",
  "docs/specs/",
  "docs/superpowers/",
  "docs/harness-research.md",
  "harness_dictionary.md",
  "templates/commit-tools/docs/",
  "tests/build/removed-skills.test.mjs",
  "tests/build/old-names.test.mjs",
  "dist/",
  ".claude-plugin/",
  ".agents/",
  ".beads/",
  ".skillshare/logs/",
];
const PLUGIN_NAMED = new Set(["bivouac", "devenv", "sketch-note"]);

async function renamed() {
  const text = await readFile("MIGRATION-v3.md", "utf8");
  const table = text.split("## Renamed skills")[1].split("\n## ")[0];
  return [...table.matchAll(/^\| `([^`]+)` \| `skills\/([^`]+)` \| `([^`]+)` \|$/gm)].map(([, old, path, plugin]) => ({ old, plugin, skill: path.split("/")[1] }));
}

test("no tracked file names a skill by its pre-v3 name", async () => {
  const rows = await renamed();
  assert.equal(rows.length, 26);
  const registry = await loadRegistry("registry.json");
  const taken = new Set();
  for (const plugin of registry.plugins) {
    taken.add(plugin.name);
    for (const entry of plugin.resources.skills) {
      const skill = entry.split("/").at(-1);
      taken.add(skill);
      taken.add(derivedId(plugin.name, skill));
    }
  }
  const files = execFileSync("git", ["ls-files", "-co", "--exclude-standard"], { encoding: "utf8" })
    .split("\n")
    .filter((file) => file && !EXCLUDED.some((prefix) => file === prefix || file.startsWith(prefix)) && !/\.(png|svg|jpe?g)$/.test(file) && !file.endsWith("_report.md"));

  const hits = [];
  for (const file of files) {
    const text = await readFile(file, "utf8").catch(() => undefined);
    if (text === undefined) continue;
    for (const { old, plugin } of rows) {
      const forms = PLUGIN_NAMED.has(old)
        ? [`skills/${old}/SKILL.md`, `${plugin}:${old}`]
        : [`skills/${old}`, `codex-skills/${old}`, `${plugin}:${old}`];
      const found = forms.filter((form) => new RegExp(`(?<![\\w-])${escape(form)}(?![\\w-])`).test(text));
      // a bare old name that is not also a new name, id or plugin name can only mean the old skill
      if (!PLUGIN_NAMED.has(old) && !taken.has(old) && new RegExp(`(?<![\\w./:-])${escape(old)}(?![\\w-]|\\.\\w)`).test(text)) found.push(old);
      for (const form of found) hits.push(`${file}: ${form}`);
    }
  }
  assert.deepEqual(hits, []);
});

function escape(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
