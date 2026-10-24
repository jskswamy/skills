# Harness adapters: one source, any harness

Date: 2026-10-24. Status: draft for approval. `docs/superpowers/` is
gitignored, so commit this file with `git add -f`.

## Intent

This repo is a collection of skills, commands, agents, hooks and templates
meant to work in any coding-agent harness. Today the build generates Claude
Code wrappers only (`scripts/lib/claude-code.mjs`), and Pi gets the root
`skills/` directory plus one hand-written commit-tools extension. We want
Antigravity, OpenCode and a full Pi adapter now (skills, commands, hooks), and
further harnesses later, with minimal and consistent effort per harness.

The way to get there is a small **adapter** per harness. An adapter reads the
same registry and canonical resources and emits whatever that harness needs.
Adding a harness means writing one adapter and flipping a flag per plugin. It
never means touching a plugin's skills, commands, agents or hooks.

We build this ourselves. Existing converters (acplugin, rulesync) were
evaluated and rejected: none enforces hooks on OpenCode or Antigravity, and
adopting rulesync would replace our `registry.json` model.

## Goals

- One canonical source per resource; every harness output is generated from it.
- A new harness costs one adapter module (plus its tests) and a registry flag.
- Behavior is consistent: a plugin offers the same skills, commands, agents and
  hook guarantees everywhere the harness can support them.
- Where a harness cannot support something, the build says so. Nothing is
  dropped silently.
- Generated output is committed (Claude installs from a git tree and runs no
  build scripts), and `npm run validate` / `npm test` cover every adapter.
- Where a harness ships its own validator (`agy plugin validate`), the adapter
  tests use it when the binary is present and skip when it is not.

## Non-goals

- Changing canonical sources or the Claude Code output. Existing Claude
  installs must keep working byte-for-byte unless a fix requires otherwise.
- OpenCode V1. OpenCode 2.0 broke the plugin API; we target V2 only and say so
  in the README. Antigravity target is `agy` 1.4.x.
- Publishing to each harness's marketplace or registry.
- Mapping Claude model names to other vendors' models.

## Anti-goals (a failure even if it technically works)

- Per-plugin harness code, such as a bespoke OpenCode plugin for `craft`.
- Two hook implementations that can disagree (a shell script for Claude and a
  JS rewrite elsewhere).
- Hooks that quietly stop protecting anything on some harness.
- An adapter interface so abstract that the next harness needs core changes.

## Design

### Pipeline

```
registry.json + canonical resources
        │  load once into a typed resource model
        ▼
 scripts/lib/model.mjs   (skills, commands, agents, hooks, templates, extra)
        │
        ├── adapters/claude-code.mjs   (existing logic, moved behind the interface)
        ├── adapters/antigravity.mjs
        ├── adapters/opencode.mjs
        ├── adapters/pi.mjs
        └── adapters/<future>.mjs
        ▼
 committed generated trees + a build report (what each harness supports)
```

`scripts/build.mjs` loads the registry, builds the model per plugin, and runs
every adapter whose flag is on for that plugin.

### Registry

`harnesses.<id>.enabled` already exists per plugin. We add `antigravity` and
`opencode` entries the same way. Claude Code keeps its current default (on
unless `enabled: false`); new harnesses are on only when `enabled: true`.
Harness ids are validated against the adapter list, so a typo fails the build.
All ten plugins already list `pi`, so Pi's adapter must exist from the first
build that validates ids.

### Adapter interface

Each adapter module exports:

- `id`: the harness id used in the registry.
- `capabilities`: for each of `skills`, `commands`, `agents`, `hooks`, a mode
  such as `native`, `as-skill`, `as-file`, `shim` or `none`, and for hooks the
  set of events it can enforce.
- `generate({ repoRoot, model, plugin, report })`: write the output tree.
- `validate({ repoRoot, plugin })`: structural checks on the generated output,
  invoking the harness's own validator if available.

