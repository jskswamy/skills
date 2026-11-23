#!/usr/bin/env node
// End-to-end check of the commit drafter relay on Claude Code
// (docs/specs/2026-11-13-commit-relay-design.md, Story 3). Runs real `claude -p`
// sessions, so it costs money: run it by hand, not in npm test.
//
//   node scripts/commit-relay-check.mjs --gate   measure-inline and measure-relay only
//   node scripts/commit-relay-check.mjs          the gate plus the T1–T6 behavior run
//
// Exits 0 when every check passes, 1 otherwise. Prints each drafted message.
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURES = join(repoRoot, "tests/fixtures/commit-relay");
const MODEL = process.env.RELAY_CHECK_MODEL ?? "sonnet";
const gateOnly = process.argv.includes("--gate");

const work = mkdtempSync(join(tmpdir(), "commit-relay-check-"));
const keep = process.argv.includes("--keep");
const failures = [];
const check = (ok, label) => {
  console.log(`${ok ? "ok  " : "FAIL"} - ${label}`);
  if (!ok) failures.push(label);
};

// --- build -------------------------------------------------------------
const build = join(work, "build");
const built = spawnSync("node", [join(repoRoot, "scripts/build.mjs"), "--out", build], { encoding: "utf8" });
if (built.status !== 0) throw new Error(`build failed:\n${built.stderr}`);
const PLUGIN = join(build, "dist/claude-code/plugins/commit-tools");
const LIB = join(PLUGIN, "skills/commit/lib");

const ALLOWED = [
  "Skill", "Agent", "SendMessage", "ToolSearch",
  "Bash(git:*)",
  // read-only shell habits of today's inline flow (settings file, listings)
  "Bash(cat:*)", "Bash(ls:*)", "Bash(head:*)", "Bash(wc:*)", "Bash(test:*)", "Bash(mkdir:*)", "Bash(echo:*)",
  `Bash(bash ${LIB}/snapshot.sh:*)`,
  `Bash(bash ${LIB}/style-check.sh:*)`,
  `Bash(__GIT_COMMIT_PLUGIN__=1 bash ${LIB}/commit.sh:*)`,
  "Edit(//tmp/commit-tools-msg/**)", "Edit(//private/tmp/commit-tools-msg/**)",
  `Read(/${PLUGIN}/**)`,
].join(" ");

// --- scratch repositories ------------------------------------------------
const files = (dir) => (existsSync(dir) ? readdirSync(dir, { recursive: true }).map(String).filter((f) => statSync(join(dir, f)).isFile()) : []);

function freshRepo(name) {
  const dir = join(work, name);
  mkdirSync(dir);
  const git = (...args) => {
    const r = spawnSync("git", args, { cwd: dir, encoding: "utf8", env: { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null" } });
    if (r.status !== 0) throw new Error(`git ${args.join(" ")}: ${r.stderr}`);
    return r.stdout.trim();
  };
  git("init", "-q", "-b", "main");
  git("config", "user.name", "Relay Check");
  git("config", "user.email", "relay-check@example.com");
  git("config", "commit.gpgsign", "false");
  git("init", "-q", "--bare", join(work, `${name}.remote.git`));
  git("remote", "add", "origin", join(work, `${name}.remote.git`));
  // Seed: every fixture's before/ files, committed and pushed, so HEAD is never amend-eligible.
  for (const change of readdirSync(FIXTURES)) copyIn(join(FIXTURES, change, "before"), dir);
  git("add", "-A");
  git("commit", "-q", "-m", "Seed the check repository");
  git("push", "-q", "origin", "main");
  return { dir, git };
}

function copyIn(from, to) {
  const out = [];
  for (const f of files(from)) {
    const target = join(to, f.replace(/\.fixture$/, ""));
    mkdirSync(dirname(target), { recursive: true });
    cpSync(join(from, f), target);
    out.push(relative(to, target));
  }
  return out;
}

function apply(repo, change) {
  const paths = copyIn(join(FIXTURES, change, "after"), repo.dir);
  repo.git("add", "--", ...paths);
  return paths;
}

// --- sessions -------------------------------------------------------------
function turn(repo, prompt, { session, extra = [] } = {}) {
  // The prompt goes right after -p: --allowedTools and --disallowedTools take lists and would swallow it.
  const args = ["-p", prompt, "--setting-sources", "project", "--plugin-dir", PLUGIN, "--model", MODEL,
    "--output-format", "stream-json", "--verbose", "--allowedTools", ALLOWED, ...extra];
  if (session) args.push("--resume", session);
  const r = spawnSync("claude", args, { cwd: repo.dir, encoding: "utf8", input: "", maxBuffer: 64 * 1024 * 1024 });
  const events = r.stdout.split("\n").filter(Boolean).flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } });
  const results = events.filter((e) => e.type === "result");
  if (results.length === 0) console.log(`  (no result from claude; exit ${r.status}; stderr: ${(r.stderr || "").slice(0, 400)})`);
  return {
    events,
    session: results.at(-1)?.session_id ?? events.find((e) => e.session_id)?.session_id,
    text: results.map((e) => e.result ?? "").join("\n"),
    denials: results.flatMap((e) => e.permission_denials ?? []),
    tools: events.filter((e) => e.type === "assistant" && !e.parent_tool_use_id)
      .flatMap((e) => e.message.content.filter((c) => c.type === "tool_use")),
  };
}

