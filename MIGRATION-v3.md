# Migration to v3: skill names and entries

This release removes the `commands/` folder and renames 26 of the 36 plugin skills so
a skill name no longer repeats its plugin. Old names stop working in this release (no
aliases). Each renamed plugin takes its own major version.

## Renamed skills

| old skill name | new path | plugin |
|---|---|---|
| `bivouac` | `skills/bivouac/session` | `bivouac` |
| `devenv` | `skills/devenv/manage` | `devenv` |
| `commit-action` | `skills/commit-tools/commit` | `commit-tools` |
| `jot-capture` | `skills/jot/capture` | `jot` |
| `jot-configure` | `skills/jot/configure` | `jot` |
| `jot-setup` | `skills/jot/setup` | `jot` |
| `craft-decompose` | `skills/craft/decompose` | `craft` |
| `execute-tasks` | `skills/craft/execute` | `craft` |
| `park-idea` | `skills/craft/park` | `craft` |
| `review-parked` | `skills/craft/parked` | `craft` |
| `craft-understand` | `skills/craft/understand` | `craft` |
| `craft-backlog` | `skills/craft/backlog` | `craft` |
| `craft-deps` | `skills/craft/deps` | `craft` |
| `craft-epic` | `skills/craft/epic` | `craft` |
| `craft-task` | `skills/craft/task` | `craft` |
| `sketch-note` | `skills/sketch-note/sketch` | `sketch-note` |
| `typst-publish` | `skills/typst-notes/publish` | `typst-notes` |
| `codebase-explore` | `skills/codebase/explore` | `codebase` |
| `codebase-ask` | `skills/codebase/ask` | `codebase` |
| `codebase-index` | `skills/codebase/index` | `codebase` |
| `codebase-impact` | `skills/codebase/impact` | `codebase` |
| `codebase-graph` | `skills/codebase/graph` | `codebase` |
| `study-coach` | `skills/study/coach` | `study` |
| `study-recall` | `skills/study/recall` | `study` |
| `study-setup` | `skills/study/setup` | `study` |
| `refactor-scan` | `skills/refactor/scan` | `refactor` |

The other ten skills keep their name and move into `skills/<plugin>/<skill>/`.

## What a user types

Claude Code and Antigravity: `/plugin:skill`, for example `/craft:craft-backlog`
becomes `/craft:backlog`. Codex: `$plugin:skill`, for example `$craft:backlog`. Pi and
OpenCode have no namespace, so every entry is `plugin-skill`, for example
`/craft-backlog`; a bare `/backlog` or `/commit` no longer exists.

| skill | Claude Code, Antigravity | Codex | Pi and OpenCode (entry) | old Pi and OpenCode entry |
|---|---|---|---|---|
| `bivouac:session` | `/bivouac:session` | `$bivouac:session` | `/bivouac-session` | `/bivouac` |
| `devenv:manage` | `/devenv:manage` | `$devenv:manage` | `/devenv-manage` | none |
| `commit-tools:commit` | `/commit-tools:commit` | `$commit-tools:commit` | `/commit-tools-commit` | `/commit` |
| `commit-tools:review-commits` | `/commit-tools:review-commits` | `$commit-tools:review-commits` | `/commit-tools-review-commits` | none |
| `commit-tools:validate-commits` | `/commit-tools:validate-commits` | `$commit-tools:validate-commits` | `/commit-tools-validate-commits` | none |
| `jot:capture` | `/jot:capture` | `$jot:capture` | `/jot-capture` | `/capture` |
| `jot:configure` | `/jot:configure` | `$jot:configure` | `/jot-configure` | `/configure` |
| `jot:setup` | `/jot:setup` | `$jot:setup` | `/jot-setup` | `/jot-setup` |
| `craft:park` | `/craft:park` | `$craft:park` | `/craft-park` | `/park` |
| `craft:debug` | `/craft:debug` | `$craft:debug` | `/craft-debug` | none (new in craft 3.0.0) |
| `craft:shape` | `/craft:shape` | `$craft:shape` | `/craft-shape` | `/decompose`, `/understand`, `/epic` |
| `craft:build` | `/craft:build` | `$craft:build` | `/craft-build` | `/execute`, `/backlog`, `/deps`, `/task` |
| `sketch-note:sketch` | `/sketch-note:sketch` | `$sketch-note:sketch` | `/sketch-note-sketch` | `/sketch` |
| `typst-notes:publish` | `/typst-notes:publish` | `$typst-notes:publish` | `/typst-notes-publish` | `/publish` |
| `codebase:ask` | `/codebase:ask` | `$codebase:ask` | `/codebase-ask` | `/ask` |
| `codebase:index` | `/codebase:index` | `$codebase:index` | `/codebase-index` | `/index` |
| `codebase:impact` | `/codebase:impact` | `$codebase:impact` | `/codebase-impact` | `/impact` |
| `codebase:graph` | `/codebase:graph` | `$codebase:graph` | `/codebase-graph` | `/graph` |
| `study:coach` | `/study:coach` | `$study:coach` | `/study-coach` | `/coach` |
| `study:recall` | `/study:recall` | `$study:recall` | `/study-recall` | `/recall` |
| `study:setup` | `/study:setup` | `$study:setup` | `/study-setup` | `/study-setup` |
| `refactor:scan` | `/refactor:scan` | `$refactor:scan` | `/refactor-scan` | `/scan` |

`commit-tools:review-commits`, `commit-tools:validate-commits` and `devenv:manage`
had no Pi or OpenCode entry before; they have one now. The generated
`<plugin>-cmd-<command>` skills on Codex and Antigravity (for example
`commit-tools-cmd-commit`) no longer exist; the skill itself is the entry.

## Install paths

Each harness reads its own generated tree.

| Harness | Install from |
|---|---|
| Claude Code | `dist/claude-code/plugins/<plugin>` (the marketplace file points there) |
| Codex | `dist/codex/plugins/<plugin>` (the marketplace file points there) |
| Antigravity | `agy plugin install <checkout>/dist/antigravity` (all plugins) or `<checkout>/dist/antigravity/plugins/<plugin>` |
| OpenCode | `dist/opencode/plugins/<plugin>` |
| Pi | `dist/pi/plugins/<plugin>` |

`dist/plugins/` no longer exists. Reinstall Codex, OpenCode and Pi from the new path.
