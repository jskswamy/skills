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
  await cp(resolve("skills/commit-tools/commit"), skill, { recursive: true });
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
    ["Add initial file\n", [], { __GIT_COMMIT_PLUGIN__: "" }, /validate/i],
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

test("history replay uses the commit skill and requires approval before amendments", async (t) => {
  const { cwd, git, commit, run } = await fixture(t);
  assert.equal((await commit("Add initial file\n")).status, 0);
  const head = git("rev-parse", "HEAD");
  const tree = git("rev-parse", "HEAD^{tree}");
  const plan = join(cwd, "plan.yaml"), msgs = join(cwd, "messages with spaces");
  await writeFile(plan, `actions:\n  - hash: ${head}\n    action: reword\n    new_message: |\n      Explain initial fixture\n\n      Preserve the original file tree.\n`);
  const build = run("bash", [resolve("skills/commit-tools/review-commits/lib/build-todo.sh"), plan, msgs]);
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

test("approved split replay finishes without pausing before its commit calls", async (t) => {
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
  const build = run("bash", [resolve("skills/commit-tools/review-commits/lib/build-todo.sh"), plan, msgs]);
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
  const result = run("bash", [resolve("skills/commit-tools/review-commits/lib/apply-split.sh"), head, "/missing-plan"], { __GIT_COMMIT_PLUGIN__: "" });
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
  const result = run("bash", [resolve("skills/commit-tools/review-commits/lib/apply-split.sh"), head, "/missing-plan"]);
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

test("fixup creates plain fixup! commit even for pushed or other-author ancestor and autosquashes", async (t) => {
  const { cwd, skill, git, commit, run } = await fixture(t);
  assert.equal((await commit("Add initial file\n")).status, 0);
  const rootSha = git("rev-parse", "HEAD");
  await writeFile(join(cwd, "a.txt"), "v1\n");
  git("add", "a.txt");
  git("-c", "user.email=other@example.com", "commit", "-q", "-m", "Add alpha module");
  const targetA = git("rev-parse", "HEAD");
  await writeFile(join(cwd, "b.txt"), "b1\n");
  git("add", "b.txt");
  assert.equal((await commit("Add beta module\n")).status, 0);
  git("update-ref", "refs/remotes/origin/main", "HEAD");

  await writeFile(join(cwd, "a.txt"), "v2\n");
  git("add", "a.txt");
  const res = run("bash", [join(skill, "lib/commit.sh"), "--fixup", targetA]);
  assert.equal(res.status, 0, res.stderr);
  assert.equal(git("log", "-1", "--format=%s"), "fixup! Add alpha module");

  const rebase = run("git", ["rebase", "-i", "--autosquash", rootSha], { GIT_EDITOR: "true", GIT_SEQUENCE_EDITOR: "true" });
  assert.equal(rebase.status, 0, rebase.stderr);
  assert.equal(git("rev-list", "--count", `${rootSha}..HEAD`), "2");
  assert.equal(git("log", "--reverse", "--format=%s", `${rootSha}..HEAD`), "Add alpha module\nAdd beta module");
  assert.equal(await readFile(join(cwd, "a.txt"), "utf8"), "v2\n");
});

test("fixup with --message-file validates and creates amend! commit that replaces message on autosquash", async (t) => {
  const { cwd, git, commit, run } = await fixture(t);
  assert.equal((await commit("Add initial file\n")).status, 0);
  const rootSha = git("rev-parse", "HEAD");
  await writeFile(join(cwd, "a.txt"), "v1\n");
  git("add", "a.txt");
  assert.equal((await commit("Add alpha module\n\nOriginal alpha rationale.\n")).status, 0);
  const targetA = git("rev-parse", "HEAD");
  await writeFile(join(cwd, "b.txt"), "b1\n");
  git("add", "b.txt");
  assert.equal((await commit("Add beta module\n")).status, 0);
  git("update-ref", "refs/remotes/origin/main", "HEAD");

  await writeFile(join(cwd, "a.txt"), "v2\n");
  git("add", "a.txt");
  // Invalid style and AI attribution are rejected before creating amend! commit.
  assert.notEqual((await commit("Added alpha module\n", ["--fixup", targetA])).status, 0);
  assert.notEqual((await commit("Add alpha module\n\nCo-Authored-By: Claude <bot@anthropic.com>\n", ["--fixup", targetA])).status, 0);

  const replacement = "Update alpha module with validation\n\nHandle edge cases caught during PR review.\n\nSigned-off-by: Test User <test@example.com>\n";
  const ok = await commit(replacement, [`--fixup=${targetA}`]);
  assert.equal(ok.status, 0, ok.stderr);
  assert.equal(git("log", "-1", "--format=%s"), "amend! Add alpha module");

  const rebase = run("git", ["rebase", "-i", "--autosquash", rootSha], { GIT_EDITOR: "true", GIT_SEQUENCE_EDITOR: "true" });
  assert.equal(rebase.status, 0, rebase.stderr);
  assert.equal(git("rev-list", "--count", `${rootSha}..HEAD`), "2");
  const newA = git("rev-parse", "HEAD~1");
  assert.equal(git("log", "-1", "--format=%B", newA).trim(), replacement.trim());
  assert.equal(await readFile(join(cwd, "a.txt"), "utf8"), "v2\n");
});

test("fixup targets root commit in both plain and message-adjusted modes", async (t) => {
  const { cwd, skill, git, commit, run } = await fixture(t);
  assert.equal((await commit("Add initial file\n")).status, 0);
  const rootSha = git("rev-parse", "HEAD");
  await writeFile(join(cwd, "file.txt"), "root fix\n");
  git("add", "file.txt");
  const plain = run("bash", [join(skill, "lib/commit.sh"), "--fixup", rootSha]);
  assert.equal(plain.status, 0, plain.stderr);
  assert.equal(git("log", "-1", "--format=%s"), "fixup! Add initial file");
  const r1 = run("git", ["rebase", "-i", "--autosquash", "--root"], { GIT_EDITOR: "true", GIT_SEQUENCE_EDITOR: "true" });
  assert.equal(r1.status, 0, r1.stderr);
  assert.equal(git("rev-list", "--count", "HEAD"), "1");

  const newRoot = git("rev-parse", "HEAD");
  await writeFile(join(cwd, "file.txt"), "root fix 2\n");
  git("add", "file.txt");
  const adj = await commit("Refine initial file\n\nInclude follow-up root fixture update.\n", ["--fixup", newRoot]);
  assert.equal(adj.status, 0, adj.stderr);
  const r2 = run("git", ["rebase", "-i", "--autosquash", "--root"], { GIT_EDITOR: "true", GIT_SEQUENCE_EDITOR: "true" });
  assert.equal(r2.status, 0, r2.stderr);
  assert.equal(git("rev-list", "--count", "HEAD"), "1");
  assert.equal(git("log", "-1", "--format=%s"), "Refine initial file");
  assert.match(git("log", "-1", "--format=%b"), /follow-up root fixture update/);
});

test("fixup rejects invalid targets, bad options, non-ancestors, merges, chained fixups, and empty index", async (t) => {
  const { cwd, skill, git, commit, run } = await fixture(t);
  assert.equal((await commit("Add initial file\n")).status, 0);
  const base = git("rev-parse", "HEAD");

  // Create a commit on an unrelated branch (non-ancestor of main).
  git("checkout", "-q", "-b", "side");
  await writeFile(join(cwd, "side.txt"), "side\n");
  git("add", "side.txt");
  assert.equal((await commit("Add side branch file\n")).status, 0);
  const sideSha = git("rev-parse", "HEAD");

  // Create a merge commit on main.
  git("checkout", "-q", "-");
  await writeFile(join(cwd, "main.txt"), "main\n");
  git("add", "main.txt");
  assert.equal((await commit("Add main branch file\n")).status, 0);
  git("merge", "-q", "--no-ff", "side", "-m", "Merge side");
  const mergeSha = git("rev-parse", "HEAD");

  // Create another non-ancestor commit on side after merge.
  git("checkout", "-q", "side");
  await writeFile(join(cwd, "side2.txt"), "side2\n");
  git("add", "side2.txt");
  assert.equal((await commit("Add second side file\n")).status, 0);
  const nonAncestor = git("rev-parse", "HEAD");
  git("checkout", "-q", "-");

  // Create a fixup! commit so we can test chained fixup rejection.
  await writeFile(join(cwd, "file.txt"), "fix1\n");
  git("add", "file.txt");
  assert.equal(run("bash", [join(skill, "lib/commit.sh"), "--fixup", base]).status, 0);
  const fixupSha = git("rev-parse", "HEAD");

  // Empty index fails cleanly in both Mode A and Mode B.
  assert.notEqual(run("bash", [join(skill, "lib/commit.sh"), "--fixup", base]).status, 0);
  assert.notEqual((await commit("Update initial file\n", ["--fixup", base])).status, 0);

  // Stage a change for option & target validation checks.
  await writeFile(join(cwd, "file.txt"), "fix2\n");
  git("add", "file.txt");

  const exec = (args, overrides = {}) => run("bash", [join(skill, "lib/commit.sh"), ...args], overrides);
  for (const [args, env, pattern] of [
    [["--fixup", base], { __GIT_COMMIT_PLUGIN__: "" }, /validate/i],
    [["--fixup"], {}, /missing/i],
    [["--fixup="], {}, /empty/i],
    [["--fixup=-m"], {}, /invalid fixup target/i],
    [[`--fixup=amend:${base}`], {}, /amend:\/reword:/i],
    [[`--fixup=reword:${base}`], {}, /amend:\/reword:/i],
    [["--fixup", base, "--amend"], {}, /combine/i],
    [["--fixup", base, "--allow-style-override"], {}, /--message-file/i],
    [["--fixup", "deadbeef0000"], {}, /invalid fixup target/i],
    [["--fixup", nonAncestor], {}, /not an ancestor/i],
    [["--fixup", mergeSha], {}, /merge commit/i],
    [["--fixup", fixupSha], {}, /fixup!\/amend!\/squash!/i],
  ]) {
    const r = exec(args, env);
    assert.notEqual(r.status, 0, `expected failure for ${args.join(" ")}`);
    assert.match(r.stderr, pattern, `unexpected stderr for ${args.join(" ")}: ${r.stderr}`);
  }
  assert.equal(sideSha.length >= 40, true);
});
