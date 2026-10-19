import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

async function load(t) {
  const { default: extension } = await import("../../harnesses/pi/extensions/commit-tools.js");
  const commands = new Map(), events = new Map(), messages = [];
  const cwd = await mkdtemp(join(tmpdir(), "pi bare repo "));
  t.after(() => rm(cwd, { recursive: true, force: true }));
  const pi = {
    registerCommand: (name, command) => commands.set(name, command),
    on: (name, handler) => events.set(name, handler),
    sendUserMessage: (message, options) => messages.push({ message, options }),
  };
  extension(pi);
  return { commands, events, messages, ctx: { cwd, isIdle: () => true } };
}

test("/commit loads the installed workflow and preserves arguments without repo instructions", async (t) => {
  const { commands, messages, ctx } = await load(t);
  await commands.get("commit").handler('--amend explain "why"', ctx);
  assert.equal(messages.length, 1);
  assert.match(messages[0].message, /# Commit Action Skill/);
  assert.ok(messages[0].message.includes(resolve("skills/commit-action/SKILL.md")));
  assert.ok(messages[0].message.includes('--amend explain "why"'));
});

test("agent-start routing applies without an explicit user commit request", async (t) => {
  const { events, ctx } = await load(t);
  const result = await events.get("before_agent_start")({ prompt: "Finish the task" }, ctx);
  assert.match(result.message.content, /before.*commit/i);
  assert.ok(result.message.content.includes(resolve("skills/commit-action/SKILL.md")));
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
    assert.equal(result.block, true);
    assert.match(result.reason, /commit-action/);
  }
  assert.equal(await handler({ toolName: "bash", input: { command: "git log -1" } }, ctx), undefined);
  assert.equal(await handler({ toolName: "bash", input: { command: "__GIT_COMMIT_PLUGIN__=1 git commit -m test" } }, ctx), undefined);
});
