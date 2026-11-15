---
name: review-commits
description: "Review and clean up commits before pushing. [--base <ref>] [--unattended] [--style classic|conventional] Use when reviewing or cleaning up commits before pushing, squashing related commits, preparing a branch for main, or checking commit hygiene; includes unattended review requests."
argument-hint: "[--tag <version>] [--base <ref>] [--unattended] [--style <classic|conventional>] [--result <path>] [--test-cmd <cmd>]"
metadata:
  short-description: "Review and clean up commits before pushing. [--base <ref>] [--unattended] [--style classic|conventional]"
---

# Review Commits

Review and clean up commits before pushing. Auto-detects whether you are on
a feature branch or on main and runs the appropriate workflow. Uses a
planner/executor split: all commit message authoring happens in the planning
phase, and the executor is purely mechanical replay via
`git rebase --exec` with `GIT_EDITOR=true` so no editor ever opens
mid-rebase. A revalidation step auto-amends any subject that drifts from the
saved style. Before rewriting history, load `commit-tools:commit` to validate and
explicitly approve the complete message plan. Its shared executor owns every
explicit commit/amend; this skill owns analysis and replay sequencing.
Resolve bundled paths from the absolute directory of this loaded skill,
not from the working repository. Where AskUserQuestion is unavailable, ask
in chat and wait; unattended runs return a blocker instead of asking.

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

Read `references/unattended-mode.md` and follow it.

## Precondition

Read `references/precondition.md` and follow it.

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

Read `references/test-detection.md` and follow it.

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

Read `references/hygiene-analysis.md` and follow it.

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

Read `references/review-options.md` and follow it.

### Step 4: Optional Tag

Same as Branch Flow Step 9.

### Step 5: Validate

Invoke `validate-commits` (unless "Validate only" was already selected in
Step 3, which already ran it).

## Failure Handling

Read `references/failure-handling.md` and follow it.

## Integration

See `references/integration.md` for delegation to commit-tools:commit, /codebase:index, Superpowers, and standalone use.
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
