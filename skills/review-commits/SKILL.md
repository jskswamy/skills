---
name: review-commits
description: >
  Review and clean up commits before pushing. Uses planner/executor split:
  reads commits inline, authors final messages in saved style, replays via
  `git rebase --exec` with GIT_EDITOR=true so no editor opens. Detects
  logical clusters of granular TDD commits and proposes collapsing them
  into one logical commit. Auto-amends drifted subjects on revalidation.
  Activates on: "review commits", "clean up commits", "prep for push",
  "squash these commits", "finalize commits", "merge branch to main",
  "clean up my commits before pushing", "review before push".
argument-hint: "[--tag <version>] [--base <ref>]"
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
| `--tag <version>` | string | none | Tag after completion |
| `--base <ref>` | string | auto | Override base commit detection |

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

## Test Detection (Shared)

Before either flow, detect the project's test command by checking for
project files in the working directory root:

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

### Step 1: Check MCP Availability

Call the `codebase-memory-mcp` `list_projects` tool.

- If the MCP server is **not available** (tool call fails or server not
  connected): set `$SEMANTIC_AVAILABLE=false`. Continue without semantic
  analysis — Layers 1 and 2 will still run.
- If the MCP server **is available**: continue to Step 2.

### Step 2: Decide Whether to (Re)Index

Compute three signals:

```bash
last_indexed=$(awk '/^last_indexed:/{print $2}' .claude/codebase.local.md 2>/dev/null)
latest_commit_ts=$(git log -1 --format=%cI "$base..HEAD" 2>/dev/null)
needs_reindex=false

if [[ -z "$last_indexed" ]]; then
  needs_reindex=true                          # first run on this project
elif [[ -n "$latest_commit_ts" && "$latest_commit_ts" > "$last_indexed" ]]; then
  needs_reindex=true                          # commits being reviewed are newer than the graph
else
  # 24-hour calendar fallback for the rest of the repo
  now_s=$(date +%s)
  idx_s=$(date -j -f "%Y-%m-%dT%H:%M:%SZ" "$last_indexed" +%s 2>/dev/null || echo 0)
  age_h=$(( (now_s - idx_s) / 3600 ))
  [[ $age_h -gt 24 ]] && needs_reindex=true
fi
```

If `$needs_reindex=true`, invoke `/codebase:index`. The codebase plugin
honors the user's `auto_index: ask|always|never` preference, so the skill
delegates that decision rather than re-implementing it.

If indexing fails for any reason, set `$SEMANTIC_AVAILABLE=false` and
continue — do not block the workflow.

If indexing succeeds (or was unnecessary), set `$SEMANTIC_AVAILABLE=true`.

## Argument Parsing

Parse `--tag <version>` and `--base <ref>` only. Both are optional. If
`.claude/clean-merge.local.md` exists from a previous v1 run, ignore it —
v2 has no settings.

## Commit Hygiene Analysis (Shared)

Analyze commits in the range `$base..HEAD` for hygiene issues. This analysis
runs in both Branch Flow and Main Flow (Rebase option) before the rebase plan
is built. It is performed inline by the main agent using the checklist in
`lib/synthesizer-prompt.md`.

Three detection layers run in order. Each layer adds findings to a shared list.

### Layer 1: Subject-Based (always runs)

Parse `git log --oneline $base..HEAD` and detect introduce-then-fix pairs:

A pair is flagged when:
- Commit B's subject starts with `Fix`, `Fixup`, `Fix up`, `Correct`,
  or `Update` (case-insensitive)
- The remainder of B's subject shares a significant word (3+ characters,
  excluding stop words: the, for, and, a, an, in, of, to, is, it, on,
  at, by, or, be, as, do, if, so, no, up, we, my, he) with commit A's
  subject
- B is within 3 commits of A in the log (not necessarily adjacent)

Each detected pair is recorded as:
```
finding: pair
commits: [<hash-A>, <hash-B>]
reason: "introduce-then-fix: <shared word>"
action: fixup (mandatory)
```

