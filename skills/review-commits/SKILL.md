---
name: review-commits
description: Use when reviewing or cleaning up commits before pushing, squashing related commits, preparing a branch for main, or checking commit hygiene; includes unattended review requests.
argument-hint: "[--tag <version>] [--base <ref>] [--unattended] [--style <classic|conventional>] [--result <path>] [--test-cmd <cmd>]"
---

# Review Commits

Review and clean up commits before pushing. Auto-detects whether you are on
a feature branch or on main and runs the appropriate workflow. Uses a
planner/executor split: all commit message authoring happens in the planning
phase, and the executor is purely mechanical replay via
`git rebase --exec` with `GIT_EDITOR=true` so no editor ever opens
mid-rebase. A revalidation step auto-amends any subject that drifts from the
saved style.

## Arguments

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `--tag <version>` | string | none | Tag after completion; ignored with `--unattended` |
| `--base <ref>` | string | required with `--unattended`; auto otherwise | Override base commit detection |
| `--unattended` | boolean | false | Run without `AskUserQuestion`; choose recommended/default options and write a result file |
| `--style <classic\|conventional>` | enum | repo setting, then `classic` | Commit message style to use without first-time setup prompts |
| `--result <path>` | string | `.review-commits/result.json` | Machine-readable result file; must be outside tracked files |
| `--test-cmd <cmd>` | string | auto-detected | Override test command detection |

## Unattended Mode Contract

When `--unattended` is set, this skill is safe for agents running with no
human attached:

1. It never calls AskUserQuestion. At every user gate it chooses the option
   marked recommended/default and records the decision in the result file.
2. It stays within the current branch scope: never check out another branch,
   never merge, never delete a branch, never remove a worktree, never tag
   (ignore `--tag`), and never push.
3. It never blocks on setup. `--base <ref>` is required; missing base fails
   with reason: `no-base`. First-time style setup is skipped. Style is read
   from `--style`, then `.claude/git-commit.local.md`, then `classic`.
4. It never invokes `/codebase:index`. Layer 3 semantic checks run only when
   an existing fresh index is available; otherwise Layer 3 is skipped and the
   skip is recorded in `decisions`.
5. It fails loudly, not interactively. Rebase conflicts run
   `git rebase --abort`, restore the original HEAD, write reason: `conflict`
   with conflicting files, and exit non-zero. Test failures write reason:
   `tests`. Revalidation drift without a saved message writes reason: `drift`.
6. It enforces the tree invariant after rewriting: `git diff <original HEAD> HEAD`
   must be empty. If not, restore the original HEAD, write reason:
   `tree-mismatch`, and exit non-zero.

Before starting, record `originalHead=$(git rev-parse HEAD)` and resolve
`base=$(git rev-parse --verify "$BASE_REF")`. If base resolution fails in
unattended mode, write the result with reason: `no-base` and exit non-zero.

add `.review-commits/` to `.git/info/exclude` before writing the default result
path so the result file is not accidentally tracked.

### Result File

Write `--result <path>` in every outcome:

The result file is JSON with keys `outcome` (`done | failed`), `reason`, `base`, `originalHead`, `newHead`, `decisions`, `plan`, `validation`, `detail`; the full schema is in `references/result-file.md` (read it before writing the file).

Exit code 0 only when `outcome` is `done`.

## Precondition

Require a clean worktree. Run:

```bash
git status --porcelain
```

If output is non-empty, refuse to proceed:

    Your worktree has uncommitted changes. Please commit or stash them
    before running review-commits.

## Auto-Detection

Check the current branch:

```bash
branch=$(git branch --show-current)
```

- If `$branch` is `main` or `master` → **Main Flow**
- Otherwise → **Branch Flow**

With `--unattended`, skip this distinction and always use Branch Flow
semantics on the current branch. Do not show the Main Flow options menu.

## Test Detection (Shared)

Before either flow, if `--test-cmd <cmd>` was provided, use it as the test
command. Otherwise detect the project's test command by checking for project
files in the working directory root:

| File | Command |
|------|---------|
| `go.mod` | `go test ./...` |
| `package.json` | `npm test` |
| `Cargo.toml` | `cargo test` |
| `pyproject.toml` | `pytest` |

