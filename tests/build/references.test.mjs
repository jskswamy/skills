import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { loadRegistry } from "../../scripts/lib/registry.mjs";
import { referencePairs } from "../../scripts/lib/transforms/names.mjs";

// Every `plugin:skill` or `/plugin:skill` written in a skill, agent, hook, template or eval must
// name a skill or agent that exists in that plugin (agents by file stem; a shared name is the skill).
// A token followed by `/` is a path such as jot:inbox/..., not a reference.
const TOKEN = /(?<![A-Za-z0-9_.\-/:])\/?([a-z0-9]+(?:-[a-z0-9]+)*):([a-z0-9]+(?:-[a-z0-9]+)*)(?![A-Za-z0-9_/-])/g;

test("every plugin:skill reference names a skill or agent that exists", async () => {
  const registry = await loadRegistry("registry.json");
  const pairs = referencePairs(registry);
  const plugins = new Set(registry.plugins.map((plugin) => plugin.name));
  const files = execFileSync("git", ["ls-files", "-co", "--exclude-standard"], { encoding: "utf8" })
    .split("\n")
    .filter((file) => /^(skills|agents|hooks|templates|evals)\//.test(file) && !file.includes("/tests/") && !file.startsWith("templates/commit-tools/docs/"));
  const dangling = [];
  for (const file of files) {
    const text = await readFile(file, "utf8").catch(() => undefined);
    if (text === undefined) continue;
    for (const [, plugin, name] of text.matchAll(TOKEN)) {
      if (plugins.has(plugin) && !pairs.has(`${plugin}:${name}`)) dangling.push(`${file}: ${plugin}:${name}`);
    }
  }
  assert.deepEqual(dangling, []);
});
