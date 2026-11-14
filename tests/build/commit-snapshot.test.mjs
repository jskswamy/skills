import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readdir, readFile, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

// The plugin runtime must not need node, as in commit-action.test.mjs.
const PATH_WITHOUT_NODE = (process.env.PATH || "").split(delimiter)
  .filter((dir) => dir && !existsSync(join(dir, "node"))).join(delimiter);
const SCRIPT = resolve("skills/commit-tools/commit/lib/snapshot.sh");

async function repo(t) {
  const root = await mkdtemp(join(tmpdir(), "commit snapshot "));
  t.after(() => rm(root, { recursive: true, force: true }));
  const cwd = join(root, "repo");
  await mkdir(cwd);
  const env = { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1", PATH: PATH_WITHOUT_NODE };
  const run = (cmd, args, dir = cwd) => spawnSync(cmd, args, { cwd: dir, env, encoding: "utf8" });
  const git = (...args) => {
    const r = run("git", args);
    assert.equal(r.status, 0, r.stderr);
    return r.stdout.trim();
  };
  git("init", "-q");
  git("config", "user.name", "Test User");
  git("config", "user.email", "test@example.com");
  git("config", "commit.gpgsign", "false");
  const write = (name, text, dir = cwd) => writeFile(join(dir, name), text);
  const snap = (args = [], dir = cwd) => run("bash", [SCRIPT, ...args], dir);
  // `snapshot <id> <nonce> <files> <dir>`; the dir is the rest of the line (paths may hold spaces).
  const parse = (out) => {
    const m = /^snapshot (\S+) (\S+) (\d+) (.+)$/.exec(out.trim());
    assert.ok(m, `unexpected output: ${out}`);
    return { id: m[1], nonce: m[2], files: Number(m[3]), dir: m[4] };
  };
  return { root, cwd, run, git, write, snap, parse };
}

test("snapshot writes the staged state under the absolute git dir", async (t) => {
  const { cwd, git, write, snap, parse } = await repo(t);
  await write("a.txt", "one\n");
  git("add", "a.txt");
  git("commit", "-q", "-m", "Seed");
  await write("a.txt", "two\n");
  await write("b.txt", "new\n");
  git("add", "a.txt", "b.txt");
  await write("loose.txt", "untracked\n");

  const r = snap();
  assert.equal(r.status, 0, r.stderr);
  const s = parse(r.stdout);
  assert.equal(s.dir, join(git("rev-parse", "--absolute-git-dir"), "commit-relay", s.nonce));
  assert.equal(s.files, 2);
  assert.match(s.id, /^[0-9a-f]{12}-[0-9a-f]{12}$/);

  const read = (f) => readFile(join(s.dir, f), "utf8");
  assert.equal((await read("id.txt")).trim(), s.id);
  assert.equal((await read("staged.files")).trim().split("\n").sort().join(","), "a.txt,b.txt");
  assert.match(await read("staged.stat"), /2 files changed/);
  assert.match(await read("untracked.txt"), /loose\.txt/);
  assert.match(await read("head.txt"), /Seed/);
  assert.match(await read("last-commit.diff"), /Seed/);
  assert.equal((await read("amend-eligible.txt")).trim(), "yes");

  const diff = await read("staged.diff");
  const last = diff.trimEnd().split("\n").at(-1);
  const token = /^relay-token: ([0-9a-f]+)$/.exec(last)?.[1];
  assert.ok(token, "the last line carries the token");
  assert.match(diff, /^\+two$/m);
  assert.ok(!r.stdout.includes(token), "the token is never printed with the snapshot");
  assert.ok(!s.dir.includes(token) && !s.nonce.includes(token));
  for (const f of await readdir(s.dir)) if (f !== "staged.diff") assert.ok(!(await read(f)).includes(token), f);

  const tok = snap(["--token", s.dir]);
  assert.equal(tok.status, 0, tok.stderr);
  assert.equal(tok.stdout.trim(), token);
  assert.equal(snap(["--id"]).stdout.trim(), s.id);
  assert.equal(git("status", "--porcelain", "--", ".git"), "", "nothing under .git shows in status");
  assert.ok(existsSync(join(cwd, ".git", "commit-relay")));
});

test("the id changes on git add and on a new commit, not on an unstaged edit", async (t) => {
  const { git, write, snap } = await repo(t);
  await write("a.txt", "one\n");
  git("add", "a.txt");
  git("commit", "-q", "-m", "Seed");
  await write("a.txt", "two\n");
  git("add", "a.txt");
  const id = () => snap(["--id"]).stdout.trim();
  const first = id();
  await write("a.txt", "three, unstaged\n");
  assert.equal(id(), first, "an unstaged edit is not part of the commit");
  await write("c.txt", "more\n");
  git("add", "c.txt");
  const staged = id();
  assert.notEqual(staged, first);
  git("commit", "-q", "-m", "Next");
  assert.notEqual(id(), staged);
});

test("a repository with no commits uses root as the head", async (t) => {
  const { git, write, snap, parse } = await repo(t);
  await write("a.txt", "one\n");
  git("add", "a.txt");
  const r = snap();
  assert.equal(r.status, 0, r.stderr);
  const s = parse(r.stdout);
  assert.match(s.id, /^root-[0-9a-f]{12}$/);
  assert.equal((await readFile(join(s.dir, "head.txt"), "utf8")).trim(), "no commits");
  assert.ok(!existsSync(join(s.dir, "last-commit.diff")));
  assert.equal((await readFile(join(s.dir, "amend-eligible.txt"), "utf8")).trim(), "no");
});

test("amend is not eligible for another author or a pushed HEAD", async (t) => {
  const { root, git, write, snap, parse } = await repo(t);
  const eligible = async () => (await readFile(join(parse(snap().stdout).dir, "amend-eligible.txt"), "utf8")).trim();
  await write("a.txt", "one\n");
  git("add", "a.txt");
  git("-c", "user.email=other@example.com", "commit", "-q", "-m", "Theirs");
  await write("b.txt", "two\n");
  git("add", "b.txt");
  assert.equal(await eligible(), "no", "another author");

  git("commit", "-q", "-m", "Mine");
  await write("c.txt", "three\n");
  git("add", "c.txt");
  assert.equal(await eligible(), "yes", "own, unpushed");

  git("init", "-q", "--bare", join(root, "remote.git"));
  git("remote", "add", "origin", join(root, "remote.git"));
  git("push", "-q", "origin", "HEAD:main");
  git("fetch", "-q", "origin");
  assert.equal(await eligible(), "no", "pushed");
});

test("cleanup removes only the caller's previous folder and folders older than a day", async (t) => {
  const { root, git, write, snap, parse } = await repo(t);
  await write("a.txt", "one\n");
  git("add", "a.txt");
  const mine = parse(snap().stdout);
  const other = parse(snap().stdout); // another session's fresh folder
  const old = parse(snap().stdout);
  const dayAgo = (Date.now() - 25 * 3600 * 1000) / 1000;
  await utimes(old.dir, dayAgo, dayAgo);
  const outside = join(root, "keep-me");
  await mkdir(outside);

  const next = parse(snap(["--prev", mine.dir]).stdout);
  assert.ok(existsSync(next.dir));
  assert.ok(!existsSync(mine.dir), "--prev folder removed");
  assert.ok(existsSync(other.dir), "another session's fresh folder kept");
  assert.ok(!existsSync(old.dir), "folder older than 24 hours removed");

  const again = snap(["--prev", outside]);
  assert.equal(again.status, 0, again.stderr);
  assert.ok(existsSync(outside), "--prev outside commit-relay deletes nothing");
});

test("a linked worktree gets its own snapshot folder", async (t) => {
  const { root, git, write, snap, parse } = await repo(t);
  await write("a.txt", "one\n");
  git("add", "a.txt");
  git("commit", "-q", "-m", "Seed");
  const wt = join(root, "linked tree");
  git("worktree", "add", "-q", "-b", "linked", wt);
  await write("w.txt", "in worktree\n", wt);
  const add = spawnSync("git", ["add", "w.txt"], { cwd: wt, encoding: "utf8", env: { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null" } });
  assert.equal(add.status, 0, add.stderr);
  const r = snap([], wt);
  assert.equal(r.status, 0, r.stderr);
  const s = parse(r.stdout);
  const gitDir = spawnSync("git", ["rev-parse", "--absolute-git-dir"], { cwd: wt, encoding: "utf8" }).stdout.trim();
  assert.equal(s.dir, join(gitDir, "commit-relay", s.nonce));
  assert.equal((await readFile(join(s.dir, "staged.files"), "utf8")).trim(), "w.txt");
});

test("a staged diff over 400,000 chars fails cleanly", async (t) => {
  const { cwd, git, write, snap } = await repo(t);
  await write("big.txt", "x".repeat(100) + "\n".repeat(1) + ("y".repeat(99) + "\n").repeat(4100));
  git("add", "big.txt");
  const r = snap();
  assert.notEqual(r.status, 0);
  assert.equal(r.stdout.trim(), "snapshot-failed too-large");
  const relay = join(cwd, ".git", "commit-relay");
  assert.deepEqual(existsSync(relay) ? await readdir(relay) : [], [], "no folder left behind");
});

test("outside a git repository it fails cleanly", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "no repo "));
  t.after(() => rm(root, { recursive: true, force: true }));
  const r = spawnSync("bash", [SCRIPT], { cwd: root, encoding: "utf8", env: { ...process.env, GIT_CEILING_DIRECTORIES: root } });
  assert.notEqual(r.status, 0);
  assert.match(r.stdout, /^snapshot-failed /);
});
