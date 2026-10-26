import test from "node:test";
import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import * as opencode from "../../harnesses/opencode/adapter.mjs";
import { runAdapters } from "../../scripts/lib/adapters/index.mjs";
import { expandCommand } from "../../harnesses/opencode/runtime.mjs";

const PLUGINS = "dist/opencode";

async function write(path, content) {
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, content);
}

async function tempDir(t, prefix) {
  const dir = await mkdtemp(join(tmpdir(), prefix));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}

const HOOKS = {
  hooks: {
    SessionStart: [{ hooks: [{ type: "command", command: "bash ${CLAUDE_PLUGIN_ROOT}/hooks/reminder.sh" }] }],
    SubagentStart: [{ hooks: [{ type: "command", command: "bash ${CLAUDE_PLUGIN_ROOT}/hooks/sub.sh" }] }],
    PreToolUse: [
      { matcher: "Bash|mcp__.*git.*commit", hooks: [{ type: "command", command: "bash ${CLAUDE_PLUGIN_ROOT}/hooks/scripts/guard.sh", timeout: 1 }] },
      { matcher: "NotebookEdit", hooks: [{ type: "command", command: "bash ${CLAUDE_PLUGIN_ROOT}/hooks/scripts/nb.sh" }] },
    ],
    Stop: [{ hooks: [{ type: "command", command: "bash ${CLAUDE_PLUGIN_ROOT}/hooks/scripts/stop.sh" }] }],
  },
};

function plugin(name, overrides = {}) {
  return {
    name,
    version: "1.0.0",
    description: `${name} plugin`,
    tags: ["t"],
    resources: { skills: [`${name}-skill`], commands: [`${name}/setup.md`], agents: [], hooks: [], templates: [], extra: [] },
    harnesses: { opencode: { enabled: true } },
    ...overrides,
  };
}

const ONE = plugin("one", {
  resources: {
    skills: ["one-skill"],
    commands: ["one/setup.md", "one/review.md", "one/run.md"],
    agents: ["one/helper.md"],
    hooks: ["one/hooks.json", "one/reminder.sh", "one/sub.sh", "one/scripts"],
    templates: [],
    extra: [{ from: "templates/one/.mcp.json", to: ".mcp.json" }],
  },
});

async function fixture(t, plugins) {
  const repoRoot = await tempDir(t, "opencode-adapter-");
  for (const name of ["one", "two"]) {
    await write(join(repoRoot, `skills/${name}-skill/SKILL.md`), `---\nname: ${name}-skill\ndescription: Use when ${name}.\n---\n\nBody of ${name}.\n`);
    await write(join(repoRoot, `commands/${name}/setup.md`), `---\nname: setup\ndescription: Set up ${name}\n---\n\nInvoke the \`${name}-skill\` skill.\n`);
  }
  await write(join(repoRoot, "skills/one-skill/tests/x.test.mjs"), "");
  await write(join(repoRoot, "commands/one/review.md"), "---\ndescription: Review\n---\n\nReview $1 then $ARGUMENTS.\n");
  await write(join(repoRoot, "commands/one/run.md"), "---\ndescription: Run it\n---\n\nRun now.\n");
  await write(
    join(repoRoot, "agents/one/helper.md"),
    "---\nname: helper\ndescription: |\n  Helps with things.\n\n  <example>\n  user: help\n  </example>\nmodel: sonnet\ntools: Bash\n---\n\nYou help.\n",
  );
  await write(join(repoRoot, "templates/one/.mcp.json"), "{}");
  await write(join(repoRoot, "hooks/one/hooks.json"), JSON.stringify(HOOKS));
  await write(join(repoRoot, "hooks/one/reminder.sh"), "echo '{\"hookSpecificOutput\":{\"additionalContext\":\"one reminder\"}}'");
  await write(join(repoRoot, "hooks/one/sub.sh"), "echo sub reminder");
  await write(join(repoRoot, "hooks/one/scripts/guard.sh"), "cat > /dev/null; sleep 30");
  await write(join(repoRoot, "hooks/one/scripts/nb.sh"), "exit 0");
  await write(join(repoRoot, "hooks/one/scripts/stop.sh"), 'grep -q \'"stop_hook_active":false\' && { echo "keep going" >&2; exit 2; }; exit 0');
  const registry = { marketplace: { name: "mp", description: "d" }, plugins };
  return { repoRoot, run: () => runAdapters({ repoRoot, registry, adapters: [opencode] }) };
}

