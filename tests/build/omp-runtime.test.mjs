import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import * as omp from "../../harnesses/omp/adapter.mjs";
import { runAdapters } from "../../scripts/lib/adapters/index.mjs";
import { readJson } from "../../scripts/lib/fs-utils.mjs";

// Builds the real plugins for omp (every plugin enabled, as the release
// registry does) and drives the copied runtime the way omp loads it.
const outRoot = await mkdtemp(join(tmpdir(), "omp-runtime-"));
test.after(() => rm(outRoot, { recursive: true, force: true }));
const registry = await readJson("registry.json");
for (const plugin of registry.plugins) plugin.harnesses = { ...plugin.harnesses, omp: { enabled: true } };
const report = await runAdapters({ repoRoot: ".", outRoot, registry, adapters: [omp] });
const COMMIT = join(outRoot, "dist/omp/plugins/commit-tools");
const { createRuntime, loadManifest } = await import(pathToFileURL(join(COMMIT, "runtime/omp/runtime.mjs")).href);

async function load(t, entries = loadManifest(join(COMMIT, "runtime/omp/hooks.manifest.json")), ctxExtra = {}) {
  const events = new Map(), messages = [], logs = [], notices = [];
  const cwd = await mkdtemp(join(tmpdir(), "omp bare repo "));
  t.after(() => rm(cwd, { recursive: true, force: true }));
  const pi = { on: (name, handler) => events.set(name, handler), sendMessage: (message) => messages.push(message) };
  createRuntime({ entries, log: (line) => logs.push(line) })(pi);
  const ctx = { cwd, ...ctxExtra, ui: { notify: (text, level) => notices.push([text, level]) } };
  return { events, messages, logs, notices, ctx, cwd };
}

test("omp carries all seven hooks with no report notes", () => {
  assert.deepEqual(report.entries.filter((entry) => entry.harness === "omp" && entry.kind === "hooks"), []);
  const manifests = ["codebase", "commit-tools", "devenv", "craft"].map((name) =>
    loadManifest(join(outRoot, `dist/omp/plugins/${name}/runtime/omp/hooks.manifest.json`)),
  );
  assert.equal(manifests.flat().length, 7);
});

test("the commit guard blocks bash and git MCP commits and names a loadable skill", async (t) => {
  const { events, ctx } = await load(t);
  const handler = events.get("tool_call");
  for (const event of [
    { toolName: "bash", input: { command: "git status; git commit -m test" }, toolCallId: "c1" },
    { toolName: "mcp__git_git_commit", input: { message: "skip" }, toolCallId: "c2" },
  ]) {
    const result = await handler(event, ctx);
    assert.equal(result?.block, true, event.toolCallId);
    assert.match(result.reason, /commit-tools-commit/);
  }
  assert.equal(await handler({ toolName: "mcp__git_git_status", input: {}, toolCallId: "c3" }, ctx), undefined);
  assert.equal(await handler({ toolName: "bash", input: { command: "git log -1" }, toolCallId: "c4" }, ctx), undefined);
});

const recorder = (dir) => `cat >> "${dir}/stdin.log"; echo >> "${dir}/stdin.log"`;
const recorded = async (dir) =>
  (await readFile(join(dir, "stdin.log"), "utf8")).trim().split("\n").map((line) => JSON.parse(line));

test("session events map to Claude sources, and subagent sessions run only SubagentStart", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "omp-start-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const entries = [
    { event: "session-start", matcher: "startup|resume|clear|compact", command: `${recorder(dir)}; echo main reminder` },
    { event: "subagent-start", command: "cat > /dev/null; echo sub reminder" },
  ];
  const { events, messages, ctx } = await load(t, entries, { agent: { kind: "main" } });
  await events.get("session_start")({}, ctx);
  await events.get("session_switch")({ reason: "new" }, ctx);
  await events.get("session_switch")({ reason: "resume" }, ctx);
  await events.get("session_compact")({}, ctx);
  assert.deepEqual((await recorded(dir)).map((input) => input.source), ["startup", "clear", "resume", "compact"]);
  assert.deepEqual(messages.map((message) => message.content), Array(4).fill("main reminder"));

  messages.length = 0;
  await events.get("session_start")({}, { ...ctx, agent: { kind: "sub" } });
  assert.deepEqual(messages.map((message) => message.content), ["sub reminder"]);
});

test("an edit over several paths runs file hooks once per path, and glob carries its pattern", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "omp-tools-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const entries = [
    { event: "post-tool", matcher: "Write|Edit", command: recorder(dir) },
    { event: "pre-tool", matcher: "Grep|Glob", command: recorder(dir) },
  ];
  const { events, ctx } = await load(t, entries);
  await events.get("tool_result")({ toolName: "edit", input: { input: "patch", paths: ["flake.nix", "README.md"] }, toolCallId: "e1", content: [] }, ctx);
  await events.get("tool_call")({ toolName: "glob", input: { path: "*.nix", hidden: true }, toolCallId: "g1" }, ctx);
  await events.get("tool_call")({ toolName: "grep", input: { pattern: "carryHooks", path: "." }, toolCallId: "g2" }, ctx);
  const inputs = await recorded(dir);
  assert.deepEqual(inputs.map((input) => [input.tool_name, input.tool_input.file_path ?? input.tool_input.pattern]), [
    ["Edit", "flake.nix"],
    ["Edit", "README.md"],
    ["Glob", "*.nix"],
    ["Grep", "carryHooks"],
  ]);
});

test("notices reach the UI when there is one and stderr otherwise", async (t) => {
  const entries = [{ event: "post-tool", matcher: "Write", command: `cat > /dev/null; echo '{"continue": true, "systemMessage": "Ran nixfmt"}'` }];
  const withUI = await load(t, entries, { hasUI: true });
  await withUI.events.get("tool_result")({ toolName: "write", input: { path: "flake.nix" }, toolCallId: "w1", content: [] }, withUI.ctx);
  assert.deepEqual(withUI.notices, [["Ran nixfmt", "info"]]);
  const printMode = await load(t, entries, { hasUI: false });
  await printMode.events.get("tool_result")({ toolName: "write", input: { path: "flake.nix" }, toolCallId: "w2", content: [] }, printMode.ctx);
  assert.deepEqual(printMode.notices, []);
  assert.deepEqual(printMode.logs, ["Ran nixfmt"]);
});

test("a stop hook's notice is delivered and its block is only logged", async (t) => {
  const entries = [
    { event: "stop", command: `cat > /dev/null; echo '{"systemMessage": "2 parked ideas"}'` },
    { event: "stop", command: "cat > /dev/null; echo 'keep going' >&2; exit 2" },
  ];
  const { events, ctx, notices, logs } = await load(t, entries, { hasUI: true });
  assert.equal(await events.get("session_stop")({}, ctx), undefined);
  assert.deepEqual(notices, [["2 parked ideas", "info"]]);
  assert.match(logs.join("\n"), /stop hook asked to continue.*keep going/);
});

test("a crashing hook never blocks a tool", async (t) => {
  const { events, ctx } = await load(t, [{ event: "pre-tool", matcher: "Bash", command: "cat > /dev/null; exit 1" }]);
  assert.equal(await events.get("tool_call")({ toolName: "bash", input: { command: "ls" }, toolCallId: "b1" }, ctx), undefined);
});
