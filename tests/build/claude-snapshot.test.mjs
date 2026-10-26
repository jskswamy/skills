import test from "node:test";
import assert from "node:assert/strict";
import { readJson } from "../../scripts/lib/fs-utils.mjs";
import { buildClaudeSnapshot } from "../fixtures/update-claude-snapshot.mjs";

const fixture = await readJson("tests/fixtures/claude-snapshot.json");

test("generated Claude output matches the committed snapshot", async () => {
  const actual = await buildClaudeSnapshot(".");
  const changed = [...new Set([...Object.keys(fixture), ...Object.keys(actual)])]
    .filter((path) => fixture[path] !== actual[path])
    .sort();
  assert.deepEqual(
    changed,
    [],
    "Claude output changed; if intended, run: node tests/fixtures/update-claude-snapshot.mjs",
  );
});
