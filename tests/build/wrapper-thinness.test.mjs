import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import * as opencode from "../../harnesses/opencode/adapter.mjs";
import * as pi from "../../harnesses/pi/adapter.mjs";
import { withTempBuild } from "../../scripts/lib/adapters/index.mjs";
import { loadRegistry } from "../../scripts/lib/registry.mjs";
import { loadPluginModel } from "../../scripts/lib/model.mjs";
import { derivedId } from "../../scripts/lib/transforms/names.mjs";

test("Pi prompts and OpenCode commands are thin wrappers over runnable skills", async () => {
  const repoRoot = process.cwd();
  const registry = await loadRegistry(join(repoRoot, "registry.json"));
  // every plugin on, so each harness builds all of them
  const all = {
    ...registry,
    plugins: registry.plugins.map((p) => ({ ...p, harnesses: { ...p.harnesses, pi: { enabled: true }, opencode: { enabled: true } } })),
  };
  const expected = [];
  for (const plugin of all.plugins) {
    const model = await loadPluginModel({ repoRoot, plugin });
    for (const skill of model.skills.filter((s) => s.userInvocable)) expected.push([plugin.name, derivedId(plugin.name, skill.name), skill.hidden]);
  }
  assert.ok(expected.length > 0);

  await withTempBuild({ repoRoot, registry: all, adapters: [pi, opencode] }, async ({ outRoot }) => {
    // Pi has no prompt for a hidden skill (users run /skill:<id>); OpenCode keeps its command.
    const wrappers = [
      ["dist/pi/plugins", "prompts", false],
      ["dist/opencode/plugins", "runtime/opencode/commands", true],
    ];
    for (const [base, sub, wrapsHidden] of wrappers) {
      const found = [];
      for (const [plugin, id, hidden] of expected) {
        if (hidden && !wrapsHidden) continue;
        const path = join(outRoot, base, plugin, sub, `${id}.md`);
        const content = await readFile(path, "utf8");
        found.push(`${plugin}/${id}`);
        assert.match(content, new RegExp(`\\b${id}\\b`), `${path} names ${id}`);
        assert.match(content, /Forward all arguments/i, `${path} forwards arguments`);
        assert.ok(content.includes("$ARGUMENTS"), `${path} has the $ARGUMENTS placeholder`);
        const body = content.replace(/^---[\s\S]*?---\s*/, "");
        assert.ok(body.split("\n").filter((l) => l.trim()).length <= 5, `${path} should be a thin wrapper`);
      }
      // no wrapper exists for a skill that is not runnable
      const onDisk = new Set();
      for (const [plugin] of expected) {
        for (const f of await readdir(join(outRoot, base, plugin, sub)).catch(() => [])) onDisk.add(`${plugin}/${f.slice(0, -3)}`);
      }
      assert.deepEqual([...onDisk].sort(), found.sort(), `${base} has exactly the runnable skills' wrappers`);
    }
  });
});
