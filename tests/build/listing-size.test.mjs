import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isEnabled, withTempBuild } from "../../scripts/lib/adapters/index.mjs";
import { listingSize, skillSizeErrors } from "../../scripts/listing-size.mjs";
import { applyExclude, loadPluginModel } from "../../scripts/lib/model.mjs";
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
        const { model } = applyExclude(await loadPluginModel({ repoRoot, plugin }), plugin, harness);
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

test("skillSizeErrors flags a generated SKILL.md over 8,000 bytes on any harness", async () => {
  const outRoot = await mkdtemp(join(tmpdir(), "skill-size-"));
  try {
    const put = async (rel, bytes) => {
      await mkdir(join(outRoot, rel, ".."), { recursive: true });
      await writeFile(join(outRoot, rel), "x".repeat(bytes));
    };
    await put("dist/codex/plugins/p/codex-skills/big/SKILL.md", 8001);
    await put("dist/pi/plugins/p/skills/edge/SKILL.md", 8000);
    await put("dist/pi/plugins/p/skills/big/references/long.md", 20000);
    assert.deepEqual(await skillSizeErrors(outRoot), ["codex p:big: SKILL.md is 8001 bytes (max 8000)"]);
  } finally {
    await rm(outRoot, { recursive: true, force: true });
  }
});
