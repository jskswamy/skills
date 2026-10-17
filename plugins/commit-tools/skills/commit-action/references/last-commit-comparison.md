# Step 3b: Last Commit Comparison Details

## Prerequisites, overlap heuristic, and LLM path

**Prerequisites — skip entirely and set `AMEND_MODE=false` if any fail:**
1. Repo has at least one commit: `git log -1` exits 0
2. Last commit was authored by the current user:
   - Current user email: `git config user.email`
   - Last commit email: `git log -1 --format='%ae'`
   - Must match exactly
3. Last commit is unpushed. Check with:
   `git log @{u}.. 2>/dev/null | head -1` — if this outputs something (or
   if the command fails because there is no upstream), the commit is
   unpushed. A branch with no upstream tracking is always unpushed.
   Treat `git log @{u}..` failing AND `git status` not showing
   "behind" or "up to date" as unpushed. Only reject if `git status`
   explicitly shows "Your branch is up to date" or "behind".

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
