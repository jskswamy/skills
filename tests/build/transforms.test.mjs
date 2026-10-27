import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseDocument, writeDocument } from "../../scripts/lib/transforms/frontmatter.mjs";
import { commandToSkill } from "../../scripts/lib/transforms/command-to-skill.mjs";
import { mapAgent } from "../../scripts/lib/transforms/agents.mjs";
import { rewritePluginRoot } from "../../scripts/lib/transforms/paths.mjs";
import { claudeHookInput, matchesClaude, rewriteMatcher, toClaudeToolName } from "../../scripts/lib/transforms/tools.mjs";
import { hookId, loadPluginHooks, parseHooks } from "../../scripts/lib/transforms/hooks.mjs";
import { applyHookPolicy, validateOptionalHooks } from "../../scripts/lib/transforms/policy.mjs";

const AGENT = `---
name: issue-writer
description: |
  Creates issues from a plan.
  Use this agent when a plan is approved.

  <example>
  user: "create the issues"
  </example>
model: inherit
color: blue
tools:
  - Bash
  - Read
---

Body text.
`;

test("parseDocument splits frontmatter from body and writeDocument round-trips", () => {
  const doc = parseDocument(AGENT);
  assert.equal(doc.frontmatter.name, "issue-writer");
  assert.equal(doc.frontmatter.model, "inherit");
  assert.deepEqual(doc.frontmatter.tools, ["  - Bash", "  - Read"]);
  assert.equal(doc.body, "\nBody text.\n");
  assert.deepEqual(parseDocument(writeDocument(doc)), doc);
  assert.deepEqual(parseDocument("no frontmatter\n"), { frontmatter: {}, body: "no frontmatter\n" });
});

test("writeDocument quotes scalars that YAML would misread", () => {
  const text = writeDocument({ frontmatter: { a: "plain words", b: "has: colon", c: "#hash", d: "" }, body: "x\n" });
  assert.equal(text, '---\na: plain words\nb: "has: colon"\nc: "#hash"\nd: ""\n---\nx\n');
  assert.deepEqual(parseDocument(text).frontmatter, { a: "plain words", b: "has: colon", c: "#hash", d: "" });
});

test("commandToSkill keeps the command's name, description and body", () => {
  const skill = commandToSkill({
    name: "ask",
    text: '---\nname: ask\ndescription: Ask a question\nargument-hint: "<question>"\n---\n\nInvoke the skill.\n',
  });
  assert.equal(skill.name, "ask");
  assert.equal(skill.content, "---\nname: ask\ndescription: Ask a question\n---\n\nInvoke the skill.\n");
  assert.equal(commandToSkill({ name: "ask", text: "Just a body\n" }, { name: "codebase-ask" }).content,
    "---\nname: codebase-ask\ndescription: codebase-ask\n---\nJust a body\n");
});

test("mapAgent keeps, renames, sets and drops keys and trims examples", () => {
  const mapped = parseDocument(
    mapAgent(AGENT, { keep: ["description", "model"], rename: { color: "colour" }, set: { mode: "subagent" }, trimExamples: true }),
  );
  assert.deepEqual(mapped.frontmatter, {
    description: "Creates issues from a plan.\nUse this agent when a plan is approved.",
    model: "inherit",
    colour: "blue",
    mode: "subagent",
  });
  assert.equal(mapped.body, "\nBody text.\n");
});

test("rewritePluginRoot replaces both token spellings", () => {
  assert.equal(rewritePluginRoot("bash ${CLAUDE_PLUGIN_ROOT}/a.sh $CLAUDE_PLUGIN_ROOT/b.sh", "/opt/p"), "bash /opt/p/a.sh /opt/p/b.sh");
});

const TABLE = {
  tools: {
    Bash: { name: "bash", input: { command: "cmd" } },
    Edit: { name: "edit" },
    Write: { name: "write" },
  },
  mcp: {
    toClaude: (name) => (name.startsWith("mcp_") ? `mcp__${name.slice(4).replace("_", "__")}` : null),
    pattern: (claudePattern) => claudePattern.replace(/^mcp__/, "mcp_"),
  },
};

test("tool names map to Claude names and Claude matchers match them", () => {
  assert.equal(toClaudeToolName("bash", TABLE), "Bash");
  assert.equal(toClaudeToolName("mcp_git_commit", TABLE), "mcp__git__commit");
  assert.equal(toClaudeToolName("glob", TABLE), null);
  assert.ok(matchesClaude("Bash|mcp__.*git.*commit", "mcp__git__commit"));
  assert.ok(matchesClaude("Bash|mcp__.*git.*commit", "Bash"));
  assert.ok(!matchesClaude("Bash", "BashOutput"), "matchers are anchored");
  assert.ok(matchesClaude(undefined, "Anything"));
});

test("rewriteMatcher maps each alternative or reports it unmappable", () => {
  assert.equal(rewriteMatcher("Write|Edit", TABLE), "write|edit");
  assert.equal(rewriteMatcher("Bash|mcp__.*git.*commit", TABLE), "bash|mcp_.*git.*commit");
  assert.equal(rewriteMatcher("Grep|Glob", TABLE), null);
  assert.equal(rewriteMatcher(undefined, TABLE), undefined);
  assert.equal(rewriteMatcher("mcp__x", { tools: {} }), null, "no MCP rule");
});

