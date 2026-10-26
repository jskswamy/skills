import test from "node:test";
import assert from "node:assert/strict";
import { access, mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ADAPTERS, enabledAdapters, runAdapters, validateHarnessIds, withTempBuild } from "../../scripts/lib/adapters/index.mjs";
import { loadPluginModel } from "../../scripts/lib/model.mjs";

async function write(path, content) {
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, content);
}

function plugin(overrides = {}) {
  return {
    name: "codebase",
    version: "0.1.0",
    description: "Codebase plugin",
    author: { name: "Owner" },
    category: "code-intelligence",
    tags: ["codebase"],
    resources: {
      skills: ["codebase-explore"],
      commands: ["codebase/ask.md"],
      agents: ["codebase/explorer.md"],
      hooks: ["codebase/hooks.json"],
      templates: [],
      extra: [],
    },
    harnesses: { "claude-code": { enabled: true }, pi: { enabled: true } },
    ...overrides,
  };
}

function registry(plugins) {
  return {
    marketplace: { name: "mp", description: "Marketplace", owner: { name: "Owner" } },
    plugins,
  };
}

async function fixtureRepo() {
  const repoRoot = await mkdtemp(join(tmpdir(), "adapters-"));
  await write(
    join(repoRoot, "skills/codebase-explore/SKILL.md"),
    "---\nname: codebase-explore\ndescription: Use when exploring.\n---\n\n# Explore\n",
  );
  await write(join(repoRoot, "commands/codebase/ask.md"), "---\ndescription: Ask a question\n---\n\nAsk.\n");
  await write(join(repoRoot, "agents/codebase/explorer.md"), "---\nname: explorer\ndescription: Explores\n---\n\nBody\n");
  await write(join(repoRoot, "hooks/codebase/hooks.json"), "{\"hooks\":{}}\n");
  return repoRoot;
}

test("every adapter implements the interface", () => {
  assert.ok(ADAPTERS.length > 0);
  for (const adapter of ADAPTERS) {
    assert.equal(typeof adapter.id, "string", "id");
    for (const kind of ["skills", "commands", "agents", "hooks"]) {
      assert.ok(adapter.capabilities?.[kind]?.mode, `${adapter.id} capabilities.${kind}.mode`);
    }
    assert.equal(typeof adapter.generate, "function", `${adapter.id} generate`);
    assert.equal(typeof adapter.validate, "function", `${adapter.id} validate`);
  }
  assert.deepEqual(
    ADAPTERS.map((a) => a.id).filter((id) => ["claude-code", "pi"].includes(id)).sort(),
    ["claude-code", "pi"],
  );
});

test("validateHarnessIds rejects harness ids with no adapter", () => {
  const errors = validateHarnessIds(
    registry([plugin({ harnesses: { "claude-code": { enabled: true }, "open-code": { enabled: true } } })]),
  );
  assert.deepEqual(errors, ["codebase.harnesses.open-code has no adapter"]);
  assert.deepEqual(validateHarnessIds(registry([plugin()])), []);
});

test("claude-code is on unless disabled; other harnesses only when enabled", () => {
  const ids = (harnesses) => enabledAdapters(plugin({ harnesses })).map((a) => a.id);
  assert.deepEqual(ids(undefined), ["claude-code"]);
  assert.deepEqual(ids({ pi: {} }), ["claude-code"]);
  assert.deepEqual(ids({ "claude-code": { enabled: false }, pi: { enabled: true } }), ["pi"]);
  assert.deepEqual(ids({ pi: { enabled: true } }), ["claude-code", "pi"]);
});