### Layer 2: File-Structural (always runs)

For each commit in range, run:
```bash
git diff-tree --no-commit-id --name-only -r <hash>
```

Group changed files by top-level directory. Flag a commit as non-atomic
if it touches files in 2+ top-level directories that serve different
concerns. Use these heuristics:
- `plugins/<name-A>/` and `plugins/<name-B>/` are different concerns
  (unless both are in the same plugin)
- `docs/` changes alongside `plugins/` are acceptable (docs for the plugin)
- `tests/` alongside `src/` for the same module is acceptable
- Root config files (`.eslintrc`, `package.json`) alongside source changes
  are acceptable if the config change supports the source change

Each flagged commit is recorded as:
```
finding: non-atomic
commit: <hash>
concerns: ["<dir-A>: <description>", "<dir-B>: <description>"]
action: edit (suggested)
```

**Test-with-impl detection.** If commit B touches only test files
(`*.test.*`, `tests/`, `*_test.*`, `*_spec.*`) for symbols introduced
in an earlier commit A, mark B as a fixup of A:

```
finding: pair
commits: [<hash-A>, <hash-B>]
reason: "test-with-impl: tests for A's symbols arrived in B"
action: fixup (mandatory)
```

The synthesizer is the right phase to run this check — it has the
full file list per commit and can match test files to product files by
base name.

Also check if any commit's changes are unrelated to the branch's overall
purpose. Compare each commit's changed files against the full branch diff
(`git diff --name-only $base..HEAD`). If a commit only touches files that
no other commit in the range touches AND those files are in a different area
from the branch's main work, flag it:

```
finding: unrelated
commit: <hash>
reason: "<description of why it seems unrelated>"
action: drop (suggested)
```

### Layer 3: Semantic (runs when $SEMANTIC_AVAILABLE=true)

For each commit flagged as potentially non-atomic by Layer 2, and for any
commit where Layer 2 was uncertain, use codebase-memory-mcp to verify:

1. **Get changed symbols**: For each changed file in the commit, call
   `search_graph` with the file path to find the symbols it defines.

2. **Check cluster membership**: Call `search_graph` with a semantic query
   describing each changed symbol. If changed symbols belong to different
   clusters (e.g., "AuthService" vs "Observability"), the commit is
   non-atomic.

