import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runEvent, runHook } from "../../harnesses/lib/hook-runner.mjs";

async function scripts() {
  const dir = await mkdtemp(join(tmpdir(), "hook-runner-"));
  const files = {
    "allow.sh": "cat > \"$(dirname \"$0\")/stdin.json\"\nexit 0\n",
    "block.sh": "echo 'use /commit instead' >&2\nexit 2\n",
    "context.sh": "echo '{\"hookSpecificOutput\":{\"additionalContext\":\"remember the graph\"}}'\n",
    "plain.sh": "echo 'plain reminder'\n",
    "hang.sh": "sleep 30\n",
    "crash.sh": "echo boom >&2\nexit 1\n",
  };
  for (const [name, body] of Object.entries(files)) await writeFile(join(dir, name), `#!/bin/bash\n${body}`);
  return dir;
}

function logger() {
  const lines = [];
  return { lines, log: (line) => lines.push(line) };
}

test("exit 0 allows and passes the Claude-shaped input on stdin", async () => {
  const dir = await scripts();
  const result = await runHook({ command: `bash ${dir}/allow.sh`, input: { hook_event_name: "PreToolUse", tool_name: "Bash" } });
  assert.deepEqual(result, { blocked: false });
  assert.deepEqual(JSON.parse(await readFile(join(dir, "stdin.json"), "utf8")), { hook_event_name: "PreToolUse", tool_name: "Bash" });
});

test("exit 2 blocks with stderr as the reason", async () => {
  const dir = await scripts();
  assert.deepEqual(await runHook({ command: `bash ${dir}/block.sh`, input: {} }), { blocked: true, reason: "use /commit instead" });
});

test("additionalContext on stdout is returned as context", async () => {
  const dir = await scripts();
  assert.deepEqual(await runHook({ command: `bash ${dir}/context.sh`, input: {} }), { blocked: false, context: "remember the graph" });
  assert.deepEqual(await runHook({ command: `bash ${dir}/plain.sh`, input: {}, plainStdoutIsContext: true }), {
    blocked: false,
    context: "plain reminder",
  });
  assert.deepEqual(await runHook({ command: `bash ${dir}/plain.sh`, input: {} }), { blocked: false });
});

test("a hook that hangs past its timeout is killed and does not block", async () => {
  const dir = await scripts();
  const { lines, log } = logger();
  const started = Date.now();
  const result = await runHook({ command: `bash ${dir}/hang.sh`, input: {}, timeoutMs: 200, log });
  assert.deepEqual(result, { blocked: false });
  assert.ok(Date.now() - started < 5000, "returned promptly");
  assert.match(lines.join("\n"), /timed out after 200ms/);
});

test("a missing script does not block", async () => {
  const { lines, log } = logger();
  assert.deepEqual(await runHook({ command: "bash /nonexistent/hook.sh", input: {}, log }), { blocked: false });
  assert.match(lines.join("\n"), /exited 127/);
});

test("a crash or spawn failure does not block and never throws", async () => {
  const dir = await scripts();
  const { lines, log } = logger();
  assert.deepEqual(await runHook({ command: `bash ${dir}/crash.sh`, input: {}, log }), { blocked: false });
  assert.match(lines.join("\n"), /exited 1: boom/);
  assert.deepEqual(await runHook({ command: "true", input: {}, cwd: "/nonexistent-dir", log }), { blocked: false });
  assert.deepEqual(await runHook({ command: "true", input: 1n, log }), { blocked: false });
});

test("runEvent runs matching manifest entries and stops at the first block", async () => {
  const dir = await scripts();
  const entries = [
    { event: "pre-tool", matcher: "Grep", command: `bash ${dir}/crash.sh` },
    { event: "pre-tool", matcher: "Bash|mcp__.*git.*commit", command: `bash ${dir}/context.sh` },
    { event: "pre-tool", matcher: "Bash|mcp__.*git.*commit", command: `bash ${dir}/block.sh` },
    { event: "pre-tool", command: `bash ${dir}/hang.sh` },
    { event: "session-start", command: `bash ${dir}/plain.sh` },
  ];
  const { lines, log } = logger();
  assert.deepEqual(await runEvent({ entries, event: "pre-tool", target: "mcp__git__commit", input: {}, log }), {
    blocked: true,
    reason: "use /commit instead",
    context: ["remember the graph"],
  });
  assert.deepEqual(lines, [], "the Grep-only hook did not run");
  assert.deepEqual(await runEvent({ entries, event: "session-start", target: "startup", input: {} }), {
    blocked: false,
    context: ["plain reminder"],
  });
});
