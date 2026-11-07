---
name: park
description: "Use when capturing a quick thought, side idea, refactor note, or non-blocking follow-up mid-flow without losing focus, or when listing, promoting, dropping, or reviewing parked wisps. Not for investigating bugs (use craft:debug) or shaping specs into epics and stories (use craft:shape)."
argument-hint: "[idea|list|promote|drop|review] [--task|-t <id>] [--priority|-p 0-4] [--shape] [--force|-f]"
metadata:
  short-description: "Park an idea as a wisp, or list, promote, and drop items. [idea|list|promote|drop|review] [--priority 0-4]"
---

# Park Workshop Skill

Capture side thoughts mid-flow as ephemeral wisps in `.beads-wisp/` without polluting `.beads/` Dolt history.

| Invocation | Action |
| :--- | :--- |
| `$craft:park <idea>` | Capture `<idea>` as a wisp (`-l parked-idea -l status:backlog`) and return to work immediately. |
| `$craft:park list` | List open `parked-idea` wisps from `bd mol wisp list --json` (`ID`, `Priority`, `Title`, `Origin`, `Age`). |
| `$craft:park promote <id...> [--shape]` | Promote wisp(s) via `bd promote <id>`. With `--shape`, hand to `$craft:shape <id>`. |
| `$craft:park drop <id...> [--force]` | Confirm once (unless `--force`), then run `bd mol burn <id> --force`. |
| `$craft:park review` | Triage open `parked-idea` wisps one by one (`Promote to backlog`, `Promote & shape`, `Drop`, `Skip`). |

## Execution Rules

1. **Capture (`<idea>`)**: Resolve origin (`--task <id>` or first item in `bd list --status=in_progress --json`). Run `bd create "<title>" -d "<1-sentence context>" -p <priority|2> --ephemeral -l parked-idea -l status:backlog [--deps discovered-from:<origin-id>] --json` (omit `--deps` if no active task). Print `Parked wisp <id>: "<title>"` and resume work.
2. **Promote (`promote <id...> [--shape]`)**: Run `bd promote <id> --reason "Promoted from parked wisp"`. If `--shape`, invoke `$craft:shape <id>`; otherwise run `bd update <id> --defer +30d` and `bd set-state <id> status=backlog`.
