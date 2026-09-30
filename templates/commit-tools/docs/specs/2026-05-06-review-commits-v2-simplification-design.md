# review-commits v2 — Simplification & Logical Grouping

Date: 2026-05-06
Status: Implemented
Affected plugin: `plugins/clean-merge` (skill: `review-commits`)
Supersedes / refines: `2026-05-06-multi-agent-review-commits-design.md`

## 1. Why a v2

V1 added a parallel reader path on the assumption that reading commits at
scale was the bottleneck. Dogfooding on the v1 implementation itself (an
11-commit feature branch) revealed three problems:

1. **Parallel reading wastes tokens.** Each subagent burned ~58k tokens of
   per-call overhead (system prompt + tool schemas) to read one small
   commit and emit a 10-line YAML record. 11 readers cost ~640k tokens for
   work a single main agent could have done sequentially in ~30k tokens.
   Wall-clock saving was ~60s; cost was ~20× tokens. Bad trade for typical
   feature branches.
2. **No logical-grouping awareness.** The hygiene analysis spots *bad*
   multi-commit patterns (introduce-then-fix, non-atomic, unrelated) but
   never spots *good-but-too-granular* patterns. TDD discipline produces
   one-commit-per-task during development; once the feature lands, that
   granularity is noise. The skill should propose collapsing tightly-coupled
   atomic commits into one logical commit with a fresh authored message.
3. **Index freshness check uses calendar age only.** The 24-hour heuristic
   misses the common case: commits made 30 minutes ago against an index
   built 12 hours ago. The graph has no idea what those commits changed.
   The check should compare commit timestamps against `last_indexed`.

V2 addresses all three.

## 2. Design

### 2.1 Drop the parallel path entirely

Delete `parallel_threshold`, `parallel_batch_size`, `--no-parallel`,
`--force-parallel`, `--parallel-threshold`. Delete the first-run prompt.
Delete the reader subagent dispatch path. The settings file
`.claude/clean-merge.local.md` becomes optional and reduced (or removed).

The synthesizer logic moves inline into the main agent: it reads each
commit oldest-to-newest, builds the same record schema in memory, runs
hygiene analysis (Layers 1-3), authors messages, and writes `plan.yaml`.

What we keep from v1:
- The planner/executor split — this is the actual fix for the original
  drift bug
- `lib/style-check.sh`, `lib/build-todo.sh`, `lib/apply-split.sh`,
  `lib/revalidate.sh`
- `lib/plan-schema.md` (extended for fix 2 below)
- `lib/synthesizer-prompt.md` repurposed as a *self-prompt* the main
  agent follows during inline synthesis
- `GIT_EDITOR=true` + `GIT_SEQUENCE_EDITOR` mechanical replay
- Auto-amend revalidation

What we drop:
- `lib/reader-prompt.md` (delete; the schema lives in `plan-schema.md` and
  the synthesizer prompt)
- `lib/load-settings.sh` (delete; the settings file is gone)
- All `parallel_*` env vars and CLI flags
- `tests/test-load-settings.sh`

### 2.2 Logical-grouping detection

A new synthesizer duty: identify "feature-cluster" commits and propose
collapse to one logical commit.

**Detection heuristic** (file-path layer):

A candidate cluster is a *contiguous run of 4+ commits* in the range where:
- All commits touch files under a single 3-level path prefix
  (e.g. `plugins/<plugin>/skills/<skill>/`), AND