// Copies the canonical files of real plugins into a scratch repo, so the
// guard tests run the real hook scripts without writing into this repo.
async function realFixture(t, names) {
  const registry = JSON.parse(await readFile("registry.json", "utf8"));
  const plugins = registry.plugins
    .filter((p) => names.includes(p.name))
    .map((p) => ({ ...p, harnesses: { opencode: { enabled: true } } }));
  const repoRoot = await tempDir(t, "opencode-real-");
  for (const { resources: r } of plugins) {
    const paths = [
      ...r.skills.map((s) => `skills/${s}`),
      ...["commands", "agents", "hooks", "templates"].flatMap((kind) => r[kind].map((entry) => `${kind}/${entry}`)),
      ...r.extra.map((e) => (typeof e === "string" ? e : e.from)),
    ];
    for (const path of paths) await cp(path, join(repoRoot, path), { recursive: true });
  }
  const report = await runAdapters({ repoRoot, registry: { ...registry, plugins }, adapters: [opencode] });
  assert.deepEqual(report.errors(), []);
  return repoRoot;
}

// Stands in for OpenCode's plugin ctx and records what the plugin does.
function fakeCtx({ directory, sessions = {}, events = [] } = {}) {
  const ctx = {
    hooks: {},
    added: { skills: [], commands: [], agents: new Map() },
    prompts: [],
    location: { directory },
    tool: { hook: async (name, fn) => (ctx.hooks[`tool.${name}`] = fn) },
    session: {
      hook: async (name, fn) => (ctx.hooks[`session.${name}`] = fn),
      get: async ({ sessionID }) => ({ id: sessionID, location: { directory }, ...sessions[sessionID] }),
      prompt: async (payload) => ctx.prompts.push(payload),
    },
    skill: { transform: async (fn) => fn({ add: (skill) => ctx.added.skills.push(skill) }) },
    command: { transform: async (fn) => fn({ add: (command) => ctx.added.commands.push(command) }) },
    agent: {
      transform: async (fn) =>
        fn({
          get: (id) => ctx.added.agents.get(id),
          update: (id, edit) => {
            const agent = ctx.added.agents.get(id) ?? { id, mode: "primary" };
            ctx.added.agents.set(id, agent);
            edit(agent);
          },
        }),
    },
    event: {
      subscribe: async function* () {
        yield* events;
      },
    },
  };
  return ctx;
}

async function load(packageDir, ctx) {
  const logs = [];
  const { default: plugin } = await import(`${pathToFileURL(join(packageDir, "index.js"))}?${Math.random()}`);
  const { createPlugin } = await import(pathToFileURL(join(packageDir, "runtime/opencode/runtime.mjs")));
  const quiet = createPlugin({ id: plugin.id, root: packageDir, log: (line) => logs.push(line) });
  await quiet.setup(ctx);
  return { plugin, logs };
}

async function context(ctx, sessionID, agent = "build") {
  const system = [];
  await ctx.hooks["session.context"]({ sessionID, agent, system });
  return system.map((part) => part.text);
}

async function until(check) {
  for (let i = 0; i < 100 && !check(); i++) await new Promise((resolve) => setTimeout(resolve, 20));
  assert.ok(check());
}

