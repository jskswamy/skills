# OpenCode Harness Support (`harnesses/opencode`)

## Overview
Build adapter, OpenCode V2 plugin runtime, and tool-mapping table that package each enabled registry plugin into a self-contained OpenCode V2 plugin under `dist/opencode/<name>/`. Registers skills, commands, and subagents through OpenCode's transform APIs and bridges canonical Claude Code hooks to OpenCode tool, session context, and session execution events.

The release build (`npm run build:release`) writes one OpenCode (V2) plugin
package per plugin with `harnesses.opencode.enabled` to
`dist/opencode/<name>/`; `npm run build` writes the same into a temp dir. Each
package is self-contained: it runs without the rest of this repository. Do not
edit the packages by hand. The packages target the OpenCode V2 plugin API and
were tested with OpenCode 2.1.1; V1 is not supported.

## Interface
- `id` (`adapter.mjs`): Harness identifier `"opencode"`.
- `pluginsDir` (`adapter.mjs`): Output directory `"dist/opencode"`.
- `capabilities` (`adapter.mjs`): Declares `skills` (`native`), `commands` (`native`), `agents` (`native`), and `hooks` (`shim` for `session-start`, `subagent-start`, `pre-tool`, `post-tool`, `stop`).
- `generateRoot({ outRoot, plugins })` (`adapter.mjs`): Removes `<outRoot>/dist/opencode` and returns `{ commandName }` collision resolver seeded with `BUILTIN_COMMANDS`.
- `generate({ repoRoot, outRoot, model, state, report })` (`adapter.mjs`): Copies the canonical wrapper layout and shared runtime into `<outRoot>/dist/opencode/<plugin>/`, maps agents to `opencode-agents/`, validates payloads, rewrites hook commands to `"${OPENCODE_PLUGIN_ROOT}"`, and writes `resources.json`, `hooks.manifest.json`, `package.json`, and `index.js`.
- `canCarry(entry)` (`adapter.mjs`): Verifies `pre-tool` and `post-tool` hook matchers can be rewritten via `OPENCODE_TOOLS`.
- `validate({ repoRoot, outRoot = repoRoot, plugin })` (`adapter.mjs`): Verifies generated `package.json`, runtime files, `resources.json` payloads, and `hooks.manifest.json` script targets exist and are valid.
- `BUILTIN_COMMANDS` (`runtime.mjs`): Reserved OpenCode built-in commands (`["init", "review"]`).
- `payloadErrors(kind, payload)` (`runtime.mjs`): Validates required non-empty string fields for `skills`, `commands`, and `agents` payloads.
- `stripFrontmatter(text)` (`runtime.mjs`): Strips leading YAML frontmatter from Markdown content.
- `expandCommand(template, args = "")` (`runtime.mjs`): Substitutes `$ARGUMENTS` and positional `$1..$9` placeholders in command templates or appends `Arguments: <args>` when unplaced.
- `createPlugin({ id, root, log })` (`runtime.mjs`): Loads `hooks.manifest.json` and `resources.json` from `root` and returns an OpenCode V2 plugin `{ id, setup(ctx) }`.
- `OPENCODE_TOOLS` (`tools.mjs`): Maps Claude tool names and input parameters to OpenCode 2.1.1 tool names (`shell`, `read`, `edit`, `write`, `glob`, `grep`, `subagent`, `skill`, `webfetch`, `websearch`, `question`, `todowrite`), skips Code Mode's `"execute"` wrapper, and translates `<server>_<tool>` MCP tool names.

## Invariants
- Every skill, command, and agent payload is validated by `payloadErrors` both at build time (`adapter.mjs`) and load time (`runtime.mjs`) because a single invalid payload causes OpenCode to disable the entire plugin.
- `execute.before` tool hooks in `runtime.mjs` catch all internal errors and throw an `Error(result.reason)` *only* when a hook script exits with code `2` (`result.blocked === true`).
- Agent IDs are prefixed with `<plugin>-` unless already prefixed, and `ctx.agent.transform` never overwrites an existing user-defined agent with the same ID.
- Code Mode's `execute` wrapper tool is always skipped in `toolCall` because individual MCP tool calls inside it trigger their own hooks.

