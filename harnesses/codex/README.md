# Codex Harness Support (`harnesses/codex`)

## Overview
Build adapter that generates one native Codex plugin per enabled registry plugin under `dist/codex/plugins/<plugin>/` and writes the root `.agents/plugins/marketplace.json` catalog. Converts slash commands into `<plugin>-cmd-<command>` skills under `codex-skills/` so they are invocable in Codex without polluting `skills/` for other harnesses, preserves canonical skills, templates, and `.mcp.json` files, and marks subagents and lifecycle hooks as degraded/not-applicable.

## Interface
- `id` (`adapter.mjs`): Harness identifier `"codex"`.
- `pluginsDir` (`adapter.mjs`): Output directory `"dist/codex/plugins"`, separate from the unified `dist/plugins` bundles.
- `capabilities` (`adapter.mjs`): Declares `skills` (`native`), `commands` (`as-skill`), `agents` (`none`), and `hooks` (`none`, `events: []`).
- `generateRoot({ outRoot, registry, plugins })` (`adapter.mjs`): Writes `<outRoot>/.agents/plugins/marketplace.json` listing all Codex-enabled plugins with `source: "./dist/codex/plugins/<name>"`.
- `generate({ repoRoot, outRoot, model, report })` (`adapter.mjs`): Writes `<outRoot>/dist/codex/plugins/<plugin>/.codex-plugin/plugin.json` (`skills: "./codex-skills"`), copies canonical skills into `codex-skills/`, copies templates and extra files, converts commands into `codex-skills/<plugin>-cmd-<command>/SKILL.md` via `commandToSkill`, reports agents as `degraded`, and evaluates hooks via `carryHooks`.
- `canCarry()` (`adapter.mjs`): Returns `{ notApplicable: "Codex plugins do not support lifecycle hooks" }`.
- `validate({ repoRoot, outRoot = repoRoot, plugin })` (`adapter.mjs`): Verifies `.codex-plugin/plugin.json` required fields (`name`, `version`, `description`) and verifies all canonical skill `SKILL.md` files exist in `dist/codex/plugins/<plugin>/codex-skills/`, and fails if the bundle ships a `commands/` folder.

## Invariants
- Every plugin entry in `.agents/plugins/marketplace.json` has `name` matching `.codex-plugin/plugin.json#name` so Codex CLI and Skillshare never reject the entry for catalog/manifest name mismatch.
- The bundle never contains `commands/`: Codex converts a plugin's `commands/*.md` into `source-command-*` skills at install, so shipping it would list every command twice. Our own `<plugin>-cmd-<command>` skills carry the commands (see `docs/harness-research/codex.md`).
- Codex skills (canonical plus converted `<plugin>-cmd-<command>` skills) live in `codex-skills/` and are referenced by `.codex-plugin/plugin.json#skills`.

## Side Effects
- `generateRoot` writes `<outRoot>/.agents/plugins/marketplace.json`, and `generate` populates `<outRoot>/dist/codex/plugins/<plugin>/`. The adapter runner clears `dist/codex/plugins` before each build.

## Verification
- Run: `npm test`
- Run: `npm run validate`

## Install

Install plugins via Skillshare (`--target codex`) or directly from a checkout's `.agents/plugins/marketplace.json` in Codex CLI:

```bash
codex plugin marketplace add <checkout>
codex plugin install <plugin>@skills
```
