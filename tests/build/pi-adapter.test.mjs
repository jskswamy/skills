import test from "node:test";
import assert from "node:assert/strict";
import { access, mkdtemp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import * as pi from "../../harnesses/pi/adapter.mjs";
import { runAdapters } from "../../scripts/lib/adapters/index.mjs";

async function write(path, content) {
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, content);
}

const HOOKS = {
  hooks: {
    SessionStart: [{ hooks: [{ type: "command", command: "bash ${CLAUDE_PLUGIN_ROOT}/hooks/reminder.sh" }] }],
    SubagentStart: [{ hooks: [{ type: "command", command: "bash ${CLAUDE_PLUGIN_ROOT}/hooks/sub.sh" }] }],
    PreToolUse: [
      { matcher: "Bash|mcp__.*git.*commit", hooks: [{ type: "command", command: "bash ${CLAUDE_PLUGIN_ROOT}/hooks/scripts/guard.sh", timeout: 5 }] },
      { matcher: "NotebookEdit", hooks: [{ type: "command", command: "bash ${CLAUDE_PLUGIN_ROOT}/hooks/scripts/nb.sh" }] },
    ],
  },
};

function plugin(name, overrides = {}) {
  return {
    name,
    version: "1.0.0",
    description: `${name} plugin`,
    resources: { skills: [`${name}-skill`], commands: [`${name}/setup.md`], agents: [], hooks: [], templates: [], extra: [] },
    harnesses: { pi: { enabled: true } },
    ...overrides,
  };
}

async function fixture(plugins, { outRoot } = {}) {
  const repoRoot = await mkdtemp(join(tmpdir(), "pi-adapter-"));
  await write(join(repoRoot, "package.json"), JSON.stringify({ name: "pkg", scripts: { build: "x" }, pi: { old: true } }));
  for (const name of ["one", "two", "off"]) {
    await write(join(repoRoot, `skills/${name}-skill/SKILL.md`), `---\nname: ${name}-skill\ndescription: Use when ${name}.\n---\n`);
    await write(join(repoRoot, `commands/${name}/setup.md`), `---\nname: setup\ndescription: Set up ${name}\nargument-hint: "<dir>"\nallowed-tools: Bash\n---\n\nInvoke the \`${name}-skill\` skill.\n`);
  }
  await write(join(repoRoot, "commands/one/run.md"), "---\ndescription: Run with $1\n---\n\nRun $1 now.\n");
  await write(join(repoRoot, "agents/one/helper.md"), "---\nname: helper\ndescription: Helps\n---\n");
  await write(join(repoRoot, "hooks/one/hooks.json"), JSON.stringify(HOOKS));
  await write(join(repoRoot, "hooks/one/reminder.sh"), "echo 'remember'\n");
  await write(join(repoRoot, "hooks/one/sub.sh"), "exit 0\n");
  await write(join(repoRoot, "hooks/one/scripts/guard.sh"), "grep -q 'git commit' && { echo 'use /commit' >&2; exit 2; }\nexit 0\n");
  await write(join(repoRoot, "hooks/one/scripts/nb.sh"), "exit 0\n");
  const registry = { marketplace: { name: "mp", description: "d" }, plugins };
  outRoot ??= repoRoot;
  return { repoRoot, outRoot, run: () => runAdapters({ repoRoot, outRoot, registry, adapters: [pi] }) };
}

const ONE = plugin("one", {
  resources: {
    skills: ["one-skill"],
    commands: ["one/setup.md", "one/run.md"],
    agents: ["one/helper.md"],
    hooks: ["one/hooks.json", "one/reminder.sh", "one/sub.sh", "one/scripts"],
    templates: [],
    extra: [],
  },
});

test("commands become prompt templates, prefixed only where names collide", async () => {
  const { repoRoot, run } = await fixture([ONE, plugin("two")]);
  await run();
  assert.deepEqual((await readdir(join(repoRoot, "dist/pi/prompts"))).sort(), ["one-setup.md", "run.md", "two-setup.md"]);
  assert.equal(
    await readFile(join(repoRoot, "dist/pi/prompts/one-setup.md"), "utf8"),
    '---\ndescription: Set up one\nargument-hint: <dir>\n---\n\nInvoke the `one-skill` skill.\n\nArguments: $ARGUMENTS\n',
  );
  assert.equal(await readFile(join(repoRoot, "dist/pi/prompts/run.md"), "utf8"), "---\ndescription: Run with $1\n---\n\nRun $1 now.\n");
});

test("hooks go to one manifest with canonical script paths, and the policy applies", async () => {
  const { repoRoot, run } = await fixture([ONE]);
  const report = await run();
  const { entries } = JSON.parse(await readFile(join(repoRoot, "dist/pi/hooks.manifest.json"), "utf8"));
  assert.deepEqual(entries, [
    { plugin: "one", id: "session-start:reminder", event: "session-start", command: 'bash "${PI_PACKAGE_ROOT}"/hooks/one/reminder.sh' },
    {
      plugin: "one",
      id: "pre-tool:guard",
      event: "pre-tool",
      matcher: "Bash|mcp__.*git.*commit",
      command: 'bash "${PI_PACKAGE_ROOT}"/hooks/one/scripts/guard.sh',
      timeoutMs: 5000,
    },
  ]);
  assert.deepEqual(
    report.entries.map(({ kind, resource, status }) => `${kind} ${resource} ${status}`),
    ["agents helper degraded", "hooks subagent-start:sub not-applicable", "hooks pre-tool:nb error"],
  );
});

