import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, mkdtemp, mkdir, readdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";
import * as antigravity from "../../harnesses/antigravity/adapter.mjs";
import { runAdapters } from "../../scripts/lib/adapters/index.mjs";

const REPO = resolve(".");
const OUT = "dist/antigravity/plugins";

async function write(path, content) {
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, content);
}

const ONE_HOOKS = {
  description: "dropped on Antigravity",
  hooks: {
    SessionStart: [{ hooks: [{ type: "command", command: "bash ${CLAUDE_PLUGIN_ROOT}/hooks/context.sh" }] }],
    SubagentStart: [{ hooks: [{ type: "command", command: "bash ${CLAUDE_PLUGIN_ROOT}/hooks/context.sh" }] }],
    PreToolUse: [
      { matcher: "Bash|mcp__.*git.*commit", hooks: [{ type: "command", command: "bash ${CLAUDE_PLUGIN_ROOT}/hooks/missing.sh" }] },
      { matcher: "Bash", hooks: [{ type: "command", command: "bash ${CLAUDE_PLUGIN_ROOT}/hooks/hang.sh", timeout: 1 }] },
      { matcher: "Grep", hooks: [{ type: "command", command: "bash ${CLAUDE_PLUGIN_ROOT}/hooks/grep.sh" }] },
    ],
    Stop: [{ hooks: [{ type: "command", command: "bash ${CLAUDE_PLUGIN_ROOT}/hooks/stop.sh" }] }],
  },
};

const ONE = {
  name: "one",
  version: "1.2.3",
  description: "one plugin",
  author: { name: "me" },
  resources: {
    skills: ["one-backlog"],
    commands: ["one/backlog.md"],
    agents: ["one/helper.md", "one/bare.md"],
    hooks: ["one/hooks.json", "one/context.sh", "one/missing.sh", "one/hang.sh", "one/grep.sh", "one/stop.sh"],
    templates: ["one/note.md"],
    extra: [{ from: "templates/one/styles", to: "styles" }],
  },
  harnesses: { antigravity: { enabled: true, optional: { "pre-tool:grep": "no grep tool on agy" } } },
};

// commit-tools and codebase use their real canonical hooks and scripts.
const COMMIT_TOOLS = {
  name: "commit-tools",
  version: "1.0.0",
  description: "commits",
  resources: {
    skills: ["commit-action"],
    commands: ["commit-tools/commit.md"],
    hooks: ["commit-tools/hooks.json", "commit-tools/scripts/intercept-git-commit.sh", "commit-tools/scripts/routing-reminder.sh"],
  },
  harnesses: { antigravity: { enabled: true } },
};
const CODEBASE = {
  name: "codebase",
  version: "1.0.0",
  description: "graph",
  resources: {
    skills: [],
    hooks: ["codebase/hooks.json", "codebase/session-reminder.sh", "codebase/subagent-reminder.sh", "codebase/discovery-augment.sh"],
  },
  harnesses: { antigravity: { enabled: true, optional: { "pre-tool:discovery-augment": "no grep tool on agy" } } },
};

