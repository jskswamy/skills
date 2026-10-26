# Pi Harness Support

This repository exposes its plugins to Pi as one package, `dist/pi/`, named
by the hand-written `pi` block in the root `package.json`. The release build
(`npm run build:release`) writes it from `registry.json` for every plugin
with `harnesses.pi.enabled`. It is self-contained: the plugins' skills,
hooks, templates and scripts at their canonical paths, the prompt
templates, one hook manifest and a copy of the runtime. Do not edit it by
hand. Tested with Pi 1.4.0.

## Install

Install a released tag for a stable snapshot. Tags are the recommended
target for repeatable and shared team setups:

```bash
pi install git:github.com/jskswamy/skills@vX.Y.Z
```

Install `main` for the last release (only a release changes `dist/pi/`):

```bash
pi install git:github.com/jskswamy/skills@main
```

`dist/pi/` is also a Pi package on its own, with its own `package.json`, so
a checkout can install just that folder, directly or through skillshare:

```bash
pi install <checkout>/dist/pi
skillshare plugin add <checkout>/dist/pi --target pi -g
```

For local development, build into a temp dir and load that:

```bash
npm run build      # last line: Output: <dir>
pi -e <dir>
```

## What the package contains

Pi loads:

- `skills`: `./dist/pi/skills`, the skills of those plugins, invoked with
  `/skill:<skill-name>`
- `prompts`: `./dist/pi/prompts`, a prompt template per command
  (`/commit`, `/ask`, ...). Pi names a prompt by file name alone, so a
  command name two plugins share gets the plugin as a prefix (`/jot-setup`,
  `/study-setup`). A command that does not place its arguments gets
  `Arguments: $ARGUMENTS` appended.
- `extensions`: `./dist/pi/runtime/pi/runtime.mjs`, a copy of
  `harnesses/pi/runtime.mjs`, which runs the plugins' hooks

Pi has no sub-agents, so plugin agents are not available; the build report
lists them. [`docs/command-skill-map.md`](../../docs/command-skill-map.md)
lists every prompt with its canonical skill.

## Hooks

The canonical hooks under `hooks/<plugin>/` are Claude-format scripts. The
build collects them into `dist/pi/hooks.manifest.json`, with
`${CLAUDE_PLUGIN_ROOT}` paths mapped to the canonical paths inside `dist/pi/`
(the runtime sets `PI_PACKAGE_ROOT` to that folder), and the runtime runs
them under Claude's contract using
`harnesses/lib/hook-runner.mjs`:

| Claude event | Pi event |
| --- | --- |
| `SessionStart` | `session_start`; context is sent once per session |
| `PreToolUse` | `tool_call`; exit 2 blocks the tool |
| `PostToolUse` | `tool_result`; context is appended to the tool result |
| `Stop` | `agent_settled`; Pi cannot keep the agent going, so exit 2 is only logged |
| `SubagentStart` | not applicable |

Matchers are mapped through `tools.mjs` (`bash`, `read`, `edit`, `write`,
`find`, `grep`, the last two only when enabled with `--tools`; MCP tools keep
their `mcp__<server>__<tool>` names). Only exit 2 blocks. A missing script,
crash or timeout is logged and does not block.

## Commit workflow

The `/commit` prompt forwards to `commit-action`, and a commit-tools
session-start hook routes agent-initiated commits through it in every
repository. No project instructions or configuration are required.
`/skill:commit-action` reaches the same workflow. Classic style is the
default; message confirmation is still required. Commits stay local and the
user handles pushing and remote issue synchronization.

The commit-tools pre-tool hook blocks direct shell/MCP commits, including
nested calls from codemode, and redirects the agent to the workflow. The
environment bypass token is a convention, not a security boundary or proof
of approval.

A Skillshare skill-only copy does not load executable Pi extensions. Install
the Pi package once for the `/commit` prompt and guard; copying skill files
alone still supports `/skill:commit-action` with self-contained resources.
See the [commit-tools documentation](../../templates/commit-tools/README.md).