test("each plugin becomes a self-contained package that OpenCode can load by path", async (t) => {
  const { repoRoot, run } = await fixture(t, [ONE, plugin("two")]);
  await run();
  const out = join(repoRoot, PLUGINS, "one");
  const pkg = JSON.parse(await readFile(join(out, "package.json"), "utf8"));
  assert.equal(pkg.main, "./index.js");
  assert.equal(pkg.type, "module");
  assert.match(await readFile(join(out, "index.js"), "utf8"), /createPlugin\(\{ id: "one"/);
  assert.deepEqual((await readdir(join(out, "runtime/lib"))).sort(), ["hook-input.mjs", "hook-runner.mjs"]);
  assert.deepEqual((await readdir(join(out, "skills/one-skill"))), ["SKILL.md"]);
  assert.deepEqual(await opencode.validate({ repoRoot, plugin: ONE }), []);

  const { plugin: loaded } = await load(out, fakeCtx());
  assert.equal(loaded.id, "one");
  assert.equal(typeof loaded.setup, "function");
});

test("skills, commands and agents are registered with valid payloads", async (t) => {
  const { repoRoot, run } = await fixture(t, [ONE, plugin("two")]);
  const report = await run();
  const out = join(repoRoot, PLUGINS, "one");
  const ctx = fakeCtx();
  await load(out, ctx);

  assert.deepEqual(ctx.added.skills, [
    { id: "one-skill", name: "one-skill", description: "Use when one.", path: join(out, "skills/one-skill/SKILL.md"), content: "\nBody of one.\n" },
  ]);
  // "setup" is in two plugins and "review" is OpenCode's own.
  assert.deepEqual(ctx.added.commands.map((c) => c.name), ["one-setup", "one-review", "run"]);
  await ctx.added.commands[2].execute({ sessionID: "s1", prompt: { text: "fast" }, delivery: "steer" });
  assert.deepEqual(ctx.prompts, [{ sessionID: "s1", text: "\nRun now.\n\nArguments: fast", delivery: "steer" }]);

  const agent = ctx.added.agents.get("one-helper");
  assert.deepEqual(agent, { id: "one-helper", mode: "subagent", description: "Helps with things.", system: "\nYou help.\n" });
  assert.equal(
    await readFile(join(out, "opencode-agents/one-helper.md"), "utf8"),
    "---\ndescription: Helps with things.\nmode: subagent\n---\n\nYou help.\n",
  );
  assert.ok(report.entries.some((e) => e.kind === "extra" && e.status === "degraded"));
});

test("command arguments are placed the way Claude places them", () => {
  assert.equal(expandCommand("Review $1 then $ARGUMENTS.", "a b"), "Review a then a b.");
  assert.equal(expandCommand("Run.", ""), "Run.");
  assert.equal(expandCommand("Run.", " x $& "), "Run.\n\nArguments: x $&");
});

test("a payload OpenCode would reject fails the build instead of disabling the plugin", async (t) => {
  const { repoRoot, run } = await fixture(t, [ONE]);
  await write(join(repoRoot, "skills/one-skill/SKILL.md"), "---\nname: one-skill\n---\n\nNo description.\n");
  const report = await run();
  assert.deepEqual(
    report.errors().map(({ kind, resource }) => `${kind} ${resource}`),
    ["skills one-skill", "hooks pre-tool:nb"],
  );
  const resources = JSON.parse(await readFile(join(repoRoot, PLUGINS, "one/resources.json"), "utf8"));
  assert.deepEqual(resources.skills, []);
});

test("hooks go to a manifest with package-relative scripts, and the policy applies", async (t) => {
  const { repoRoot, run } = await fixture(t, [ONE]);
  const report = await run();
  const { entries } = JSON.parse(await readFile(join(repoRoot, PLUGINS, "one/hooks.manifest.json"), "utf8"));
  assert.deepEqual(
    entries.map(({ id, command }) => `${id} ${command}`),
    [
      'session-start:reminder bash "${OPENCODE_PLUGIN_ROOT}"/hooks/reminder.sh',
      'subagent-start:sub bash "${OPENCODE_PLUGIN_ROOT}"/hooks/sub.sh',
      'pre-tool:guard bash "${OPENCODE_PLUGIN_ROOT}"/hooks/scripts/guard.sh',
      'stop:stop bash "${OPENCODE_PLUGIN_ROOT}"/hooks/scripts/stop.sh',
    ],
  );
  assert.deepEqual(
    report.entries.filter((e) => e.kind === "hooks").map(({ resource, status }) => `${resource} ${status}`),
    ["pre-tool:nb error"],
  );

  const optional = { ...ONE, harnesses: { opencode: { enabled: true, optional: { "pre-tool:nb": "notebooks are Claude-only" } } } };
  const second = await fixture(t, [optional]);
  assert.deepEqual((await second.run()).errors(), []);
});

test("validate reports a package whose files went missing", async (t) => {
  const { repoRoot, run } = await fixture(t, [ONE]);
  await run();
  await rm(join(repoRoot, PLUGINS, "one/hooks/scripts/guard.sh"));
  await rm(join(repoRoot, PLUGINS, "one/commands/run.md"));
  assert.deepEqual(await opencode.validate({ repoRoot, plugin: ONE }), [
    "opencode one: missing commands/run.md",
    "opencode one: hook pre-tool:guard runs missing hooks/scripts/guard.sh",
  ]);
});

test("blocking: shell and MCP commits are blocked by the real commit-tools hook", async (t) => {
  const repoRoot = await realFixture(t, ["commit-tools"]);
  const ctx = fakeCtx({ directory: await tempDir(t, "opencode bare repo ") });
  await load(join(repoRoot, PLUGINS, "commit-tools"), ctx);
  const before = ctx.hooks["tool.execute.before"];

  for (const ev of [
    { tool: "shell", input: { command: "git status && git commit -m test" } },
    { tool: "git_git_commit", input: { message: "Skip workflow" } },
  ]) {
    await assert.rejects(before({ ...ev, sessionID: "s1", id: "c1" }), /commit-action/, ev.tool);
  }
  // Code Mode's wrapper is left to the inner calls, which are hooked one by one.
  await before({ tool: "execute", input: { code: "await tools.git.git_commit({})" }, sessionID: "s1", id: "c2" });
  await before({ tool: "shell", input: { command: "git log -1" }, sessionID: "s1", id: "c3" });
  await before({ tool: "edit", input: { path: "f", oldString: "a", newString: "b" }, sessionID: "s1", id: "c4" });
});

test("context injection: session-start reminders reach the system prompt once per session", async (t) => {
  const repoRoot = await realFixture(t, ["codebase", "commit-tools"]);
  const directory = await tempDir(t, "opencode-project-");
  // The codebase reminder only speaks when the project names its MCP server.
  await writeFile(join(directory, ".mcp.json"), '{"mcpServers":{"codebase-memory-mcp":{}}}');
  const ctx = fakeCtx({ directory, sessions: { child: { parentID: "s1" } } });
  await load(join(repoRoot, PLUGINS, "codebase"), ctx);

  const first = await context(ctx, "s1");
  assert.equal(first.length, 1);
  assert.match(first[0], /Code Discovery Protocol/);
  assert.deepEqual(await context(ctx, "s1"), first);

  const child = await context(ctx, "child", "codebase-explore");
  assert.equal(child.length, 1);
  assert.doesNotMatch(child[0], /Code Discovery Protocol/);
  assert.match(child[0], /codebase-memory/);

  const commitCtx = fakeCtx({ directory });
  await load(join(repoRoot, PLUGINS, "commit-tools"), commitCtx);
  const [routing] = await context(commitCtx, "s2");
  assert.match(routing, /before.*commit/i);
  assert.ok(routing.includes(join(repoRoot, PLUGINS, "commit-tools/skills/commit-action/SKILL.md")));
});

test("failure handling: a missing script, a hung script and runtime errors do not block", async (t) => {
  const { repoRoot, run } = await fixture(t, [ONE]);
  await run();
  const out = join(repoRoot, PLUGINS, "one");
  const ctx = fakeCtx();
  const { logs } = await load(out, ctx);
  const before = ctx.hooks["tool.execute.before"];

  const started = Date.now();
  await before({ tool: "shell", input: { command: "ls" }, sessionID: "s1", id: "c1" }); // guard.sh sleeps past its 1s timeout
  assert.ok(Date.now() - started < 5000);
  assert.ok(logs.some((line) => /timed out after 1000ms/.test(line)));

  await rm(join(out, "hooks/scripts/guard.sh"));
  await before({ tool: "shell", input: { command: "ls" }, sessionID: "s1", id: "c2" });
  assert.ok(logs.some((line) => /exited 127/.test(line)));

  await before(undefined);
  assert.ok(logs.some((line) => /pre-tool hook/.test(line)));
});

test("tool hook context and post-tool blocks reach later model requests", async (t) => {
  const { repoRoot, run } = await fixture(t, [ONE]);
  await run();
  const out = join(repoRoot, PLUGINS, "one");
  const entries = [
    { event: "post-tool", matcher: "Write", command: `grep -q '"file_path":"f"' && echo '{"hookSpecificOutput":{"additionalContext":"formatted f"}}'` },
    { event: "post-tool", matcher: "Edit", command: "echo 'lint failed' >&2; exit 2" },
  ];
  await writeFile(join(out, "hooks.manifest.json"), JSON.stringify({ entries }));
  const ctx = fakeCtx();
  await load(out, ctx);
  await ctx.hooks["tool.execute.after"]({ tool: "write", input: { path: "f", content: "x" }, sessionID: "s1", id: "w1" });
  await ctx.hooks["tool.execute.after"]({ tool: "edit", input: { path: "f", oldString: "a", newString: "b" }, sessionID: "s1", id: "e1" });
  assert.deepEqual(await context(ctx, "s1"), ["formatted f", "lint failed"]);
});

test("stop hooks run when the main session finishes and exit 2 keeps it going", async (t) => {
  const { repoRoot, run } = await fixture(t, [ONE]);
  await run();
  const events = [
    { type: "session.execution.succeeded", data: { sessionID: "child" } },
    { type: "session.execution.succeeded", data: { sessionID: "s1" } },
  ];
  const ctx = fakeCtx({ sessions: { child: { parentID: "s1" } }, events });
  await load(join(repoRoot, PLUGINS, "one"), ctx);
  await until(() => ctx.prompts.length > 0);
  assert.deepEqual(ctx.prompts, [{ sessionID: "s1", text: "keep going" }]);
});
