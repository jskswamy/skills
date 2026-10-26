import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

// Plugin runtime must not need node: drop every PATH entry that provides it.
const PATH_WITHOUT_NODE = (process.env.PATH || "").split(delimiter)
  .filter((dir) => dir && !existsSync(join(dir, "node"))).join(delimiter);

// Copy only this skill: no plugin root, sibling skills, or project instructions.
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "commit workflow "));
  t.after(() => rm(root, { recursive: true, force: true }));
  const skill = join(root, "installed skill");
  const cwd = join(root, "repo");
  await cp(resolve("skills/commit-action"), skill, { recursive: true });
  await mkdir(cwd);
  const env = { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1", __GIT_COMMIT_PLUGIN__: "1", PATH: PATH_WITHOUT_NODE };
  const run = (cmd, args, overrides = {}) => spawnSync(cmd, args, { cwd, env: { ...env, ...overrides }, encoding: "utf8" });
  const git = (...args) => {
    const result = run("git", args);
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };
  git("init", "-q");
  git("config", "user.name", "Test User");
  git("config", "user.email", "test@example.com");
  git("config", "commit.gpgsign", "false");
  const message = join(root, "message.txt");
  const commit = async (text, flags = [], overrides = {}) => {
    await writeFile(message, text);
    return run("bash", [join(skill, "lib/commit.sh"), "--message-file", message, ...flags], overrides);
  };
  await writeFile(join(cwd, "file.txt"), "initial\n");
  git("add", "file.txt");
  return { cwd, skill, git, commit, run };
}

test("standalone commit skill creates a validated local commit without project configuration", async (t) => {
  const { git, commit } = await fixture(t);
  const result = await commit("Add initial file\n\nKeep a small fixture for commit workflow checks.\n");
  assert.equal(result.status, 0, result.stderr);
  assert.equal(git("log", "-1", "--format=%s"), "Add initial file");
  assert.equal(git("status", "--porcelain"), "");
  assert.equal(git("remote"), "");
});

test("the executor runs without node on PATH", async (t) => {
  const { run } = await fixture(t);
  assert.notEqual(run("bash", ["-c", "command -v node"]).status, 0, "node must be absent from the test PATH");
});

test("body width counts characters, not bytes", async (t) => {
  const { git, commit } = await fixture(t);
  const wide = "é".repeat(72);
  const accepted = await commit(`Add initial file\n\n${wide}\n`);
  assert.equal(accepted.status, 0, accepted.stderr);
  assert.equal(git("log", "-1", "--format=%b"), wide);
  const rejected = await commit(`Add initial file\n\n${wide}é\n`, ["--amend"]);
  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stderr, /72/);
});

test("message-only amend keeps the tree and leaves unrelated unstaged files alone", async (t) => {
  const { cwd, git, commit } = await fixture(t);
  assert.equal((await commit("Add initial file\n")).status, 0);
  const tree = git("rev-parse", "HEAD^{tree}");
  await writeFile(join(cwd, "file.txt"), "unrelated edit\n");
  const result = await commit("Document initial fixture\n\nExplain why this fixture exists.\n", ["--amend"]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(git("rev-list", "--count", "HEAD"), "1");
  assert.equal(git("rev-parse", "HEAD^{tree}"), tree);
  assert.equal(git("log", "-1", "--format=%s"), "Document initial fixture");
  assert.equal(await readFile(join(cwd, "file.txt"), "utf8"), "unrelated edit\n");
});

test("executor rejects missing approval and invalid messages before writing commits", async (t) => {
  const { commit, git } = await fixture(t);
  for (const [message, flags, env, reason] of [
    ["Add initial file\n", [], { __GIT_COMMIT_PLUGIN__: "" }, /confirm/i],
    ["Added initial file\n", [], {}, /imperative/],
    ["Add initial file\n\nCo-Authored-By: Claude <bot@anthropic.com>\n", [], {}, /attribution/i],
    ["Add initial file\n\n" + "x".repeat(73), [], {}, /72/],
    ["Add initial file\n", ["--style", "unknown"], {}, /style/i],
  ]) {
    const result = await commit(message, flags, env);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr + result.stdout, reason);
  }
  assert.equal(git("diff", "--cached", "--name-only"), "file.txt");
});

test("a style override cannot bypass a missing bundled validator resource", async (t) => {
  const { skill, commit } = await fixture(t);
  await rm(join(skill, "styles/classic.md"));
  const result = await commit("Add initial file\n", ["--allow-style-override"]);
  assert.notEqual(result.status, 0);
});