Check files in this order. Use the first match. If no project file is
found, skip testing and warn: "No test command detected. Skipping tests."

## Codebase Index Resolution (Shared)

Before either flow, attempt to set up codebase-memory-mcp for semantic
commit analysis. This enables Layer 3 of the hygiene analysis.

## Codebase Transport

Prefer MCP first. If its tools are absent or the server is unreachable, automatically try the CLI without asking:

```bash
command -v codebase-memory-mcp
codebase-memory-mcp cli --json list_projects
```

Set `codebase_transport` to `mcp` or `cli`. All tool calls below use that transport. For CLI calls, pipe the same JSON arguments to `codebase-memory-mcp cli --json <tool>` via stdin; inspect `isError` and read the result from `content[]` text. Use each tool's `--help` for supported flags and output formats. Query and indexing errors are not transport failures: report them accurately, not as missing MCP. On a later MCP connection failure, retry through CLI. Preserve project selection, index settings, and consent rules; do not install anything automatically.

### Step 1: Check Availability

Resolve the transport above and call `list_projects`. If both MCP and CLI are unavailable, set `$SEMANTIC_AVAILABLE=false` and continue with Layers 1 and 2. If either works, continue to Step 2. Transport selection also applies in unattended mode; it does not grant permission to index.

Read `references/codebase-index-resolution.md` and follow it: Step 2 (the reindex decision signals, the `/codebase:index` delegation, the `--unattended` no-index rule). The outcome is `$SEMANTIC_AVAILABLE` set to true or false; indexing failure never blocks the workflow.

## Argument Parsing

Parse `--tag <version>`, `--base <ref>`, `--unattended`,
`--style <classic|conventional>`, `--result <path>`, and `--test-cmd <cmd>`.
`--tag` and `--base` are optional in interactive mode. With `--unattended`,
`--base <ref>` is required and `--tag` is accepted but ignored. If
`.claude/clean-merge.local.md` exists from a previous v1 run, ignore it —
v2 has no settings.

## Commit Hygiene Analysis (Shared)

Analyze commits in the range `$base..HEAD` for hygiene issues. This analysis
runs in both Branch Flow and Main Flow (Rebase option) before the rebase plan
is built. It is performed inline by the main agent using the checklist in
`lib/synthesizer-prompt.md`.

Four detection layers run in order. Each layer adds findings to a shared list.

Read `references/hygiene-layers.md` and run the four layers in order: Layer 1 (subject-based introduce-then-fix pairs, mandatory fixup), Layer 2 (file-structural non-atomic, test-with-impl, and unrelated-commit findings), Layer 3 (semantic verification via codebase-memory, only when `$SEMANTIC_AVAILABLE=true`), and Layer 4 (tracker-ID leak detection via `lib/detect-tracker-leaks.sh`). Each layer adds findings to a shared list.

### Present Hygiene Findings

After all layers complete, present findings using AskUserQuestion if any
issues were found:

Use the dialog template in `references/hygiene-findings-dialog.md`: list pairs, non-atomic commits, unrelated changes, and tracking-system references, then offer Accept all suggestions / Review one by one / Dismiss all. Introduce-then-fix pairs are mandatory fixups. Tracker subject-prefix and narrative findings require rewording; trailer and parenthetical findings can usually be stripped while preserving the surrounding prose.

If "Review one by one": walk through each non-mandatory finding with
AskUserQuestion offering accept/dismiss per finding.

With `--unattended`, choose "Accept all suggestions". Mandatory
introduce-then-fix pairs remain mandatory. Record
`{"gate":"hygiene-findings","chose":"accept-all","why":"unattended default"}`.

If no issues detected, display:
```
Commit hygiene analysis: all commits are clean and atomic. ✓
```
And proceed directly to the rebase plan.

## Logical Clustering (Shared)

Read `references/logical-clustering.md`: runs of 4+ contiguous commits sharing a 3-level path prefix (detected by `lib/detect-clusters.sh "$base"`, run after Hygiene Layers 1-4) are proposed for collapse into one commit (first `pick` with `new_message`, rest `fixup`), confirmed via codebase-memory when `$SEMANTIC_AVAILABLE=true`.

## Branch Flow

