# Codex Harness Support (`harnesses/codex`)

## Overview
Build adapter that generates one native Codex plugin per enabled registry plugin under `dist/codex/plugins/<plugin>/` and writes the root `.agents/plugins/marketplace.json` catalog. Copies each skill into `codex-skills/<skill>/`; the skill is the entry, run as `$<plugin>:<skill>`, so `/plugin:skill` in skill, template and README text is rewritten to `$plugin:skill` (shell scripts are not rewritten). There are no command wrappers. Preserves templates and `.mcp.json` files and marks subagents as degraded.

## Interface
- `id` (`adapter.mjs`): Harness identifier `"codex"`.
- `pluginsDir` (`adapter.mjs`): Output directory `"dist/codex/plugins"`, one tree per harness, written after the next release (the last release shipped `dist/plugins`).
- `capabilities` (`adapter.mjs`): Declares `skills` (`native`), `agents` (`none`), and `hooks` (`none`, `events: []`).
- `generateRoot({ outRoot, registry, plugins })` (`adapter.mjs`): Writes `<outRoot>/.agents/plugins/marketplace.json` listing all Codex-enabled plugins with `source: "./dist/codex/plugins/<name>"`.
- `generate({ repoRoot, outRoot, model, report })` (`adapter.mjs`): Writes `<outRoot>/dist/codex/plugins/<plugin>/.codex-plugin/plugin.json` (`skills: "./codex-skills"`), copies canonical skills into `codex-skills/` and rewrites `/plugin:skill` references to `$plugin:skill` (`rewriteTree`), copies templates and extra files, reports agents as `degraded`, and evaluates hooks via `carryHooks`.
- `canCarry()` (`adapter.mjs`): Returns `{ notApplicable: "Codex plugins do not support lifecycle hooks" }`.
- `validate({ repoRoot, outRoot = repoRoot, plugin })` (`adapter.mjs`): Verifies `.codex-plugin/plugin.json` required fields (`name`, `version`, `description`) and verifies all canonical skill `SKILL.md` files exist in `dist/codex/plugins/<plugin>/codex-skills/`, and fails if the bundle ships a `commands/` folder.

## Invariants
- Every plugin entry in `.agents/plugins/marketplace.json` has `name` matching `.codex-plugin/plugin.json#name` so Codex CLI and Skillshare never reject the entry for catalog/manifest name mismatch.
- The bundle never contains `commands/`: Codex converts a plugin's `commands/*.md` into `source-command-*` skills at install, so shipping it would list every skill twice. The repository has no `commands/` source now; the check stays as a guard (see `docs/harness-research/codex.md`).
- Codex skills live in `codex-skills/` and are referenced by `.codex-plugin/plugin.json#skills`.

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

Run a skill as `$<plugin>:<skill>`, for example `$commit-tools:commit`. The
marketplace points at `dist/codex/plugins/<plugin>`.
