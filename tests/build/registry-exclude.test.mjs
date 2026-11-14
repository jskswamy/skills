import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { withTempBuild } from "../../scripts/lib/adapters/index.mjs";
import { applyExclude, loadPluginModel } from "../../scripts/lib/model.mjs";
import { loadRegistry, validateRegistryResources } from "../../scripts/lib/registry.mjs";

const repoRoot = process.cwd();
const SCANNER = "agents/refactor/scanner.md";

// The real registry with refactor's scanner excluded on OpenCode only.
async function registryWithExclude(exclude = { [SCANNER]: "test reason" }) {
  const registry = await loadRegistry(join(repoRoot, "registry.json"));
  const refactor = registry.plugins.find((p) => p.name === "refactor");
  refactor.harnesses.opencode = { ...refactor.harnesses.opencode, exclude };
  return { registry, refactor };
}

const filesUnder = async (dir) => (existsSync(dir) ? (await readdir(dir, { recursive: true })).map(String) : []);

test("applyExclude drops excluded agents for that harness only", async () => {
  const { refactor } = await registryWithExclude();
  const model = await loadPluginModel({ repoRoot, plugin: refactor });
  const opencode = applyExclude(model, refactor, "opencode");
  assert.ok(!opencode.model.agents.some((a) => a.path === SCANNER));
  assert.deepEqual(opencode.excluded, [{ path: SCANNER, reason: "test reason" }]);
  assert.equal(opencode.model.agents.length, model.agents.length - 1);
  const claude = applyExclude(model, refactor, "claude-code");
  assert.equal(claude.model, model, "no exclude means the same model");
  assert.deepEqual(claude.excluded, []);
});

test("an excluded agent is missing from that harness's output only, and reported", async () => {
  const { registry } = await registryWithExclude();
  await withTempBuild({ repoRoot, registry }, async ({ outRoot, report }) => {
    const opencode = join(outRoot, "dist/opencode/plugins/refactor");
    const files = await filesUnder(opencode);
    assert.ok(!files.some((f) => /scanner\.md$/.test(f)), `opencode still ships the scanner: ${files.filter((f) => /scanner/.test(f))}`);
    const resources = JSON.parse(await readFile(join(opencode, "resources.json"), "utf8"));
    assert.ok(!resources.agents.some((a) => /scanner/.test(a.id ?? a.name)));
    assert.ok(existsSync(join(outRoot, "dist/claude-code/plugins/refactor/agents/scanner.md")), "claude-code keeps it");
    assert.ok(existsSync(join(outRoot, "dist/omp/plugins/refactor/agents/scanner.md")), "omp keeps it");

    const entry = report.entries.find((e) => e.plugin === "refactor" && e.harness === "opencode" && e.resource === SCANNER);
    assert.deepEqual({ kind: entry?.kind, status: entry?.status, reason: entry?.reason }, { kind: "agents", status: "excluded", reason: "test reason" });
    assert.equal(report.errors().length, 0);
  });
});

test("validation rejects an exclude path the plugin does not list, or a missing reason", async () => {
  const bad = async (exclude) => {
    const { registry } = await registryWithExclude(exclude);
    return (await validateRegistryResources({ repoRoot, registry })).filter((e) => /exclude/.test(e));
  };
  assert.deepEqual(await bad({ [SCANNER]: "fine" }), []);
  assert.equal((await bad({ "agents/refactor/missing.md": "x" })).length, 1);
  assert.equal((await bad({ "agents/jot/content-extractor.md": "another plugin's agent" })).length, 1);
  assert.equal((await bad({ [SCANNER]: "" })).length, 1);
  assert.equal((await bad({ [SCANNER]: 3 })).length, 1);
  assert.equal((await bad(["agents/refactor/scanner.md"])).length, 1, "must be a map");
});