test("conventional style works from a standalone skill copy", async (t) => {
  const { git, commit } = await fixture(t);
  const result = await commit("test: add fixture\n", ["--style", "conventional"]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(git("log", "-1", "--format=%s"), "test: add fixture");
});

test("history replay uses commit-action and requires approval before amendments", async (t) => {
  const { cwd, git, commit, run } = await fixture(t);
  assert.equal((await commit("Add initial file\n")).status, 0);
  const head = git("rev-parse", "HEAD");
  const tree = git("rev-parse", "HEAD^{tree}");
  const plan = join(cwd, "plan.yaml"), msgs = join(cwd, "messages with spaces");
  await writeFile(plan, `actions:\n  - hash: ${head}\n    action: reword\n    new_message: |\n      Explain initial fixture\n\n      Preserve the original file tree.\n`);
  const build = run("bash", [resolve("skills/review-commits/lib/build-todo.sh"), plan, msgs]);
  assert.equal(build.status, 0, build.stderr);
  const line = build.stdout.split("\n").find((line) => line.startsWith("exec "));
  const rejected = run("bash", ["-c", line.slice(5)], { __GIT_COMMIT_PLUGIN__: "" });
  assert.notEqual(rejected.status, 0, "replay must not mint its own approval token");
  assert.equal(git("rev-parse", "HEAD"), head);
  const approved = run("bash", ["-c", line.slice(5)]);
  assert.equal(approved.status, 0, approved.stderr);
  assert.equal(git("log", "-1", "--format=%s"), "Explain initial fixture");
  assert.equal(git("rev-parse", "HEAD^{tree}"), tree);
});

test("approved split replay finishes without pausing before its commit-action calls", async (t) => {
  const { cwd, git, commit, run } = await fixture(t);
  assert.equal((await commit("Add initial file\n")).status, 0);
  const base = git("rev-parse", "HEAD");
  await writeFile(join(cwd, "a.txt"), "a\n");
  await writeFile(join(cwd, "b.txt"), "b\n");
  git("add", "a.txt", "b.txt");
  assert.equal((await commit("Add two fixture files\n")).status, 0);
  const hash = git("rev-parse", "HEAD"), tree = git("rev-parse", "HEAD^{tree}");
  const plan = join(cwd, "../split.yaml"), msgs = join(cwd, "../split messages"), todo = join(cwd, "../todo");
  await writeFile(plan, `actions:\n  - hash: ${hash}\n    action: edit\n    split_into:\n      - files: [a.txt]\n        message: |\n          Add first fixture\n      - files: [b.txt]\n        message: |\n          Add second fixture\n`);
  const build = run("bash", [resolve("skills/review-commits/lib/build-todo.sh"), plan, msgs]);
  assert.equal(build.status, 0, build.stderr);
  await writeFile(todo, build.stdout);
  const result = run("git", ["rebase", "-i", base], { GIT_EDITOR: "true", GIT_SEQUENCE_EDITOR: `cat '${todo}' >` });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(git("rev-list", "--count", `${base}..HEAD`), "2", result.stdout + result.stderr);
  assert.equal(git("log", "--reverse", "--format=%s", `${base}..HEAD`), "Add first fixture\nAdd second fixture");
  assert.equal(git("rev-parse", "HEAD^{tree}"), tree);
  assert.equal(git("status", "--porcelain"), "");
});

test("split refuses missing approval before changing HEAD or the index", async (t) => {
  const { git, commit, run } = await fixture(t);
  assert.equal((await commit("Add initial file\n")).status, 0);
  const head = git("rev-parse", "HEAD");
  const result = run("bash", [resolve("skills/review-commits/lib/apply-split.sh"), head, "/missing-plan"], { __GIT_COMMIT_PLUGIN__: "" });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /confirm|approval/i);
  assert.equal(git("rev-parse", "HEAD"), head);
  assert.equal(git("status", "--porcelain"), "");
});

test("split rejects a missing plan before resetting HEAD", async (t) => {
  const { cwd, git, commit, run } = await fixture(t);
  assert.equal((await commit("Add initial file\n")).status, 0);
  await writeFile(join(cwd, "second.txt"), "second\n");
  git("add", "second.txt");
  assert.equal((await commit("Add second fixture\n")).status, 0);
  const head = git("rev-parse", "HEAD");
  const result = run("bash", [resolve("skills/review-commits/lib/apply-split.sh"), head, "/missing-plan"]);
  assert.notEqual(result.status, 0);
  assert.equal(git("rev-parse", "HEAD"), head);
  assert.equal(git("status", "--porcelain"), "");
});

test("amend refuses a different author and a commit on a known remote branch", async (t) => {
  const { git, commit } = await fixture(t);
  assert.equal((await commit("Add initial file\n")).status, 0);
  const head = git("rev-parse", "HEAD");
  git("config", "user.email", "other@example.com");
  const author = await commit("Rename initial fixture\n", ["--amend"]);
  assert.notEqual(author.status, 0);
  assert.match(author.stderr, /author/i);
  git("config", "user.email", "test@example.com");
  git("update-ref", "refs/remotes/origin/main", "HEAD");
  const remote = await commit("Rename initial fixture\n", ["--amend"]);
  assert.notEqual(remote.status, 0);
  assert.match(remote.stderr, /remote/i);
  assert.equal(git("rev-parse", "HEAD"), head);
});
