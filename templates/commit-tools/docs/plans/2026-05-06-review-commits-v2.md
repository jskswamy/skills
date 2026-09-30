# review-commits v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Delete the parallel reader path from `clean-merge:review-commits`, add logical-grouping detection, and tighten the codebase-memory index freshness check.

**Architecture:** Drop the multi-agent code path entirely (deleting `load-settings.sh`, `reader-prompt.md`, and their tests). Move the synthesizer's logic inline into the main agent. Add a small `detect-clusters.sh` helper that flags contiguous-commit feature clusters by file-path heuristic, with the synthesizer confirming via codebase-memory when the index is available. Replace the calendar-age freshness check with a commit-timestamp-vs-index-timestamp comparison.

**Tech Stack:** Bash 4+, jq, python3 (already used by `build-todo.sh` and `apply-split.sh`), git ≥2.20. No new runtime dependencies.

---

## Working directory

Branch: `feature/multi-agent-review-commits` (continues from v1 commits already on this branch). All paths in this plan are relative to the worktree root: `/Users/subramk/source/github.com/jskswamy/claude-plugins/.worktrees/multi-agent-review-commits`.

## File Structure (after v2)

```
plugins/clean-merge/skills/review-commits/
├── SKILL.md                        # rewritten (drop parallel, add grouping, tighten freshness)
├── lib/
│   ├── style-check.sh              # unchanged
│   ├── build-todo.sh               # unchanged
│   ├── apply-split.sh              # unchanged
│   ├── revalidate.sh               # unchanged
│   ├── detect-clusters.sh          # NEW
│   ├── plan-schema.md              # minor edit
│   └── synthesizer-prompt.md       # repurposed as inline self-prompt + grouping duty
└── tests/
    ├── helpers.sh                  # unchanged
    ├── run-all.sh                  # unchanged
    ├── test-style-check.sh         # unchanged
    ├── test-build-todo.sh          # unchanged
    ├── test-apply-split.sh         # unchanged
    ├── test-revalidate.sh          # unchanged
    └── test-detect-clusters.sh     # NEW
```

Deleted files: `lib/load-settings.sh`, `lib/reader-prompt.md`, `tests/test-load-settings.sh`.

---

### Task 1: Delete dead files from v1

These three files implement the parallel-reader path that v2 deletes. The settings file `.claude/clean-merge.local.md` is left in place if a user has one — the skill simply stops reading it.

**Files:**
- Delete: `plugins/clean-merge/skills/review-commits/lib/load-settings.sh`
- Delete: `plugins/clean-merge/skills/review-commits/lib/reader-prompt.md`
- Delete: `plugins/clean-merge/skills/review-commits/tests/test-load-settings.sh`

- [ ] **Step 1: Confirm files exist**

```bash
ls plugins/clean-merge/skills/review-commits/lib/load-settings.sh \
   plugins/clean-merge/skills/review-commits/lib/reader-prompt.md \
   plugins/clean-merge/skills/review-commits/tests/test-load-settings.sh
```
Expected: all three paths listed.

- [ ] **Step 2: Delete the three files**

```bash
git rm plugins/clean-merge/skills/review-commits/lib/load-settings.sh \
       plugins/clean-merge/skills/review-commits/lib/reader-prompt.md \
       plugins/clean-merge/skills/review-commits/tests/test-load-settings.sh
```

- [ ] **Step 3: Run remaining test suite**

```bash
bash plugins/clean-merge/skills/review-commits/tests/run-all.sh
```
Expected: 4 tests run (`test-apply-split`, `test-build-todo`, `test-revalidate`, `test-style-check`), all PASS.

- [ ] **Step 4: Commit**

```bash
__GIT_COMMIT_PLUGIN__=1 git commit -m "Drop parallel reader path from review-commits"
```

---

### Task 2: detect-clusters helper (TDD)

`detect-clusters.sh` flags contiguous-commit feature clusters. A cluster is **4+ adjacent commits in `$base..HEAD` whose touched files all share the same 3-level path prefix** (e.g. `plugins/<plugin>/skills/<skill>/`). The synthesizer reads this output and decides (with optional codebase-memory confirmation) whether to propose a squash.

**Output format** (one line per cluster, oldest-first within each cluster):

```
<short-hash> <short-hash> <short-hash>...
```

