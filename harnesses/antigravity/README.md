# Antigravity Harness Support (`harnesses/antigravity`)

## Overview
Build adapter and bash/`jq` runtime hook shim for Google Antigravity (`agy`). Generates standalone Antigravity plugins under `dist/antigravity/plugins/<plugin>/` by converting commands into `<plugin>-cmd-<command>` skills, normalizing agent frontmatter to `name` and `description`, and bridging canonical Claude Code hooks to Antigravity's root `hooks.json` contract via `hook-shim.sh` and `tools.json`.

The release build (`npm run build:release`) generates one native Antigravity
plugin per registry plugin with `harnesses.antigravity.enabled` under
`dist/antigravity/plugins/`. Do not edit them by hand. `npm run build` writes
the same tree into a temp dir for local testing. Tested with agy 1.4.1.

## Interface
- `id` (`adapter.mjs`): Harness identifier `"antigravity"`.
- `pluginsDir` (`adapter.mjs`): Output directory `"dist/antigravity/plugins"`.
- `capabilities` (`adapter.mjs`): Declares `skills` (`native`), `commands` (`as-skill`), `agents` (`native`), and `hooks` (`shim` for `session-start`, `pre-tool`, `post-tool`, `stop`).
- `generateRoot({ outRoot })` (`adapter.mjs`): Removes `<outRoot>/dist/antigravity/plugins` before generating enabled plugins.
- `generate({ repoRoot, outRoot, model, report })` (`adapter.mjs`): Generates `.antigravity-plugin/plugin.json`, copies skills/templates/hook scripts, converts commands to skills, maps agents, and emits `hooks.json`, `runtime/antigravity/hooks.manifest.json`, `hook-shim.sh`, and `tools.json`.
- `commandSkillName(plugin, command)` (`adapter.mjs`): Returns the converted skill name `${plugin}-cmd-${command}`.
- `splitMatcher(entry)` (`adapter.mjs`): Splits pipe-delimited `pre-tool`/`post-tool` matchers into mappable and unmappable entries so known tool guards are carried while unknown parts go through hook policy reporting.
- `canCarry(entry)` (`adapter.mjs`): Evaluates whether a hook entry is supported on Antigravity based on event type, `startup` session matcher compatibility, and `tools.json` tool mappings.
- `validate({ repoRoot, outRoot = repoRoot, plugin })` (`adapter.mjs`): Runs `agy plugin validate <dir> --json --strict` (when `agy` is on `PATH`) in an isolated temporary `HOME`/`XDG_*_HOME` and verifies component counts (`skills`, `agents`, `hooks`).
- `hook-shim.sh <hook-id>`: Bash + `jq` entrypoint invoked by Antigravity from the plugin root that translates Antigravity hook stdin into Claude hook stdin, executes the canonical hook command with a timeout, and formats Antigravity JSON decisions (`{"decision":"allow"|"deny"|"continue"}` or `{"injectSteps":...}`).
- `tools.json`: Shared tool-name and input-field mapping table (`Bash` -> `run_command`, `Read` -> `view_file`).

## Invariants
- Generated Antigravity plugins must not depend on Node.js at runtime; `hook-shim.sh` requires only `bash` (>= 3.2) and `jq`.
- On `PreToolUse` (`pre-tool:*`), `hook-shim.sh` must never output `{}` on non-blocking outcomes; it must output `{"decision":"allow"}` because Antigravity treats `{}` on `PreToolUse` as a denial.
- Only hook exit code `2` blocks (`{"decision":"deny"}` on `pre-tool`, `{"decision":"continue"}` on `stop`); missing `jq`, missing scripts, timeouts, or other exit codes exit `0` with default non-blocking output.
- Agent frontmatter in generated plugins retains only `name` and `description` (synthesizing a fallback `description` if absent and recording a `degraded` note) because Antigravity skips agents missing either field or carrying `tools: "*"`.

## Side Effects
- `generateRoot` and `generate` delete and write plugin trees under `<outRoot>/dist/antigravity/plugins/`.
- `validate` creates and removes a temporary `HOME` directory (`agy-validate-*`) and spawns `agy plugin validate`.
- `hook-shim.sh` creates and cleans up a temporary working directory (`${TMPDIR:-/tmp}/agy-hook.XXXXXX`), exports `ANTIGRAVITY_PLUGIN_ROOT`, spawns hook commands in the target workspace `cwd` with timeout supervision, and logs diagnostics to `stderr`.

