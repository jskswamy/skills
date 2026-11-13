import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { isEnabled, withTempBuild } from "../../scripts/lib/adapters/index.mjs";
import { listingSize } from "../../scripts/listing-size.mjs";
import { loadPluginModel } from "../../scripts/lib/model.mjs";
import { loadRegistry } from "../../scripts/lib/registry.mjs";

// Harnesses that list plugin agents to the model, and those that honor disable-model-invocation.
const LISTS_AGENTS = new Set(["claude-code", "antigravity", "omp", "opencode"]);
const HIDES = new Set(["claude-code", "antigravity", "omp", "opencode", "pi", "codex"]);

test("listingSize counts what each harness lists, matching the registry (drift guard)", async () => {
  const repoRoot = process.cwd();
  const registry = await loadRegistry(join(repoRoot, "registry.json"));
  await withTempBuild({ repoRoot, registry }, async ({ outRoot }) => {
    const sizes = await listingSize(outRoot);
    assert.deepEqual(Object.keys(sizes).sort(), ["agent-plugins", "antigravity", "claude-code", "codex", "omp", "opencode", "pi"]);
    for (const [harness, { chars, skills, agents }] of Object.entries(sizes)) {
      let wantSkills = 0;
      let wantAgents = 0;
      for (const plugin of registry.plugins.filter((p) => isEnabled(p, harness))) {
        const model = await loadPluginModel({ repoRoot, plugin });
        wantSkills += model.skills.filter((s) => !(s.hidden && HIDES.has(harness))).length;
        if (LISTS_AGENTS.has(harness)) wantAgents += model.agents.length;
      }
      assert.equal(skills, wantSkills, `${harness} skills`);
      assert.equal(agents, wantAgents, `${harness} agents`);
      assert.ok(chars > 0, `${harness} chars`);
    }
    // agent-plugins cannot hide, so it lists more than Pi, which has the same skills and no agents
    assert.ok(sizes["agent-plugins"].chars > sizes.pi.chars);
  });
});
