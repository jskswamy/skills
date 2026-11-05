# Step 3b: Last Commit Comparison Details

## Prerequisites, overlap heuristic, and LLM path

**Prerequisites — skip entirely and set `AMEND_MODE=false` if any fail:**
1. Repo has at least one commit: `git log -1` exits 0
2. Last commit was authored by the current user:
   - Current user email: `git config user.email`
   - Last commit email: `git log -1 --format='%ae'`
   - Must match exactly
3. Last commit is not contained in any known remote-tracking branch:
   `git for-each-ref --format='%(refname)' --contains=HEAD refs/remotes/`
   must succeed with empty output. A missing upstream is not evidence that
   the commit is unpublished. These refs are a local snapshot, not proof of
   remote state; do not fetch implicitly. If the conversation indicates
   the commit was published, refuse the amend even if local refs are stale.

**If all prerequisites pass, run the file-overlap heuristic:**

```bash
staged_files=$(git diff --staged --name-only)
last_files=$(git diff-tree --no-commit-id --name-only -r HEAD)
```

Compute Jaccard overlap:
```
overlap = |staged_files ∩ last_files| / |staged_files ∪ last_files|
```

Decision table:
```
overlap > 0.5                                                → AMEND_MODE=true
overlap == 0  AND  every staged file's top-level dir
             differs from every last_files' top-level dir   → AMEND_MODE=false
otherwise                                                    → LLM path
```

"Top-level dir" = the first path component before `/`. For root-level files, it is the filename itself.

**LLM path (ambiguous cases only):**

When the heuristic yields no clear decision, gather:
- `LAST_MSG=$(git log -1 --format='%B')` — last commit subject + body
- `LAST_DIFF=$(git show HEAD)` — last commit's full diff
- Current staged diff (already gathered in Step 3)

Ask yourself: "Do these staged changes belong with the previous commit (same logical concern), or are they a new, separate concern?" Answer `amend` or `new` and set `AMEND_MODE` accordingly.
