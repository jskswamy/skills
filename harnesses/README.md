# Multi-Harness Targets & Runtimes (`harnesses`)

## Overview
Target-specific build adapters, runtime hook shims, tool-mapping tables, and shared hook execution libraries that package canonical repository skills, commands, agents, and Claude-format hooks for each supported coding agent harness (`claude-code`, `antigravity`, `opencode`, `pi`, and `codex`).

## Interface
Each target harness directory (`claude-code`, `antigravity`, `opencode`, `pi`, `codex`) exposes an `adapter.mjs` module conforming to the harness adapter contract consumed by [`../scripts/lib/adapters/index.mjs`](../scripts/lib/adapters/README.md):
- `id`: Unique harness identifier (`"claude-code"`, `"antigravity"`, `"opencode"`, `"pi"`, `"codex"`).
- `capabilities`: Capability descriptor object for `skills`, `commands`, `agents`, and `hooks`.
- `pluginsDir`: Relative per-plugin output directory under `dist/` (`dist/plugins` for `claude-code`, `opencode`, `pi`, and `codex`; `dist/antigravity/plugins` for `antigravity`).
- `generateRoot({ repoRoot, outRoot, registry, plugins, report })`: Cleans legacy build output and initializes root manifests or cross-plugin naming state.
- `generate({ repoRoot, outRoot, model, plugin, state, report })`: Emits converted resources, manifests, and runtime shims for a single enabled plugin.
- `finish({ repoRoot, outRoot, registry, plugins, state, report })` (optional): Finalizes post-plugin steps after all plugins are generated.
- `validate({ repoRoot, outRoot, plugin })`: Verifies generated package structure, payloads, and external CLI validators.

## Subdirectories & Boundaries
- [`antigravity`](./antigravity/README.md): Build adapter (`adapter.mjs`), standalone bash + `jq` hook shim (`hook-shim.sh`), and tool mapping table (`tools.json`) generating native Antigravity plugins under `dist/antigravity/plugins/` and Antigravity discovery manifests in `dist/plugins/<plugin>/`.
- [`claude-code`](./claude-code/README.md): Build adapter (`adapter.mjs`) generating native Claude Code plugins under `dist/plugins/<plugin>/` and `.claude-plugin/marketplace.json`.
- [`codex`](./codex/README.md): Build adapter (`adapter.mjs`) generating native Codex plugins under `dist/plugins/<plugin>/` (`codex-skills/`) and `.agents/plugins/marketplace.json`.
- [`lib`](./lib/README.md): Self-contained Node.js hook input translator (`hook-input.mjs`) and process-group hook runner (`hook-runner.mjs`) copied into generated `opencode` and `pi` packages and reused at build time.
- [`opencode`](./opencode/README.md): Build adapter (`adapter.mjs`), OpenCode V2 plugin runtime (`runtime.mjs`), and tool mapping table (`tools.mjs`) generating OpenCode V2 plugin packages under `dist/plugins/<plugin>/`.
- [`pi`](./pi/README.md): Build adapter (`adapter.mjs`), Pi extension runtime (`runtime.mjs`), and tool mapping table (`tools.mjs`) generating Pi packages under `dist/plugins/<plugin>/`.

## Invariants
- Canonical plugin resources (`skills/`, `commands/`, `agents/`, `hooks/`, `templates/`) are authored once in Claude Code format at the repository root; harness adapters and runtimes are strictly responsible for translating them without hand-editing `dist/`.
- Across all harness runtimes and shims (`lib/hook-runner.mjs`, `antigravity/hook-shim.sh`, `opencode/runtime.mjs`, `pi/runtime.mjs`), only hook exit code `2` blocks an action; missing scripts, crashes, invalid matchers, or timeouts never block tool calls or sessions.
- Runtime files copied into generated packages (`harnesses/lib/*`, `harnesses/antigravity/hook-shim.sh`, `harnesses/opencode/runtime.mjs`, `harnesses/pi/runtime.mjs`) must remain self-contained with zero dependencies on the rest of this repository.

## Side Effects
- Adapter `generateRoot`, `generate`, and `finish` functions delete and recreate target subdirectories under `<outRoot>/dist/`, `<outRoot>/.claude-plugin/marketplace.json`, and `<outRoot>/.agents/plugins/marketplace.json`.
- Harness runtimes and shims execute canonical hook scripts as child shell processes with environment tokens (`ANTIGRAVITY_PLUGIN_ROOT`, `OPENCODE_PLUGIN_ROOT`, `PI_PACKAGE_ROOT`) and timeout supervision.

## Verification
- Run: `npm test`
- Run: `npm run validate`
