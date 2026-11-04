# Pi Harness Support (`harnesses/pi`)

## Overview
Build adapter, Pi extension runtime, and tool-mapping table that package each Pi-enabled registry plugin into a self-contained Pi package under `dist/pi/plugins/<plugin>/`. Writes one Pi prompt template per runnable skill (`dist/pi/plugins/<plugin>/prompts/<plugin>-<skill>.md`; none for `user-invocable: false`), copies skills with `plugin:skill` references rewritten to `plugin-skill` and canonical hook resources, and—when a plugin carries hooks—includes a Pi extension (`dist/pi/plugins/<plugin>/runtime/pi/runtime.mjs`) that runs canonical Claude Code hooks on Pi lifecycle events.

The release build (`npm run build:release`) writes `marketplace.json` at the repository root and one Pi package per plugin with `harnesses.pi.enabled` under `dist/pi/plugins/<name>/` (after the next release; the last release shipped `dist/plugins/<name>/`). Each package is self-contained: it includes the plugin's skills, templates, prompt templates, and—for plugins with hooks—a `runtime/pi/hooks.manifest.json` and copy of the runtime. Do not edit generated packages or `marketplace.json` by hand. Tested with Pi 1.4.0 and Skillshare 0.28.2.

## Interface
- `id` (`adapter.mjs`): Harness identifier `"pi"`.
- `pluginsDir` (`adapter.mjs`): Output directory `"dist/pi/plugins"`.
- `capabilities` (`adapter.mjs`): Declares `skills` (`native`), `agents` (`none`), and `hooks` (`shim` for `session-start`, `pre-tool`, `post-tool`, `stop`).
- `generateRoot({ outRoot, registry, plugins })` (`adapter.mjs`): Removes `<outRoot>/dist/pi`, writes `<outRoot>/marketplace.json` with `source: ./dist/pi/plugins/<name>` for Skillshare discovery, and returns `{ pairs }`, the `plugin:skill` and `plugin:agent` pairs (`referencePairs`) used to rewrite references.
- `generate({ repoRoot, outRoot, model, state, report })` (`adapter.mjs`): Copies plugin resources (excluding `agents` and `hooks/hooks.json`) to `<outRoot>/dist/pi/plugins/<plugin>/`, copies skills with rewritten references (`copyRewrittenSkills`), writes a prompt template `prompts/<plugin>-<skill>.md` (`derivedId`, `wrapperText`) for each runnable skill (`isRunnable`), reports degraded agents, and—when carried hooks exist—copies `RUNTIME` and writes `runtime/pi/hooks.manifest.json` along with `package.json`.
- `canCarry(entry)` (`adapter.mjs`): Marks `subagent-start` hooks as `notApplicable` and validates `pre-tool`/`post-tool` matchers against `PI_TOOLS`.
- `validate({ repoRoot, outRoot = repoRoot, plugin })` (`adapter.mjs`): Validates `<outRoot>/dist/pi/plugins/<plugin>/package.json` paths using `validatePiPackage` and verifies that all scripts referenced in `runtime/pi/hooks.manifest.json` exist.
- `loadManifest(path)` (`runtime.mjs`): Synchronously reads `entries` from `runtime/pi/hooks.manifest.json` (defaulting to `<here>/hooks.manifest.json`), returning `[]` on error.
- `createRuntime({ entries, root, log })` (`runtime.mjs`): Returns a Pi extension registration function `piHooks(pi)` that binds `session_start`, `tool_call`, `tool_result`, and `agent_settled` handlers; default export initializes `createRuntime({ entries: loadManifest() })`.
- `PI_TOOLS` (`tools.mjs`): Maps Claude tool names and input fields to Pi 1.4.0 tool names (`bash`, `read`, `edit`, `write`, `find`, `grep`) and passes `mcp__*` tool names and patterns through.

## Invariants
- Each Pi-enabled plugin gets its own self-contained package configuration in `dist/pi/plugins/<plugin>/package.json` with `"name": "<plugin>"` (unscoped so Skillshare matches it to the `marketplace.json` catalog entry without triggering `catalogNameDiffers`).
- `package.json#pi` includes `skills` only when `model.skills.length > 0`, `prompts` only when at least one skill is runnable, and `extensions` (plus `runtime/pi/runtime.mjs` and `runtime/pi/hooks.manifest.json`) only when the plugin has carried hooks (`hooks.length > 0`).
- A throwing `tool_call` handler in Pi blocks tool execution, so all event handlers in `runtime.mjs` are wrapped in `guarded(...)` to catch unexpected exceptions and only return `{ block: true, reason }` when a hook exits with code `2`.
- Every prompt body (`wrapperText`) carries an explicit `$ARGUMENTS` placeholder because Pi drops arguments from a prompt that has none; the skill's `argument-hint` is copied into the prompt frontmatter.
- Pre-tool hook context is buffered per `toolCallId` in `pending` and prepended to `tool_result` content when the tool finishes.

## Side Effects
- `generateRoot` and `generate` remove `<outRoot>/dist/pi`, write `<outRoot>/marketplace.json`, and populate `<outRoot>/dist/pi/plugins/<plugin>/`, copying skills, hooks, templates, prompts, runtime modules (when hooks exist), `runtime/pi/hooks.manifest.json` (when hooks exist), and `package.json`.
- At runtime, `runtime.mjs` reads `runtime/pi/hooks.manifest.json` on module load, sets `PI_PACKAGE_ROOT` in hook environments, sends hidden `hook-context` session messages via `pi.sendMessage`, appends hook context to tool results, and spawns canonical hook scripts via [`../lib/hook-runner.mjs`](../lib/README.md).

## Verification
- Run: `npm test`
- Run: `npm run validate`

## Install

Install a plugin folder from a checkout, directly or through Skillshare:

```bash
pi install <checkout>/dist/pi/plugins/<plugin>
skillshare plugin add <checkout> --plugin <plugin> --target pi -g
```

For local development, build into a temp dir and load a plugin folder:

```bash
npm run build      # last line: Output: <dir>
pi -e <dir>/dist/pi/plugins/<plugin>
```

Run a skill as the prompt `/<plugin>-<skill>`, for example `/commit-tools-commit`, or as `/skill:<plugin>-<skill>`.