Multiple clusters → multiple lines. No clusters → empty stdout, exit 0.

**Files:**
- Create: `plugins/clean-merge/skills/review-commits/tests/test-detect-clusters.sh`
- Create: `plugins/clean-merge/skills/review-commits/lib/detect-clusters.sh`

- [ ] **Step 1: Write the failing test**

`tests/test-detect-clusters.sh`:

```bash
#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/helpers.sh"
SCRIPT="$SCRIPT_DIR/../lib/detect-clusters.sh"

tmp=$(mktemp -d); trap "rm -rf $tmp" EXIT
mk_repo "$tmp/repo"
cd "$tmp/repo"
base=$(git rev-parse HEAD)

# 4 commits all under plugins/foo/skills/bar/ → one cluster
mkdir -p plugins/foo/skills/bar
echo a > plugins/foo/skills/bar/a; git add . && git -c user.email=t@t -c user.name=t commit -q -m "Add a"
ha=$(git rev-parse --short HEAD)
echo b > plugins/foo/skills/bar/b; git add . && git -c user.email=t@t -c user.name=t commit -q -m "Add b"
hb=$(git rev-parse --short HEAD)
echo c > plugins/foo/skills/bar/c; git add . && git -c user.email=t@t -c user.name=t commit -q -m "Add c"
hc=$(git rev-parse --short HEAD)
echo d > plugins/foo/skills/bar/d; git add . && git -c user.email=t@t -c user.name=t commit -q -m "Add d"
hd=$(git rev-parse --short HEAD)

out=$(bash "$SCRIPT" "$base")
assert_eq "$out" "$ha $hb $hc $hd" "single 4-commit cluster"

# Add a 5th commit that breaks the cluster (different prefix)
mkdir -p plugins/other
echo z > plugins/other/z; git add . && git -c user.email=t@t -c user.name=t commit -q -m "Add z"
out=$(bash "$SCRIPT" "$base")
# original cluster of 4 should still be detected, new 5th commit excluded
assert_eq "$out" "$ha $hb $hc $hd" "cluster preserved despite trailing outlier"

# Add 4 more under a different prefix → 2 clusters now
mkdir -p plugins/other/skills/baz
echo p > plugins/other/skills/baz/p; git add . && git -c user.email=t@t -c user.name=t commit -q -m "Add p"
hp=$(git rev-parse --short HEAD)
echo q > plugins/other/skills/baz/q; git add . && git -c user.email=t@t -c user.name=t commit -q -m "Add q"
hq=$(git rev-parse --short HEAD)
echo r > plugins/other/skills/baz/r; git add . && git -c user.email=t@t -c user.name=t commit -q -m "Add r"
hr=$(git rev-parse --short HEAD)
echo s > plugins/other/skills/baz/s; git add . && git -c user.email=t@t -c user.name=t commit -q -m "Add s"
hs=$(git rev-parse --short HEAD)

out=$(bash "$SCRIPT" "$base")
expected="$ha $hb $hc $hd
$hp $hq $hr $hs"
assert_eq "$out" "$expected" "two distinct clusters"

# Test the minimum-size threshold: 3 contiguous commits should NOT cluster
mk_repo "$tmp/repo2"
cd "$tmp/repo2"
base2=$(git rev-parse HEAD)
mkdir -p plugins/foo/skills/bar
for i in 1 2 3; do
  echo $i > plugins/foo/skills/bar/$i
  git add . && git -c user.email=t@t -c user.name=t commit -q -m "Add $i"
done
out=$(bash "$SCRIPT" "$base2")
assert_eq "$out" "" "3 commits do not form a cluster (minimum 4)"

echo "PASS"
```

```bash
chmod +x plugins/clean-merge/skills/review-commits/tests/test-detect-clusters.sh
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bash plugins/clean-merge/skills/review-commits/tests/test-detect-clusters.sh
```
Expected: FAIL — `lib/detect-clusters.sh` not found.

- [ ] **Step 3: Implement `lib/detect-clusters.sh`**