## Side Effects
- `generateRoot` and `generate` delete and write plugin packages under `<outRoot>/dist/opencode/`.
- At runtime, `createPlugin` reads `hooks.manifest.json`, `resources.json`, and Markdown resource files from disk, sets `OPENCODE_PLUGIN_ROOT` in hook environments, registers OpenCode tool/session/skill/command/agent hooks and transforms on `ctx`, subscribes to `ctx.event`, and spawns canonical hook scripts via [`../lib/hook-runner.mjs`](../lib/README.md).

## Verification
- Run: `npm test`
- Run: `npm run validate`

## Install

OpenCode loads a local plugin from a directory whose `package.json` has a
`main`. Either list the package in `opencode.json`:

```json
{ "plugins": ["/path/to/skills/dist/opencode/commit-tools"] }
```

or copy the package directory into `.opencode/plugins/<name>/` (project) or
the global OpenCode config directory's `plugins/<name>/`. Loading by path
through `opencode.json` is the tested route: all ten packages loaded with
their skills, commands, agents and hooks. Discovery from the config
directories follows OpenCode's plugin lookup and was not tested.

skillshare 0.26.3 installs a package only with `--entry index.js` and then
writes `file://…/index.js` into `opencode.json`, which OpenCode 2.1.1 rejects
("configured plugin path must be a directory"). List the package folder
yourself instead.

## What a package contains

| Path | Purpose |
| --- | --- |
| `package.json`, `index.js` | Plugin entry: `export default { id, setup }` |
| `runtime/` | Copy of `runtime.mjs`, `tools.mjs` and `harnesses/lib/` |
| `resources.json` | Skills, commands and agents the runtime registers |
| `hooks.manifest.json` | Canonical hooks the runtime runs |
| `skills/`, `commands/`, `agents/`, `hooks/`, ... | Claude wrapper layout; hook scripts find their files through it |
| `opencode-agents/` | Agents with OpenCode frontmatter (`description`, `mode: subagent`) |

Skills and commands are added with `ctx.skill.transform` and
`ctx.command.transform`. A command sends its body as a prompt, with
arguments placed as Claude places them. A command name another plugin or
OpenCode itself uses gets the plugin as a prefix (`/jot-setup`). Agents are
added through `ctx.agent.transform` (`update` creates a missing agent) with
plugin-prefixed ids (`craft-spec-reviewer`); an existing agent with the same
id is left alone.

One invalid payload makes OpenCode disable the whole plugin, hooks included,
so the build checks every payload and the runtime skips any that fail. The
jot `capture` agent has no frontmatter, so it is not registered; the build
reports it. OpenCode does not read a plugin's `.mcp.json`, so add devenv's MCP
server to `opencode.json` yourself.

[`docs/command-skill-map.md`](../../docs/command-skill-map.md) lists every
command name.

## Hooks

The runtime runs the canonical Claude-format scripts under Claude's
contract (`harnesses/lib/hook-runner.mjs`), with `${CLAUDE_PLUGIN_ROOT}`
rewritten to the package directory:

| Claude event | OpenCode |
| --- | --- |
| `PreToolUse` | `ctx.tool.hook("execute.before")`; exit 2 throws, which blocks the tool |
| `PostToolUse` | `ctx.tool.hook("execute.after")` |
| `SessionStart` | first `ctx.session.hook("context")` of a session; the context is pushed into every request of it |
| `SubagentStart` | the same, for a session with a parent |
| `Stop` | `session.execution.succeeded` event for a session without a parent; exit 2 prompts the session with the reason |

Hook context from tool hooks joins the session's context for later
requests, since OpenCode has no per-result slot. Tool names map through
`tools.mjs` (`shell` is `Bash`, `path` is `file_path`, ...). MCP tools are
named `<server>_<tool>` and map to `mcp__<server>__<tool>`; Code Mode's
`execute` wrapper is skipped because each MCP call inside it is hooked on its
own. `patch`, used only by gpt-* models, has no Claude equivalent, so
`Write|Edit` hooks such as devenv's formatters do not fire for patch edits.

Only exit 2 blocks. A missing script, crash or timeout is logged and does
not block.

On OpenCode 2.1.1, a shell `git commit` and an MCP commit made from Code Mode
were both blocked, session reminders reached the model, and a blocking stop
hook prompted the session once. `PostToolUse` is covered by unit tests only.
