# Claude Code Harness Support (`harnesses/claude-code`)

## Overview
Build adapter for the native Claude Code plugin target (`dist/claude-code/<plugin>`) and root marketplace manifest (`.claude-plugin/marketplace.json`). Because canonical repository resources already follow Claude Code's native skills, commands, agents, and hooks conventions, this adapter copies each enabled plugin's wrapper layout directly without resource conversion.

`npm run build:release` writes one Claude Code plugin per plugin in
`registry.json` (unless `harnesses.claude-code.enabled` is `false`) and the
marketplace that lists them, `.claude-plugin/marketplace.json`. Claude Code
reads hooks, skills, commands and agents natively, so the plugins are the
canonical resources laid out the way Claude expects; nothing is converted.
Do not edit the generated plugins by hand.

## Interface
- `id` (`adapter.mjs`): Harness identifier `"claude-code"`.
- `pluginsDir` (`adapter.mjs`): Output directory `"dist/claude-code"`.
- `capabilities` (`adapter.mjs`): Declares native support for `skills`, `commands`, `agents`, and `hooks` (`session-start`, `subagent-start`, `pre-tool`, `post-tool`, `stop`).
- `generateRoot({ outRoot, registry, plugins })` (`adapter.mjs`): Removes `<outRoot>/dist/claude-code` and writes `<outRoot>/.claude-plugin/marketplace.json` indexing all enabled plugins.
- `generate({ repoRoot, outRoot, model })` (`adapter.mjs`): Writes `<outRoot>/dist/claude-code/<plugin>/.claude-plugin/plugin.json` and copies the plugin's canonical resources via `wrapperLayout(model)`.
- `validate()` (`adapter.mjs`): No-op validator returning `[]`.

## Invariants
- `generateRoot` always rebuilds `dist/claude-code` from scratch so removed plugins or resources never linger in the output tree.
- Generated `.claude-plugin/marketplace.json` plugin `source` paths always resolve relative to the repository/output root as `./dist/claude-code/<plugin>`.
- Canonical skills, commands, agents, hooks, templates, and extra files are copied without frontmatter or hook transformation.

## Side Effects
- Deletes and recreates `<outRoot>/dist/claude-code/` and writes `<outRoot>/.claude-plugin/marketplace.json` and per-plugin `.claude-plugin/plugin.json` manifests.
- Copies canonical resource trees from `repoRoot` into `<outRoot>/dist/claude-code/<plugin>/` (excluding skill `tests/` subdirectories).

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
claude --plugin-dir <dir>/<plugin>
```

`<dir>` is the Claude output of a build: the path `npm run build` prints,
followed by the Claude plugin folder.
