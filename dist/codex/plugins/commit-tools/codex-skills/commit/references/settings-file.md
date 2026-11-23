# Settings File: .claude/git-commit.local.md

## Settings file format

```yaml
---
commit_style: classic
confirm: false
pairs:
  - name: "John Doe"
    email: "john@example.com"
  - name: "Jane Smith"
    email: "jane@example.com"
---
```

# Git Commit Plugin Settings

This file stores your preferences for the git-commit plugin.

## Available Settings

| Setting | Values | Default | Description |
|---------|--------|---------|-------------|
| `commit_style` | `classic`, `conventional` | `classic` | Default commit message style |
| `confirm` | `false`, `true` | `false` | Prompt for confirmation before committing (`--confirm` enables for one run; unrecognized values warn and default to `true`) |
| `pairs` | list | `[]` | Saved co-authors for pair programming |
