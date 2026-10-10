---
name: release
description: Release marketplace with version bumping, changelog generation via git-cliff, and git tagging
argument-hint: "[--bump major|minor|patch] [--dry-run]"
---

Read and follow `skills/release/SKILL.md` in the repo root — that is the
canonical, harness-neutral source for this workflow (also used by Pi and any
other agent working in this repository). Pass `$ARGUMENTS` through as the
`--bump`/`--dry-run` flags described there.
