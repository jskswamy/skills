import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const wrappers = [
  ["commands/codebase/ask.md", "codebase-ask"],
  ["commands/codebase/index.md", "codebase-index"],
  ["commands/codebase/impact.md", "codebase-impact"],
  ["commands/codebase/graph.md", "codebase-graph"],
];

test("codebase commands are thin wrappers over skills", async () => {
  for (const [path, skill] of wrappers) {
    const content = await readFile(path, "utf8");
    assert.match(content, /^---[\s\S]*?---/, `${path} keeps frontmatter`);
    assert.match(content, new RegExp(`\\b${skill}\\b`), `${path} names ${skill}`);
    assert.match(content, /Forward all arguments/i, `${path} forwards arguments`);
    assert.ok(content.split("\n").length <= 25, `${path} should be a thin wrapper`);
  }
});
