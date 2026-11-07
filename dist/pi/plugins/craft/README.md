# craft

Spec-driven development workshop backed by `beads` (`bd`) wisps and thin vertical-slice stories. Capture side thoughts as ephemeral wisps without breaking flow, isolate bug root causes before deciding whether to fix inline or promote, shape specifications into thin stories with `--spec-id` pointers, and build stories just-in-time with subagents, Ponytail proportion checks, refactor scans, and commit hygiene.

## Workshop Commands

| Command | Purpose |
|---------|---------|
| `/craft-park` | Park a quick thought as an ephemeral wisp (`-l parked-idea`), or `list`, `promote [--shape]`, `drop`, and `review` parked wisps |
| `/craft-debug` | Diagnose a bug symptom or issue in a diagnostic wisp (`-l debug-wisp`) with root-cause and caller tracing |
| `/craft-shape` | Shape an idea, promoted wisp, or design doc into a spec, epic, and thin vertical-slice stories in `.beads/` |
| `/craft-build` | Pick, plan just-in-time, execute, refactor-scan, and polish commits for a story or epic |

## Swimlanes

Stories move across four hyphenated swimlanes (`bd set-state <id> status=<lane>`):

- `status:backlog` — Parked wisps in `.beads-wisp/`, promoted unshaped ideas, or stories blocked by upstream dependencies
- `status:ready` — Shaped stories (`--spec-id` attached) with zero open blockers (`bd ready`)
- `status:in-progress` — Claimed by `/craft-build` (`Plan: <path> | Base: <sha>`)
- `closed` — Implemented, verified, refactor-scanned, and committed (`bd close`)

## Skills & Agents

- `craft-park` — Ephemeral wisp capture and triage (`list`, `promote`, `drop`, `review`)
- `craft-debug` — Diagnostic wisp investigation, caller blast-radius trace, and resolution routing
- `craft-shape` — Spec acquisition (`egm`, `superpowers`, `grill-me`, or Socratic fallback), Ponytail critique, and thin story slicing
- `craft-build` — Swimlane picker, adaptive scope check, JIT TDD planning, subagent execution, post-story `refactor-scan` + Ponytail filter, and `commit-tools-review-commits` polish
- `craft-issue-writer` — Batched `bd` graph creation agent (`--dolt-auto-commit=batch` + `bd swarm validate`)

## Hook

A `Stop` hook (`hooks/craft/scripts/check-parked-ideas.sh`) checks `.beads-wisp/` for open `parked-idea` wisps at session end and reminds you to run `/craft-park review` or `/craft-park promote <id> --shape`.

## Install

```text
/plugin install craft@skills
```
