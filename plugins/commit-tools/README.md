# commit-tools

Write atomic commits, review local history, and validate commit hygiene.
Install once; use in any Git repository without adding `AGENTS.md`,
`CLAUDE.md`, settings or repository hooks.

## Install

Claude Code:

```text
/plugin install commit-tools@skills
/commit
```

Pi (global package install, once):

```bash
pi install git:github.com/jskswamy/skills@main
```

Then use `/commit` or `/skill:commit-action`. Installing/copying **only skill
files** through Skillshare supplies instructions and bundled scripts, not Pi
executable extensions. The Pi package is needed for `/commit` and its guard.
Restart or reload Pi after updating the installed package.

## Workflow

- `commit-action` owns every commit/amend, including agent-initiated task
  completion. It validates atomicity and messages, then asks for confirmation.
- Classic style is the default. `--style conventional` overrides it; existing
  `.claude/git-commit.local.md` preferences remain optional.
- `--amend` works with an empty index when only the message changes. Unrelated
  unstaged files are left alone. Known-published commits and other authors'
  commits cannot be amended. Published-state checks use local cached refs;
  there is no implicit fetch.
- `task-commit` gathers task context and delegates to `commit-action`.
- `review-commits` plans history changes, then delegates full-message validation
  and approval to `commit-action`. Replay uses its shared executor. Unattended
  review returns `confirmation-required` without approval of the exact plan.
- Commits remain local. The user owns pushes and remote issue synchronization.

## Guards and limits

Claude Code's `PreToolUse` hook and Pi's `tool_call` handler redirect direct
shell and MCP Git commits to the workflow. Pi also checks nested tool calls
from codemode. Compound commands and command substitutions are checked; a read
operation elsewhere in the command does not exempt a commit.

`__GIT_COMMIT_PLUGIN__=1` is an approval **convention**, not a security boundary.
Helpers require it after workflow confirmation; they do not mint it themselves.
The shell guard is not a sandbox: arbitrary programs, generated scripts and Git
aliases can hide writes. Use OS-level controls for an untrusted agent.

## Bundled resources

`skills/commit-action/` contains its style guides, validator and executor.
They resolve from the installed skill location, not the working repository.
The generated Claude wrapper also exports `styles/` for compatibility.

`commit-style` explains the rules; `validate-commits` runs the seven final
history checks. No guard automatically confirms a message or initiates a push.