async function fixture(t, plugins) {
  const repoRoot = await mkdtemp(join(tmpdir(), "agy-adapter-"));
  t.after(() => rm(repoRoot, { recursive: true, force: true }));
  await write(join(repoRoot, "skills/one-backlog/SKILL.md"), "---\nname: one-backlog\ndescription: Use when one.\n---\n");
  await write(join(repoRoot, "skills/one-backlog/tests/case.md"), "dev only\n");
  await write(join(repoRoot, "commands/one/backlog.md"), '---\nname: backlog\ndescription: Show the backlog\nargument-hint: "<x>"\n---\n\nInvoke the `one-backlog` skill.\n');
  await write(
    join(repoRoot, "agents/one/helper.md"),
    '---\nname: helper\ndescription: |\n  Helps.\n\n  <example>x</example>\nmodel: inherit\ntools: "*"\n---\n\nBody.\n',
  );
  await write(join(repoRoot, "agents/one/bare.md"), "## No frontmatter\n");
  await write(join(repoRoot, "templates/one/note.md"), "note\n");
  await write(join(repoRoot, "templates/one/styles/a.css"), "a\n");
  await write(join(repoRoot, "hooks/one/hooks.json"), JSON.stringify(ONE_HOOKS));
  await write(join(repoRoot, "hooks/one/context.sh"), `echo '{"hookSpecificOutput":{"additionalContext":"one context"}}'\n`);
  await write(join(repoRoot, "hooks/one/missing.sh"), "exit 2\n");
  await write(join(repoRoot, "hooks/one/hang.sh"), "sleep 30\n");
  await write(join(repoRoot, "hooks/one/grep.sh"), "exit 0\n");
  await write(join(repoRoot, "hooks/one/stop.sh"), "echo 'parked ideas remain' >&2; exit 2\n");
  for (const path of ["skills/commit-action", "hooks/commit-tools", "commands/commit-tools", "hooks/codebase"]) {
    await cp(join(REPO, path), join(repoRoot, path), { recursive: true });
  }
  const registry = { marketplace: { name: "mp", description: "d" }, plugins };
  const report = await runAdapters({ repoRoot, registry, adapters: [antigravity] });
  return { repoRoot, report, out: (plugin, path = "") => join(repoRoot, OUT, plugin, path) };
}

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

// Runs a generated hook the way agy does: from the plugin root, through sh.
function runShim(pluginRoot, hookId, input, env = process.env) {
  const hooks = spawnSync("sh", ["-c", `bash runtime/antigravity/hook-shim.sh ${hookId}`], {
    cwd: pluginRoot,
    input: JSON.stringify(input),
    encoding: "utf8",
    env,
  });
  assert.equal(hooks.status, 0, hooks.stderr);
  return { output: JSON.parse(hooks.stdout), stderr: hooks.stderr };
}

