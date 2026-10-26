# Merge and Cleanup Prompts

## Step 8: ff-only failure prompt

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

## Step 10: branch cleanup prompt

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
