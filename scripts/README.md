# Build, Validation & Release Scripts (`scripts`)

## Overview
Command-line entrypoints for building multi-harness plugin distributions (`build.mjs`), validating source and generated package integrity (`validate.mjs`), detecting plugins with uncommitted build diffs for version bumping (`changed-plugins.mjs`), running Claude Code skill evaluations (`eval.mjs`), and regenerating the plugin catalog in the root `README.md` (`update-readme.sh`).

## Interface
- `node scripts/build.mjs [--release] [--out <dir>]` (`build.mjs`): Validates `registry.json` shape and harness IDs, builds all enabled harness targets (`claude-code`, `antigravity`, `opencode`, `pi`, `codex`) into a temporary directory by default (or `--out <dir>`, or `repoRoot` when `--release` is passed), prints the per-plugin harness report, and exits `1` if any resource cannot be carried.
- `changedPlugins({ repoRoot, outRoot, adapters = ADAPTERS })` (`changed-plugins.mjs`): Compares committed per-plugin output trees (`dist/plugins`, `dist/antigravity/plugins`) and root catalogs (`.claude-plugin/marketplace.json`, `.agents/plugins/marketplace.json`) in `repoRoot` against a fresh build in `outRoot` (ignoring `version` fields in `plugin.json`, `package.json`, and `marketplace.json`) and returns a sorted list of changed plugin names. Also executable as `node scripts/changed-plugins.mjs`.
- `node scripts/eval.mjs [plugin ...] [-- <extra claude plugin eval flags>]` (`eval.mjs`): Builds Claude Code plugins into a temporary directory, copies `evals/<plugin>` into each built plugin tree, runs `claude plugin eval` with results written to `evals/results/<plugin>-<timestamp>`, and cleans up the temporary build.
- `node scripts/validate.mjs` (`validate.mjs`): Validates `registry.json` shape and resource paths, harness IDs, optional hook declarations, all `skills/*/SKILL.md` frontmatter and reference links, and a fresh temporary build of all enabled harnesses via each adapter's `validate()` check.
- `./scripts/update-readme.sh [--dry-run|-n]` (`update-readme.sh`): Renders `templates/readme-plugins.md.tmpl` from `registry.json` using `gomplate` and updates the block between `<!-- PLUGINS:START -->` and `<!-- PLUGINS:END -->` in the root `README.md`.
- Subdirectories:
  - [Build & Validation Library](./lib/README.md): Shared model loaders, layout helpers, registry/skill/Pi validators, [harness adapter runner](./lib/adapters/README.md), and [resource/hook transforms](./lib/transforms/README.md).

## Invariants
- `build.mjs` never modifies the working tree unless `--release` is explicitly passed; `--release` and `--out` are mutually exclusive.
- `validate.mjs`, `changed-plugins.mjs`, and `eval.mjs` always evaluate a fresh temporary build via `withTempBuild` rather than trusting the committed `dist/` directory.
- `changedPlugins` strips `version` fields from `plugin.json`, `package.json`, `.claude-plugin/marketplace.json`, and `.agents/plugins/marketplace.json` before comparing files so version bumps alone do not register as content changes.
- `update-readme.sh` requires `gomplate` on `PATH` and both `<!-- PLUGINS:START -->` and `<!-- PLUGINS:END -->` markers in the root `README.md`.

## Side Effects
- `build.mjs` creates temporary directories (or writes to `--out` / `repoRoot` under `--release`) and writes generated harness trees (`dist/`, `.claude-plugin/marketplace.json`, and `.agents/plugins/marketplace.json`).
- `changed-plugins.mjs` and `validate.mjs` create and remove temporary build directories (`skills-build-*`, `agy-validate-*`) and print status or errors to `stdout`/`stderr`.
- `eval.mjs` creates temporary build directories, spawns `claude plugin eval` (which invokes live model APIs and incurs token costs), and writes evaluation artifacts under `evals/results/`.
- `update-readme.sh` writes `README.md.tmp` and atomically replaces `README.md` (unless `--dry-run` is passed).

## Verification
- Run: `npm test`
- Run: `npm run validate`
