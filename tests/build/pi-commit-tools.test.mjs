import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import * as piAdapter from "../../harnesses/pi/adapter.mjs";
import { runAdapters } from "../../scripts/lib/adapters/index.mjs";
import { readJson } from "../../scripts/lib/fs-utils.mjs";

// Drives a fresh build of the commit-tools Pi package (manifest + copied
// runtime), the way Pi loads it, so the test sees current sources and not
// committed dist/.
const outRoot = await mkdtemp(join(tmpdir(), "pi-commit-tools-"));
test.after(() => rm(outRoot, { recursive: true, force: true }));
await runAdapters({ repoRoot: ".", outRoot, registry: await readJson("registry.json"), adapters: [piAdapter] });
const PI = join(outRoot, "dist/plugins/commit-tools");
const { createRuntime, loadManifest } = await import(pathToFileURL(join(PI, "runtime/pi/runtime.mjs")).href);

async function load(t, entries = loadManifest()) {
  const events = new Map(), messages = [], logs = [];
  const cwd = await mkdtemp(join(tmpdir(), "pi bare repo "));
  t.after(() => rm(cwd, { recursive: true, force: true }));
  const pi = {
    on: (name, handler) => events.set(name, handler),
    sendMessage: (message) => messages.push(message),
  };
  createRuntime({ entries, log: (line) => logs.push(line) })(pi);
  return { events, messages, logs, ctx: { cwd } };
}

test("/commit is a generated prompt that forwards its arguments to commit-action", async () => {
  const prompt = await readFile(join(PI, "prompts/commit.md"), "utf8");
  assert.match(prompt, /^description: Generate and create git commit messages/m);
  assert.match(prompt, /`commit-action` skill/);
  assert.match(prompt, /\$ARGUMENTS/);
});

test("session start routes commits through commit-action without a user commit request", async (t) => {
  const { events, messages, ctx } = await load(t);
  await events.get("session_start")({ reason: "startup" }, ctx);
  assert.equal(messages.length, 1);
  assert.match(messages[0].content, /before.*commit/i);
  assert.ok(messages[0].content.includes(join(PI, "skills/commit-action/SKILL.md")));
  assert.equal(messages[0].display, false);
});

test("Pi blocks direct and codemode-nested bash commits and direct MCP commits", async (t) => {
  const { events, ctx } = await load(t);
  const handler = events.get("tool_call");
  for (const event of [
    { toolName: "bash", input: { command: "git status; git commit -m test" }, toolCallId: "call1" },
    { toolName: "bash", input: { command: "git commit --amend --no-edit" }, toolCallId: "code1/1", parentToolCallId: "code1" },
    { toolName: "mcp__git__git_commit", input: { message: "Skip workflow" }, toolCallId: "code1/2", parentToolCallId: "code1" },
  ]) {
    const result = await handler(event, ctx);
    assert.equal(result?.block, true, event.toolCallId);
    assert.match(result.reason, /commit-action/);
  }
  assert.equal(await handler({ toolName: "bash", input: { command: "git log -1" }, toolCallId: "c2" }, ctx), undefined);
  assert.equal(
    await handler({ toolName: "bash", input: { command: "__GIT_COMMIT_PLUGIN__=1 git commit -m test" }, toolCallId: "c3" }, ctx),
    undefined,
  );
  assert.equal(await handler({ toolName: "read", input: { path: "x" }, toolCallId: "c4" }, ctx), undefined);
});

test("hook context reaches the model through the tool result", async (t) => {
  const entries = [
    { event: "pre-tool", matcher: "Write", command: `echo '{"hookSpecificOutput":{"additionalContext":"pre note"}}'` },
    { event: "post-tool", matcher: "Write", command: `cat > /dev/null; echo '{"hookSpecificOutput":{"additionalContext":"post note"}}'` },
  ];
  const { events, ctx } = await load(t, entries);
  assert.equal(await events.get("tool_call")({ toolName: "write", input: { path: "f", content: "x" }, toolCallId: "w1" }, ctx), undefined);
  const result = await events.get("tool_result")(
    { toolName: "write", input: { path: "f", content: "x" }, toolCallId: "w1", content: [{ type: "text", text: "wrote f" }] },
    ctx,
  );
  assert.deepEqual(result.content, [
    { type: "text", text: "wrote f" },
    { type: "text", text: "pre note\n\npost note" },
  ]);
});

test("broken hooks and runtime errors never block a tool", async (t) => {
  const entries = [{ event: "pre-tool", matcher: "Bash", command: "bash /nonexistent/guard.sh" }];
  const { events, logs, ctx } = await load(t, entries);
  assert.equal(await events.get("tool_call")({ toolName: "bash", input: { command: "ls" }, toolCallId: "b1" }, ctx), undefined);
  assert.equal(await events.get("tool_call")(undefined, ctx), undefined);
  assert.ok(logs.some((line) => /exited 127/.test(line)));
  assert.ok(logs.some((line) => /hook runtime error/.test(line)));
});

test("stop hooks run when the agent settles and cannot block", async (t) => {
  const entries = [{ event: "stop", command: "echo 'keep going' >&2; exit 2" }];
  const { events, logs, ctx } = await load(t, entries);
  assert.equal(await events.get("agent_settled")({ aborted: false }, ctx), undefined);
  assert.ok(logs.some((line) => /Pi cannot do: keep going/.test(line)));
});