```bash
#!/bin/bash
# detect-clusters.sh: flag contiguous-commit feature clusters in $base..HEAD.
# Usage: detect-clusters.sh <base-sha>
# Output: one line per cluster, space-separated short-hashes oldest-first.
set -euo pipefail
base="$1"
MIN_CLUSTER_SIZE=4

mapfile -t hashes < <(git rev-list --reverse "$base..HEAD")

# For each commit, compute its 3-level path prefix from the first changed file.
# A "3-level prefix" is the first 3 path components (e.g. plugins/foo/skills).
prefix_of() {
  local h="$1"
  local files
  mapfile -t files < <(git diff-tree --no-commit-id --name-only -r "$h")
  if [[ ${#files[@]} -eq 0 ]]; then
    echo ""
    return
  fi
  # Check that ALL files share the same 3-level prefix; if not, no prefix.
  local first_prefix
  first_prefix=$(echo "${files[0]}" | awk -F/ '{print $1"/"$2"/"$3}')
  for f in "${files[@]}"; do
    local p
    p=$(echo "$f" | awk -F/ '{print $1"/"$2"/"$3}')
    if [[ "$p" != "$first_prefix" ]]; then
      echo ""
      return
    fi
  done
  echo "$first_prefix"
}

# Walk hashes, group contiguous runs sharing the same non-empty prefix.
clusters=()
current_prefix=""
current_run=()
flush() {
  if [[ ${#current_run[@]} -ge $MIN_CLUSTER_SIZE ]]; then
    local short_run=()
    for h in "${current_run[@]}"; do
      short_run+=("$(git rev-parse --short "$h")")
    done
    clusters+=("${short_run[*]}")
  fi
  current_run=()
  current_prefix=""
}

for h in "${hashes[@]}"; do
  p=$(prefix_of "$h")
  if [[ -z "$p" ]]; then
    flush
    continue
  fi
  if [[ "$p" != "$current_prefix" ]]; then
    flush
    current_prefix="$p"
  fi
  current_run+=("$h")
done
flush

for c in "${clusters[@]}"; do
  echo "$c"
done
```

```bash
chmod +x plugins/clean-merge/skills/review-commits/lib/detect-clusters.sh
```

- [ ] **Step 4: Run test to verify it passes**

```bash
bash plugins/clean-merge/skills/review-commits/tests/test-detect-clusters.sh
bash plugins/clean-merge/skills/review-commits/tests/run-all.sh
```
Both exit 0.

- [ ] **Step 5: Commit**

```bash
git add plugins/clean-merge/skills/review-commits/lib/detect-clusters.sh \
        plugins/clean-merge/skills/review-commits/tests/test-detect-clusters.sh
__GIT_COMMIT_PLUGIN__=1 git commit -m "Add detect-clusters helper for logical-grouping detection"
```

---

### Task 3: Update plan-schema.md to note clustering uses existing primitives

The cluster concept is synthesizer-side; the plan still emits `pick`/`fixup`. Document this so a future reader of `plan-schema.md` understands how clustering lands in the action list.

**Files:**
- Modify: `plugins/clean-merge/skills/review-commits/lib/plan-schema.md`

- [ ] **Step 1: Append a "Logical clustering" section to plan-schema.md**

Open the file and append (preserving everything already there):

```markdown

## Logical clustering

The synthesizer may detect a "feature cluster" — a contiguous run of
4+ commits that together form one logical change (a feature built up
TDD-style across several atomic commits). When it does, the cluster
collapses into existing primitives, not a new schema entry:

- the **first** commit of the cluster gets `action: pick` and a
  `new_message` field holding the synthesizer's authored message
- every **other** commit of the cluster gets `action: fixup`

`build-todo.sh` already handles this combination correctly: the fixups
fold into the pick; the `exec git commit --amend -F <msg>` line written
after the pick retitles the collapsed commit with the saved text. No
plan-schema field changes for v2.
```

- [ ] **Step 2: Commit**

```bash
git add plugins/clean-merge/skills/review-commits/lib/plan-schema.md
__GIT_COMMIT_PLUGIN__=1 git commit -m "Document logical clustering in plan-schema"
```

---

### Task 4: Rewrite synthesizer-prompt.md as inline self-prompt with grouping duty

The synthesizer is no longer a dispatched subagent — it's the inline logic the main agent follows during planning. The prompt file becomes a checklist the agent reads. Two new duties versus v1: invoke `detect-clusters.sh` and confirm with codebase-memory.

**Files:**
- Modify: `plugins/clean-merge/skills/review-commits/lib/synthesizer-prompt.md`

