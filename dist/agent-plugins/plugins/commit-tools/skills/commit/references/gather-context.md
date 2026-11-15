# Step 3: Gather Context

1. **Get the full staged diff:**
   - Try: `mcp__1mcp__git_1mcp_git_diff_staged`
   - Fallback: `git diff --staged`

2. **Get list of staged files:**
   - `git diff --staged --name-only`

3. **Get recent commits** (for style consistency):
   - Try: `mcp__1mcp__git_1mcp_git_log` with limit 5
   - Fallback: `git log --oneline -5`

4. **If `--amend` flag is set:**
   - Read `references/last-commit-comparison.md` and verify the same author/unpublished prerequisites before proceeding. Use local remote-tracking refs only; do not fetch or push. Refuse known-published commits and commits authored by others.
   - Get current commit message: `git log -1 --format=%B`
   - Set `AMEND_MODE=true` and capture `LAST_DIFF=$(git show HEAD)`.

5. **User context:** Any remaining arguments after flags are treated as context/intention
