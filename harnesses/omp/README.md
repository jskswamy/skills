# omp adapter

Build adapter for [omp](https://omp.sh) ("oh-my-pi", a fork of Pi). It writes
one plugin per folder, `dist/omp/plugins/<plugin>/`, and the root catalog
`.omp-plugin/marketplace.json` that omp and Skillshare's omp target install
from. The evidence behind every choice here is the omp section of
[`docs/harness-research.md`](../../docs/harness-research.md#omp)
(omp 18.16.0).

## Install

```bash
skillshare plugin add <checkout> --plugin <plugin-name> --target omp -g
# or natively
omp plugin marketplace add <checkout>
omp plugin install <plugin-name>@skills
```

## Layout

```text
.omp-plugin/marketplace.json     every plugin → ./dist/omp/plugins/<p> (omp prefers it over .claude-plugin/)
dist/omp/plugins/<p>/
  .omp-plugin/plugin.json        name, version, description, author, keywords
  package.json                   "omp": {"extensions": ["./runtime/omp/runtime.mjs"]} only when hooks are carried
  skills/<skill>/SKILL.md        frontmatter name <p>-<skill>; bare plugin:name references → plugin-name
  commands/<skill>.md            one per runnable skill; omp registers it as /<p>:<skill>
  agents/<agent>.md              name <p>-<agent> and description only
  .mcp.json                      as is; omp substitutes ${CLAUDE_PLUGIN_ROOT}
  hooks/scripts/…                canonical scripts (copied, bare references rewritten)
  runtime/omp/                   runtime.mjs, tools.mjs, hooks.manifest.json
  runtime/lib/                   hook-runner.mjs, hook-input.mjs (shared, copied)
```

There is no `.claude-plugin/` and no `hooks/hooks.json`: omp would read the
first as a second copy and never runs the second. Slash references such as
`/craft:park` stay as written, because the command wrappers give omp that
exact name.

## Hooks

omp runs plugin hooks only as JS extensions. `runtime/omp/runtime.mjs` (a fork
of `harnesses/pi/runtime.mjs`) runs the canonical Claude-format scripts on
omp's events through the shared runner:

| Claude event | omp event |
|---|---|
| SessionStart (`startup`, `clear`, `resume`, `compact`) | `session_start`, `session_switch` (`new`, `resume`, `fork`), `session_compact`, in the main agent |
| SubagentStart | the same session events when `ctx.agent.kind === "sub"` |
| PreToolUse / PostToolUse | `tool_call` / `tool_result` |
| Stop | `session_stop` (main agent) |

Tool names (`tools.mjs`): `bash`, `read`/`write`/`edit` (`path` →
`file_path`), `grep`, `glob` (`path` → `pattern`), and MCP tools
`mcp__<plugin>_<server>_<tool>`, passed through unchanged. An `edit` that
names several files in `paths[]` runs a file hook once per path. A hook whose
matcher names a tool omp lacks fails the build unless `registry.json` lists
it under `harnesses.omp.optional`.

Hook output: exit 2 blocks a tool call; `additionalContext` (and plain stdout
at session start) reaches the model; `systemMessage` is shown with
`ctx.ui.notify`, or on stderr when omp has no UI (`omp -p`).

### Known differences from Claude Code

- A Stop hook cannot keep the agent going; its exit 2 is only logged.
- Agents keep only `name` and `description`, so tool limits are not carried.
- omp's `eval` tool can run code that commits without a `bash` call; the
  commit guard, as in Claude Code, sees only `bash` and git MCP tools.

## Migration and rollback

An install made with `--target omp` before this adapter holds the Claude tree,
which omp loads without hooks. Skillshare refuses native in-place updates for
omp, so move with remove, then add:

```bash
skillshare plugin remove <plugin-name> --target omp -g
skillshare plugin add <checkout> --plugin <plugin-name> --target omp -g
# natively: omp plugin uninstall <plugin-name>@skills, then install again
```

Rollback is a release with omp disabled for every plugin: the build deletes
`.omp-plugin/`, and omp falls back to the Claude catalog (without hooks).

## Verification

- `npm test` runs `tests/build/omp-adapter.test.mjs` and
  `tests/build/omp-runtime.test.mjs` (the real hooks against a fake omp
  extension API).
- `scripts/omp-smoke.sh` installs a fresh build into omp from
  `.omp-plugin/marketplace.json` in a scratch HOME (omp's own marketplace
  commands: Skillshare 0.30 refuses omp installs into a scratch HOME) and
  checks the commands, skills and one guard block live. Skillshare's routing
  is covered by `tests/build/skillshare-audit.test.mjs`. Last passed on omp
  18.18.6.
- Manual checklist, once before the first release and after each omp upgrade
  (tool or event renames break hooks silently):
  1. Start the omp TUI and note the extension trust prompt.
  2. `/new` and `/compact` re-inject the session reminders.
  3. Editing `flake.nix` shows the nix-tools notice.
  4. Ending a turn with a parked idea shows the craft notice.
  5. With an old Claude-catalog install next to the omp tree, record what omp
     lists, and update this README.
