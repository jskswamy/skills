# Command to Skill Map

Commands are thin wrappers around canonical skills. Each harness exposes them
differently:

- **Claude Code**: plugin slash commands, `/<command>` or `/<plugin>:<command>`.
- **Pi**: prompt templates named after the command. Pi names a prompt by file
  name alone, so a name two plugins share gets the plugin as a prefix.
- **Antigravity and Codex**: neither loads commands directly, so each becomes a
  skill named `<plugin>-cmd-<command>`.
- **OpenCode**: commands with the same names, prefixed with the plugin when
  another plugin or OpenCode itself uses the name.

The skill in the last column is invocable by name on every harness, for
example `/skill:<name>` on Pi.

| Claude Code | Pi | Antigravity / Codex skill | OpenCode | Canonical skill |
| --- | --- | --- | --- | --- |
| `/bivouac` | `/bivouac` | `bivouac-cmd-bivouac` | `/bivouac` | `bivouac` |
| `/commit` | `/commit` | `commit-tools-cmd-commit` | `/commit` | `commit-action` |
| `/backlog` | `/backlog` | `craft-cmd-backlog` | `/backlog` | `craft-backlog` |
| `/decompose` | `/decompose` | `craft-cmd-decompose` | `/decompose` | `craft-decompose` |
| `/deps` | `/deps` | `craft-cmd-deps` | `/deps` | `craft-deps` |
| `/epic` | `/epic` | `craft-cmd-epic` | `/epic` | `craft-epic` |
| `/execute` | `/execute` | `craft-cmd-execute` | `/execute` | `execute-tasks` |
| `/park` | `/park` | `craft-cmd-park` | `/park` | `park-idea` |
| `/parked` | `/parked` | `craft-cmd-parked` | `/parked` | `review-parked` |
| `/task` | `/task` | `craft-cmd-task` | `/task` | `craft-task` |
| `/capture` | `/capture` | `jot-cmd-capture` | `/capture` | `jot-capture` |
| `/configure` | `/configure` | `jot-cmd-configure` | `/configure` | `jot-configure` |
| `/jot:setup` | `/jot-setup` | `jot-cmd-setup` | `/jot-setup` | `jot-setup` |
| `/scan` | `/scan` | `refactor-cmd-scan` | `/scan` | `refactor-scan` |
| `/sketch` | `/sketch` | `sketch-note-cmd-sketch` | `/sketch` | `sketch-note` |
| `/coach` | `/coach` | `study-cmd-coach` | `/coach` | `study-coach` |
| `/recall` | `/recall` | `study-cmd-recall` | `/recall` | `study-recall` |
| `/study:setup` | `/study-setup` | `study-cmd-setup` | `/study-setup` | `study-setup` |
| `/publish` | `/publish` | `typst-notes-cmd-publish` | `/publish` | `typst-publish` |
| `/codebase:ask` | `/ask` | `codebase-cmd-ask` | `/ask` | `codebase-ask` |
| `/codebase:index` | `/index` | `codebase-cmd-index` | `/index` | `codebase-index` |
| `/codebase:impact` | `/impact` | `codebase-cmd-impact` | `/impact` | `codebase-impact` |
| `/codebase:graph` | `/graph` | `codebase-cmd-graph` | `/graph` | `codebase-graph` |

`review-commits` and `validate-commits` have no command; invoke the skill,
for example `/skill:review-commits --unattended --base <ref>` on Pi.

Forward arguments exactly as you would pass them to the Claude Code command.
