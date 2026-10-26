# Codex Harness Support (`harnesses/codex`)

## Overview
Build adapter that generates one native Codex plugin per enabled registry plugin under `dist/plugins/<plugin>/` and writes the root `.agents/plugins/marketplace.json` catalog. Converts slash commands into `<plugin>-cmd-<command>` skills under `codex-skills/` so they are invocable in Codex without polluting `skills/` for other harnesses, preserves canonical skills, templates, and `.mcp.json` files, and marks subagents and lifecycle hooks as degraded/not-applicable.

## Interface
- `id` (`adapter.mjs`): Harness identifier `"codex"`.
- `pluginsDir` (`adapter.mjs`): Output directory `"dist/plugins"`.
- `capabilities` (`adapter.mjs`): Declares `skills` (`native`), `commands` (`as-skill`), `agents` (`none`), and `hooks` (`none`, `events: []`).
- `generateRoot({ outRoot, registry, plugins })` (`adapter.mjs`): Removes legacy `<outRoot>/dist/codex` and writes `<outRoot>/.agents/plugins/marketplace.json` listing all Codex-enabled plugins with `source: "./dist/plugins/<name>"`.
- `generate({ repoRoot, outRoot, model, report })` (`adapter.mjs`): Writes `<outRoot>/dist/plugins/<plugin>/.codex-plugin/plugin.json` (`skills: "./codex-skills"`), copies canonical skills into `codex-skills/`, copies templates and extra files, converts commands into `codex-skills/<plugin>-cmd-<command>/SKILL.md` via `commandToSkill`, reports agents as `degraded`, and evaluates hooks via `carryHooks`.
- `canCarry()` (`adapter.mjs`): Returns `{ notApplicable: "Codex plugins do not support lifecycle hooks" }`.
- `validate({ repoRoot, outRoot = repoRoot, plugin })` (`adapter.mjs`): Verifies `.codex-plugin/plugin.json` required fields (`name`, `version`, `description`) and verifies all canonical skill `SKILL.md` files exist in `dist/plugins/<plugin>/codex-skills/`.

## Invariants
- Every plugin entry in `.agents/plugins/marketplace.json` has `name` matching `.codex-plugin/plugin.json#name` so Codex CLI and Skillshare never reject the entry for catalog/manifest name mismatch.
- Codex skills (canonical plus converted `<plugin>-cmd-<command>` skills) live in `codex-skills/` and are referenced by `.codex-plugin/plugin.json#skills`.

## Side Effects
- `generateRoot` and `generate` remove legacy `<outRoot>/dist/codex`, write `<outRoot>/.agents/plugins/marketplace.json`, and populate `<outRoot>/dist/plugins/<plugin>/`.

## Verification
- Run: `npm test`
- Run: `npm run validate`

## Install

Install plugins via Skillshare (`--target codex`) or directly from a checkout's `.agents/plugins/marketplace.json` in Codex CLI:

```bash
codex plugin marketplace add <checkout>
codex plugin install <plugin>@skills
```
