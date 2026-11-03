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
    tags: [name],
    resources: { skills: [`${name}/setup`], agents: [], hooks: [], templates: [], extra: [] },
    harnesses: { pi: { enabled: true } },
    ...overrides,
  };
}

async function fixture(plugins, { outRoot } = {}) {
  const repoRoot = await mkdtemp(join(tmpdir(), "pi-adapter-"));
  for (const name of ["one", "two", "off"]) {
    await write(
      join(repoRoot, `skills/${name}/setup/SKILL.md`),
      `---\nname: setup\ndescription: Set up ${name}\nargument-hint: "<dir>"\n---\n\nSee /one:setup, (/one:setup) and one:setup but not docs/one:setup, https://x/one:setup, my-one:setup or one:setup_x.\n`,
    );
  }
  await write(join(repoRoot, "skills/one/run/SKILL.md"), "---\nname: run\ndescription: Run it\n---\n\nRun now.\n");
  await write(join(repoRoot, "skills/one/quiet/SKILL.md"), "---\nname: quiet\ndescription: Model only\nuser-invocable: false\n---\n");
  await write(join(repoRoot, "agents/one/helper.md"), "---\nname: helper\ndescription: Helps\n---\n");
  await write(join(repoRoot, "hooks/one/hooks.json"), JSON.stringify(HOOKS));
  await write(join(repoRoot, "hooks/one/reminder.sh"), "echo 'remember'\n");
  await write(join(repoRoot, "hooks/one/sub.sh"), "exit 0\n");
  await write(join(repoRoot, "hooks/one/scripts/guard.sh"), "grep -q 'git commit' && { echo 'use /one:setup' >&2; exit 2; }\nexit 0\n");
  await write(join(repoRoot, "hooks/one/scripts/nb.sh"), "exit 0\n");
  const registry = { marketplace: { name: "mp", description: "d" }, plugins };
  outRoot ??= repoRoot;
  return { repoRoot, outRoot, run: () => runAdapters({ repoRoot, outRoot, registry, adapters: [pi] }) };
}

const ONE = plugin("one", {
  resources: {
    skills: ["one/setup", "one/run", "one/quiet"],
    agents: ["one/helper.md"],
    hooks: ["one/hooks.json", "one/reminder.sh", "one/sub.sh", "one/scripts"],
    templates: [],
    extra: [],
  },
});

test("each runnable skill becomes a prompt named plugin-skill", async () => {
  const { repoRoot, run } = await fixture([ONE, plugin("two")]);
  await run();
  assert.deepEqual((await readdir(join(repoRoot, "dist/pi/plugins/one/prompts"))).sort(), ["one-run.md", "one-setup.md"]);
  assert.deepEqual((await readdir(join(repoRoot, "dist/pi/plugins/two/prompts"))).sort(), ["two-setup.md"]);
  const wrapper = "Invoke the `one-setup` skill with this command request.\nForward all arguments exactly as provided.\n\nArguments: $ARGUMENTS\n";
  assert.equal(
    await readFile(join(repoRoot, "dist/pi/plugins/one/prompts/one-setup.md"), "utf8"),
    `---\ndescription: Set up one\nargument-hint: <dir>\n---\n${wrapper}`,
  );
  const run_ = await readFile(join(repoRoot, "dist/pi/plugins/one/prompts/one-run.md"), "utf8");
  assert.doesNotMatch(run_, /argument-hint/);
  assert.match(run_, /\$ARGUMENTS/);
});

test("a model-only skill gets no Pi prompt", async () => {
  const { repoRoot, run } = await fixture([ONE]);
  await run();
  await assert.rejects(access(join(repoRoot, "dist/pi/plugins/one/prompts/one-quiet.md")));
  await access(join(repoRoot, "dist/pi/plugins/one/skills/quiet/SKILL.md"));
});

test("plugin:skill references become plugin-skill, only where they are references", async () => {
  const { repoRoot, run } = await fixture([ONE]);
  await run();
  const dist = join(repoRoot, "dist/pi/plugins/one");
  const skill = await readFile(join(dist, "skills/setup/SKILL.md"), "utf8");
  assert.match(skill, /^name: one-setup$/m);
  assert.match(skill, /See \/one-setup, \(\/one-setup\) and one-setup but not docs\/one:setup, https:\/\/x\/one:setup, my-one:setup or one:setup_x\./);
  assert.match(await readFile(join(dist, "hooks/scripts/guard.sh"), "utf8"), /use \/one-setup/);
});

