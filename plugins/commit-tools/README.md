# commit-tools

End-to-end commit hygiene for Claude Code: write atomic, well-styled
commit messages; review and consolidate commits before pushing; and
validate the final history meets project standards.

## What's included

| Command | Purpose |
|---------|---------|
| `/commit` | Write an atomic commit with classic or conventional style, intelligent message generation from session context, and pair-programming attribution |
| `/review-commits` | Plan a rebase to squash/reword/drop commits before push; supports cluster detection (path heuristic + branch heuristic), body preservation through fixup, and a user-gated plan review |
| `/validate-commits` | Five deterministic checks (clean worktree, tests pass, no AI co-author leaks, no conflict markers, no rebase residue) |

## Skills

- `commit-style` — Educational guidance on classic vs conventional commit styles and the seven-rules canon.
- `commit-action` — The action skill behind `/commit`: stages, validates atomicity, generates and confirms the message, executes.
- `review-commits` — The action skill behind `/review-commits`: planner/executor split with cluster detection, body preservation, and drift recovery.
- `validate-commits` — The action skill behind `/validate-commits`.

## Hook

This plugin installs a `PreToolUse` hook on `Bash` calls that intercepts
direct `git commit` invocations and redirects them to the `/commit`
workflow. Internal callers can bypass the hook by setting
`__GIT_COMMIT_PLUGIN__=1` on the commit command. The plugin's own helpers
(`build-todo.sh`, `revalidate.sh`) and recommended user automation should
use this bypass when committing programmatically.

## Style files

Commit message styles ship at `plugins/commit-tools/styles/`:
- `classic.md` — The seven-rules canon (Tim Pope), default
- `conventional.md` — Conventional Commits 1.0.0

User preference is stored in `.claude/git-commit.local.md` and read by
both `/commit` and `/review-commits` so the two share authoring style.

## Install

```
/plugin install commit-tools@skills
```

## History

`commit-tools` is the v2.0.0 consolidation of the former `git-commit`
and `clean-merge` plugins. Command names and behavior are unchanged;
only the package they ship in changed. See `MIGRATION-v2.md` at the
repo root for upgrade steps.
