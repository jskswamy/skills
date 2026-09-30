# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Structure

This is a multi-harness agent capabilities repository. Reusable behavior lives in canonical root resource directories; Claude Code plugin wrappers are generated from those resources.

```text
registry.json                         # Source of truth for plugin metadata and resource membership
skills/                               # Canonical Agent Skills source
commands/                             # Canonical slash-command markdown grouped by plugin
agents/                               # Canonical agent prompts grouped by plugin
hooks/                                # Canonical hook definitions/scripts grouped by plugin
templates/                            # Canonical templates/static assets
shared-scripts/                       # Canonical shared runtime scripts
.claude-plugin/marketplace.json       # Generated Claude Code marketplace registry
plugins/<plugin-name>/                # Generated Claude Code plugin wrappers
harnesses/pi/                         # Pi-specific docs/extensions
```

## Source-of-Truth Rules

- Edit canonical root resources, not generated copies under `plugins/<plugin-name>/`.
- Update `registry.json` when adding/removing plugin resources or changing plugin metadata.
- Run `npm run build` after registry or canonical resource changes.
- Run `npm run validate` before committing structural changes.
- Keep generated Claude wrappers committed because Claude Code installs from a git tree and does not run build scripts.

## Creating or Updating a Plugin

1. Add reusable skills under `skills/<skill-name>/SKILL.md` using Agent Skills frontmatter.
2. Add commands under `commands/<plugin-name>/`.
3. Add agents under `agents/<plugin-name>/`.
4. Add hooks under `hooks/<plugin-name>/`.
5. Add templates/assets under `templates/<plugin-name>/` or `shared-scripts/<plugin-name>/`.
6. Register all resources in `registry.json`.
7. Regenerate wrappers:
   ```bash
   npm run build
   ```
8. Verify:
   ```bash
   npm run validate
   npm test
   ```

## Testing Plugins Locally

Claude Code wrapper:

```bash
claude --plugin-dir ./plugins/<plugin-name>
```

Pi package:

```bash
pi -e .
```

## Git Commits

Always use the `/commit` command instead of `git commit` directly when working in Claude Code. The `/commit` plugin provides atomic commit validation, intelligent message generation from conversation context, and style enforcement.