test("an optional marker downgrades an uncarried hook to a report entry", async () => {
  const optional = { ...ONE, harnesses: { pi: { enabled: true, optional: { "pre-tool:nb": "notebooks are Claude-only" } } } };
  const { run } = await fixture([optional]);
  const report = await run();
  assert.deepEqual(report.errors(), []);
  assert.match(report.lines().join("\n"), /pre-tool:nb: skipped .*notebooks are Claude-only/);
});

test("the build leaves package.json alone; its pi block is hand-written", async () => {
  const { repoRoot, run } = await fixture([plugin("one")]);
  await run();
  assert.deepEqual(JSON.parse(await readFile(join(repoRoot, "package.json"), "utf8")).pi, { old: true });
});

test("dist/pi mirrors the canonical layout for Pi plugins only", async () => {
  const { repoRoot, run } = await fixture([ONE, plugin("two"), plugin("off", { harnesses: {} })]);
  await run();
  const dist = join(repoRoot, "dist/pi");
  await access(join(dist, "skills/one-skill/SKILL.md"));
  await access(join(dist, "skills/two-skill/SKILL.md"));
  await access(join(dist, "hooks/one/scripts/guard.sh"));
  await access(join(dist, "runtime/pi/runtime.mjs"));
  await access(join(dist, "runtime/lib/hook-runner.mjs"));
  await assert.rejects(access(join(dist, "skills/off-skill")), "a plugin without Pi does not ship to Pi");
  await assert.rejects(access(join(dist, "commands")), "commands ship as prompts only");
});

test("dist/pi is a Pi package of its own", async () => {
  const { repoRoot, run } = await fixture([ONE]);
  await run();
  const pkg = JSON.parse(await readFile(join(repoRoot, "dist/pi/package.json"), "utf8"));
  assert.equal(pkg.name, "pkg-pi");
  assert.ok(pkg.keywords.includes("pi-package"));
  assert.deepEqual(pkg.pi, { skills: ["./skills"], prompts: ["./prompts"], extensions: ["./runtime/pi/runtime.mjs"] });
});

test("dist/pi is self-contained, even under a path with spaces", async (t) => {
  const outRoot = await mkdtemp(join(tmpdir(), "pi out "));
  t.after(() => rm(outRoot, { recursive: true, force: true }));
  const { run } = await fixture([ONE], { outRoot });
  await run();
  const dist = join(outRoot, "dist/pi");
  const { entries } = JSON.parse(await readFile(join(dist, "hooks.manifest.json"), "utf8"));
  assert.ok(entries.length > 0);
  for (const { command } of entries) {
    assert.doesNotMatch(command, /\.\./);
    const paths = [...command.matchAll(/"\$\{PI_PACKAGE_ROOT\}"\/(\S+)/g)].map((m) => m[1]);
    assert.ok(paths.length > 0, command);
    for (const path of paths) await access(join(dist, path));
  }
});

test("the copied runtime still blocks a commit with the sources removed", async (t) => {
  const outRoot = await mkdtemp(join(tmpdir(), "pi out "));
  t.after(() => rm(outRoot, { recursive: true, force: true }));
  const { repoRoot, run } = await fixture([ONE], { outRoot });
  await run();
  await rm(join(repoRoot, "skills"), { recursive: true });
  await rm(join(repoRoot, "hooks"), { recursive: true });
  const runtime = await import(pathToFileURL(join(outRoot, "dist/pi/runtime/pi/runtime.mjs")).href);
  const events = new Map();
  runtime.createRuntime({ entries: runtime.loadManifest(), log: () => {} })({ on: (name, handler) => events.set(name, handler), sendMessage: () => {} });
  const result = await events.get("tool_call")({ toolName: "bash", toolCallId: "1", input: { command: "git commit -m x" } }, { cwd: outRoot });
  assert.deepEqual(result, { block: true, reason: "use /commit" });
});

test("validate checks the paths dist/pi/package.json names", async () => {
  const { repoRoot, run } = await fixture([ONE]);
  await run();
  assert.deepEqual(await pi.validate({ repoRoot, outRoot: repoRoot, plugin: ONE }), []);
  const path = join(repoRoot, "dist/pi/package.json");
  const pkg = JSON.parse(await readFile(path, "utf8"));
  await writeFile(path, JSON.stringify({ ...pkg, pi: { ...pkg.pi, skills: ["./nope"] } }));
  assert.match((await pi.validate({ repoRoot, outRoot: repoRoot, plugin: ONE })).join("\n"), /dist\/pi: pi\.skills path does not exist: \.\/nope/);
});