- The combined diff stays within that prefix (no commit in the run touches
  files outside the cluster's prefix), AND
- No commit in the run is already flagged as a fixup target by Layer 1
  (so we don't double-count introduce-then-fix pairs)

**Confirmation** (codebase-memory layer, when `$SEMANTIC_AVAILABLE=true`):

For each candidate cluster:
1. Collect the union of symbols defined or modified across all commits in
   the cluster (via `search_graph` on each changed file)
2. Run `search_graph` with the symbol union to retrieve their architectural
   labels / module assignments
3. If all symbols belong to the same architectural cluster (same module or
   tightly connected by `trace_path`), confirm the squash with high
   confidence. The cluster's module name informs the authored message.
4. If symbols span 2+ unrelated clusters, demote the candidate — the
   commits are co-located but architecturally distinct, so leave them alone

**Fallback when MCP is unavailable**:

The file-path heuristic alone proposes the squash with medium confidence.
The user sees the proposal in plan review and can accept or reject.

**Plan output**:

Use the existing `squash` action — no new schema field needed. The cluster
becomes a `pick` on the first commit followed by `squash` on the rest, with
`new_message` on the first commit's record. `build-todo.sh` already handles
this:

```yaml
actions:
  - hash: <first>
    action: pick
    new_message: |
      Add review-commits helper library and tests
      <body>
  - hash: <second>
    action: fixup     # collapse into the first commit's message
  - hash: <third>
    action: fixup
  ...
```

(We use `fixup` rather than `squash` so git doesn't try to compose messages
— the synthesizer's authored message is the only one that lands. The
existing `build-todo.sh` emits `exec git commit --amend -F <msg-file>`
after the run, which retitles the collapsed commit with the saved text.)

This means **no `plan-schema.md` change and no `build-todo.sh` change**.
The `cluster` concept is a synthesizer-side abstraction; the plan emits
existing primitives.

### 2.3 Tighter index freshness check

Replace the calendar-age check in the "Codebase Index Resolution" section
with a stronger check that re-indexes whenever EITHER:

1. Latest commit timestamp in `$base..HEAD` is newer than `last_indexed`
   (the graph doesn't know about commits being reviewed), OR
2. `last_indexed` is older than 24 hours (general staleness fallback for
   the rest of the repo), OR
3. `last_indexed` is missing entirely (first run on this project)

When any condition triggers, invoke `/codebase:index`. The codebase plugin
already honors the user's `auto_index: ask|always|never` preference, so
the skill delegates that decision rather than re-implementing it.

```bash
last_indexed=$(awk '/^last_indexed:/{print $2}' .claude/codebase.local.md 2>/dev/null)
latest_commit_ts=$(git log -1 --format=%cI "$base..HEAD" 2>/dev/null)
needs_reindex=false

if [[ -z "$last_indexed" ]]; then
  needs_reindex=true
elif [[ -n "$latest_commit_ts" && "$latest_commit_ts" > "$last_indexed" ]]; then
  needs_reindex=true
else
  # fallback 24h check
  age_hours=$(( ( $(date +%s) - $(date -j -f "%Y-%m-%dT%H:%M:%SZ" "$last_indexed" +%s) ) / 3600 ))
  [[ $age_hours -gt 24 ]] && needs_reindex=true
fi

[[ "$needs_reindex" == "true" ]] && /codebase:index
```

The ISO-8601 string comparison works because both timestamps are
zero-padded UTC.

## 3. What changes in each file

### Modified

| File | Change |
|---|---|
| `SKILL.md` | Delete parallel path, first-run prompt, settings flags. Inline the synthesizer logic. Add logical-grouping section. Replace freshness check. |
| `lib/synthesizer-prompt.md` | Repurpose as a self-prompt the main agent follows. Add the logical-grouping detection duty. |
| `lib/plan-schema.md` | Minor edit to clarify how clustering uses pick+fixup primitives. No schema change. |

### Deleted

| File | Reason |
|---|---|
| `lib/reader-prompt.md` | No more reader subagents |
| `lib/load-settings.sh` | No more settings to load |
| `tests/test-load-settings.sh` | Helper deleted |

### Unchanged

| File | Why |
|---|---|
| `lib/style-check.sh` + test | Still used by revalidator |
| `lib/build-todo.sh` + test | Still used by executor; clustering reuses existing actions |
| `lib/apply-split.sh` + test | Still used for `edit` actions |
| `lib/revalidate.sh` + test | Still used for drift auto-amend |

### Settings file

`.claude/clean-merge.local.md` is no longer needed. The skill stops
reading it. (We don't actively delete the user's existing file — the skill
just ignores it.)

## 4. Failure handling (changes from v1)

| Failure | New response |
|---|---|
| Codebase-memory-mcp unavailable | Logical-grouping uses file-path heuristic alone with medium-confidence label in the plan-review prompt. Layers 1-2 still run. |
| Index re-indexing fails (timeout, permissions) | Set `$SEMANTIC_AVAILABLE=false`, continue without Layer 3 and without cluster confirmation. Don't block. |
| Latest commit timestamp parse fails | Fall back to 24h calendar check alone. |

## 5. Migration

This is a breaking change to the skill's CLI surface (three flags removed).
The skill is unreleased — we're shipping v1 and v2 as one merged feature
because v1 hasn't landed on main yet. Branch state at design time:
`feature/multi-agent-review-commits` has the v1 commits; v2 commits will
land on the same branch and the whole thing squashes into ~2 commits at
merge time.

## 6. Testing

Same approach as v1 — bash unit tests for the helpers, integration
scenarios documented for manual fixture-repo runs. New test coverage:

- `test-revalidate.sh` and `test-build-todo.sh` continue to cover their
  helpers (no behavior change from v1)
- A new `tests/test-grouping-detection.sh` would unit-test the file-path
  heuristic but NOT the codebase-memory confirmation (that requires a real
  index and is integration-scope). The unit test feeds the synthesizer
  fake reader records and asserts which commits get grouped.

## 7. Open items

None — all blocking decisions resolved during brainstorming:

- Delete parallel path: yes
- Logical grouping reuses existing pick+fixup primitives, no schema change
- Codebase-memory enriches grouping confirmation only (not message authoring)
- Index freshness gates on commit timestamp + 24h fallback
- Settings file deprecated (skill ignores it)