test("loadPluginModel reads resources and their frontmatter", async () => {
  const repoRoot = await fixtureRepo();
  const model = await loadPluginModel({ repoRoot, plugin: plugin() });

  assert.equal(model.name, "codebase");
  assert.deepEqual(model.skills, [
    {
      name: "codebase-explore",
      path: "skills/codebase-explore",
      frontmatter: { name: "codebase-explore", description: "Use when exploring." },
    },
  ]);
  assert.deepEqual(model.commands, [
    { name: "ask", path: "commands/codebase/ask.md", frontmatter: { description: "Ask a question" } },
  ]);
  assert.equal(model.agents[0].name, "explorer");
  assert.equal(model.agents[0].frontmatter.description, "Explores");
  assert.deepEqual(model.hooks, [{ path: "hooks/codebase/hooks.json" }]);
  assert.deepEqual(model.extra, []);
});

test("runAdapters runs enabled adapters and returns a per-plugin report", async () => {
  const repoRoot = await fixtureRepo();
  const calls = [];
  const fake = (id, entry) => ({
    id,
    capabilities: {},
    generateRoot: async ({ plugins }) => calls.push(`${id}:root:${plugins.map((p) => p.name).join(",")}`),
    generate: async ({ model, report }) => {
      calls.push(`${id}:${model.name}`);
      if (entry) report.add(entry);
    },
    validate: async () => [],
  });
  const adapters = [
    fake("claude-code"),
    fake("pi", { kind: "agents", resource: "explorer", status: "degraded", reason: "no sub-agents" }),
  ];
  const off = plugin({ name: "other", harnesses: { "claude-code": { enabled: false } } });

  const report = await runAdapters({ repoRoot, registry: registry([plugin(), off]), adapters });

  assert.deepEqual(calls, ["claude-code:root:codebase", "claude-code:codebase", "pi:root:codebase", "pi:codebase"]);
  assert.deepEqual(report.entries, [
    {
      plugin: "codebase",
      harness: "pi",
      kind: "agents",
      resource: "explorer",
      status: "degraded",
      reason: "no sub-agents",
    },
  ]);
  assert.deepEqual(report.errors(), []);
  assert.deepEqual(report.lines(), [
    "codebase: claude-code ok; pi 1 note",
    "  pi agents explorer: degraded (no sub-agents)",
    "other: no harness enabled",
  ]);
});

test("claude-code adapter writes the marketplace and plugin wrapper", async () => {
  const repoRoot = await fixtureRepo();
  await runAdapters({
    repoRoot,
    registry: registry([plugin()]),
    adapters: ADAPTERS.filter((a) => a.id === "claude-code"),
  });
  const marketplace = JSON.parse(await readFile(join(repoRoot, ".claude-plugin/marketplace.json"), "utf8"));
  assert.equal(marketplace.plugins[0].source, "./dist/claude-code/codebase");
  assert.equal(
    await readFile(join(repoRoot, "dist/claude-code/codebase/agents/explorer.md"), "utf8"),
    await readFile(join(repoRoot, "agents/codebase/explorer.md"), "utf8"),
  );
});

test("report errors collect entries a harness cannot carry", async () => {
  const repoRoot = await fixtureRepo();
  const failing = {
    id: "pi",
    capabilities: {},
    generate: async ({ report }) => report.add({ kind: "hooks", resource: "stop:check", status: "error", reason: "cannot block" }),
    validate: async () => [],
  };
  const report = await runAdapters({ repoRoot, registry: registry([plugin()]), adapters: [failing] });
  assert.deepEqual(report.errors().map((e) => `${e.plugin} ${e.harness} ${e.resource}`), ["codebase pi stop:check"]);
});

test("withTempBuild builds into a temp dir, hands it over, then removes it", async () => {
  const repoRoot = await fixtureRepo();
  let seen;
  const result = await withTempBuild(
    { repoRoot, registry: registry([plugin()]), adapters: ADAPTERS.filter((a) => a.id === "claude-code") },
    async ({ outRoot, report }) => {
      seen = outRoot;
      assert.notEqual(outRoot, repoRoot);
      await access(join(outRoot, "dist/claude-code/codebase/.claude-plugin/plugin.json"));
      assert.deepEqual(report.errors(), []);
      return "used";
    },
  );
  assert.equal(result, "used");
  await assert.rejects(access(seen), "the temp dir is removed afterwards");
});
