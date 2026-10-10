# Migration to jskswamy-plugins v2.0.0

This release reorganizes five workflow plugins into three. Command names
and behavior are unchanged — only the plugin namespace they ship in
changed. Day-to-day usage of `/commit`, `/review-commits`, `/decompose`,
`/execute`, etc. continues to work without modification once you switch
to the new plugins.

## What changed

| Old plugin | Removed in | Replacement |
|------------|------------|-------------|
| `git-commit` | v2.0.0 | `commit-tools` |
| `clean-merge` | v2.0.0 | `commit-tools` |
| `task-decomposer` | v2.0.0 | `craft` |
| `task-executor` | v2.0.0 | `craft` |

`refactor` and the other plugins (`devenv`, `jot`, `sketch-note`,
`typst-notes`, `codebase`) are unaffected.

## Steps

### 1. Uninstall the old plugins

```
/plugin uninstall git-commit@jskswamy-plugins
/plugin uninstall clean-merge@jskswamy-plugins
/plugin uninstall task-decomposer@jskswamy-plugins
/plugin uninstall task-executor@jskswamy-plugins
```

Skip any line for a plugin you didn't have installed.

### 2. Install the replacements

```
/plugin install commit-tools@jskswamy-plugins
/plugin install craft@jskswamy-plugins
```

### 3. Update settings/scripts that reference the old plugin namespace

If you have personal automation, hook configuration, or settings.json
entries that reference plugin commands by full namespace, update them:

| Old | New |
|-----|-----|
| `git-commit:commit` | `commit-tools:commit` |
| `git-commit:commit-style` | `commit-tools:commit-style` |
| `git-commit:commit-action` | `commit-tools:commit-action` |
| `clean-merge:review-commits` | `commit-tools:review-commits` |
| `clean-merge:validate-commits` | `commit-tools:validate-commits` |
| `task-decomposer:decompose` | `craft:decompose` |
| `task-decomposer:epic` | `craft:epic` |
| `task-decomposer:park` | `craft:park` |
| `task-decomposer:parked` | `craft:parked` |
| `task-decomposer:review-parked` | `craft:review-parked` |
| `task-decomposer:understand` | `craft:understand` |
| `task-decomposer:task` | `craft:task` |
| `task-decomposer:deps` | `craft:deps` |
| `task-decomposer:backlog` | `craft:backlog` |
| `task-decomposer:task-commit` | `craft:task-commit` |
| `task-executor:execute` | `craft:execute` |

Bare command invocations (`/commit`, `/review-commits`, `/decompose`,
etc. — no `plugin:` prefix) work without any change after the
reinstallation in steps 1 and 2.

## What does NOT change

- Every command name (`/commit`, `/review-commits`, `/decompose`,
  `/execute`, etc.)
- Every command's behavior, style, defaults, and arguments
- The shared style files for commit messages
  (`classic.md`, `conventional.md`)
- The PreToolUse hook that intercepts direct `git commit` calls
- The Stop hook that nudges parked-idea triage
- Any configuration in `.claude/git-commit.local.md` or
  `.claude/clean-merge.local.md`

## Why this reorg

The old names tied plugins to either an outcome (`clean-merge`) or an
implementation backend (`task-decomposer`, `task-executor` — both
beads-backed today, swappable tomorrow). The new names describe the
user-facing capability and group commands that belong to the same
workflow.

See `docs/superpowers/specs/2026-05-07-plugin-reorg-v2-design.md` for
the full design rationale.
