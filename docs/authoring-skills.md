# Authoring Skills and Plugins

This repository keeps reusable agent behavior in canonical root resource
directories. The build runs one adapter per harness, which turns those
resources and `registry.json` into that harness's install tree under `dist/`:

| Harness | Generated output |
| --- | --- |
| Claude Code | `dist/claude-code/<plugin-name>/`, `.claude-plugin/marketplace.json` |
| Pi | `dist/pi/` (skills, hooks, prompts, hook manifest and runtime) |
| Antigravity | `dist/antigravity/plugins/<plugin-name>/` |
| OpenCode | `dist/opencode/<plugin-name>/` |

`npm run build` writes this into a temp dir and prints it; only the release
(`npm run build:release`) writes it into the repo. Edit canonical resources,
build, and read the report. Never commit `dist/` or `.claude-plugin/` outside
a release.

## Canonical Resource Directories

```text
skills/          # Agent Skills source of truth
commands/        # Claude command wrappers grouped by plugin
agents/          # agent prompts grouped by plugin
hooks/           # hook definitions and scripts grouped by plugin
templates/       # reusable templates and static assets
shared-scripts/  # shared runtime scripts
```

Do not edit generated output directly. If a generated file is wrong, fix its
canonical source or the adapter that writes it, and regenerate.

## Add a Skill

Create:

```text
skills/<skill-name>/SKILL.md
```

Use Agent Skills frontmatter:

```markdown
---
name: my-skill
description: What this skill does and when to use it.
---

# My Skill

Instructions here.
```

Use lowercase hyphenated names. Keep shared skill prose harness-neutral where
possible. When a harness needs special handling, describe the generic action
first and name harness-specific commands second.

## Add Commands, Agents, Hooks, or Templates

Use plugin-grouped paths:

```text
commands/<plugin-name>/<command>.md
agents/<plugin-name>/<agent>.md
hooks/<plugin-name>/hooks.json
templates/<plugin-name>/<template>
shared-scripts/<plugin-name>/<script>
```

## Command Wrappers

For cross-harness workflows, put the full workflow in
`skills/<name>/SKILL.md`. Claude command files under `commands/` should be
thin wrappers that invoke the canonical skill and forward all arguments
unchanged.

Example command wrapper:

```markdown
---
name: ask
description: Ask a natural language question about the codebase
argument-hint: "<question>"
---

# /codebase:ask Command

Invoke the `codebase-ask` skill with the user's question.
Forward all arguments exactly as provided.
```

Each harness then exposes the command its own way (a Pi prompt, an
Antigravity skill, an OpenCode command), and the skill stays invocable by
name. Keep the mapping visible in
[`docs/command-skill-map.md`](command-skill-map.md).

## Register Resources

