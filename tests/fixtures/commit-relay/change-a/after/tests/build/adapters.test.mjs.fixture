import test from "node:test";
import assert from "node:assert/strict";
import { access, mkdtemp, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ADAPTERS, enabledAdapters, runAdapters, validateHarnessIds, withTempBuild } from "../../scripts/lib/adapters/index.mjs";
import { MARKETPLACES } from "../../scripts/changed-plugins.mjs";
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
      skills: ["codebase/explore"],
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
    join(repoRoot, "skills/codebase/explore/SKILL.md"),
    "---\nname: codebase-explore\ndescription: Use when exploring.\n---\n\n# Explore\n",
  );
  await write(join(repoRoot, "agents/codebase/explorer.md"), "---\nname: explorer\ndescription: Explores\n---\n\nBody\n");
  await write(join(repoRoot, "hooks/codebase/hooks.json"), "{\"hooks\":{}}\n");
  return repoRoot;
}

test("every adapter implements the interface", () => {
  assert.ok(ADAPTERS.length > 0);
  for (const adapter of ADAPTERS) {
    assert.equal(typeof adapter.id, "string", "id");
    for (const kind of ["skills", "agents", "hooks"]) {
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
  assert.equal(model.skills.length, 1);
  assert.deepEqual(
    { ...model.skills[0], pickerLine: undefined },
    {
      name: "explore",
      plugin: "codebase",
      path: "skills/codebase/explore",
      frontmatter: { name: "codebase-explore", description: "Use when exploring." },
      userInvocable: true,
      pickerLine: undefined,
    },
  );
  assert.equal(model.commands, undefined);
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
  assert.equal(marketplace.plugins[0].source, "./dist/claude-code/plugins/codebase");
  assert.equal(
    await readFile(join(repoRoot, "dist/claude-code/plugins/codebase/agents/explorer.md"), "utf8"),
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
      await access(join(outRoot, "dist/claude-code/plugins/codebase/.claude-plugin/plugin.json"));
      assert.deepEqual(report.errors(), []);
      return "used";
    },
  );
  assert.equal(result, "used");
  await assert.rejects(access(seen), "the temp dir is removed afterwards");
});

test("all adapters co-exist in dist/<harness>/plugins/<plugin> without manifest or skill collisions", async () => {
  const repoRoot = await fixtureRepo();
  await write(
    join(repoRoot, "hooks/codebase/hooks.json"),
    JSON.stringify({ hooks: { SessionStart: [{ hooks: [{ type: "command", command: "bash ${CLAUDE_PLUGIN_ROOT}/hooks/remind.sh" }] }] } }),
  );
  await write(join(repoRoot, "hooks/codebase/remind.sh"), "echo hi\n");
  const allEnabled = plugin({
    resources: {
      skills: ["codebase/explore"],
      agents: ["codebase/explorer.md"],
      hooks: ["codebase/hooks.json", "codebase/remind.sh"],
      templates: [],
      extra: [],
    },
    harnesses: {
      "claude-code": { enabled: true },
      antigravity: { enabled: true },
      opencode: { enabled: true },
      pi: { enabled: true },
      omp: { enabled: true },
      codex: { enabled: true },
    },
  });

  const outRoot = await mkdtemp(join(tmpdir(), "adapters-out-"));
  const report = await runAdapters({ repoRoot, outRoot, registry: registry([allEnabled]) });
  assert.deepEqual(report.errors(), []);

  // no adapter writes outside dist/<harness>/ except the root marketplace files
  const files = (await readdir(outRoot, { recursive: true, withFileTypes: true }))
    .filter((e) => e.isFile())
    .map((e) => join(e.parentPath, e.name).slice(outRoot.length + 1));
  const outside = files.filter((f) => !/^dist\/(claude-code|antigravity|opencode|pi|omp|codex)\//.test(f));
  assert.deepEqual(outside.sort(), [
    ".agents/plugins/marketplace.json",
    ".claude-plugin/marketplace.json",
    ".omp-plugin/marketplace.json",
    ".plugin/marketplace.json",
    "marketplace.json",
  ]);
  // the release must stage and compare every one of them
  const release = await readFile("skills/release/SKILL.md", "utf8");
  const releasing = await readFile("docs/releasing.md", "utf8");
  for (const catalog of outside) {
    assert.ok(MARKETPLACES.includes(catalog), `${catalog} missing from MARKETPLACES`);
    const staged = catalog.includes("/") ? catalog.split("/")[0] : catalog;
    for (const [name, text] of [["release skill", release], ["docs/releasing.md", releasing]]) {
      assert.match(text, new RegExp(`git add registry\\.json[^\\n]* ${staged.replace(".", "\\.")}( |$)`, "m"), `${staged} not staged by ${name}`);
    }
  }

  const tree = (harness) => join(outRoot, "dist", harness, "plugins/codebase");
  await access(join(tree("claude-code"), ".claude-plugin/plugin.json"));
  await access(join(tree("codex"), ".codex-plugin/plugin.json"));
  await access(join(tree("antigravity"), ".antigravity-plugin/plugin.json"));
  await access(join(tree("opencode"), ".opencode/plugins/index.js"));
  await access(join(tree("opencode"), "runtime/opencode/hooks.manifest.json"));
  await access(join(tree("pi"), "runtime/pi/hooks.manifest.json"));
  await access(join(tree("antigravity"), "runtime/antigravity/hooks.manifest.json"));
  await access(join(tree("omp"), ".omp-plugin/plugin.json"));
  await access(join(tree("omp"), "runtime/omp/hooks.manifest.json"));

  const pkg = JSON.parse(await readFile(join(tree("pi"), "package.json"), "utf8"));
  assert.equal(pkg.main, undefined, "Pi package does not carry the OpenCode entry");
  assert.deepEqual(pkg.pi.skills, ["./skills"]);
  assert.ok(pkg.keywords.includes("pi-package") && !pkg.keywords.includes("opencode-plugin"));
  const ocPkg = JSON.parse(await readFile(join(tree("opencode"), "package.json"), "utf8"));
  assert.equal(ocPkg.main, ".opencode/plugins/index.js");
  assert.ok(ocPkg.keywords.includes("opencode-plugin"));

  // one skill folder per harness, no -cmd- skills, no commands/ capability; only omp ships commands/ wrappers
  for (const harness of ["claude-code", "antigravity", "opencode", "pi", "omp"]) {
    assert.deepEqual(await readdir(join(tree(harness), "skills")), ["explore"], harness);
  }
  assert.deepEqual(await readdir(join(tree("codex"), "codex-skills")), ["explore"]);
  assert.ok(files.every((f) => !f.includes("-cmd-")));
  for (const harness of ["claude-code", "codex", "antigravity", "opencode", "pi"]) {
    await assert.rejects(access(join(tree(harness), "commands")), `${harness} has no commands/`);
  }
  assert.ok(ADAPTERS.every((a) => a.capabilities.commands === undefined));
});
