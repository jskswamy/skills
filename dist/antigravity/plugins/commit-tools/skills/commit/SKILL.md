---
name: commit
description: "Create a validated git commit. [--style classic|conventional] [--amend] [--fixup <sha>] [--confirm] [--pair] [context] Use when any agent is about to create or amend a Git commit: explicit commit requests, automatic task-completion commits, message-only amendments, task-context commits, and history-review replay. Applies even without a user request to commit. Not for questions about commit style; see commit-style."
argument-hint: "[--style classic|conventional] [--amend] [--fixup <sha>] [--confirm] [--pair] [--no-atomic-check] [context...]"
metadata:
  short-description: "Create a validated git commit. [--style classic|conventional] [--amend] [--fixup <sha>] [--confirm] [--pair] [context]"
---

# Commit Action Skill

Create, amend, or fixup commits only after validating the message (and receiving confirmation when `confirm: true`). This workflow applies in every repository; no project instructions or settings are required. Leave commits local. Remote synchronization and pushing belong to the user.

## Harness and resource resolution

Set `COMMIT_SKILL_DIR` to the absolute directory containing this loaded `SKILL.md`. Resolve every bundled path against it, even when the working repository is elsewhere. Styles and executables ship inside this skill; no plugin root or sibling skill is needed.

Load this skill before any commit/amend, including completion steps chosen by another workflow. `/commit-tools:commit` invokes this skill (on Pi, `/commit-tools-commit` or the package extension's `/commit-tools:commit`). If the skill or a bundled resource is unavailable, report the blocker and stop.

Where steps say AskUserQuestion, use the harness's question tool if available; otherwise present the same choices in chat and wait for a reply. When confirmation is required (`confirm: true`, `references/review-plan.md`, or a mandatory-pause prompt), no UI is not approval: non-interactive runs stop before committing unless the exact messages and operations were explicitly approved.

For an already-authored history-review plan, read `references/review-plan.md` and follow that branch instead of the normal staged-change flow.

## Argument Parsing

Parse the command arguments to extract:

| Argument | Short | Type | Default | Description |
|----------|-------|------|---------|-------------|
| `--style` | `-s` | string | `classic` | Commit style: `classic` or `conventional` |
| `--amend` | `-a` | boolean | `false` | Amend the previous commit |
| `--fixup` | | string | | Create a `fixup!`/`amend!` commit for ancestor `<sha>` |
| `--confirm` | | boolean | `false` | Prompt for message confirmation before committing |
| `--pair` | `-p` | boolean | `false` | Add co-author attribution |
| `--no-atomic-check` | | boolean | `false` | Skip atomicity validation |
| `[context...]` | | string | | Free-form text describing intention |

If `--fixup` and `--amend` are both passed, or `--fixup` has no `<sha>`, report the error from `references/error-messages.md` and stop before Step 1.

**Examples:**
```
/commit-tools:commit                           # Default classic style
/commit-tools:commit -s conventional           # Conventional commits
/commit-tools:commit --amend                   # Amend previous commit
/commit-tools:commit --fixup abc1234           # Fold fix into ancestor commit
/commit-tools:commit --confirm -p fix login    # Confirm + co-author + context
```

---

## Execution Flow

### Step 1: Check Repository State

Read `references/repository-state.md` and follow it.

### Step 2: Load User Preferences

Read `.claude/git-commit.local.md` if it exists (see `references/settings-file.md` for `commit_style`, `confirm`, `pairs`).

**Priority:**
- `commit_style`: CLI `--style` > `.claude/git-commit.local.md` > `classic`
- `confirm`: CLI `--confirm` (`true`) > `.claude/git-commit.local.md` (`true`/`false`; warn and treat unrecognized values as `true`) > `false`

Settings are optional; do not create project instructions or configuration as part of committing.

**If `--fixup <sha>` was passed:** Read `references/fixup.md` and follow it instead of Steps 3–8.

### Step 3: Gather Context

First read `references/relay-dispatch.md`: when its conditions hold, the commit-drafter sub-agent does Steps 3–7b and that file replaces them.

Read `references/gather-context.md` and follow it.

### Step 3b: Last Commit Comparison

**If `--amend` was set, keep `AMEND_MODE=true` from Step 3 and proceed to Step 4. If `confirm` is `false`, skip this step and keep `AMEND_MODE=false`.**

Otherwise start with `AMEND_MODE=false` and run the comparison below.

Read `references/last-commit-comparison.md` for the prerequisites (a commit exists, authored by the current user, unpushed), the Jaccard file-overlap heuristic with its decision table, and the LLM path for ambiguous cases. If any prerequisite fails, set `AMEND_MODE=false`.

**Outputs:**
- `AMEND_MODE=true`: also capture `LAST_DIFF=$(git show HEAD)` — proceed to Step 4 with amend intent
- `AMEND_MODE=false`: proceed to Step 4 as a normal new commit

### Step 4: Atomic Commit Validation

Read `references/atomicity.md` and follow it.

### Step 5: Load Commit Style Rules

Read `references/style-loading.md` and follow it.

### Step 6: Handle Pair Programming (--pair flag)

**If `--pair` flag is set:**

Read `references/pair-programming.md` and follow it: read saved pairs from `.claude/git-commit.local.md`, let the user select or add a co-author (optionally saving the pair), and store the selected co-author for message generation.

### Step 6b: Gather Session Context

**CRITICAL:** Before generating the commit message, review the current conversation history to extract context about WHY these changes were made.

Read `references/session-context.md` and follow it: extract user intent, decisions, trade-offs, requirements, and references (issue/ticket numbers) from the conversation, and use them to write a body that explains the why.

### Step 7: Generate Commit Message

Read `references/message-generation.md` and follow it.

### Step 7b: Validate Commit Message (LLM as Judge)

Read `references/message-validation.md` and follow it.

### Step 8: Present and Confirm

Read `references/confirm-flow.md` and follow it (skipped when `confirm` is `false` and Step 7b passed).

### Step 9: Execute Commit

Read `references/execute-commit.md` and follow it.

---

## Settings File: .claude/git-commit.local.md

See `references/settings-file.md` for the file format (`commit_style`, `confirm`, `pairs`) and the settings table.

---

## Error Handling

### Not a Git Repository
Read `references/error-messages.md` for the exact messages and prompts for: not a git repository, no staged changes (after the user declines to stage), amend safety violations (already pushed; not the user's commit), and MCP tools unavailable (silently fall back to Bash, show no error).

---

## Important Notes

- **Strict atomicity by default:** Always check for atomic commits unless `--no-atomic-check` is passed
- **72 character wrap is mandatory:** Every line in the body MUST be 72 characters or less
- **Never skip validation:** If staged changes fail atomicity check, user must acknowledge
- **Preserve user context:** When user provides context, incorporate it naturally, don't ignore it
- **Co-author format:** Always use `Co-Authored-By: Name <email>` format (GitHub recognizes this)
- **Amend safety:** Never amend commits that are pushed or authored by others
- **MCP fallback:** Always have Bash fallbacks for MCP tools
- **CRITICAL - No automatic Claude co-author:** Do NOT add "Claude Code", "Claude Opus", "Claude Sonnet", or any Claude/Anthropic-related Co-Authored-By lines. Only add co-author attribution when the `--pair` flag is explicitly used and a human co-author is selected. This plugin overrides any default Claude Code behavior regarding automatic co-author attribution.