Update `registry.json`:

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "What this plugin does",
  "author": { "name": "Author" },
  "category": "utilities",
  "tags": ["utility"],
  "resources": {
    "skills": ["my-skill"],
    "commands": ["my-plugin/do.md"],
    "agents": [],
    "hooks": [],
    "templates": [],
    "extra": []
  },
  "harnesses": {
    "claude-code": { "enabled": true },
    "antigravity": { "enabled": true },
    "opencode": { "enabled": true },
    "pi": { "enabled": true }
  }
}
```

Claude Code is on unless `enabled` is `false`; every other harness is on only
when `enabled` is `true`. A harness id without an adapter fails the build.

`extra` entries map canonical paths to Claude wrapper destinations:

```json
{ "from": "shared-scripts/my-plugin", "to": "scripts" }
```

## Generate and Verify

```bash
npm run build
npm run validate
npm test
git status --short
```

The build prints, per plugin and harness, what was degraded, skipped or not
applicable. An `error` entry fails it. Commit the canonical resources only;
the next release writes the generated output.

## Hooks on Other Harnesses

Canonical hooks are Claude-format `hooks/<plugin-name>/hooks.json` plus
scripts, and that format is the contract on every harness: the event arrives
as Claude-shaped JSON on stdin, exit code 2 blocks with the reason on stderr,
and `{"hookSpecificOutput":{"additionalContext":"..."}}` on stdout adds
context. Matchers use Claude tool names (`Bash`, `Write|Edit`,
`mcp__.*git.*commit`).

Every hook is required on every enabled harness. If an adapter cannot carry
one, for example because its matcher names a tool the harness lacks, the
build fails until the plugin marks it optional for that harness with a
one-line reason:

```json
"antigravity": {
  "enabled": true,
  "optional": {
    "pre-tool:discovery-augment": "agy has no Grep or Glob tool, and its PreToolUse cannot inject context"
  }
}
```

The key is the hook id, `<event>:<script name>`, with events `session-start`,
`subagent-start`, `pre-tool`, `post-tool` and `stop`. The build report shows
the ids. `npm run validate` rejects a marker that names no hook or has no
reason. A hook whose event does not exist on a harness, such as
subagent-start on Pi, is reported as not applicable and needs no marker.

## Adding a Harness

A new harness needs one folder, `harnesses/<id>/`, holding its adapter,
any runtime or shim and its README, plus its tests and a registry flag. Canonical
resources, the registry schema and the other adapters stay unchanged.
[`harnesses/pi/adapter.mjs`](../harnesses/pi/adapter.mjs) and
[`harnesses/opencode/adapter.mjs`](../harnesses/opencode/adapter.mjs) are worked examples.

1. **Write the adapter.** Add `harnesses/<id>/adapter.mjs` and list it in
   `ADAPTERS` in [`scripts/lib/adapters/index.mjs`](../scripts/lib/adapters/index.mjs).
   It exports:

   - `id`: the harness id used in `registry.json`.
   - `capabilities`: a mode for each of `skills`, `commands`, `agents` and
     `hooks` (`native`, `as-skill`, `as-file`, `shim` or `none`), and for
     `hooks` the list of `events` it can enforce.
   - `generate({ repoRoot, outRoot, model, plugin, state, report })`:
     writes one plugin's output under `outRoot/dist/<id>/`. Read sources
     from `repoRoot`, write only under `outRoot`. `model` holds the
     plugin's loaded resources.
   - `validate({ repoRoot, outRoot, plugin })`: returns a list of error
     strings for the output under `outRoot`, running the harness's own
     validator when it is installed.
   - Optional `generateRoot({ repoRoot, outRoot, registry, plugins, report })`,
     run once before the plugins. Remove `outRoot/dist/<id>/` here so
     removed plugins and files stop shipping. Whatever it returns is passed
     as `state` to every `generate` call and to the optional
     `finish({ repoRoot, outRoot, registry, plugins, state, report })`, run
     once after them. Use these for repo-wide output, such as the Claude
     marketplace or Pi's single aggregate package.

   Record anything not carried as it is with
   `report.add({ kind, resource, status, reason })`, where `status` is
   `degraded`, `skipped`, `not-applicable` or `error`. Reuse the conversions
   in [`scripts/lib/transforms/`](../scripts/lib/transforms/) (frontmatter,
   command to skill, agent mapping, path tokens, tool names, hooks) and
   `wrapperLayout` from `scripts/lib/layout.mjs`, which hook commands address
   through `${CLAUDE_PLUGIN_ROOT}`.

2. **Map tools and run hooks.** Add `harnesses/<id>/tools.mjs`, a table
   keyed by Claude tool name giving the harness's tool name and any renamed
   input fields, plus an `mcp` rule (`toClaude`, `pattern`) for MCP tool
   names. `rewriteMatcher` uses it to translate matchers, and returns `null`
   when any alternative cannot be mapped, because a guard that never fires
   fails silently. Unless the harness runs Claude's `hooks.json` as is, add a
   runtime or hook shim under `harnesses/<id>/` that builds the stdin with
   `claudeHookInput` from `harnesses/lib/hook-input.mjs` and runs the
   scripts with `runEvent` or `runHook` from
   [`harnesses/lib/hook-runner.mjs`](../harnesses/lib/hook-runner.mjs). Only exit 2 may
   block; a missing, crashing or timed-out script must not. Copy the runtime
   into each generated package if the harness installs it without the rest
   of this repository.

3. **Apply the hook policy and enable plugins.** Give the adapter a
   `canCarry(entry)` that returns `{ ok: true }`, `{ notApplicable: reason }`
   or `{ unsupported: reason }`, and pass it to `applyHookPolicy` from
   `scripts/lib/transforms/policy.mjs`. Add `harnesses.<id>.enabled: true`
   to each plugin that should ship there, and an `optional` marker with a
   reason for each hook the build reports as an error that the harness truly
   cannot carry (see [Hooks on Other Harnesses](#hooks-on-other-harnesses)).

4. **Test and document.** Add `tests/build/<id>-adapter.test.mjs` that builds
   a small fixture registry in a temporary directory, checks the generated
   output, and covers the three parts of the hook contract with the
   harness's own tool names: a shell and an MCP-shaped `git commit` blocked
   by the commit-tools guard, session-start context reaching the model, and a
   missing or hanging script not blocking. Then run `npm run build`,
   `npm run validate` and `npm test`, add `harnesses/<id>/README.md` with
   install steps, and add the harness to the capability table in the
   [README](../README.md#harness-support) and to the
   [Command to Skill Map](command-skill-map.md).
