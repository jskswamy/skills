# Codebase Index Resolution Details

## Step 2: Decide Whether to (Re)Index

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

With `--unattended`, do not invoke `/codebase:index`. If the existing index is
missing or stale, set `$SEMANTIC_AVAILABLE=false`, continue with Layers 1 and 2,
and record a decision such as `{"gate":"codebase-index","chose":"skip","why":"unattended; existing fresh index unavailable"}`.

If indexing fails for any reason, set `$SEMANTIC_AVAILABLE=false` and
continue — do not block the workflow.

If indexing succeeds (or was unnecessary), set `$SEMANTIC_AVAILABLE=true`.
