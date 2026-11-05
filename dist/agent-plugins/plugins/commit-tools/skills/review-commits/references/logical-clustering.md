# Logical Clustering

Note: `lib/...` paths are relative to the skill root (the directory containing SKILL.md), not to this references/ directory.

## Feature cluster detection

Beyond per-commit hygiene, the planner detects "feature clusters": runs of
4+ contiguous commits that together form a single logical change (TDD
discipline produces these — scaffold → helper → test → another helper →
wire it up). Once the feature lands, that granularity is noise on `main`.

Detection runs after Hygiene Layers 1-4 and uses
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
