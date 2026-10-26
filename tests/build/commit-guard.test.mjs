import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const hook = "hooks/commit-tools/scripts/intercept-git-commit.sh";
function check(command) {
  return spawnSync("bash", [hook], {
    input: JSON.stringify({ tool_input: { command } }), encoding: "utf8",
  });
}

test("Claude guard blocks compound, nested and option-prefixed direct commits", () => {
  for (const command of [
    "git commit -m test",
    "git status; git commit -m test",
    "git diff && git commit --amend --no-edit",
    "value=$(git commit -m test)",
    "git -C '/tmp/repo with spaces' commit -m test",
    "git -c core.hooksPath=/tmp/hooks commit -m test",
    "git --git-dir=/tmp/repo/.git commit -m test",
    '"git" "commit" -m test',
    'bash -c "git commit -m test"',
    "sh -c 'git status; git commit -m test'",
    'echo "$(git commit -m test)"',
    'echo "`git commit -m test`"',
    "git \\\ncommit -m test",
    "/usr/bin/git commit -m test",
    '__GIT_COMMIT_PLUGIN__=1 git status; git commit -m test',
    'echo __GIT_COMMIT_PLUGIN__=1; git commit -m test',
    'git commit -m "__GIT_COMMIT_PLUGIN__=1"',
  ]) {
    const result = check(command);
    assert.equal(result.status, 2, `${command}: ${result.stderr}`);
    assert.match(result.stderr, /commit-action|\/commit/);
  }
});

test("guard permits read-only Git and the scoped workflow convention", () => {
  for (const command of [
    "git status", "git log -1 --format=%B", "git show HEAD", "git diff --cached",
    "git log --grep='git commit'", "git -C /tmp/repo log -1",
    "__GIT_COMMIT_PLUGIN__=1 git commit -m test",
    "git status; __GIT_COMMIT_PLUGIN__=1 git commit --amend -F /tmp/message",
  ]) {
    const result = check(command);
    assert.equal(result.status, 0, `${command}: ${result.stderr}`);
  }
});

test("malformed hook input fails closed with a useful error", () => {
  const result = spawnSync("bash", [hook], { input: "{", encoding: "utf8" });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /input|JSON/i);
});

// The guard needs only bash and jq; without jq it does nothing.
test("without jq the guard allows everything, and it never needs node", async () => {
  const { mkdtemp, symlink } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { join } = await import("node:path");
  const toolDir = async (tools) => {
    const bin = await mkdtemp(join(tmpdir(), "guard-bin-"));
    for (const tool of tools) {
      const found = spawnSync("bash", ["-c", `type -P ${tool}`], { encoding: "utf8" }).stdout.trim();
      await symlink(found, join(bin, tool));
    }
    return bin;
  };
  const run = (bin, command) =>
    spawnSync(join(bin, "bash"), [hook], { input: JSON.stringify({ tool_input: { command } }), encoding: "utf8", env: { PATH: bin } });

  const noJq = await toolDir(["bash", "cat", "tr"]);
  assert.equal(run(noJq, "git commit -m test").status, 0);

  const noNode = await toolDir(["bash", "cat", "tr", "jq"]);
  assert.equal(run(noNode, "ls -la").status, 0);
  const blocked = run(noNode, "git status; git commit -m test");
  assert.equal(blocked.status, 2, blocked.stderr);
  assert.match(blocked.stderr, /commit-action/);
});

test("a very long command is answered quickly instead of timing out into a pass", () => {
  const prose = "This note explains how git commit works. ".repeat(2500);
  const started = Date.now();
  const long = check(`cat > notes.md <<'EOF'\n${prose}\nEOF`);
  assert.equal(long.status, 2, long.stderr);
  assert.match(long.stderr, /commit-action|\/commit/);
  assert.ok(Date.now() - started < 3000, `took ${Date.now() - started}ms`);
  // Long text that never names a commit is untouched.
  assert.equal(check(`cat > notes.md <<'EOF'\n${"plain words. ".repeat(8000)}\nEOF`).status, 0);
});