3. **Trace connections**: Call `trace_path` between changed files. If a
   path exists (they're connected through call chains), the changes may be
   related despite being in different directories. Remove the non-atomic
   flag.

4. **Check module boundaries**: Call `get_architecture` and verify whether
   the commit crosses module boundaries. Cross-boundary changes with no
   call-chain connection are non-atomic.

Layer 3 can **upgrade** a Layer 2 finding (uncertain → confirmed non-atomic)
or **dismiss** it (files are in different directories but semantically
connected).

If any `codebase-memory-mcp` tool call fails during Layer 3, skip the
remaining semantic checks for that commit and keep the Layer 2 finding
as-is. Do not fail the workflow.

### Present Hygiene Findings

After all layers complete, present findings using AskUserQuestion if any
issues were found:

```
Commit hygiene analysis complete.

⚠ Issues detected:

  Introduce-then-fix pairs (will be auto-squashed):
    c844c6a + 7de838b — "sync-beads": add then fix shell escaping
    c8fa279 + e526d22 — "hook": expand then fix false-positive

  Non-atomic commits (suggest splitting):
    a1b2c3d — touches auth handler (AuthService) + logging (Observability)
      These are unrelated concerns in different subsystems.

  Unrelated changes (suggest dropping):
    f4e5d6c — README typo fix, unrelated to auth migration branch

Introduce-then-fix pairs are mandatory fixups. For other findings:

○ Accept all suggestions
○ Review one by one — decide per finding
○ Dismiss all — keep commits as-is (only hygiene pairs will be fixed)
```

If "Review one by one": walk through each non-mandatory finding with
AskUserQuestion offering accept/dismiss per finding.

If no issues detected, display:
```
Commit hygiene analysis: all commits are clean and atomic. ✓
```
And proceed directly to the rebase plan.

## Logical Clustering (Shared)

Beyond per-commit hygiene, the planner detects "feature clusters": runs of
4+ contiguous commits that together form a single logical change (TDD
discipline produces these — scaffold → helper → test → another helper →
wire it up). Once the feature lands, that granularity is noise on `main`.

Detection runs after Hygiene Layers 1-3 and uses
`lib/detect-clusters.sh "$base"`:

- The helper outputs one line per cluster, space-separated short-hashes
  oldest-first
- A cluster is 4+ contiguous commits whose touched files all share a
  3-level path prefix (e.g. `plugins/foo/skills/bar/`)
- Commits that are already a fixup target from Layer 1 are excluded from
  cluster candidates (they collapse separately)

If `$SEMANTIC_AVAILABLE=true`, the planner confirms each candidate via
codebase-memory: query `search_graph` for the symbols across all commits
in the cluster, and reject the candidate if symbols span 2+ unrelated
architectural clusters. Confirmation upgrades the proposal to
high-confidence; absence of MCP demotes it to medium-confidence (still
proposed, the plan review just flags the confidence level).

A confirmed cluster maps to existing plan primitives:
- first commit: `action: pick` with `new_message` (authored in saved style)
- every later commit in the cluster: `action: fixup`

`build-todo.sh` already emits the right exec sequence for this combination.

## Branch Flow

### Step 1: Verify Tests

Run the detected test command. If it fails, stop:

    Tests failed. Fix the failures before reviewing commits.

### Step 2: Show Branch State

Determine the merge base:

```bash
base=$(git merge-base HEAD main)
```

If `--base` was provided, use that instead.

Show the commits:

```bash
git log --oneline $base..HEAD
```

Display:
```
Branch <branch-name> has N commits since main:

  <hash> <subject>
  <hash> <subject>
  ...

Analyzing commit hygiene and building rebase plan...
```

### Step 3: Ensure Codebase Index

Run the "Codebase Index Resolution" flow defined above. This sets
`$SEMANTIC_AVAILABLE` for use in Step 4.

### Step 4: Plan (inline)

Set up the working directory:

```bash
WORKING_DIR=$(mktemp -d)/review-commits
mkdir -p "$WORKING_DIR/msgs"
```

Resolve `$STYLE_FILE` by reading `.claude/git-commit.local.md` →
`commit_style` value → `plugins/commit-tools/styles/<style>.md`. If the
local settings file is missing, default to `classic`.

Read each commit in `$base..HEAD` oldest-to-newest using
`git log --reverse --format='%H%x00%s%x00%b%x00---END---' "$base..HEAD"`
so commit bodies are available to the synthesizer. Run the planning
checklist at `plugins/commit-tools/skills/review-commits/lib/synthesizer-prompt.md`
and write `$WORKING_DIR/plan.yaml`. Cluster detection runs as part of
that checklist (Step 4 in the synthesizer prompt) using
`lib/detect-clusters.sh`.

There is no longer a multi-agent path — the main agent does both
reading and synthesis. For a typical feature branch (5-30 commits)
this is faster and cheaper than dispatching subagents.

### Step 5: Plan Review (User Gate)

Show the plan via AskUserQuestion. Display the original
`git log --oneline $base..HEAD`, then the proposed action sequence with
the first line of each new message inline (truncated to 72 chars).

First, present any cluster proposals. The form depends on which
detectors fired:

**Both detectors fire (overlap-free disjoint case):**

```
Cluster proposals for branch <name>:

  Option A (recommended, branch heuristic, medium confidence):
    Collapse all 4 commits into one
      pick   f3696d7  Extract netbox process-compose commands to scripts
      fixup  bc7a342  ↳ folded
      fixup  fd11711  ↳ folded
      fixup  c0cc5e8  ↳ folded

  Option B (path heuristic, high confidence):
    Collapse 4 commits in plugins/foo/skills/bar/ into one
      pick   9e14e75  Add NetBoxClient interface, mock, and validation
      fixup  3312c0b  ↳ folded
      fixup  …
      fixup  …

○ Accept Option A — collapse the whole branch
○ Accept Option B — collapse only the sub-clusters
○ Keep all as pick — don't collapse
○ Modify per-commit
```

**Branch detector only (no path sub-clusters):**

```
Cluster proposal for branch <name>:

  Branch heuristic, medium confidence:
    Collapse all N commits into one
      pick   <h1>  <subject>
      fixup  <h2>  ↳ folded
      ...

  No path-prefix sub-clusters found.

○ Accept — collapse the whole branch
○ Keep all as pick — don't collapse
○ Modify per-commit
```

**Path detector only (running on main/master, or branch candidate did not fire):**

```
Cluster proposals (path heuristic, high confidence):
  Collapse N commits in <dir> into one
    pick   <h1>  <subject>
    fixup  <h2>  ↳ folded
    ...

○ Accept — collapse the sub-cluster(s)
○ Keep all as pick — don't collapse
○ Modify per-commit
```

**Neither detector fires:**

```
No cluster proposals.
  Branch heuristic: skipped (on main/master)
  Path heuristic: no contiguous run of 4+ commits shares a parent directory.

  If these commits form one logical feature, use Modify to choose
  which to collapse manually.
```

After the cluster decision is made, present the final per-commit plan:

```
Rebase plan for N commits on <branch-name>:

  Current log:
    c844c6a  Add sync-beads skill
    7de838b  Fix sync-beads skill
    ...

  Proposed sequence:
    pick   9e14e75  Add NetBoxClient interface, mock, and validation
                      Adds NetBoxClient as the testable boundary for all
                      NetBox HTTP calls. The mock is generated via…
    fixup  3312c0b  ↳ folded into above
    edit   a1b2c3d  Update auth handler  ← will split into 2
    drop   f4e5d6c  Fix unrelated typo

○ Accept — execute this plan
○ Modify — adjust action for specific commits
○ Reset — soft-reset and regroup manually (escape hatch)
```

For any `pick` or `reword` whose authored `new_message` carries a body,
show the first 2 wrapped lines of the body indented under the subject
(max ~160 chars total, ellipsis if truncated). Subject-only entries
render as today. `fixup`, `drop`, and `edit` entries never get a body
preview line — only `pick` and `reword` carry `new_message`.

If "Modify": use AskUserQuestion to let the user change the action for any
commit. Re-display the updated plan for confirmation.

If "Reset": fall back to the Soft-Reset Escape Hatch (see below).

### Step 6: Execute

Build the todo file and message directory, then run the rebase:

```bash
msgdir="$WORKING_DIR/msgs"
mkdir -p "$msgdir"
bash plugins/commit-tools/skills/review-commits/lib/build-todo.sh \
  "$WORKING_DIR/plan.yaml" "$msgdir" > "$WORKING_DIR/todo"
GIT_EDITOR=true \
GIT_SEQUENCE_EDITOR="cat $WORKING_DIR/todo >" \
  git rebase -i "$base"
```

**The executor authors NO messages.** If you find yourself writing a commit
message during this step, you are violating the contract — stop, return to
Step 4, and fix the plan instead.

`build-todo.sh` and `apply-split.sh` set `__GIT_COMMIT_PLUGIN__=1` on the
`git commit --amend` and `git commit -F` calls they emit/run, which is the
documented bypass for the git-commit plugin's PreToolUse block. The skill
itself does not need to re-set this — the helpers handle it.

If the rebase reports a conflict:
1. Stop immediately
2. Run `git diff --name-only --diff-filter=U` to show conflicting files
3. Await user resolution + `git rebase --continue`
4. Resume from Step 7 once the rebase completes

### Step 7: Revalidate

```bash
PATH_TO_LIB=plugins/commit-tools/skills/review-commits/lib \
  bash plugins/commit-tools/skills/review-commits/lib/revalidate.sh \
  "$WORKING_DIR/plan.yaml" "$msgdir" "$base" "$STYLE_FILE" \
  || echo "drift remained — see warnings"
```

This auto-amends any commit whose subject drifted from the saved messages.
A non-zero exit means at least one subject failed the style check AND no
saved message was available — surface as a warning to the user but do not
abort.

### Step 8: Merge to Main

Move the cleaned-up commits to main:

```bash
git checkout main
git merge <branch> --ff-only
```

If `--ff-only` fails, use AskUserQuestion:
```
Fast-forward merge failed — main has diverged from <branch>.

○ Rebase — rebase <branch> onto main first (recommended)
○ Merge commit — create a merge commit instead
○ Abort — stop and let me handle it
```

If "Rebase": run `git checkout <branch> && git rebase main`, then retry
the ff merge. If rebase has conflicts, report and stop.

If "Merge commit": run `git merge <branch>` (allow merge commit).

If "Abort": stop.

### Step 9: Optional Tag

Only if `--tag <version>` was provided:

```bash
git tag <version>
```

Never prompt for a tag. Never auto-tag.

### Step 10: Validate and Cleanup

Invoke the `validate-commits` skill to run all five checks.

After validation passes, ask before cleaning up using AskUserQuestion:
```
Branch <branch> has been merged to main. Delete it?
○ Yes — delete the branch
○ No — keep it
```

If "Yes":
```bash
git branch -d <branch>
```

If a worktree was used (check via `git worktree list`):
```bash
git worktree remove <path>
```

### Soft-Reset Escape Hatch

If the user chose "Reset" in Step 5, instead of interactive rebase:

```bash
git reset --soft $base
```

This unstages all changes. Group files by top-level directory and concern,
then present groupings via AskUserQuestion. For each group:
1. Stage the group's files: `git add <files>`
2. Invoke `/commit`

The hygiene findings from Step 4 carry forward — display them again as
context for grouping decisions.

## Main Flow (on main/master)

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

| Failure | Response |
|---------|----------|
| A reader subagent fails on one commit | Synthesizer treats that commit as `pick` and adds a note. The user sees the note in plan review and can override the action. |
| codebase-memory-mcp unavailable | Skip Layer 3 entirely. Layers 1+2 still run. Set `$SEMANTIC_AVAILABLE=false`. |
| Synthesizer cannot author a message for an action | Surface the gap before plan review. The user chooses: accept the original message (downgrades the action to `pick`) or abort the run. |
| Rebase conflict during execute | Stop, list conflicting files, await `git rebase --continue`. Resume at Step 7 once the rebase completes. |
| Revalidator finds a drifted subject AND has a saved message | Auto-amend with the saved message. No user intervention. |
| Revalidator finds a drifted subject AND has NO saved message | Print a warning to stderr listing the drifted hash and subject. Do not abort. |
| Revalidator finds a planned action that did not materialize (missing hash, wrong split count) | Warn loudly to the user. Do not auto-fix; the user must decide whether to redo the run. |

## Integration

### With /commit

This skill READS `plugins/commit-tools/styles/<style>.md` directly during the
synthesis phase to author messages in the saved style. It does NOT invoke
`/commit` at execute time — the executor is purely mechanical replay. `/commit`
is a peer of this skill, not a caller.

### With /codebase:index

This skill invokes `/codebase:index` to build or refresh the
codebase-memory-mcp index when needed. The index enables Layer 3 semantic
analysis for commit hygiene checks.

### With Superpowers

- `finishing-a-development-branch` detects this skill when "Merge locally"
  is selected
- `subagent-driven-development` naturally leads here after tasks complete

### Standalone

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
- **Force semantic analysis** — if codebase-memory-mcp is not available,
  Layers 1-2 still provide value
