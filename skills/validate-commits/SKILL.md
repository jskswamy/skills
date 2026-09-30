---
name: validate-commits
description: >
  Validate commits before pushing. Runs six deterministic checks: clean
  worktree, tests pass, no AI co-author leaks (Claude, Anthropic, GPT,
  OpenAI, Copilot), no conflict markers, no squash/fixup residue, and
  subject lines conform to the configured style (classic or conventional).
  Activates on: "validate commits", "check commits before push",
  "any AI leaks", "check for co-author", "are my commits clean",
  "validate before pushing", "check commits".
argument-hint: "[--base <ref>] [--unattended] [--result <path>] [--test-cmd <cmd>]"
---

# Validate Commits

Run six deterministic checks against unpushed commits. All checks use
git commands, grep, and the shared `style-check.sh` script — no LLM
judgment.

## Arguments

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `--base <ref>` | string | auto; required with `--unattended` | Base for `base..HEAD` |
| `--unattended` | boolean | false | Run without `AskUserQuestion`; fail instead of prompting and write result JSON |
| `--result <path>` | string | `.review-commits/validate-result.json` | Machine-readable result file |
| `--test-cmd <cmd>` | string | auto-detected | Override test command detection |

With `--unattended`, add `.review-commits/` to `.git/info/exclude` before
writing the default result path.

## Unattended Result File

Write `--result <path>` in every unattended outcome:

```json
{
  "outcome": "done | failed",
  "reason": "no-base | tests | validation | null",
  "base": "<sha>",
  "originalHead": "<sha>",
  "newHead": "<sha>",
  "decisions": [{"gate": "ai-coauthor-autofix", "chose": "default", "why": "unattended default"}],
  "validation": {"cleanWorktree": true, "tests": true, "noAICoauthor": true,
                  "noConflictMarkers": true, "noSquashResidue": true, "style": true},
  "detail": "..."
}
```

Record all six checks as pass/fail with details. Exit code 0 only when
`outcome` is `done`.

## Precondition

Require a clean worktree before starting. Run:

```bash
git status --porcelain
```

If output is non-empty, refuse to proceed:

    Your worktree has uncommitted changes. Please commit or stash them
    before running validation.

## Determine Commit Range

Establish the base ref for `base..HEAD` in this priority order:

1. **Explicit `--base <ref>` argument** — use directly
2. **Upstream tracking** — run `git rev-parse @{u}` to get upstream ref.
   If it succeeds, use `@{u}..HEAD`
3. **No upstream** — ask the user using AskUserQuestion:
   - Get the latest tag: `git describe --tags --abbrev=0 2>/dev/null`
   - Offer options:
     - "Use latest tag (<tag>)" — if a tag exists
     - "Enter a commit ref" — free text input

With `--unattended`, `--base <ref>` is required. Do not use upstream fallback
and do not ask. If `--base` is missing or cannot be resolved, write
`outcome: failed`, reason: `no-base`, leave the repository unchanged, and exit
non-zero.

Store the resolved base as `$BASE` for all subsequent checks.

If `git log --oneline $BASE..HEAD` produces no commits, report
"No commits to validate between $BASE and HEAD" and stop.

## Checks

Run ALL six checks regardless of individual failures. Collect results,
then report everything at once.

### Check 1: Clean Worktree

Run: `git status --porcelain`

- **Pass:** No output
- **Fail:** List the dirty files

### Check 2: Tests Pass

If `--test-cmd <cmd>` was provided, use it as the test command. Otherwise
detect the project test command by checking for project files in the working
directory root:

| File | Command |
|------|---------|
| `go.mod` | `go test ./...` |
| `package.json` | `npm test` |
| `Cargo.toml` | `cargo test` |
| `pyproject.toml` | `pytest` |

Check files in this order. Use the first match. If no project file is
found, skip this check and mark as "Skipped (no test command detected)".

Run the detected command. Capture exit code.

- **Pass:** Exit code 0
- **Fail:** Show the test command and its exit code

### Check 3: No AI Co-Author

Scan all commits in range for AI co-author lines:

```bash
git log --format=%B $BASE..HEAD
```

Search the output for `Co-Authored-By:` lines matching ANY of these
patterns (case-insensitive):

