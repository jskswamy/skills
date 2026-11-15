# Precondition

Require a clean worktree. Run:

```bash
git status --porcelain
```

If output is non-empty:

- With `--unattended`, or when only untracked files exist, or when `command -v git-absorb` is unavailable, refuse to proceed:

      Your worktree has uncommitted changes. Please commit or stash them
      before running review-commits.

- In interactive mode when tracked files have staged modifications (and no unstaged or untracked files) and `command -v git-absorb >/dev/null 2>&1` is available, resolve `$base` (`--base` or `git merge-base HEAD main`) and run `git absorb --base "$base" --dry-run`. Only if the dry run succeeds and leaves no unabsorbed staged hunks, ask via AskUserQuestion whether to run `git absorb --base "$base"` (creating `fixup!` commits to be folded during Step 6's approved rebase) or abort so the user can commit/stash manually. Never pass `--and-rebase` here so no history is rewritten before the `commit-tools-commit` approval gate; if the dry run cannot absorb every hunk cleanly, refuse with the message above without creating any commits.
