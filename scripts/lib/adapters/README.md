# Harness Adapters Orchestration (`scripts/lib/adapters`)

## Overview
Central registry and execution runner for harness build adapters (`claude-code`, `antigravity`, `opencode`, `pi`, and `codex`). Coordinates per-plugin and root-level package generation, validates harness identifiers configured in `registry.json`, tracks degradation or error notes across builds, and provides isolated temporary build execution for validation and evaluation scripts.

## Interface
- `ADAPTERS` (`index.mjs`): Array of registered harness adapter modules (`[claudeCode, antigravity, opencode, pi, codex]`).
- `isEnabled(plugin, id)` (`index.mjs`): Returns whether harness `id` is enabled for `plugin` (`claude-code` defaults to enabled unless explicitly `false`; all other harnesses require `enabled === true`).
- `enabledAdapters(plugin, adapters = ADAPTERS)` (`index.mjs`): Filters `adapters` to those enabled for `plugin`.
- `validateHarnessIds(registry, adapters = ADAPTERS)` (`index.mjs`): Returns validation error strings for any `plugin.harnesses.<id>` key in `registry` that does not match a registered adapter `id`.
- `runAdapters({ repoRoot, outRoot = repoRoot, registry, adapters = ADAPTERS })` (`index.mjs`): Runs `generateRoot`, per-plugin `loadPluginModel` + `generate`, and `finish` across all `adapters`, returning a structured build report (`{ entries, errors(), for(plugin, harness), ran(plugin, harness), lines() }`).
- `withTempBuild({ repoRoot, registry, adapters = ADAPTERS }, use)` (`index.mjs`): Creates a temporary directory (`skills-build-*`), runs `runAdapters` into it, invokes `await use({ outRoot, report })`, and removes the temporary directory afterward.

## Invariants
- `claude-code` is enabled by default for every plugin unless `plugin.harnesses["claude-code"].enabled === false`; all other harnesses (`antigravity`, `opencode`, `pi`, `codex`) are opt-in and require `enabled === true`.
- For each adapter, `generateRoot` executes once before per-plugin `generate` calls, and its return value (`state`) is passed to every `generate` call and to `finish`.
- `withTempBuild` guarantees cleanup of its temporary build directory in a `finally` block regardless of whether `runAdapters` or `use` throws.
- Source files are always read from `repoRoot` while generated artifacts are written exclusively under `outRoot`.

## Side Effects
- Reads plugin models from `repoRoot` via `loadPluginModel` (`../model.mjs`).
- Invokes adapter `generateRoot`, `generate`, and `finish` hooks, which create and remove directories and write generated plugin files under `outRoot`.
- `withTempBuild` creates and deletes temporary directories under the OS temp directory (`os.tmpdir()`).

## Verification
- Run: `npm test`
- Run: `npm run validate`
