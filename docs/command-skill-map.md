# Command to Skill Map

Claude Code commands are thin wrappers around canonical skills. In Pi, invoke the same workflow with `/skill:<name>`.

| Claude Code command | Canonical skill | Pi invocation |
| --- | --- | --- |
| `/bivouac` | `bivouac` | `/skill:bivouac` |
| `/commit` | `commit-action` | `/skill:commit-action` |
| `/backlog` | `craft-backlog` | `/skill:craft-backlog` |
| `/decompose` | `craft-decompose` | `/skill:craft-decompose` |
| `/deps` | `craft-deps` | `/skill:craft-deps` |
| `/epic` | `craft-epic` | `/skill:craft-epic` |
| `/execute` | `execute-tasks` | `/skill:execute-tasks` |
| `/park` | `park-idea` | `/skill:park-idea` |
| `/parked` | `review-parked` | `/skill:review-parked` |
| `/task` | `craft-task` | `/skill:craft-task` |
| `/capture` | `jot-capture` | `/skill:jot-capture` |
| `/configure` | `jot-configure` | `/skill:jot-configure` |
| `/setup` in jot | `jot-setup` | `/skill:jot-setup` |
| `/scan` | `refactor-scan` | `/skill:refactor-scan` |
| `/review-commits --unattended --base <ref>` | `review-commits` | `/skill:review-commits --unattended --base <ref>` |
| `/validate-commits --unattended --base <ref>` | `validate-commits` | `/skill:validate-commits --unattended --base <ref>` |
| `/sketch` | `sketch-note` | `/skill:sketch-note` |
| `/coach` | `study-coach` | `/skill:study-coach` |
| `/recall` | `study-recall` | `/skill:study-recall` |
| `/setup` in study | `study-setup` | `/skill:study-setup` |
| `/publish` | `typst-publish` | `/skill:typst-publish` |
| `/codebase:ask` | `codebase-ask` | `/skill:codebase-ask` |
| `/codebase:index` | `codebase-index` | `/skill:codebase-index` |
| `/codebase:impact` | `codebase-impact` | `/skill:codebase-impact` |
| `/codebase:graph` | `codebase-graph` | `/skill:codebase-graph` |

Forward arguments exactly as you would pass them to the Claude Code command.
