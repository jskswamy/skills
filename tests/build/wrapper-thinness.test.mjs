import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const wrappers = [
  ["commands/codebase/ask.md", "codebase-ask"],
  ["commands/codebase/index.md", "codebase-index"],
  ["commands/codebase/impact.md", "codebase-impact"],
  ["commands/codebase/graph.md", "codebase-graph"],
  ["commands/commit-tools/commit.md", "commit-action"],
  ["commands/craft/backlog.md", "craft-backlog"],
  ["commands/craft/decompose.md", "craft-decompose"],
  ["commands/craft/deps.md", "craft-deps"],
  ["commands/craft/epic.md", "craft-epic"],
  ["commands/craft/execute.md", "execute-tasks"],
  ["commands/craft/park.md", "park-idea"],
  ["commands/craft/parked.md", "review-parked"],
  ["commands/craft/task.md", "craft-task"],
  ["commands/guardrails/handoff.md", "ide-handoff"],
  ["commands/jot/capture.md", "jot-capture"],
  ["commands/jot/configure.md", "jot-configure"],
  ["commands/jot/setup.md", "jot-setup"],
  ["commands/refactor/scan.md", "refactor-scan"],
  ["commands/sketch-note/sketch.md", "sketch-note"],
  ["commands/study/coach.md", "study-coach"],
  ["commands/study/recall.md", "study-recall"],
  ["commands/study/setup.md", "study-setup"],
  ["commands/typst-notes/publish.md", "typst-publish"],
];

test("commands are thin wrappers over skills", async () => {
  for (const [path, skill] of wrappers) {
    const content = await readFile(path, "utf8");
    assert.match(content, /^---[\s\S]*?---/, `${path} keeps frontmatter`);
    assert.match(content, new RegExp(`\\b${skill}\\b`), `${path} names ${skill}`);
    assert.match(content, /Forward all arguments/i, `${path} forwards arguments`);
    const body = content.replace(/^---[\s\S]*?---\s*/, "");
    assert.ok(body.split("\n").filter(Boolean).length <= 5, `${path} should be a thin wrapper`);
  }
});