- [ ] **Step 1: Replace the file's content**

Write the full new content:

```markdown
# Synthesizer self-prompt

The main agent follows this checklist during the planning phase. There is no
separate synthesizer subagent in v2 — the same agent that runs the SKILL.md
flow runs these steps inline.

## Inputs

- `$base` — base SHA for the rebase
- `$WORKING_DIR` — directory to write `plan.yaml` to
- `$STYLE_FILE` — absolute path to `plugins/git-commit/styles/<style>.md`
- `$SEMANTIC_AVAILABLE` — `true` if codebase-memory-mcp is reachable AND
  the index is fresh; `false` otherwise

## Tools

- `git log`, `git show`, `git diff`, `git diff-tree` (read-only)
- Read: `$STYLE_FILE`, anything under `$WORKING_DIR`
- `bash plugins/clean-merge/skills/review-commits/lib/detect-clusters.sh "$base"`
- If `$SEMANTIC_AVAILABLE=true`: codebase-memory-mcp `search_graph`,
  `trace_path`, `get_architecture`

## Steps

1. **Read each commit in `$base..HEAD` oldest-to-newest.** For each, build a
   record in memory matching this shape:

   ```yaml
   hash: <abbrev>
   subject: <original>
   files: [...]
   top_level_dirs: [...]
   concern: <one-line>
   change_type: feat|fix|refactor|docs|test|chore|style|build
   suggested_action: pick|fixup|squash|drop|reword|edit
   fixup_candidate_for: <hash or null>
   unrelated: true|false
   ```

   Keep the records in memory; they don't need to be written to disk.

2. **Run hygiene Layers 1 and 2** as described in SKILL.md. Layer 1 detects
   introduce-then-fix subject pairs. Layer 2 flags non-atomic commits and
   test-with-impl pairs (commit B touches only test files for symbols
   introduced by commit A).

3. **Run hygiene Layer 3** if `$SEMANTIC_AVAILABLE=true`. Use
   codebase-memory-mcp to confirm or dismiss Layer 2's `non-atomic` flags
   via cluster membership and `trace_path`.

4. **Detect logical clusters.** Run:

   ```bash
   bash plugins/clean-merge/skills/review-commits/lib/detect-clusters.sh "$base"
   ```

   Each output line is a candidate cluster (space-separated short-hashes,
   oldest first). For each candidate:

   - Skip if any commit in the candidate is already flagged as a fixup
     target by Layer 1 (avoid double-counting).
   - If `$SEMANTIC_AVAILABLE=true`: collect the symbols defined or modified
     across all commits via `search_graph` per file, then check whether
     they all belong to the same architectural cluster. If yes, confirm
     with high confidence and use the cluster's module name as a hint when
     authoring the message. If the symbols span 2+ unrelated clusters,
     demote the candidate (do not propose a squash).
   - If `$SEMANTIC_AVAILABLE=false`: propose with medium confidence; the
     plan-review prompt should flag the lower confidence.

5. **Read `$STYLE_FILE` in full.** The "Subject Line Rules" and "Examples"
   sections are the contract. Author messages in this style for:
   - every action that is `reword` or `squash` (existing v1 behavior)
   - the first commit of each confirmed cluster (new v2 behavior)
   The first line must pass
   `bash lib/style-check.sh "<subject>" "$STYLE_FILE"`.

6. **Emit `plan.yaml` to `$WORKING_DIR/plan.yaml`** matching
   `lib/plan-schema.md`. Cluster collapse uses `pick` on the first commit
   (with `new_message`) and `fixup` on the rest, per `plan-schema.md`'s
   "Logical clustering" section.

7. **Reply with a one-line summary and action counts** before handing off
   to the plan-review user gate.
```

- [ ] **Step 2: Verify the file is well-formed**

```bash
head -3 plugins/clean-merge/skills/review-commits/lib/synthesizer-prompt.md
wc -l plugins/clean-merge/skills/review-commits/lib/synthesizer-prompt.md
```
First line: `# Synthesizer self-prompt`. Length: roughly 60-80 lines.

- [ ] **Step 3: Run the test suite (no test depends on this file)**

```bash
bash plugins/clean-merge/skills/review-commits/tests/run-all.sh
```
All 5 tests still PASS.

- [ ] **Step 4: Commit**