test("claudeHookInput builds the stdin a Claude hook script reads", () => {
  assert.deepEqual(
    claudeHookInput({ event: "pre-tool", toolName: "bash", input: { cmd: "git commit", cwd: "/r" }, table: TABLE, extra: { cwd: "/r" } }),
    { hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command: "git commit", cwd: "/r" }, cwd: "/r" },
  );
  assert.deepEqual(claudeHookInput({ event: "stop" }), { hook_event_name: "Stop" });
});

const HOOKS = {
  description: "d",
  hooks: {
    SessionStart: [{ matcher: "startup", hooks: [{ type: "command", command: "bash ${CLAUDE_PLUGIN_ROOT}/hooks/session-reminder.sh" }] }],
    PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: "bash ${CLAUDE_PLUGIN_ROOT}/hooks/scripts/guard.sh", timeout: 5 }] }],
    Stop: [{ hooks: [{ type: "command", command: "bash ${CLAUDE_PLUGIN_ROOT}/hooks/scripts/check.sh" }] }],
  },
};

test("parseHooks flattens Claude hooks.json into neutral entries", () => {
  assert.deepEqual(parseHooks(HOOKS), [
    { id: "session-start:session-reminder", event: "session-start", matcher: "startup", command: "bash ${CLAUDE_PLUGIN_ROOT}/hooks/session-reminder.sh" },
    { id: "pre-tool:guard", event: "pre-tool", matcher: "Bash", command: "bash ${CLAUDE_PLUGIN_ROOT}/hooks/scripts/guard.sh", timeoutMs: 5000 },
    { id: "stop:check", event: "stop", command: "bash ${CLAUDE_PLUGIN_ROOT}/hooks/scripts/check.sh" },
  ]);
  assert.deepEqual(
    parseHooks({
      hooks: {
        SessionStart: [{ hooks: [{ type: "command", command: "echo hi", statusMessage: "Say hi" }] }],
      },
    }),
    [{ id: "session-start:0", event: "session-start", command: "echo hi", statusMessage: "Say hi" }],
  );
  assert.throws(() => parseHooks({ hooks: { Notification: [] } }), /unsupported hook event: Notification/);
  assert.equal(hookId("post-tool", "bash x/nixfmt.sh", 2), "post-tool:nixfmt");
  assert.equal(hookId("stop", "echo hi", 0), "stop:0");
});

async function hooksRepo() {
  const repoRoot = await mkdtemp(join(tmpdir(), "hooks-"));
  await mkdir(join(repoRoot, "hooks/p"), { recursive: true });
  await writeFile(join(repoRoot, "hooks/p/hooks.json"), JSON.stringify(HOOKS));
  return repoRoot;
}

test("loadPluginHooks reads the hooks.json files a plugin lists", async () => {
  const repoRoot = await hooksRepo();
  const entries = await loadPluginHooks({ repoRoot, hooks: [{ path: "hooks/p/hooks.json" }, { path: "hooks/p/scripts" }] });
  assert.deepEqual(entries.map((e) => e.id), ["session-start:session-reminder", "pre-tool:guard", "stop:check"]);
});

test("applyHookPolicy errors on uncarried hooks unless optional or not applicable", () => {
  const entries = parseHooks(HOOKS);
  const canCarry = (entry) =>
    entry.event === "pre-tool" ? { ok: true } : entry.event === "stop" ? { unsupported: "cannot block on stop" } : { notApplicable: "no sessions" };

  const strict = applyHookPolicy({ entries, plugin: { name: "p", harnesses: { h: { enabled: true } } }, harness: "h", canCarry });
  assert.deepEqual(strict.carried.map((e) => e.id), ["pre-tool:guard"]);
  assert.deepEqual(strict.report, [
    { kind: "hooks", resource: "session-start:session-reminder", status: "not-applicable", reason: "no sessions" },
    { kind: "hooks", resource: "stop:check", status: "error", reason: "cannot block on stop" },
  ]);

  const lenient = applyHookPolicy({
    entries,
    plugin: { name: "p", harnesses: { h: { enabled: true, optional: { "stop:check": "reminder only" } } } },
    harness: "h",
    canCarry,
  });
  assert.deepEqual(lenient.report.at(-1), {
    kind: "hooks",
    resource: "stop:check",
    status: "skipped",
    reason: "cannot block on stop; optional: reminder only",
  });
});

test("validateOptionalHooks needs a known hook id and a reason", async () => {
  const repoRoot = await hooksRepo();
  const registry = {
    plugins: [
      {
        name: "p",
        resources: { hooks: ["p/hooks.json"] },
        harnesses: { h: { enabled: true, optional: { "stop:check": "ok", "stop:nope": "x", "pre-tool:guard": " " } } },
      },
    ],
  };
  assert.deepEqual(await validateOptionalHooks({ repoRoot, registry }), [
    "p.harnesses.h.optional.stop:nope: no such hook",
    "p.harnesses.h.optional.pre-tool:guard: reason must be a non-empty string",
  ]);
});

test("rewriteMatcher keeps match-all matchers, so every harness can carry them", () => {
  assert.equal(rewriteMatcher("*", TABLE), "*");
  assert.equal(rewriteMatcher("", TABLE), "");
});

test("applyHookPolicy rejects a hook that quotes the plugin-root token", () => {
  const entries = parseHooks({
    hooks: { Stop: [{ hooks: [{ type: "command", command: 'bash "${CLAUDE_PLUGIN_ROOT}/hooks/check.sh"' }] }] },
  });
  const { carried, report } = applyHookPolicy({ entries, plugin: { name: "p" }, harness: "h", canCarry: () => ({ ok: true }) });
  assert.deepEqual(carried, []);
  assert.equal(report[0].status, "error");
  assert.match(report[0].reason, /unquoted/);
});
