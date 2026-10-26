# Codex Harness Support (`harnesses/codex`)

## Overview
Build adapter that generates one native Codex plugin per enabled registry plugin under `dist/codex/<plugin>/` and writes the root `.agents/plugins/marketplace.json` catalog. Converts slash commands into `<plugin>-cmd-<command>` skills so they are invocable in Codex, preserves canonical skills, templates, and `.mcp.json` files, and marks subagents and lifecycle hooks as degraded/not-applicable.

## Interface
- `id` (`adapter.mjs`): Harness identifier `"codex"`.
- `pluginsDir` (`adapter.mjs`): Output directory `"dist/codex"`.
- `capabilities` (`adapter.mjs`): Declares `skills` (`native`), `commands` (`as-skill`), `agents` (`none`), and `hooks` (`none`, `events: []`).
- `generateRoot({ outRoot, registry, plugins })` (`adapter.mjs`): Removes `<outRoot>/dist/codex` and writes `<outRoot>/.agents/plugins/marketplace.json` listing all Codex-enabled plugins with `source: "./dist/codex/<name>"`.
- `generate({ repoRoot, outRoot, model, report })` (`adapter.mjs`): Writes `<outRoot>/dist/codex/<plugin>/.codex-plugin/plugin.json`, copies skills, templates, and extra files, converts commands into `skills/<plugin>-cmd-<command>/SKILL.md` via `commandToSkill`, reports agents as `degraded`, and evaluates hooks via `carryHooks`.
- `canCarry()` (`adapter.mjs`): Returns `{ notApplicable: "Codex plugins do not support lifecycle hooks" }`.
- `validate({ repoRoot, outRoot = repoRoot, plugin })` (`adapter.mjs`): Verifies `.codex-plugin/plugin.json` required fields (`name`, `version`, `description`) and verifies all canonical skill `SKILL.md` files exist in `dist/codex/<plugin>/skills/`.

## Invariants
- Every plugin entry in `.agents/plugins/marketplace.json` has `name` matching `.codex-plugin/plugin.json#name` so Codex CLI and Skillshare never reject the entry for catalog/manifest name mismatch.
- Canonical `commands/`, `agents/`, and `hooks/` directories are excluded from `dist/codex/<plugin>/`; commands are emitted as `<plugin>-cmd-<command>` skills under `skills/`.

## Side Effects
- `generateRoot` and `generate` delete `<outRoot>/dist/codex`, write `<outRoot>/.agents/plugins/marketplace.json`, and populate `<outRoot>/dist/codex/<plugin>/`.

## Verification
- Run: `npm test`
- Run: `npm run validate`

## Install

Install plugins via Skillshare (`--target codex`) or directly from a checkout's `.agents/plugins/marketplace.json` in Codex CLI:

```bash
codex plugin marketplace add <checkout>
codex plugin install <plugin>@skills
```