// Characters entering the parent: its own text and tool inputs, and every tool result or
// injected message it receives. Sub-agent events (non-null parent_tool_use_id) are excluded.
function parentChars(t) {
  let chars = 0;
  let excluded = 0;
  for (const e of t.events) {
    if (e.type !== "assistant" && e.type !== "user") continue;
    if (e.parent_tool_use_id) { excluded += 1; continue; }
    const content = typeof e.message.content === "string" ? [{ type: "text", text: e.message.content }] : e.message.content;
    for (const c of content) {
      if (c.type === "text") chars += c.text.length;
      else if (c.type === "tool_use") chars += JSON.stringify(c.input).length;
      else if (c.type === "tool_result") chars += typeof c.content === "string" ? c.content.length : JSON.stringify(c.content).length;
    }
  }
  return { chars, excluded };
}

const APPROVE = "Commit. I approve the message shown.";
const commits = (repo) => Number(repo.git("rev-list", "--count", "HEAD"));
const drafterStarts = (t) => t.tools.filter((c) => c.name === "Agent" && /commit-drafter/.test(c.input?.subagent_type ?? "")).length;
const sends = (t) => t.tools.filter((c) => c.name === "SendMessage").length;
// A denial of a step the skill prescribes fails the check; other read-only improvisation is a warning.
// The snapshot folder is .git/commit-relay/; the scratch paths (commit-relay-check-*) must not match.
const PRESCRIBED = /snapshot\.sh|style-check\.sh|commit\.sh|commit-tools-msg|\.git\/commit-relay\//;
const noDenials = (t, label) => {
  const inputs = t.denials.map((d) => JSON.stringify(d.tool_input));
  const prescribed = inputs.filter((i) => PRESCRIBED.test(i));
  for (const other of inputs.filter((i) => !PRESCRIBED.test(i))) console.log(`warn - ${label}: unrelated denial ${other.slice(0, 200)}`);
  check(prescribed.length === 0, `${label}: no denial of a prescribed step${prescribed.length ? ` (${prescribed.join(" | ").slice(0, 400)})` : ""}`);
};
const showMessage = (repo, label) => console.log(`\n--- ${label} ---\n${repo.git("log", "-1", "--format=%B")}`);

function commitOnce(repo, label, { session, extra } = {}) {
  const before = commits(repo);
  const t1 = turn(repo, "/commit-tools:commit --confirm", { session, extra });
  const t2 = turn(repo, APPROVE, { session: t1.session, extra });
  noDenials(t1, `${label} draft turn`);
  noDenials(t2, `${label} approve turn`);
  check(commits(repo) === before + 1, `${label}: one commit created`);
  const a = parentChars(t1);
  const b = parentChars(t2);
  return { session: t2.session ?? t1.session, chars: a.chars + b.chars, excluded: a.excluded + b.excluded, t1, t2 };
}

