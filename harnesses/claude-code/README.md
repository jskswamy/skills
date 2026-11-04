# Claude Code Harness Support (`harnesses/claude-code`)

## Overview
Build adapter for the native Claude Code plugin target (`dist/claude-code/plugins/<plugin>`) and root marketplace manifest (`.claude-plugin/marketplace.json`). Because canonical repository resources already follow Claude Code's native skills, agents, and hooks conventions, this adapter copies each enabled plugin's wrapper layout directly and rewrites runnable skill frontmatter via `restatePicker(..., "when_to_use")` so `description` holds the compact picker line (`metadata.short-description`) and the full trigger text moves to `when_to_use`.

`npm run build:release` writes one Claude Code plugin per plugin in
`registry.json` (unless `harnesses.claude-code.enabled` is `false`) and the
marketplace that lists them, `.claude-plugin/marketplace.json`. Claude Code
reads hooks, skills and agents natively, so the plugins are the
canonical resources laid out the way Claude expects.
Do not edit the generated plugins by hand. A skill is its own slash entry,
`/<plugin>:<skill>`; there are no command files.

## Interface
- `id` (`adapter.mjs`): Harness identifier `"claude-code"`.
- `pluginsDir` (`adapter.mjs`): Output directory `"dist/claude-code/plugins"`.
- `capabilities` (`adapter.mjs`): Declares native support for `skills`, `agents`, and `hooks` (`session-start`, `subagent-start`, `pre-tool`, `post-tool`, `stop`).
- `generateRoot({ outRoot, registry, plugins })` (`adapter.mjs`): Removes `<outRoot>/dist/claude-code` and writes `<outRoot>/.claude-plugin/marketplace.json` indexing all enabled plugins.
- `generate({ repoRoot, outRoot, model })` (`adapter.mjs`): Writes `<outRoot>/dist/claude-code/plugins/<plugin>/.claude-plugin/plugin.json`, copies the plugin's canonical resources via `wrapperLayout(model)`, and for each runnable skill with `pickerLine`, rewrites `skills/<skill>/SKILL.md` with `restatePicker(..., skill.pickerLine, "when_to_use", file)`.
- `validate()` (`adapter.mjs`): No-op validator returning `[]`.

## Invariants
- `runAdapters` always rebuilds `dist/claude-code` from scratch so removed plugins or resources never linger in the output tree.
- Generated `.claude-plugin/marketplace.json` plugin `source` paths always resolve relative to the repository/output root as `./dist/claude-code/plugins/<plugin>`.
- Canonical agents, hooks, templates, and extra files are copied without transformation; runnable skills with `metadata.short-description` (`pickerLine`) have their `SKILL.md` frontmatter rewritten so `description` contains `pickerLine` and `when_to_use` retains the canonical trigger description.

## Side Effects
- Populates `<outRoot>/dist/claude-code/plugins/` and writes `<outRoot>/.claude-plugin/marketplace.json` and per-plugin `.claude-plugin/plugin.json` manifests.
- Copies canonical resource trees from `repoRoot` into `<outRoot>/dist/claude-code/plugins/<plugin>/` (excluding skill `tests/` subdirectories).

## Verification
- Run: `npm test`
- Run: `npm run validate`

## Install

```text
/plugin marketplace add jskswamy/skills
/plugin install <plugin>@skills
```

To try a plugin from a checkout without installing it:

```bash
claude --plugin-dir <dir>/dist/claude-code/plugins/<plugin>
```

`<dir>` is the Claude output of a build: the path `npm run build` prints,
followed by the Claude plugin folder.
