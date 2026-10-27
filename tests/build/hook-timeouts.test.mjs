import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

// Claude Code reads a hook timeout in seconds; a millisecond-sized value lets
// a hung hook stall the session for hours. Every hook also needs a non-empty
// statusMessage so harnesses like Codex display a named hook instead of "Unnamed hook".
test("canonical hook timeouts are in seconds and every hook has a statusMessage", async () => {
  const slow = [];
  const unnamed = [];
  for (const plugin of await readdir("hooks")) {
    const path = join("hooks", plugin, "hooks.json");
    const hooks = JSON.parse(await readFile(path, "utf8").catch(() => "{}")).hooks ?? {};
    for (const groups of Object.values(hooks)) {
      for (const group of groups) {
        for (const hook of group.hooks ?? []) {
          if (hook.timeout > 600) slow.push(`${path}: ${hook.command} timeout ${hook.timeout}`);
          if (typeof hook.statusMessage !== "string" || hook.statusMessage.trim() === "") {
            unnamed.push(`${path}: ${hook.command} missing statusMessage`);
          }
        }
      }
    }
  }
  assert.deepEqual(slow, []);
  assert.deepEqual(unnamed, []);
});
