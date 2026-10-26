# OpenCode Harness Support

The release build (`npm run build:release`) writes one OpenCode (V2) plugin
package per plugin with `harnesses.opencode.enabled` to
`dist/opencode/<name>/`; `npm run build` writes the same into a temp dir. Each
package is self-contained: it runs without the rest of this repository. Do not
edit the packages by hand. The packages target the OpenCode V2 plugin API and
were tested with OpenCode 2.1.1; V1 is not supported.

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