Read `references/branch-flow.md` and follow it for feature branches and all `--unattended` runs. It contains the plan review, execution, revalidation, merge/cleanup gates, and soft-reset escape hatch.

## Main Flow (on main/master)

Read `references/branch-flow.md` before following the shared Branch Flow steps below.

### Step 1: Verify Tests

Same as Branch Flow Step 1.

### Step 2: Identify Unpushed Commits

Try to find commits ahead of upstream:

```bash
git log --oneline @{u}..HEAD 2>/dev/null
```

If this succeeds, show the commits.

If it fails (no upstream), use AskUserQuestion:
```
No upstream tracking branch. Which commit is the base?
○ Use latest tag (<tag from: git describe --tags --abbrev=0>)
○ Enter a commit ref
```

If `--base` was provided, use that instead of detection.

### Step 3: Review Options

Use AskUserQuestion:
```
What would you like to do?
○ Validate only — check for issues without changing commits
○ Rebase — run hygiene analysis and interactive rebase to clean up
○ Reword — amend commit messages using saved style
```

**Validate only:**
Invoke the `validate-commits` skill. Done.

**Rebase:**
Run the same analysis and rebase workflow as Branch Flow Steps 4-7:
1. Ensure Codebase Index (set `$SEMANTIC_AVAILABLE`)
2. Run Commit Hygiene Analysis against `$base..HEAD`
3. Plan and review (Steps 4-5 of Branch Flow)
4. Execute (Step 6 of Branch Flow)
5. Revalidate (Step 7 of Branch Flow)

All steps work identically to the Branch Flow — the only difference is that
there is no merge step afterward (commits are already on main).

**Reword:**
Walk through commits oldest-to-newest. Let the user select which commits
to reword via AskUserQuestion. Build a plan where all selected commits have
`action: reword` and all others have `action: pick`. Execute via the same
Steps 4-7 of Branch Flow (the synthesizer authors the new messages, the
executor replays them, the revalidator confirms style).

### Step 4: Optional Tag

Same as Branch Flow Step 9.

### Step 5: Validate

Invoke `validate-commits` (unless "Validate only" was already selected in
Step 3, which already ran it).

## Failure Handling

After any unattended rebase/rewrite that appears successful, verify the tree
invariant with `git diff <original HEAD> HEAD`. If the diff is non-empty,
restore the original HEAD, write `outcome: failed`, reason: `tree-mismatch`,
and exit non-zero.

| Failure | Response |
|---------|----------|
| A reader subagent fails on one commit | Synthesizer treats that commit as `pick` and adds a note. The user sees the note in plan review and can override the action. |
| Both MCP and CLI unavailable | Skip Layer 3 entirely. Layers 1+2 still run. Set `$SEMANTIC_AVAILABLE=false`. |
| Synthesizer cannot author a message for an action | Surface the gap before plan review. The user chooses: accept the original message (downgrades the action to `pick`) or abort the run. |
| Rebase conflict during execute | Interactive: stop, list conflicting files, await `git rebase --continue`. Unattended: run `git rebase --abort`, restore original HEAD, write reason: `conflict`, exit non-zero. |
| Revalidator finds a drifted subject AND has a saved message | Auto-amend with the saved message. No user intervention. |
| Revalidator finds a drifted subject AND has NO saved message | Interactive: print a warning to stderr listing the drifted hash and subject. Unattended: restore original HEAD, write reason: `drift`, exit non-zero. |
| Revalidator finds a planned action that did not materialize (missing hash, wrong split count) | Warn loudly to the user. Do not auto-fix; the user must decide whether to redo the run. |

## Integration

See `references/integration.md` for how this skill relates to /commit (reads the style files; never invokes /commit at execute time), /codebase:index, Superpowers, and standalone use.
Run `/review-commits` anytime — before pushing, after a messy session, to
clean up agent commits.

## What This Skill Does NOT Do

- **Generate commit messages at execute time** — messages are pre-authored
  in the planning phase
- **Open `$EDITOR` mid-rebase** — `GIT_EDITOR=true` is always set
- **Auto-tag** — only with explicit `--tag`
- **Add co-author** — never
- **Push** — user pushes manually
- **Resolve merge conflicts** — reports and stops
- **Force semantic analysis** — if neither MCP nor CLI is available,
  Layers 1-2 still provide value