- Names: `Claude`, `Anthropic`, `GPT`, `OpenAI`, `Copilot`, `GitHub Copilot`
- Emails: `noreply@anthropic.com`, `noreply@openai.com`
- Model refs: `Claude Opus`, `Claude Sonnet`, `Claude Haiku`, `Claude Code`

For each match, record the commit hash and the offending line.

- **Pass:** No matches
- **Fail:** List each commit hash and the matched Co-Authored-By line

### Check 4: No Conflict Markers

Get the list of files changed in the commit range:

```bash
git diff --name-only $BASE..HEAD
```

For each file that still exists in the working tree, search for
conflict markers:

```bash
grep -n '^<<<<<<< \|^>>>>>>>' <file>
```

- **Pass:** No matches in any file
- **Fail:** List each file and line number with the marker

### Check 5: No Squash Residue

Check commit subjects for fixup/squash prefixes:

```bash
git log --format=%s $BASE..HEAD
```

Check each subject line. A subject starting with `fixup! ` or `squash! `
is a failure.

- **Pass:** No subjects start with `fixup!` or `squash!`
- **Fail:** List each commit hash and subject

### Check 6: Subjects Conform to Style

Resolve the active style file:

1. Read `.claude/git-commit.local.md` and extract the `commit_style` value
   from its YAML frontmatter
2. If missing, default to `classic`
3. Style file path: `plugins/commit-tools/styles/<style>.md`

Then for each commit in `$BASE..HEAD`, run the shared style check:

```bash
SCRIPT=plugins/commit-tools/skills/review-commits/lib/style-check.sh
for h in $(git rev-list --reverse $BASE..HEAD); do
  subj=$(git log -1 --format=%s "$h")
  if ! reason=$(bash "$SCRIPT" "$subj" "$STYLE_FILE" 2>&1); then
    echo "  ✗ $h '$subj' — $reason"
  fi
done
```

The script enforces the loaded style's rules. For `classic` these are:
≤50 chars, leading uppercase, no trailing period, no `word:` type prefix,
imperative mood (best-effort denylist of common past/3rd-person/gerund
forms). For `conventional`: ≤72 chars and the standard `type(scope)?: description`
format.

- **Pass:** Every subject conforms
- **Fail:** List each non-conforming commit hash, subject, and reason

## Report Results

Display all six results using checkmark/cross format:

```
Post-commit validation:

  ✓ Clean worktree
  ✓ Tests pass (summary)
  ✗ AI co-author in commit 7ce2788
    Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
  ✓ No conflict markers
  ✓ No squash residue
  ✗ Style violation in commit a1b2c3d
    'Spec: declarative agent provisioning' — subject has type-prefix (classic forbids 'word:' prefixes)
```

If ALL pass: "All checks passed. Ready to push."

If ANY fail: "Post-commit validation failed." followed by the results.

## Auto-Fix: AI Co-Author

If Check 3 fails AND all other checks pass (or the user wants to fix
incrementally), offer to auto-fix:

With `--unattended`, do not ask. Take the default safe choice: do not modify
commits, record `{"gate":"ai-coauthor-autofix","chose":"no","why":"unattended default"}`,
write the failed Check 3 detail to the result file, and exit non-zero.

Use AskUserQuestion:
```
Fix automatically? (amends the affected commit to remove the AI co-author line)
○ Yes — remove the co-author line
○ No — I'll handle it
```

If "Yes":
- For each affected commit (most recent first):
  - Get the full commit message: `git log -1 --format=%B <hash>`
  - Remove the offending `Co-Authored-By:` line(s)
  - If the commit is HEAD: `git commit --amend -m "<cleaned message>"`
  - If the commit is NOT HEAD: use interactive rebase is not possible
    in this context, so report: "Commit <hash> is not HEAD. To fix,
    run: `git rebase -i <hash>^` and edit the commit message manually."
- Re-run Check 3 to confirm the fix worked

If "No": Report the failure and let the user handle it.

## No Other Auto-Fixes

Checks 1, 2, 4, 5, and 6 report failures only. The user must fix them.
Style violations (Check 6) are typically fixed by running `/review-commits`,
which rewrites drifted subjects against the saved style.
