# Build & Validation Library (`scripts/lib`)

## Overview
Shared library modules backing the repository's build, validation, and release scripts (`scripts/`). Provides filesystem utilities, canonical plugin model resolution, Claude-style wrapper layout calculation, `registry.json` schema and resource validation, `SKILL.md` frontmatter and reference validation, Pi package validation, and child subsystems for harness adapter orchestration (`./adapters`) and cross-harness resource transformations (`./transforms`).

## Interface
- `removeDir(path)` (`fs-utils.mjs`): Recursively deletes `path` with `force: true`.
- `ensureDir(path)` (`fs-utils.mjs`): Recursively creates directory `path`.
- `copyResourceTree({ from, to, filter })` (`fs-utils.mjs`): Recursively copies `from` to `to` preserving timestamps and applying an optional `filter` predicate.
- `readJson(path)` (`fs-utils.mjs`): Reads and parses a UTF-8 JSON file.
- `writeJson(path, value)` (`fs-utils.mjs`): Ensures parent directory exists and writes pretty-printed JSON (`2`-space indent, trailing newline) to `path`.
- `pathExists(path)` (`fs-utils.mjs`): Returns a boolean promise indicating whether `path` is accessible on disk.
- `wrapperLayout(model)` (`layout.mjs`): Computes the canonical-to-wrapper `{ kind, from, to }` mapping array for a plugin model (`skills/<skill>`, `agents/<file>`, `hooks/<stripped>`, `templates/<stripped>`, and `extra`).
- `copyLayout({ repoRoot, layout, to })` (`layout.mjs`): Copies all entries in a `layout` array from `repoRoot` into `to`, filtering out `tests/` directories inside skills.
- `rewriteTree(dir, { pairs, join, sigil, exts })` (`layout.mjs`): Rewrites `plugin:skill` references in the files under `dir` (or in one file) that have an extension in `exts`, using `rewriteReferences`.
- `copyRewrittenSkills({ repoRoot, model, to, pairs })` (`layout.mjs`): Copies a plugin's skills for Pi and OpenCode, sets each frontmatter `name` to `plugin-skill`, and rewrites references in the skills, agents, templates and hook scripts of the tree.
- `setNameLine(text, name)` and `insertAfterDescription(text, line)` (`layout.mjs`): Line-level edits of a `SKILL.md` frontmatter block (replace `name`; add a line after `description`).
- `copyRuntime({ files, to })` (`layout.mjs`): Copies shared runtime files (resolved relative to this repository's root `SELF_ROOT`) into a generated package directory `to`.
- `loadPluginModel({ repoRoot, plugin })` (`model.mjs`): Resolves a `registry.json` plugin entry against `repoRoot`, parsing frontmatter for all listed `skills` (registry entries `plugin/skill`; each model skill carries `name`, `path`, `frontmatter` and `userInvocable`) and `agents` and normalizing `hooks`, `templates`, and `extra` paths.
- `validatePiPackage({ repoRoot, packageJson })` (`pi-package.mjs`): Validates that `pi.skills`, `pi.extensions`, and `pi.prompts` in `packageJson` are arrays of non-empty string paths that exist under `repoRoot`.
- `loadRegistry(registryPath)` (`registry.mjs`): Reads and parses `registry.json`.
- `validateRegistryShape(registry)` (`registry.mjs`): Synchronously validates the structural schema of `registry` (`marketplace`, non-empty `plugins` array, unique plugin names, required `name`/`version`/`description`, and `resources` arrays).
- `validateRegistryResources({ repoRoot, registry })` (`registry.mjs`): Verifies that all `agents`, `hooks`, `templates`, `skills/<plugin>/<skill>/SKILL.md`, and `extra` paths declared in `registry.plugins` exist under `repoRoot`.
- `parseFrontmatter(text)` (`skills.mjs`): Parses top-level YAML frontmatter keys (plain, single/double-quoted, `|` and `>` block scalars, and raw nested lines) from a Markdown string, returning `null` if no frontmatter block is present.
- `pickerLine(frontmatter)` and `isRunnable(frontmatter)` (`skills.mjs`): `metadata.short-description` of a skill, if any; and whether the skill is runnable (true unless `user-invocable: false`).
- `validateSkills({ repoRoot, registry })` (`skills.mjs`): Validates every skill under `<repoRoot>/skills/<plugin>/<skill>/` (or `skills/<skill>/` for a skill in no plugin) for `SKILL.md` existence, matching kebab-case `name` (`<= 64` chars), non-empty `description` (`<= 1024` chars) containing a trigger phrase (`Use when ...`), and bidirectional `references/*.md` link integrity.
- Subdirectories:
  - [Harness Adapters Orchestration](./adapters/README.md): Registry and execution runner (`ADAPTERS`, `isEnabled`, `enabledAdapters`, `validateHarnessIds`, `runAdapters`, `withTempBuild`) for all harness build targets.
  - [Resource & Hook Transforms](./transforms/README.md): Frontmatter, agent, name and reference, plugin-root path, tool matcher, and hook policy transforms (`mapAgent`, `parseDocument`, `writeDocument`, `parseHooks`, `hookId`, `loadPluginHooks`, `derivedId`, `referencePairs`, `rewriteReferences`, `wrapperText`, `rewritePluginRoot`, `pluginRootPaths`, `canonicalPluginPaths`, `applyHookPolicy`, `carryHooks`, `validateOptionalHooks`, `rewriteMatcher`).

## Invariants
- `copyLayout` always excludes `<skill>/tests` directories from generated plugin outputs so development-only test fixtures never ship in installed packages.
- `copyRuntime` always resolves runtime source files from `SELF_ROOT` (this repository's checkout) rather than `repoRoot`, allowing test suites to run builds against temporary fixture repositories.
- `validateSkills` enforces that every skill's frontmatter `name` equals the last segment of its folder (`skills/<plugin>/<skill>/` gives `<skill>`), matches `^[a-z0-9]+(-[a-z0-9]+)*$`, has a trigger phrase (`use when`, `use this`, `use for`, `trigger(s)`, `activates when/on`), that every `references/<path>.md` linked in `SKILL.md` exists, and that every file under `references/` is referenced somewhere in the skill.
- `parseFrontmatter` supports only top-level scalar keys (`plain`, quoted, `|`, `>`) and keeps nested map/list lines uninterpreted as raw line arrays.

## Side Effects
- Filesystem helpers (`removeDir`, `ensureDir`, `copyResourceTree`, `writeJson`, `copyLayout`, `copyRuntime`) create, overwrite, and delete files and directories on disk.
- Model, registry, and skill loaders (`readJson`, `loadPluginModel`, `loadRegistry`, `validateRegistryResources`, `validateSkills`, `validatePiPackage`) read files and directory listings from `repoRoot`.

## Verification
- Run: `npm test`
- Run: `npm run validate`
