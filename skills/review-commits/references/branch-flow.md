# Branch Flow

Paths in this workflow are relative to the review-commits skill directory.

### Step 1: Verify Tests

Run the detected test command. If it fails, stop:

    Tests failed. Fix the failures before reviewing commits.

### Step 2: Show Branch State

Determine the merge base:

```bash
base=$(git merge-base HEAD main)
```

If `--base` was provided, use that instead.

Show the commits:

```bash
git log --oneline $base..HEAD
```

Display:
```
Branch <branch-name> has N commits since main:

  <hash> <subject>
  <hash> <subject>
  ...

Analyzing commit hygiene and building rebase plan...
```

### Step 3: Ensure Codebase Index

Run the "Codebase Index Resolution" flow defined above. This sets
`$SEMANTIC_AVAILABLE` for use in Step 4.

### Step 4: Plan (inline)

Set up the working directory:

```bash
WORKING_DIR=$(mktemp -d)/review-commits
mkdir -p "$WORKING_DIR/msgs"
```

Resolve `$STYLE_FILE` by reading `.claude/git-commit.local.md` →
`commit_style` value → `plugins/commit-tools/styles/<style>.md`. If the
local settings file is missing, default to `classic`.

Read each commit in `$base..HEAD` oldest-to-newest using
`git log --reverse --format='%H%x00%s%x00%b%x00---END---' "$base..HEAD"`
so commit bodies are available to the synthesizer. Run the planning
checklist at `plugins/commit-tools/skills/review-commits/lib/synthesizer-prompt.md`
and write `$WORKING_DIR/plan.yaml`. Cluster detection runs as part of
that checklist (Step 5 in the synthesizer prompt) using
`lib/detect-clusters.sh`.

There is no longer a multi-agent path — the main agent does both
reading and synthesis. For a typical feature branch (5-30 commits)
this is faster and cheaper than dispatching subagents.

### Step 5: Plan Review (User Gate)

Show the plan via AskUserQuestion. Display the original
`git log --oneline $base..HEAD`, then the proposed action sequence with
the first line of each new message inline (truncated to 72 chars).

First present any cluster proposals, then the final per-commit plan, using the templates in `references/plan-review-dialogs.md`. The cluster form depends on which detectors fired: both, branch only, path only, or neither. The final plan offers Accept / Modify / Reset.

For any `pick` or `reword` whose authored `new_message` carries a body,
show the first 2 wrapped lines of the body indented under the subject
(max ~160 chars total, ellipsis if truncated). Subject-only entries
render as today. `fixup`, `drop`, and `edit` entries never get a body
preview line — only `pick` and `reword` carry `new_message`.

If "Modify": use AskUserQuestion to let the user change the action for any
commit. Re-display the updated plan for confirmation.

If "Reset": fall back to the Soft-Reset Escape Hatch (see below).

With `--unattended`, automatically take the cluster option marked
recommended. If no option is marked recommended, keep all commits as `pick`.
Then accept the final per-commit plan. Record each decision, including
`{"gate":"cluster-proposal","chose":"recommended-or-pick","why":"unattended default"}`
and `{"gate":"plan-review","chose":"accept","why":"unattended default"}`.
Write the full plan to the result file before executing. The Modify and Reset
paths are unavailable in unattended mode; if the plan cannot be executed
mechanically, fail non-zero instead of asking.

### Step 6: Execute

Build the todo file and message directory, then run the rebase:

```bash
msgdir="$WORKING_DIR/msgs"
mkdir -p "$msgdir"
bash plugins/commit-tools/skills/review-commits/lib/build-todo.sh \
  "$WORKING_DIR/plan.yaml" "$msgdir" > "$WORKING_DIR/todo"
GIT_EDITOR=true \
GIT_SEQUENCE_EDITOR="cat $WORKING_DIR/todo >" \
  git rebase -i "$base"
```

**The executor authors NO messages.** If you find yourself writing a commit
message during this step, you are violating the contract — stop, return to
Step 4, and fix the plan instead.

`build-todo.sh` and `apply-split.sh` set `__GIT_COMMIT_PLUGIN__=1` on the
`git commit --amend` and `git commit -F` calls they emit/run, which is the
documented bypass for the git-commit plugin's PreToolUse block. The skill
itself does not need to re-set this — the helpers handle it.

If the rebase reports a conflict:
1. Stop immediately
2. Run `git diff --name-only --diff-filter=U` to show conflicting files
3. Await user resolution + `git rebase --continue`
4. Resume from Step 7 once the rebase completes

With `--unattended`, do not wait for resolution. Capture conflicting files,
run `git rebase --abort`, restore the recorded original HEAD if needed, write
`outcome: failed`, reason: `conflict`, and exit non-zero.

### Step 7: Revalidate

```bash
PATH_TO_LIB=plugins/commit-tools/skills/review-commits/lib \
  bash plugins/commit-tools/skills/review-commits/lib/revalidate.sh \
  "$WORKING_DIR/plan.yaml" "$msgdir" "$base" "$STYLE_FILE" \
  || echo "drift remained — see warnings"
```

This auto-amends any commit whose subject drifted from the saved messages.
A non-zero exit means at least one subject failed the style check AND no
saved message was available — surface as a warning to the user but do not
abort.

With `--unattended`, drift with no saved message is a hard failure. Restore
the original HEAD, write `outcome: failed`, reason: `drift`, and exit non-zero.

### Step 8: Merge to Main

With `--unattended`, skip this step entirely. Do not merge and never check out
another branch.

Move the cleaned-up commits to main:

```bash
git checkout main
git merge <branch> --ff-only
```

If `--ff-only` fails, use AskUserQuestion per `references/merge-and-cleanup-prompts.md` (Step 8): Rebase (recommended) / Merge commit / Abort.

### Step 9: Optional Tag

With `--unattended`, skip this step entirely and ignore `--tag`.

Only if `--tag <version>` was provided:

```bash
git tag <version>
```

Never prompt for a tag. Never auto-tag.

### Step 10: Validate and Cleanup

With `--unattended`, invoke `validate-commits --unattended --base <base>`
(pass through `--result`/`--test-cmd` equivalents as needed for validation
output). If validation fails, restore the original HEAD, write reason:
`validation`, and exit non-zero. Never delete the branch or remove a worktree.

Invoke the `validate-commits` skill to run all seven checks.

After validation passes, ask before cleaning up using AskUserQuestion per `references/merge-and-cleanup-prompts.md` (Step 10): delete the merged branch (`git branch -d`) and remove the worktree if one was used.

### Soft-Reset Escape Hatch

The Soft-Reset Escape Hatch is not available with `--unattended`; if the plan
cannot be executed, fail non-zero and write the reason to the result file.

If the user chose "Reset" in Step 5, instead of interactive rebase:

```bash
git reset --soft $base
```

This unstages all changes. Group files by top-level directory and concern,
then present groupings via AskUserQuestion. For each group:
1. Stage the group's files: `git add <files>`
2. Invoke `/commit`

The hygiene findings from Step 4 carry forward — display them again as
context for grouping decisions.