test("plugin tree: manifest, skills without tests, command skills, mapped agents, templates", async (t) => {
  const { out } = await fixture(t, [ONE]);
  assert.deepEqual(await readJson(out("one", ".antigravity-plugin/plugin.json")), { name: "one", version: "1.2.3", description: "one plugin" });
  assert.deepEqual((await readdir(out("one", "skills"))).sort(), ["one-backlog", "one-cmd-backlog"]);
  assert.equal(existsSync(out("one", "skills/one-backlog/tests")), false);
  assert.equal(
    await readFile(out("one", "skills/one-cmd-backlog/SKILL.md"), "utf8"),
    "---\nname: one-cmd-backlog\ndescription: Show the backlog\n---\n\nInvoke the `one-backlog` skill.\n",
  );
  assert.equal(await readFile(out("one", "agents/helper.md"), "utf8"), "---\nname: helper\ndescription: |\n  Helps.\n\n  <example>x</example>\n---\n\nBody.\n");
  assert.match(await readFile(out("one", "agents/bare.md"), "utf8"), /^---\nname: bare\ndescription: The bare agent of the one plugin\.\n---\n## No frontmatter/);
  assert.equal(await readFile(out("one", "templates/note.md"), "utf8"), "note\n");
  assert.equal(await readFile(out("one", "styles/a.css"), "utf8"), "a\n");
  for (const absent of ["commands", "hooks/hooks.json", ".claude-plugin"]) assert.equal(existsSync(out("one", absent)), false, absent);
});

test("hooks.json uses agy's schema: named hooks, no description, mapped matchers", async (t) => {
  const { out, report } = await fixture(t, [ONE]);
  const hooks = await readJson(out("one", "hooks.json"));
  const shim = (id) => `bash runtime/antigravity/hook-shim.sh ${id}`;
  assert.deepEqual(hooks, {
    "one/session-start:context": { SessionStart: [{ type: "command", command: shim("session-start:context"), timeout: 15 }] },
    "one/pre-tool:missing": {
      PreToolUse: [{ matcher: "^(?:run_command)$", hooks: [{ type: "command", command: shim("pre-tool:missing"), timeout: 15 }] }],
    },
    "one/pre-tool:hang": {
      PreToolUse: [{ matcher: "^(?:run_command)$", hooks: [{ type: "command", command: shim("pre-tool:hang"), timeout: 6 }] }],
    },
    "one/stop:stop": { Stop: [{ type: "command", command: shim("stop:stop"), timeout: 15 }] },
  });
  const manifest = await readJson(out("one", "runtime/antigravity/hooks.manifest.json"));
  assert.equal(manifest.entries["pre-tool:hang"].command, 'bash "${ANTIGRAVITY_PLUGIN_ROOT}"/hooks/hang.sh');
  assert.equal(manifest.entries["pre-tool:hang"].timeoutMs, 1000);
  // The unmappable MCP half of the matcher is an error, never dropped.
  assert.deepEqual(
    report.entries.filter((e) => e.status !== "degraded").map(({ kind, resource, status }) => `${kind} ${resource} ${status}`),
    ["hooks subagent-start:context not-applicable", "hooks pre-tool:missing error", "hooks pre-tool:grep skipped"],
  );
  assert.match(report.errors()[0].reason, /mcp__\.\*git\.\*commit/);
  assert.ok(report.entries.some((e) => e.resource === "hooks.json" && e.status === "degraded"));
});

test("an optional marker turns the unmapped MCP half into a skip and keeps the run_command guard", async (t) => {
  const marked = { ...COMMIT_TOOLS, harnesses: { antigravity: { enabled: true, optional: { "pre-tool:intercept-git-commit": "MCP naming unknown" } } } };
  const { out, report } = await fixture(t, [marked]);
  assert.deepEqual(report.errors(), []);
  assert.match(report.lines().join("\n"), /pre-tool:intercept-git-commit: skipped .*MCP naming unknown/);
  const hooks = await readJson(out("commit-tools", "hooks.json"));
  assert.equal(hooks["commit-tools/pre-tool:intercept-git-commit"].PreToolUse[0].matcher, "^(?:run_command)$");
  assert.deepEqual(await readdir(out("commit-tools", "skills")), ["commit-action", "commit-tools-cmd-commit"].sort());
});

test("a plugin without hooks gets no hooks.json or runtime", async (t) => {
  const plain = { ...ONE, resources: { ...ONE.resources, hooks: [] }, harnesses: { antigravity: { enabled: true } } };
  const { out } = await fixture(t, [plain]);
  assert.equal(existsSync(out("one", "hooks.json")), false);
  assert.equal(existsSync(out("one", "runtime")), false);
});

test("blocking: a run_command git commit through the real commit guard is denied", async (t) => {
  const marked = { ...COMMIT_TOOLS, harnesses: { antigravity: { enabled: true, optional: { "pre-tool:intercept-git-commit": "MCP naming unknown" } } } };
  const { out } = await fixture(t, [marked]);
  const workspace = await mkdtemp(join(tmpdir(), "agy workspace "));
  t.after(() => rm(workspace, { recursive: true, force: true }));
  const call = (CommandLine) => ({
    conversationId: "c1",
    workspacePaths: [workspace],
    toolCall: { name: "run_command", args: { CommandLine, Cwd: workspace } },
    stepIdx: 3,
  });

  const denied = runShim(out("commit-tools"), "pre-tool:intercept-git-commit", call("git status; git commit -m test")).output;
  assert.equal(denied.decision, "deny");
  assert.match(denied.reason, /commit-action/);
  // Anything else passes without auto-approving the tool.
  assert.deepEqual(runShim(out("commit-tools"), "pre-tool:intercept-git-commit", call("git log -1")).output, {});
});

test("context: SessionStart output becomes injectSteps (codebase reminder and commit routing)", async (t) => {
  const { out } = await fixture(t, [CODEBASE, { ...COMMIT_TOOLS, harnesses: { antigravity: { enabled: true, optional: { "pre-tool:intercept-git-commit": "x" } } } }]);
  const workspace = await mkdtemp(join(tmpdir(), "agy-workspace-"));
  t.after(() => rm(workspace, { recursive: true, force: true }));
  // The reminder stays silent unless an MCP config in the project names the server.
  await writeFile(join(workspace, ".mcp.json"), '{"mcpServers":{"codebase-memory-mcp":{}}}');
  const start = { conversationId: "c1", workspacePaths: [workspace] };

  const reminder = runShim(out("codebase"), "session-start:session-reminder", start).output;
  assert.match(reminder.injectSteps[0].systemMessage.systemMessage, /Code Discovery Protocol/);

  const routing = runShim(out("commit-tools"), "session-start:routing-reminder", start).output;
  assert.ok(routing.injectSteps[0].systemMessage.systemMessage.includes(out("commit-tools", "skills/commit-action/SKILL.md")));
});

test("failure handling: a missing or hung script does not block; stop exit 2 continues", async (t) => {
  const { out } = await fixture(t, [{ ...ONE, harnesses: { antigravity: { enabled: true, optional: { "pre-tool:missing": "x", "pre-tool:grep": "x" } } } }]);
  await rm(out("one", "hooks/missing.sh"));
  const call = { workspacePaths: [tmpdir()], toolCall: { name: "run_command", args: { CommandLine: "ls" } } };

  assert.deepEqual(runShim(out("one"), "pre-tool:missing", call).output, {});
  const started = Date.now();
  const hung = runShim(out("one"), "pre-tool:hang", call);
  assert.deepEqual(hung.output, {});
  assert.ok(Date.now() - started < 10_000);
  assert.match(hung.stderr, /timed out/);
  assert.deepEqual(runShim(out("one"), "pre-tool:nope", call).output, {});
  assert.deepEqual(runShim(out("one"), "stop:stop", { workspacePaths: [tmpdir()], terminationReason: "NO_TOOL_CALL" }).output, {
    decision: "continue",
    reason: "parked ideas remain",
  });
});

test("without jq on PATH a hook does nothing", async (t) => {
  const { out } = await fixture(t, [{ ...ONE, harnesses: { antigravity: { enabled: true, optional: { "pre-tool:missing": "x", "pre-tool:grep": "x" } } } }]);
  // A PATH holding only sh and bash, so jq cannot be found.
  const bin = await mkdtemp(join(tmpdir(), "agy-bin-"));
  t.after(() => rm(bin, { recursive: true, force: true }));
  for (const name of ["sh", "bash"]) {
    const found = spawnSync("sh", ["-c", `command -v ${name}`], { encoding: "utf8" }).stdout.trim();
    await symlink(found, join(bin, name));
  }
  const env = { ...process.env, PATH: bin };
  assert.deepEqual(runShim(out("one"), "stop:stop", { workspacePaths: [tmpdir()] }, env).output, {});
  assert.deepEqual(runShim(out("one"), "session-start:context", { workspacePaths: [tmpdir()] }, env).output, {});
});

test("generated plugins ship no JavaScript, so they run without node", async (t) => {
  const { repoRoot } = await fixture(t, [ONE, CODEBASE]);
  const files = await readdir(join(repoRoot, OUT), { recursive: true });
  assert.ok(files.some((file) => file.endsWith("hook-shim.sh")));
  assert.deepEqual(files.filter((file) => /\.(?:c|m)?js$/.test(file)), []);
});

const agyInstalled = (process.env.PATH ?? "").split(delimiter).some((dir) => dir && existsSync(join(dir, "agy")));

test("agy plugin validate accepts the generated plugins with the expected counts", { skip: !agyInstalled && "agy not on PATH" }, async (t) => {
  const marked = { ...COMMIT_TOOLS, harnesses: { antigravity: { enabled: true, optional: { "pre-tool:intercept-git-commit": "x" } } } };
  const { repoRoot, out } = await fixture(t, [{ ...ONE, harnesses: { antigravity: { enabled: true, optional: { "pre-tool:missing": "x", "pre-tool:grep": "x" } } } }, marked]);
  assert.deepEqual(await antigravity.validate({ repoRoot, plugin: ONE }), []);
  assert.deepEqual(await antigravity.validate({ repoRoot, plugin: marked }), []);

  // agy drops a hooks.json it cannot decode without a finding; the count catches it.
  const hooks = await readJson(out("one", "hooks.json"));
  await writeFile(out("one", "hooks.json"), JSON.stringify({ description: "x", ...hooks }));
  assert.match((await antigravity.validate({ repoRoot, plugin: ONE })).join("\n"), /agy sees 0 hooks, expected 4/);
});
