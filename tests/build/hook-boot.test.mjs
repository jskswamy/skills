import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// A hook that fails or hangs on a plain call would stall or block every
// harness at boot or on its first tool call. Run each canonical hook on benign
// input, as a harness would, and expect a quiet pass inside its timeout.
const BENIGN = {
  SessionStart: { hook_event_name: "SessionStart", source: "startup" },
  SubagentStart: { hook_event_name: "SubagentStart" },
  Stop: { hook_event_name: "Stop", stop_hook_active: false },
  PreToolUse: { hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command: "ls" } },
  PostToolUse: { hook_event_name: "PostToolUse", tool_name: "Write", tool_input: { file_path: "/tmp/notes.txt" }, tool_response: {} },
};

test("every canonical hook passes quietly on benign input within its timeout", async (t) => {
  const cwd = await mkdtemp(join(tmpdir(), "hook-boot-"));
  t.after(() => rm(cwd, { recursive: true, force: true }));
  const repo = process.cwd();
  let ran = 0;
  for (const plugin of await readdir("hooks")) {
    const hooks = JSON.parse(await readFile(join("hooks", plugin, "hooks.json"), "utf8").catch(() => "{}")).hooks ?? {};
    for (const [event, groups] of Object.entries(hooks)) {
      for (const group of groups) {
        for (const hook of group.hooks ?? []) {
          const command = hook.command.replaceAll("${CLAUDE_PLUGIN_ROOT}/hooks/", `${repo}/hooks/${plugin}/`);
          const started = Date.now();
          const run = spawnSync("sh", ["-c", command], { cwd, input: JSON.stringify(BENIGN[event]), encoding: "utf8", timeout: (hook.timeout ?? 10) * 1000 });
          const label = `${plugin} ${event}: ${hook.command}`;
          assert.equal(run.status, 0, `${label} exited ${run.status}: ${run.stderr}`);
          assert.ok(Date.now() - started < 5000, `${label} took ${Date.now() - started}ms`);
          ran++;
        }
      }
    }
  }
  assert.ok(ran > 0);
});