The build report records, per plugin and harness, every resource that is
degraded or unsupported (for example "craft agents: not supported on
pi"). The report is printed by `npm run build` and summarized in the
README capability table.

Hook policy: every hook of every plugin is in scope on every enabled harness
and is **required by default**. If a harness cannot carry a hook, including one
whose matcher cannot be mapped, the build fails for that plugin and harness. A
hook may be marked `optional` for a named harness in `registry.json`, with a
one-line reason, which downgrades the failure to a report entry. A hook whose
event cannot exist on a harness (for example subagent-start on Pi, which has no
sub-agents) is `not-applicable` and is not an error. Agents and commands that a
harness cannot carry are reported as degraded.

### Shared transforms (written once, used by many adapters)

- **Frontmatter reader/writer**, extending the existing `parseFrontmatter`.
- **Command to skill**: our commands are thin wrappers that forward to a skill.
  Where a harness has no commands, the transform emits a skill with the
  command's name, description and body.
- **Agent mapping**: per harness, a table of frontmatter keys to keep, rename
  or drop (for example OpenCode wants `description` and `mode: subagent`; the
  long `<example>` blocks in the description are trimmed there).
- **Path tokens**: hook commands use `${CLAUDE_PLUGIN_ROOT}`. The adapter
  rewrites this to the harness's own mechanism, or to a path relative to the
  generated plugin if the harness has none.
- **Tool names and hook input**: hook matchers use Claude tool names
  (`Bash|mcp__.*git.*commit`, `Write|Edit`). Each adapter carries a table from
  its harness's tool names to the Claude names, used both to rewrite matchers
  and to build the Claude-shaped JSON (`tool_name`, `tool_input`) that the
  shared scripts read on stdin. Each adapter also carries a rule for MCP tool
  names, because harnesses name them differently and the `commit-tools`
  matcher covers `mcp__.*git.*commit` as well as `Bash`. A matcher that cannot
  be mapped is never emitted unchanged, because an unmatched guard fails
  silently; it counts as a hook the harness cannot carry (see the hook policy
  above). The existing `commitToolBlock` in `skills/commit-action/lib/` already
  decides what counts as a commit for Pi, including MCP calls, and is the model
  for the other shims.

### Hooks: one implementation, one contract

Canonical hooks stay as they are: `hooks/<plugin>/hooks.json` in Claude format
plus shell scripts. They already speak the Claude hook protocol (JSON event on
stdin; exit code 2 blocks with the message on stderr). That protocol is the
contract. The shell scripts, and the Node guards they call, are the only
implementation.

The contract has three parts. Input: the event as Claude-shaped JSON on stdin.
Blocking: exit code 2, with the reason on stderr. Context injection: a
`hookSpecificOutput.additionalContext` JSON object on stdout, as the
`codebase` reminder hooks print. Each harness shim must honor all three: for
example OpenCode appends the text through `ctx.session.hook("context")` and
Pi returns it as a `before_agent_start` message.

Shim behavior, matching Claude Code, in every shim:

- Only exit code 2 blocks. Any other failure (script missing, crash, non-zero
  exit other than 2, a thrown error in the shim) is logged and does not block.
  Pi blocks a tool when a `tool_call` handler throws, so the Pi shim catches
  everything; otherwise one broken script would block every `bash`, `edit` and
  `write` call.
- The hook's `timeout` is enforced by killing the script. Hooks without one get
  a default. A timeout does not block.

The model parses `hooks.json` into neutral entries: `event` (session-start,
subagent-start, pre-tool, post-tool, stop), optional `matcher`, `command`,
`timeout`. Adapters then translate:

- **Claude Code**: copy as is.
- **Antigravity**: emit a root `hooks.json` in its schema. Findings from
  `agy plugin validate`: only a root `hooks.json` is read (not `hooks/`), the
  `description` key must be absent, and events must sit under a named hook
  rather than a `hooks` wrapper.
- **OpenCode (V2)**: no hook file exists. One shared runtime
  (`harnesses/opencode/runtime.mjs`, written once) reads a generated
  `hooks.manifest.json` and wires `ctx.tool.hook`, `ctx.session.hook` and
  related calls to run the shell scripts under the same stdin/exit-code
  contract. Plugins carry no JS of their own.
- **Pi**: one shared extension (`harnesses/pi/runtime.mjs`) reads the
  generated hooks manifest and wires Pi's extension events to the scripts:
  `tool_call` (can block) for pre-tool, `tool_result` for post-tool,
  `session_start` / `before_agent_start` (can inject a message) for
  session-start, and `agent_settled` for stop (Pi cannot block there, so a
  blocking stop hook cannot be carried, so it must be `optional`; none of
  ours blocks on stop). Pi has no sub-agents, so subagent-start is
  not-applicable there. This replaces the hand-written
  `harnesses/pi/extensions/commit-tools.js`; its behavior is the regression
  target (`tests/pi-commit-tools.test.mjs`).

Every adapter that emits hooks has one test per part of the contract, using
that harness's own tool names and input shapes:

- **Blocking**: a real `git commit` call, and an MCP-shaped commit call, go
  through the generated `commit-tools` hook and are blocked. This proves the
  tool-name and MCP mapping.
- **Context injection**: the generated session-start hook for `codebase` runs,
  and its reminder text appears in what the harness sends to the model.
- **Failure handling**: a missing script and a script that hangs past its
  timeout do not block. `tests/pi-commit-tools.test.mjs` is the precedent.

### Output per harness

| Resource | Claude Code | Antigravity | OpenCode (V2) | Pi |
|---|---|---|---|---|
| Manifest | `.claude-plugin/plugin.json` (existing) | `.antigravity-plugin/plugin.json` (name, version, description) | `package.json` plus generated `index.js` that exports `{id, setup}` and calls the shared runtime | root `package.json` `pi` block, regenerated |
| Skills | copy | copy | registered through `ctx.skill.transform` | root `skills/` as today |
| Commands | copy | generated as skills | registered through `ctx.command.transform`; each executes by sending the command's prompt | generated prompt templates (replaces the hand-written `/commit` command) |
| Agents | copy | copy to `agents/` | registered by the runtime through `ctx.agent.transform` `editor.update`, which creates a missing agent (opencode 2.1.1; the editor has no `add`) | none: Pi ships without sub-agents, reported as degraded |
| Hooks | copy | root `hooks.json` | `hooks.manifest.json` run by the shared runtime | `hooks.manifest.json` run by the shared Pi extension |

The shared OpenCode runtime is copied into every generated OpenCode package,
so a package installed by path or from npm runs without the rest of this repo.

Claude output stays at `plugins/<name>/`. Antigravity and OpenCode get their
own generated trees, `harnesses/<id>/plugins/<name>/`, so one harness's quirks
(for example command-skills that Claude does not need) cannot leak into
another's. Pi is different: `pi install` takes one package per repo, so the Pi
adapter writes one aggregate under `harnesses/pi/` (prompts, the shared
extension, one combined hooks manifest) and regenerates the root `package.json`
`pi` block from the plugins that have `pi` enabled.

### Adding a harness later

1. Write `scripts/lib/adapters/<id>.mjs` implementing the interface above.
2. Add a golden-output test using a small fixture registry.
3. Add `harnesses.<id>.enabled: true` to the plugins that should ship there.
4. If the harness has no native hooks, add a runtime under `harnesses/<id>/`.

No change to canonical resources, the registry schema, or other adapters.

## Constraints and evidence

Target versions are the ones installed for implementation: OpenCode 2.1.1,
`agy` 1.4.1, Pi 1.4.0. Where they disagree with the evidence below, they
win.

These come from spikes run on 2026-10-23/24 (OpenCode 2.0.32, `agy` 1.4.4,
Pi 1.3.0) and are re-checked against the target versions before the
adapters rely on them:

- OpenCode V2 plugin shape: default export `{ id, setup(ctx) }`. The V1 `config`
  hook form failed to load. Docs found for V1 are out of date for V2.
- V2 `ctx.skill.transform` and `ctx.command.transform` accept `editor.add`
  (verified: skill and command appeared in the server API). The agent editor
  has `list/get/default/update/remove` only; `add` threw.
- Pi 1.3.0: skills, prompt templates (`--prompt-template`) and extensions
  load as separate resources. Extension events documented: `tool_call` (can
  mutate input or block), `tool_result`, `before_agent_start` (can return a
  message), `session_start`, `agent_settled`. Built-in tools are `read`,
  `bash`, `edit`, `write`. Not verified: the `package.json` `pi` key's
  support for `prompts`, and prompt-template argument syntax.
- File-based agents in `.opencode/agents/*.md` loaded in V2. File-based
  commands and skills under V2 were not tested.
- Whether a V2 tool hook can block a call is not yet verified; the documented
  alternative is a permission hook that sets `effect = "deny"`.
- `agy plugin validate` counts skills and agents from our current layout,
  ignores `commands/`, and ignores `hooks/hooks.json` (details above).
  `agy` says it converts Claude Code plugins on install; not yet tested.
- Not verified: whether `agy` expands `${CLAUDE_PLUGIN_ROOT}`, and whether its
  `Stop` and `SessionStart` events behave like Claude's.
- Sandbox note for tests: OpenCode needs `HOME` and `XDG_*` pointed at a
  scratch directory to run here.

## Decided by me (not yet confirmed with you)

- Keep Claude-format `hooks.json` as the canonical hook definition, not a new
  neutral format.
- Hooks: all hooks of all plugins ship on all enabled harnesses and are
  required by default (the build fails if a harness cannot carry one).
  `optional` per harness needs a reason in the registry. This follows your
  instruction that hooks must be supported for all plugins.
- Antigravity and OpenCode get separate generated trees; Pi gets one aggregate
  because its install takes one package.
- OpenCode V2 only. Agents on Pi are degraded, not converted.
- **Spikes come first in the plan**, before the adapters they affect:
  (a) can an OpenCode V2 tool or permission hook block a call; (b) does
  `agy plugin install` on a Claude wrapper already convert commands and hooks,
  does it expand `${CLAUDE_PLUGIN_ROOT}` and run hooks from the plugin
  directory, and how does it point at `harnesses/antigravity/plugins/<name>/`
  (or does it need a generated marketplace file); (c) do file-based skills and
  commands load in OpenCode V2; (d) does Pi's `pi` package key load generated
  prompt templates, and with what argument syntax. Results can shrink the
  adapters.
- **OpenCode runtime content.** The shared runtime reads skills and commands
  from the generated plugin tree at load time (paths resolved from the module
  location), not from an embedded manifest. If spike (c) shows V2 loads
  file-based skills and commands natively, keep the runtime for hooks only.
- **Output layout is provisional.** Installability wins over layout if spike
  (b) shows `agy plugin install` cannot target the proposed paths.
- **"Byte-for-byte" for Claude** means the generated `plugins/` tree and
  `.claude-plugin/marketplace.json` do not change. The registry's `optional`
  marker lives only in `registry.json` and is never written to any output. The
  first plan task is a snapshot test over `plugins/`, taken before the
  refactor. Pi's equivalent safety net is the existing `tests/pi-*.test.mjs`.

## Open items for the builder

- **OpenCode agent delivery.** Generated agent files must reach
  `.opencode/agents/`. Preferred: the shared runtime copies them on first
  load, idempotently, with generated-file markers and plugin-prefixed names,
  after checking that OpenCode picks up files added at runtime. Fallback: a
  documented copy command.
- **Pi agents.** Check whether Pi has a sub-agent extension mechanism worth
  targeting; until then they are reported as degraded.
- Fixture design, report format and the README capability table.
