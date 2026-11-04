# Codex Harness Support (`harnesses/codex`)

## Overview
Build adapter that generates one native Codex plugin per enabled registry plugin under `dist/codex/plugins/<plugin>/` and writes the root `.agents/plugins/marketplace.json` catalog. Copies each skill into `codex-skills/<skill>/`; the skill is the entry, run as `$<plugin>:<skill>`, so `/plugin:skill` in skill, template, hook script and README text is rewritten to `$plugin:skill`. There are no command wrappers. Carries supported lifecycle hooks into `codex-hooks.json` (pointing `.codex-plugin/plugin.json#hooks` at `./codex-hooks.json`), preserves templates and `.mcp.json` files, and marks subagents as degraded.

## Interface
- `id` (`adapter.mjs`): Harness identifier `"codex"`.
- `pluginsDir` (`adapter.mjs`): Output directory `"dist/codex/plugins"`, one tree per harness.
- `capabilities` (`adapter.mjs`): Declares `skills` (`native`), `agents` (`none`), and `hooks` (`native` for `session-start`, `pre-tool`, `post-tool`, `stop`).
- `generateRoot({ outRoot, registry, plugins })` (`adapter.mjs`): Writes `<outRoot>/.agents/plugins/marketplace.json` listing all Codex-enabled plugins with `source: "./dist/codex/plugins/<name>"` and returns `referencePairs(registry)`.
- `generate({ repoRoot, outRoot, model, report, state })` (`adapter.mjs`): Writes `<outRoot>/dist/codex/plugins/<plugin>/.codex-plugin/plugin.json` (`skills: "./codex-skills"`, plus `hooks: "./codex-hooks.json"` when the plugin defines hooks), copies canonical skills into `codex-skills/` and rewrites `/plugin:skill` references to `$plugin:skill` (`rewriteTree`), copies templates, hook scripts, and extra files (excluding `hooks/hooks.json`), reports agents as `degraded`, evaluates hooks via `carryHooks`, synthesizes a fallback `statusMessage` (`${model.name} ${entry.id}`, reporting `degraded`) when a carried hook lacks one, and writes `codex-hooks.json`.
- `canCarry(entry)` (`adapter.mjs`): Marks `subagent-start` hooks as `{ notApplicable: "Codex has no SubagentStart event" }` and validates `pre-tool`/`post-tool` matchers against `CODEX_TOOLS` (`Bash` and `mcp__*`).
- `validate({ repoRoot, outRoot = repoRoot, plugin })` (`adapter.mjs`): Verifies `.codex-plugin/plugin.json` required fields (`name`, `version`, `description`, `skills: "./codex-skills"`, and `hooks: "./codex-hooks.json"` when hooks exist), verifies all canonical skill `SKILL.md` files exist in `dist/codex/plugins/<plugin>/codex-skills/`, fails if the bundle ships a `commands/` folder or a top-level `hooks.json`, and validates `codex-hooks.json` structure, non-empty `statusMessage` strings, and existence of all `${CLAUDE_PLUGIN_ROOT}/...` script paths.

## Invariants
- Every plugin entry in `.agents/plugins/marketplace.json` has `name` matching `.codex-plugin/plugin.json#name` so Codex CLI and Skillshare never reject the entry for catalog/manifest name mismatch.
- The bundle never contains `commands/`: Codex converts a plugin's `commands/*.md` into `source-command-*` skills at install, so shipping it would list every skill twice. The repository has no `commands/` source now; the check stays as a guard (see `docs/harness-research/codex.md`).
- Codex skills live in `codex-skills/` and are referenced by `.codex-plugin/plugin.json#skills`.
- Codex hooks live in `codex-hooks.json` (never `hooks.json` or `hooks/hooks.json`) and are referenced by `.codex-plugin/plugin.json#hooks` so Skillshare does not misclassify the Codex bundle as an Antigravity or Claude hook bundle. Every hook entry in `codex-hooks.json` has a non-empty `statusMessage` and uses integer seconds (`Math.ceil(timeoutMs / 1000)`) for `timeout`.

## Side Effects
- `generateRoot` writes `<outRoot>/.agents/plugins/marketplace.json`, and `generate` populates `<outRoot>/dist/codex/plugins/<plugin>/` (including `codex-hooks.json` when hooks are present). The adapter runner clears `dist/codex/plugins` before each build.

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
