# Step 1: Check Repository State

First, verify we're in a git repository and check the current state:

1. Run `git rev-parse --git-dir` to verify git repository
2. If not a git repo, show error and exit:
   ```
   Error: Not a git repository. Please run this command from within a git repository.
   ```

3. Get staged changes: `git diff --staged --stat` (the summary is enough here; the full diff stays out until it is needed)

4. If `--amend` is set and no staged changes exist, keep the index unchanged and continue to Step 2. Use `git show HEAD` and the current message as context; leave unrelated unstaged/untracked files alone.

5. Otherwise, if NO staged changes:
   - Get unstaged changes: `git diff --stat` and `git status --porcelain`
   - Use AskUserQuestion:
     ```
     No changes are staged for commit.

     Unstaged changes detected:
     - src/auth/login.ts (modified)
     - src/ui/button.tsx (modified)
     - README.md (new file)

     What would you like to do?
     ○ Stage all changes - git add -A
     ○ Select files to stage - Choose specific files
     ○ Cancel - Exit without committing
     ```
   - If "Stage all": Run `git add -A` then continue
   - If "Select files": Show file list with multiSelect, stage selected files
   - If "Cancel": Exit
