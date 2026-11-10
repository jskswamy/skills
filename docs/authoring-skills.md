# Authoring Skills and Plugins

This repository keeps reusable agent behavior in canonical root resource
directories. The build runs one adapter per harness, which turns those
resources and `registry.json` into that harness's install tree under `dist/`:

| Harness | Generated output |
| --- | --- |
| Claude Code | `dist/claude-code/plugins/<plugin-name>/`, `.claude-plugin/marketplace.json` |
| Pi | `dist/pi/plugins/<plugin-name>/` (`package.json#pi`, `prompts/`, `runtime/pi/`), `marketplace.json` |
| omp | `dist/omp/plugins/<plugin-name>/` (`.omp-plugin/plugin.json`, `commands/`, `package.json#omp`, `runtime/omp/`), `.omp-plugin/marketplace.json` |
| Antigravity | `dist/antigravity/plugins/<plugin-name>/` (each with `.antigravity-plugin/plugin.json`) |
| OpenCode | `dist/opencode/plugins/<plugin-name>/` (`package.json`, `index.js`, `.opencode/plugins/index.js`, `runtime/opencode/`), `.plugin/marketplace.json` |
| Codex | `dist/codex/plugins/<plugin-name>/` (`.codex-plugin/plugin.json`, `codex-skills/`), `.agents/plugins/marketplace.json` |

Each harness reads only its own tree; no adapter writes into another's.
These paths exist after the next release (the last release shipped
`dist/plugins/<plugin-name>/`).

`npm run build` writes this into a temp dir and prints it; only the release
(`npm run build:release`) writes it into the repo. Edit canonical resources,
build, and read the report. Never commit `dist/`, `.claude-plugin/`,
`.agents/`, `.plugin/`, `.omp-plugin/`, or `marketplace.json` outside a release.

## Skillshare Discovery and Catalogs

Skillshare does not walk `dist/`; it only inspects plugin directories
referenced by root marketplace catalog files and merges entries across catalogs
when their plugin `name` matches:

| Root catalog | Target tree | Purpose |
| --- | --- | --- |
| `.agents/plugins/marketplace.json` | `./dist/codex/plugins/<name>` | Codex CLI and Skillshare Codex discovery |
| `.claude-plugin/marketplace.json` | `./dist/claude-code/plugins/<name>` | Claude Code and Skillshare Claude/Antigravity discovery |
| `.plugin/marketplace.json` | `./dist/opencode/plugins/<name>` | Skillshare OpenCode discovery (`package.json#main`) |
| `marketplace.json` | `./dist/pi/plugins/<name>` | Skillshare Pi discovery (`package.json#pi`) |
| `.omp-plugin/marketplace.json` | `./dist/omp/plugins/<name>` | omp and Skillshare omp discovery (`.omp-plugin/plugin.json`) |

Keep these invariants whenever changing adapter layouts or manifests:

- **Unscoped plugin `package.json` names:** Generated `dist/pi/plugins/<name>/package.json`
  and `dist/opencode/plugins/<name>/package.json` must use `"name": "<name>"`
  (not `@jskswamy/<name>`). Skillshare normalizes `@jskswamy/<name>` to
  `jskswamy-<name>`, flags `catalogNameDiffers` against the catalog's `<name>`,
  and silently drops the Pi and OpenCode targets on catalog merge. (The root
  `package.json` is not a plugin catalog entry and keeps `@jskswamy/skills`.)
- **No Copilot manifest in OpenCode output:** `.plugin/marketplace.json` is
  also a Copilot catalog path in Skillshare. It is safe for OpenCode only
  because `dist/opencode/plugins/<name>/` carries no Copilot manifest.
- **No `.cursor-plugin/` or `.github/plugin/` catalogs:** Do not add those
  root catalog paths, as they advertise or steal unrelated agent targets in
  Skillshare.
- **`.omp-plugin/marketplace.json` lists every plugin or does not exist:**
  omp reads it instead of `.claude-plugin/marketplace.json`, so a partial
  catalog hides plugins from omp users. The registry requires omp on every
  plugin or none, and the omp adapter deletes the catalog before writing it.
  Skillshare v0.29.1 routes only its omp target to this catalog (claude and
  copilot stay on `.claude-plugin`).

## Canonical Resource Directories

```text
skills/          # Agent Skills source of truth: skills/<plugin>/<skill>/
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
skills/<plugin-name>/<skill-name>/SKILL.md
```

The skill is the only authored file for a capability; there are no command
files. Use Agent Skills frontmatter:

```markdown
---
name: my-skill
description: What this skill does and when to use it.
---

# My Skill

Instructions here.
```

Use lowercase hyphenated names. The `name` equals the folder name, and it
must not start with the plugin name: the skill `shape` in the `craft`
plugin is `craft:shape`, not `craft-shape`. A skill that belongs to no
plugin (such as `release`) sits directly under `skills/<skill-name>/`.

A skill is runnable by name unless its frontmatter has `user-invocable: false`,
which marks it model-only. Pi and OpenCode get a prompt or command per
runnable skill and none for a model-only one.

Refer to another skill by its qualified name, `plugin:skill`, or
`/plugin:skill` where the text tells the user to run it, even within the same
plugin. The build rewrites these for Pi and OpenCode (`plugin-skill`) and Codex
(`$plugin:skill`). A token that names no skill is left alone, and a test fails
when a source file names a skill that does not exist.

Keep shared skill prose harness-neutral where possible. When a harness needs
special handling, describe the generic action first and name
harness-specific commands second. How each harness runs a skill is in
[`docs/command-skill-map.md`](command-skill-map.md).

## Add Agents, Hooks, or Templates

Use plugin-grouped paths:

```text
agents/<plugin-name>/<agent>.md
hooks/<plugin-name>/hooks.json
templates/<plugin-name>/<template>
shared-scripts/<plugin-name>/<script>
```

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
    "skills": ["my-plugin/my-skill"],
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
   - `capabilities`: a mode for each of `skills`, `agents` and
     `hooks` (`native`, `as-file`, `shim` or `none`), and for
     `hooks` the list of `events` it can enforce.
   - `pluginsDir`: where it writes, `dist/<id>/plugins`. The build clears it
     before the adapters run.
   - `generate({ repoRoot, outRoot, model, plugin, state, report })`:
     writes one plugin's output under `outRoot/dist/<id>/plugins/<plugin>/`, and nothing under another harness's tree. Read sources
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
   names and reference rewriting, agent mapping, path tokens, tool names,
   hooks) and `wrapperLayout` from `scripts/lib/layout.mjs`, which hook
   commands address through `${CLAUDE_PLUGIN_ROOT}`. A harness with no
   namespace gives each skill the id `derivedId(plugin, skill)`
   (`plugin-skill`), rewrites references with `rewriteTree` or
   `copyRewrittenSkills`, and writes its entry per runnable skill (`isRunnable`),
   as Pi and OpenCode do.

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
   [invocation forms](command-skill-map.md).
