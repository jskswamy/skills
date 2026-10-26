# Antigravity Harness Support

The release build (`npm run build:release`) generates one native Antigravity
plugin per registry plugin with `harnesses.antigravity.enabled` under
`dist/antigravity/plugins/`. Do not edit them by hand. `npm run build` writes
the same tree into a temp dir for local testing. Tested with agy 1.4.1.

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