```bash
git add plugins/clean-merge/skills/review-commits/lib/synthesizer-prompt.md
__GIT_COMMIT_PLUGIN__=1 git commit -m "Repurpose synthesizer prompt as inline self-prompt"
```

---

### Task 5: Rewrite SKILL.md (drop parallel, add grouping, tighten freshness)

Major rewrite: delete every reference to parallel/threshold, fold the planning phase into a single inline path, point at the new synthesizer self-prompt, replace the freshness check, and add a logical-grouping subsection to the hygiene flow.

**Files:**
- Modify: `plugins/clean-merge/skills/review-commits/SKILL.md`

- [ ] **Step 1: Read the current file to understand what's being preserved vs replaced**

```bash
wc -l plugins/clean-merge/skills/review-commits/SKILL.md
sed -n '1,15p' plugins/clean-merge/skills/review-commits/SKILL.md  # frontmatter
```
Note the current line count and frontmatter shape.

- [ ] **Step 2: Replace the file content**

Write the new SKILL.md. Use this exact frontmatter:

```yaml
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
```

The body must contain these sections, in this order. Where a section is
**Unchanged**, copy it verbatim from the v1 SKILL.md. Where a section is
**Replaced** or **New**, use the content shown below.

#### Unchanged sections (copy from v1)

- `# Review Commits` (intro paragraph)
- `## Arguments` — but DELETE the `--parallel-threshold`, `--no-parallel`,
  `--force-parallel` rows; keep only `--tag` and `--base`
- `## Precondition`
- `## Auto-Detection`
- `## Test Detection (Shared)`
- `## Commit Hygiene Analysis (Shared)` Layer 1 — verbatim
- `## Commit Hygiene Analysis (Shared)` Layer 2 — verbatim INCLUDING the
  test-with-impl detection block
- `## Commit Hygiene Analysis (Shared)` Layer 3 — verbatim
- `### Present Hygiene Findings` — verbatim
- `### Step 1: Verify Tests` (Branch Flow) — verbatim
- `### Step 2: Show Branch State` — verbatim
- `### Step 5: Plan Review (User Gate)` — verbatim
- `### Step 6: Execute` — verbatim
- `### Step 7: Revalidate` — verbatim
- `### Step 8: Merge to Main` — verbatim
- `### Step 9: Optional Tag` — verbatim
- `### Step 10: Validate and Cleanup` — verbatim
- `### Soft-Reset Escape Hatch` — verbatim
- `## Main Flow` — verbatim
- `## What This Skill Does NOT Do` — verbatim

#### Replaced: `## Codebase Index Resolution (Shared)`

Replace the v1 24-hour-only check with this:

```markdown
## Codebase Index Resolution (Shared)

Before either flow, attempt to set up codebase-memory-mcp for semantic
commit analysis. This enables Layer 3 of the hygiene analysis AND
confirms candidate logical clusters.

### Step 1: Check MCP Availability

Call the `codebase-memory-mcp` `list_projects` tool. If the MCP server is
not available (tool call fails or server not connected): set
`$SEMANTIC_AVAILABLE=false`. Continue without semantic analysis — Layers
1-2 still run, and cluster detection falls back to file-path heuristic
alone.

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
```

#### Replaced: `## Argument Parsing & Settings Load`

Delete this section entirely. v2 has no settings to load. Replace with:

```markdown
## Argument Parsing

Parse `--tag <version>` and `--base <ref>` only. Both are optional. If
`.claude/clean-merge.local.md` exists from a previous v1 run, ignore it —
v2 has no settings.
```

#### Replaced: `### Step 3: Ensure Codebase Index` (Branch Flow)

Becomes a one-liner: "Run the Codebase Index Resolution flow defined
above. This sets `$SEMANTIC_AVAILABLE` for use in Step 4."

#### Replaced: `### Step 4: Plan` (Branch Flow)