test("hooks go to per-plugin manifest with wrapper script paths, and the policy applies", async () => {
  const { repoRoot, run } = await fixture([ONE]);
  const report = await run();
  const { entries } = JSON.parse(await readFile(join(repoRoot, "dist/pi/plugins/one/runtime/pi/hooks.manifest.json"), "utf8"));
  assert.deepEqual(entries, [
    { plugin: "one", id: "session-start:reminder", event: "session-start", command: 'bash "${PI_PACKAGE_ROOT}"/hooks/reminder.sh' },
    {
      plugin: "one",
      id: "pre-tool:guard",
      event: "pre-tool",
      matcher: "Bash|mcp__.*git.*commit",
      command: 'bash "${PI_PACKAGE_ROOT}"/hooks/scripts/guard.sh',
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

test("dist/pi/plugins/<plugin> emits per-plugin packages and omits runtime when a plugin has no hooks", async () => {
  const noCmdsOrHooks = plugin("two", {
    resources: { skills: [], agents: [], hooks: [], templates: [], extra: [] },
  });
  const { repoRoot, run } = await fixture([ONE, noCmdsOrHooks, plugin("off", { harnesses: {} })]);
  await run();

  const oneDist = join(repoRoot, "dist/pi/plugins/one");
  await access(join(oneDist, "skills/setup/SKILL.md"));
  await access(join(oneDist, "hooks/scripts/guard.sh"));
  await access(join(oneDist, "runtime/pi/runtime.mjs"));
  await access(join(oneDist, "runtime/lib/hook-runner.mjs"));
  await assert.rejects(access(join(oneDist, "commands")), "no commands folder ships");

  const twoDist = join(repoRoot, "dist/pi/plugins/two");
  await assert.rejects(access(join(twoDist, "skills")), "skill-less plugin omits skills/");
  await assert.rejects(access(join(twoDist, "runtime")), "hookless plugin omits runtime/");
  await assert.rejects(access(join(twoDist, "runtime/pi/hooks.manifest.json")), "hookless plugin omits hooks.manifest.json");
  await assert.rejects(access(join(twoDist, "prompts")), "skill-less plugin omits prompts/");
  await assert.rejects(access(join(repoRoot, "dist/pi/plugins/off")), "a plugin without Pi does not ship to Pi");

  const onePkg = JSON.parse(await readFile(join(oneDist, "package.json"), "utf8"));
  assert.equal(onePkg.name, "@jskswamy/one");
  assert.equal(onePkg.version, "1.0.0");
  assert.ok(onePkg.keywords.includes("pi-package"));
  assert.deepEqual(onePkg.pi, { skills: ["./skills"], prompts: ["./prompts"], extensions: ["./runtime/pi/runtime.mjs"] });

  const twoPkg = JSON.parse(await readFile(join(twoDist, "package.json"), "utf8"));
  assert.equal(twoPkg.name, "@jskswamy/two");
  assert.deepEqual(twoPkg.pi, {});
});

test("dist/pi/plugins/<plugin> is self-contained, even under a path with spaces", async (t) => {
  const outRoot = await mkdtemp(join(tmpdir(), "pi out "));
  t.after(() => rm(outRoot, { recursive: true, force: true }));
  const { run } = await fixture([ONE], { outRoot });
  await run();
  const dist = join(outRoot, "dist/pi/plugins/one");
  const { entries } = JSON.parse(await readFile(join(dist, "runtime/pi/hooks.manifest.json"), "utf8"));
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
  const runtime = await import(pathToFileURL(join(outRoot, "dist/pi/plugins/one/runtime/pi/runtime.mjs")).href);
  const events = new Map();
  runtime.createRuntime({ entries: runtime.loadManifest(), log: () => {} })({ on: (name, handler) => events.set(name, handler), sendMessage: () => {} });
  const result = await events.get("tool_call")({ toolName: "bash", toolCallId: "1", input: { command: "git commit -m x" } }, { cwd: outRoot });
  assert.deepEqual(result, { block: true, reason: "use /one-setup" });
});

test("validate checks the paths dist/pi/plugins/<plugin>/package.json names", async () => {
  const { repoRoot, run } = await fixture([ONE]);
  await run();
  assert.deepEqual(await pi.validate({ repoRoot, outRoot: repoRoot, plugin: ONE }), []);
  const path = join(repoRoot, "dist/pi/plugins/one/package.json");
  const pkg = JSON.parse(await readFile(path, "utf8"));
  await writeFile(path, JSON.stringify({ ...pkg, pi: { ...pkg.pi, skills: ["./nope"] } }));
  assert.match((await pi.validate({ repoRoot, outRoot: repoRoot, plugin: ONE })).join("\n"), /pi one: pi\.skills path does not exist: \.\/nope/);
});
