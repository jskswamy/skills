# Multi-Harness Targets & Runtimes (`harnesses`)

## Overview
Target-specific build adapters, runtime hook shims, tool-mapping tables, and shared hook execution libraries that package canonical repository skills, agents, and Claude-format hooks for each supported coding agent harness (`claude-code`, `antigravity`, `opencode`, `pi`, `omp`, and `codex`).

## Interface
Each target harness directory (`claude-code`, `antigravity`, `opencode`, `pi`, `omp`, `codex`) exposes an `adapter.mjs` module conforming to the harness adapter contract consumed by [`../scripts/lib/adapters/index.mjs`](../scripts/lib/adapters/README.md):
- `id`: Unique harness identifier (`"claude-code"`, `"antigravity"`, `"opencode"`, `"pi"`, `"omp"`, `"codex"`).
- `capabilities`: Capability descriptor object for `skills`, `agents`, and `hooks`.
- `pluginsDir`: Relative per-plugin output directory, `dist/<id>/plugins` for each harness (`dist/claude-code/plugins`, `dist/codex/plugins`, `dist/antigravity/plugins`, `dist/opencode/plugins`, `dist/pi/plugins`, `dist/omp/plugins`). Nothing is written into another harness's tree.
- `generateRoot({ repoRoot, outRoot, registry, plugins, report })`: Cleans the harness's build output and initializes root manifests or cross-plugin state (Pi, omp, OpenCode and Codex return the `plugin:skill` reference pairs).
- `generate({ repoRoot, outRoot, model, plugin, state, report })`: Emits converted resources, manifests, and runtime shims for a single enabled plugin.
- `finish({ repoRoot, outRoot, registry, plugins, state, report })` (optional): Finalizes post-plugin steps after all plugins are generated.
- `validate({ repoRoot, outRoot, plugin })`: Verifies generated package structure, payloads, and external CLI validators.

## Subdirectories & Boundaries
- [`antigravity`](./antigravity/README.md): Build adapter (`adapter.mjs`), standalone bash + `jq` hook shim (`hook-shim.sh`), and tool mapping table (`tools.json`) generating native Antigravity plugins under `dist/antigravity/plugins/`, each with its own `.antigravity-plugin/plugin.json`.
- [`claude-code`](./claude-code/README.md): Build adapter (`adapter.mjs`) generating native Claude Code plugins under `dist/claude-code/plugins/<plugin>/` and `.claude-plugin/marketplace.json`.
- [`codex`](./codex/README.md): Build adapter (`adapter.mjs`) generating native Codex plugins under `dist/codex/plugins/<plugin>/` (`codex-skills/`, `codex-hooks.json`, never a `commands/` folder) and `.agents/plugins/marketplace.json`.
- [`lib`](./lib/README.md): Self-contained Node.js hook input translator (`hook-input.mjs`) and process-group hook runner (`hook-runner.mjs`) copied into generated `opencode` and `pi` packages and reused at build time.
- [`opencode`](./opencode/README.md): Build adapter (`adapter.mjs`), OpenCode V2 plugin runtime (`runtime.mjs`), and tool mapping table (`tools.mjs`) generating OpenCode V2 plugin packages under `dist/opencode/plugins/<plugin>/` and `.plugin/marketplace.json`.
- [`pi`](./pi/README.md): Build adapter (`adapter.mjs`), Pi extension runtime (`runtime.mjs`), and tool mapping table (`tools.mjs`) generating Pi packages under `dist/pi/plugins/<plugin>/` and `marketplace.json`.
- [`omp`](./omp/README.md): Build adapter (`adapter.mjs`), omp extension runtime forked from Pi's (`runtime.mjs`) and tool mapping table (`tools.mjs`) generating omp plugins under `dist/omp/plugins/<plugin>/` (`.omp-plugin/plugin.json`, `commands/` wrappers, `runtime/omp/`) and the root `.omp-plugin/marketplace.json`.

## Invariants
- Canonical plugin resources (`skills/<plugin>/<skill>/`, `agents/`, `hooks/`, `templates/`) are authored once in Claude Code format at the repository root; harness adapters and runtimes are strictly responsible for translating them without hand-editing `dist/`.
- Skillshare discovers harness trees only through root marketplace catalogs (`.agents/plugins/marketplace.json` for Codex, `.claude-plugin/marketplace.json` for Claude Code, `.plugin/marketplace.json` for OpenCode, and `marketplace.json` for Pi) and merges them by plugin `name`. Generated `package.json` manifests in `dist/pi/plugins/<plugin>/` and `dist/opencode/plugins/<plugin>/` must use the bare `<plugin>` name (never a `@scope/<plugin>` name) so Skillshare does not reject them with `catalogNameDiffers`.
- Across all harness runtimes and shims (`lib/hook-runner.mjs`, `antigravity/hook-shim.sh`, `opencode/runtime.mjs`, `pi/runtime.mjs`), only hook exit code `2` blocks an action; missing scripts, crashes, invalid matchers, or timeouts never block tool calls or sessions.
- Runtime files copied into generated packages (`harnesses/lib/*`, `harnesses/antigravity/hook-shim.sh`, `harnesses/opencode/runtime.mjs`, `harnesses/pi/runtime.mjs`) must remain self-contained with zero dependencies on the rest of this repository.

## Side Effects
- Adapter `generateRoot`, `generate`, and `finish` functions delete and recreate target subdirectories under `<outRoot>/dist/`, `<outRoot>/.claude-plugin/marketplace.json`, `<outRoot>/.agents/plugins/marketplace.json`, `<outRoot>/.plugin/marketplace.json`, and `<outRoot>/marketplace.json`.
- Harness runtimes and shims execute canonical hook scripts as child shell processes with environment tokens (`ANTIGRAVITY_PLUGIN_ROOT`, `OPENCODE_PLUGIN_ROOT`, `PI_PACKAGE_ROOT`) and timeout supervision.

## Verification
- Run: `npm test`
- Run: `npm run validate`
