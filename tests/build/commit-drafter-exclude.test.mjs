import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { isEnabled, withTempBuild } from "../../scripts/lib/adapters/index.mjs";
import { loadRegistry } from "../../scripts/lib/registry.mjs";

// The relay drafter runs read-only only where tool limits hold and sub-agents resume: Claude Code.
test("the commit drafter ships on Claude Code only", async () => {
  const repoRoot = process.cwd();
  const registry = await loadRegistry(join(repoRoot, "registry.json"));
  const commitTools = registry.plugins.find((p) => p.name === "commit-tools");
  await withTempBuild({ repoRoot, registry }, async ({ outRoot }) => {
    const harnesses = (await readdir(join(outRoot, "dist"))).filter((h) => isEnabled(commitTools, h));
    assert.ok(harnesses.length >= 7, `expected every harness, got ${harnesses}`);
    for (const harness of harnesses) {
      const dir = join(outRoot, "dist", harness, "plugins", "commit-tools");
      const files = existsSync(dir) ? (await readdir(dir, { recursive: true })).map(String) : [];
      const ships = files.some((f) => /commit-drafter/.test(f));
      assert.equal(ships, harness === "claude-code", `${harness} ships commit-drafter: ${ships}`);
    }
  });
});
