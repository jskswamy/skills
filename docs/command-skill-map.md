# Invocation forms

Skills are the only authored file. Each harness runs a skill through its own
mechanism, and the build generates a separate tree for each harness
(`dist/<harness>/plugins/<plugin>/`).

- **Claude Code and Antigravity**: the skill is the slash entry, `/<plugin>:<skill>`.
- **Codex**: the skill is run as `$<plugin>:<skill>`.
- **Pi**: a prompt template named `<plugin>-<skill>` (`/<plugin>-<skill>`, with the
  argument hint); the skill itself is also `/skill:<plugin>-<skill>`.
- **OpenCode**: a command named `<plugin>-<skill>` (`/<plugin>-<skill>`); the
  skill is `@<plugin>-<skill>`.

Pi and OpenCode cannot namespace plugin skills, so every entry carries the
plugin name. Model-only skills (`user-invocable: false`) have no entry.

| Claude Code, Antigravity | Codex | Pi, OpenCode |
| --- | --- | --- |
| `/bivouac:session` | `$bivouac:session` | `/bivouac-session` |
| `/devenv:manage` | `$devenv:manage` | `/devenv-manage` |
| `/commit-tools:commit` | `$commit-tools:commit` | `/commit-tools-commit` |
| `/commit-tools:review-commits` | `$commit-tools:review-commits` | `/commit-tools-review-commits` |
| `/commit-tools:validate-commits` | `$commit-tools:validate-commits` | `/commit-tools-validate-commits` |
| `/jot:capture` | `$jot:capture` | `/jot-capture` |
| `/jot:configure` | `$jot:configure` | `/jot-configure` |
| `/jot:setup` | `$jot:setup` | `/jot-setup` |
| `/craft:park` | `$craft:park` | `/craft-park` |
| `/craft:debug` | `$craft:debug` | `/craft-debug` |
| `/craft:shape` | `$craft:shape` | `/craft-shape` |
| `/craft:build` | `$craft:build` | `/craft-build` |
| `/sketch-note:sketch` | `$sketch-note:sketch` | `/sketch-note-sketch` |
| `/typst-notes:publish` | `$typst-notes:publish` | `/typst-notes-publish` |
| `/codebase:ask` | `$codebase:ask` | `/codebase-ask` |
| `/codebase:index` | `$codebase:index` | `/codebase-index` |
| `/codebase:impact` | `$codebase:impact` | `/codebase-impact` |
| `/codebase:graph` | `$codebase:graph` | `/codebase-graph` |
| `/codebase:capabilities` | `$codebase:capabilities` | `/codebase-capabilities` |
| `/codebase:seams` | `$codebase:seams` | `/codebase-seams` |
| `/study:coach` | `$study:coach` | `/study-coach` |
| `/study:recall` | `$study:recall` | `/study-recall` |
| `/study:setup` | `$study:setup` | `/study-setup` |
| `/refactor:scan` | `$refactor:scan` | `/refactor-scan` |

`commit-tools:review-commits` and `commit-tools:validate-commits` take
`--unattended`; for example `/skill:commit-tools-review-commits --unattended --base <ref>`
and `/skill:commit-tools-validate-commits --unattended --base <ref>` on Pi.

Forward arguments exactly as you would pass them to the Claude Code skill.