```markdown
### Step 4: Plan (inline)

Set up the working directory:

```bash
WORKING_DIR=$(mktemp -d)/review-commits
mkdir -p "$WORKING_DIR/msgs"
```

Resolve `$STYLE_FILE` by reading `.claude/git-commit.local.md` →
`commit_style` value → `plugins/git-commit/styles/<style>.md`. If the
local settings file is missing, default to `classic`.

Read each commit in `$base..HEAD` oldest-to-newest, run the planning
checklist at `plugins/clean-merge/skills/review-commits/lib/synthesizer-prompt.md`,
and write `$WORKING_DIR/plan.yaml`. Cluster detection runs as part of
that checklist (Step 4 in the synthesizer prompt) using
`lib/detect-clusters.sh`.

There is no longer a multi-agent path — the main agent does both
reading and synthesis. For a typical feature branch (5-30 commits)
this is faster and cheaper than dispatching subagents.
```

#### New: `## Logical Clustering` section after the Hygiene Analysis

Insert this as a new section between `## Commit Hygiene Analysis (Shared)`
and the start of `## Branch Flow`:

```markdown
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
```

- [ ] **Step 3: Verify frontmatter and basic structure**

```bash
awk '/^---$/{c++} END{exit (c<2)}' plugins/clean-merge/skills/review-commits/SKILL.md \
  || (echo "frontmatter not closed"; exit 1)
grep -c "^## " plugins/clean-merge/skills/review-commits/SKILL.md  # expect ~10-12 sections
grep -E "parallel_threshold|--no-parallel|--force-parallel|load-settings.sh|reader-prompt.md" \
  plugins/clean-merge/skills/review-commits/SKILL.md \
  && (echo "v1 references remain"; exit 1) || echo "OK: no v1 references"
```
The grep for v1 references must produce no matches.

- [ ] **Step 4: Run full test suite**

```bash
bash plugins/clean-merge/skills/review-commits/tests/run-all.sh
```
All 5 tests still PASS (no test depends on SKILL.md content).

- [ ] **Step 5: Commit**

```bash
git add plugins/clean-merge/skills/review-commits/SKILL.md
__GIT_COMMIT_PLUGIN__=1 git commit -m "Drop parallel path and add logical clustering to review-commits"
```

---

### Task 6: Update v2 design status

Once implementation lands, mark the v2 spec as implemented (matches what
v1 should have done but didn't).

**Files:**
- Modify: `plugins/clean-merge/docs/specs/2026-05-06-review-commits-v2-simplification-design.md`

- [ ] **Step 1: Edit the Status line**

Change the second line:
```
Status: Draft (pending user review)
```
to:
```
Status: Implemented
```

- [ ] **Step 2: Commit**

```bash
git add plugins/clean-merge/docs/specs/2026-05-06-review-commits-v2-simplification-design.md
__GIT_COMMIT_PLUGIN__=1 git commit -m "Mark review-commits v2 design as implemented"
```

---

## Self-Review

**Spec coverage check:**

| Spec section | Task |
|---|---|
| §2.1 Drop parallel path | Task 1 (delete dead files), Task 5 (SKILL.md cleanup) |
| §2.2 Logical-grouping detection | Task 2 (detect-clusters helper), Task 4 (synthesizer prompt), Task 5 (SKILL.md section) |
| §2.3 Tighter index freshness | Task 5 (Codebase Index Resolution rewrite) |
| §3 File changes (delete list) | Task 1 |
| §3 File changes (modify list) | Tasks 3, 4, 5 |
| §3 File changes (unchanged list) | n/a — verified by tests still passing |
| §4 Failure handling | Task 4 (synthesizer fallbacks), Task 5 (freshness fallback) |
| §6 Testing — new test for grouping | Task 2 (test-detect-clusters.sh) |

No gaps.

**Placeholder scan:** No "TBD", no "implement later", every step has the actual code or command. ✓

**Type consistency:** `$base`, `$WORKING_DIR`, `$STYLE_FILE`, `$SEMANTIC_AVAILABLE` all match across the synthesizer prompt (Task 4) and SKILL.md (Task 5). The cluster output format ("space-separated short-hashes, oldest first, one line per cluster") is consistent across the helper (Task 2), the synthesizer prompt (Task 4), and the SKILL.md "Logical Clustering" section (Task 5). The plan-schema's "first pick + rest fixup" pattern is consistent across plan-schema.md (Task 3), synthesizer-prompt.md (Task 4), and SKILL.md (Task 5).

---

## Execution Handoff

Plan complete and saved to `plugins/clean-merge/docs/plans/2026-05-06-review-commits-v2.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using `executing-plans`, batch execution with checkpoints.

Which approach?