try {
  // --- measurement (the gate) ----------------------------------------------
  console.log(`# commit relay check (${gateOnly ? "gate" : "full"}), model ${MODEL}, work dir ${work}`);
  const inlineRepo = freshRepo("measure-inline");
  apply(inlineRepo, "change-a");
  const inline = commitOnce(inlineRepo, "measure-inline", { extra: ["--disallowedTools", "Agent SendMessage"] });
  check(drafterStarts(inline.t1) === 0, "measure-inline: no drafter dispatched");
  showMessage(inlineRepo, "inline message (change-a)");

  const relayRepo = freshRepo("measure-relay");
  apply(relayRepo, "change-a");
  const first = commitOnce(relayRepo, "measure-relay first");
  check(drafterStarts(first.t1) === 1, "measure-relay first: drafter started once");
  check(first.excluded > 0, "measure-relay first: sub-agent events were excluded from the count");
  showMessage(relayRepo, "relay message (change-a)");
  relayRepo.git("push", "-q", "origin", "main");
  apply(relayRepo, "change-b");
  const later = commitOnce(relayRepo, "measure-relay later", { session: first.session });
  check(drafterStarts(later.t1) === 0 && sends(later.t1) >= 1, "measure-relay later: the same drafter resumed (SendMessage, no new start)");
  showMessage(relayRepo, "relay message (change-b)");

  const ratio = (n) => (n / inline.chars).toFixed(2);
  console.log(`\nparent chars: inline ${inline.chars}, relay first ${first.chars} (${ratio(first.chars)}), relay later ${later.chars} (${ratio(later.chars)})`);
  check(first.chars <= 0.55 * inline.chars, "acceptance: first commit at most 55% of inline");
  check(later.chars <= 0.35 * inline.chars, "acceptance: later commit at most 35% of inline");

  if (!gateOnly) {
    // --- behavior run T1–T6 ------------------------------------------------
    const repo = freshRepo("behavior");
    apply(repo, "change-a");
    const t1 = turn(repo, "/commit-tools:commit --confirm");
    noDenials(t1, "T1");
    check(drafterStarts(t1) === 1 && commits(repo) === 1, "T1: drafter started, draft shown, nothing committed");
    apply(repo, "change-a-extra");
    const t2 = turn(repo, APPROVE, { session: t1.session });
    noDenials(t2, "T2");
    check(commits(repo) === 1 && sends(t2) >= 1, "T2: staged files changed, so a new draft is shown and nothing is committed");
    const t3 = turn(repo, APPROVE, { session: t2.session ?? t1.session });
    noDenials(t3, "T3");
    check(commits(repo) === 2, "T3: committed after confirming the new draft");
    check(repo.git("show", "--name-only", "--format=", "HEAD").split("\n").filter(Boolean).length === 7, "T3: the commit holds all 7 staged files");
    showMessage(repo, "T3 message");
    repo.git("push", "-q", "origin", "main");
    apply(repo, "change-b");
    const t4 = turn(repo, "/commit-tools:commit --confirm", { session: t3.session ?? t1.session });
    noDenials(t4, "T4");
    check(drafterStarts(t4) === 0 && sends(t4) >= 1, "T4: the same drafter resumed");
    const t5 = turn(repo, APPROVE, { session: t4.session ?? t1.session });
    noDenials(t5, "T5");
    check(commits(repo) === 3, "T5: committed");
    showMessage(repo, "T5 message");
    repo.git("push", "-q", "origin", "main");
    apply(repo, "change-mixed");
    const t6 = turn(repo, "/commit-tools:commit", { session: t5.session ?? t1.session });
    noDenials(t6, "T6");
    check(drafterStarts(t6) === 0 && sends(t6) === 1, "T6: one dispatch, no second dispatch after the inline hand-off");
    check(/split|atomic|separate|concern/i.test(t6.text) && commits(repo) === 3, "T6: inline flow offers a split, nothing committed");
  }
} finally {
  if (!keep) rmSync(work, { recursive: true, force: true });
}

console.log(failures.length ? `\n${failures.length} check(s) failed` : "\nall checks passed");
process.exit(failures.length ? 1 : 0);