## Verification
- Run: `npm test`
- Run: `npm run validate`

## Install

From a clone of this repository, install every plugin at once, where
`<checkout>` is the path of the clone:

```bash
agy plugin install <checkout>/dist/antigravity
```

Point agy at `dist/antigravity`, not the repository root: agy installs every
plugin under that folder's `plugins/`.

## What a plugin contains

Each plugin holds:

- `.antigravity-plugin/plugin.json`: name, version and description
- `skills/`: the plugin's skills, plus one skill per command. agy does not
  load commands, so `/commit` of `commit-tools` becomes the skill
  `commit-tools-cmd-commit`, the name agy itself gives a converted Claude
  command. [`docs/command-skill-map.md`](../../docs/command-skill-map.md)
  lists them all.
- `agents/`: name and description only. agy skips an agent without both, or
  with `tools: "*"`, and Claude tool lists mean nothing to it.
- `hooks.json` and `runtime/`: the hooks, described below
- templates and other files at the same paths as the Claude wrapper

## Hooks

agy reads only a root `hooks.json` in its own schema and speaks a different
hook contract from Claude Code. Each canonical hook becomes a named hook
(`<plugin>/<hook id>`) that runs `bash runtime/antigravity/hook-shim.sh`,
which runs the canonical script under Claude's contract and translates both
ways:

| Claude event | agy event | What carries over |
| --- | --- | --- |
| `SessionStart` | `SessionStart` | context becomes `injectSteps` |
| `PreToolUse` | `PreToolUse` | exit 2 becomes `{"decision":"deny"}`; context is only logged |
| `PostToolUse` | `PostToolUse` | nothing reaches the model; agy ignores the output |
| `Stop` | `Stop` | exit 2 becomes `{"decision":"continue"}` |
| `SubagentStart` | none | not applicable |

Only exit 2 blocks. A missing script, crash or timeout does not block: it
prints `{}`, except on `PreToolUse`, where agy treats `{}` as a denial and
the shim prints `{"decision":"allow"}`. That `allow` skips agy's own
permission prompt for the call.

The shim needs only bash (3.2 or later, as macOS ships) and `jq`; generated
plugins contain no JavaScript and do not need Node.js. Without `jq` on
`PATH` every hook prints `{}` and does nothing. A hook's `timeout` (10 s by
default) is enforced with `timeout(1)` when present, otherwise by a
background watcher that kills the script's process group.

Matchers and tool calls are mapped through `tools.json`, which the build and
the shim both read: only `Bash` (`run_command`) and
`Read` (`view_file`) have known names. A matcher with an unknown part, such as
the MCP half of `Bash|mcp__.*git.*commit`, is split: the known part is
carried and the rest goes through the hook policy, so it fails the build
unless `registry.json` marks the hook optional for `antigravity`. These hooks
are marked optional, each with its reason under
`harnesses.antigravity.optional`:

- commit-tools `pre-tool:intercept-git-commit`: only the MCP half; the
  `run_command` guard is carried
- codebase `pre-tool:discovery-augment`: agy has no Grep or Glob tool
- devenv `post-tool:nix-tools`: agy's
  hook names for file edits are unverified

codebase's `subagent-start:subagent-reminder` does not apply, since agy has
no SubagentStart event.

agy 1.4.1 did not run JSON hooks without a signed-in account (they appear to
be behind an experiment), so the hooks follow agy's documented contract but
are unverified at runtime. The build reports this for every plugin with hooks.

`npm run validate` runs `agy plugin validate --json --strict` on every
generated plugin when agy is installed, and checks its skill, agent and hook
counts, because agy drops a malformed `hooks.json` without a finding.

## Smoke test before a release

The tests above run the shim with synthetic input. agy itself is the only
check of its hook contract, so before a release, with a signed-in agy:

1. `agy plugin install dist/antigravity` (from a release build).
2. Start a session and run any `run_command` such as `ls`. It must run, not
   fail with `tool call denied by pre-tool hook`.
3. Ask for `git commit -m test`. The commit guard must deny it.
4. Check that the session-start reminder reaches the model.

A hook that prints nothing, or `{}` on `PreToolUse`, blocks every call, so
step 2 catches the failure that once broke `run_command`.
