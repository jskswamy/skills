# Resource & Hook Transforms (`scripts/lib/transforms`)

## Overview
Pure and file-backed transformation utilities that convert canonical Claude-format skills, commands, agents, frontmatter documents, tool matchers, and hooks into harness-specific formats and enforce cross-harness hook portability policies.

## Interface
- `mapAgent(text, { keep = [], rename = {}, set = {}, trimExamples = false })` (`agents.mjs`): Parses an agent Markdown document, filters or renames YAML frontmatter keys, optionally strips `<example>...</example>` blocks from `description`, merges `set` fields, and serializes the result.
- `commandToSkill({ name, text }, { name: skillName = name } = {})` (`command-to-skill.mjs`): Converts a command Markdown file into a skill object `{ name, content }` with `name` and `description` frontmatter.
- `parseDocument(text)` (`frontmatter.mjs`): Splits a Markdown document with optional YAML frontmatter into `{ frontmatter, body }`.
- `writeDocument({ frontmatter, body })` (`frontmatter.mjs`): Serializes `{ frontmatter, body }` back to Markdown with YAML frontmatter (plain or JSON-quoted scalars, `|` block scalars for multiline strings, and raw array lines).
- `parseHooks(hooksJson)` (`hooks.mjs`): Flattens a Claude-format `hooks.json` object into normalized hook entries `{ id, event, matcher?, command, timeoutMs? }` with timeouts converted from seconds to milliseconds.
- `hookId(event, command, index)` (`hooks.mjs`): Computes a stable hook identifier (`<event>:<script-basename>` or `<event>:<index>`) used by `registry.json` optional hook markers.
- `loadPluginHooks({ repoRoot, hooks })` (`hooks.mjs`): Reads and parses all `hooks.json` files listed in a plugin model's `hooks` array from `repoRoot`.
- `commandNames(plugins, reserved = [])` (`names.mjs`): Returns a resolver `(plugin, name) => string` that prefixes command names with `<plugin>-` when another plugin or the `reserved` list also claims `name`.
- `rewritePluginRoot(command, replacement)` (`paths.mjs`): Replaces `${CLAUDE_PLUGIN_ROOT}` and `$CLAUDE_PLUGIN_ROOT` tokens in a hook command string with `replacement`.
- `pluginRootPaths(command)` (`paths.mjs`): Extracts all plugin-relative paths referenced via `${CLAUDE_PLUGIN_ROOT}/...` or `$CLAUDE_PLUGIN_ROOT/...` in a hook command.
- `canonicalPluginPaths(command, layout, root)` (`paths.mjs`): Maps wrapper-relative `${CLAUDE_PLUGIN_ROOT}/<to>` paths in `command` back to `<root>/<from>` canonical paths using a `wrapperLayout` table.
- `applyHookPolicy({ entries, plugin, harness, canCarry })` (`policy.mjs`): Evaluates normalized hook entries against a harness's `canCarry(entry)` predicate and `plugin.harnesses[harness].optional`, returning `{ carried, report }`.
- `carryHooks({ repoRoot, model, harness, canCarry, report, prepare })` (`policy.mjs`): Loads a plugin's hooks, runs `prepare` and `applyHookPolicy`, appends non-carried notes to `report`, and returns carried hook entries.
- `validateOptionalHooks({ repoRoot, registry })` (`policy.mjs`): Validates that every hook ID under `plugin.harnesses.<harness>.optional` in `registry` exists in the plugin's `hooks.json` and has a non-empty string reason.
- `rewriteMatcher(matcher, table)` (`tools.mjs`): Rewrites a pipe-delimited Claude tool matcher (`Bash|mcp__...`) into harness tool names using `table.tools` and `table.mcp.pattern`, returning `null` if any alternative cannot be mapped.
- Re-exports `CLAUDE_EVENTS`, `claudeHookInput`, `toClaudeToolName` from [`../../../harnesses/lib/hook-input.mjs`](../../../harnesses/lib/hook-input.mjs) and `matchesClaude` from [`../../../harnesses/lib/hook-runner.mjs`](../../../harnesses/lib/hook-runner.mjs) (`tools.mjs`).

## Invariants
- `parseHooks` throws if a hook event is not in `CLAUDE_EVENTS` or if `hook.type !== "command"`.
- `applyHookPolicy` rejects any hook command that quotes `${CLAUDE_PLUGIN_ROOT}` or `$CLAUDE_PLUGIN_ROOT` (`status: "error"`) because harness runtimes substitute an already-quoted root token.
- Every unsupported hook is recorded as `status: "error"` unless `plugin.harnesses[harness].optional[entry.id]` provides a non-empty reason string, in which case it is recorded as `status: "skipped"`.
- `rewriteMatcher` returns `null` if *any* alternative in a `|`-separated matcher fails to map, preventing partial guards from silently failing to match.
- `canonicalPluginPaths` throws if a `${CLAUDE_PLUGIN_ROOT}/...` path has no matching destination in `layout`.

## Side Effects
- `loadPluginHooks` and `carryHooks` read `hooks.json` files from `repoRoot` on disk.
- `carryHooks` mutates the passed `report` collector via `report.add(entry)`.
- All other functions in this package are pure in-memory transformations.

## Verification
- Run: `npm test`
- Run: `npm run validate`
