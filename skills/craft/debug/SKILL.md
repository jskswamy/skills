---
name: debug
description: "Use when encountering a bug, test failure, regression, or unexpected behavior that needs root-cause investigation before deciding whether to fix inline, queue as a bug bead, or shape into an epic. Not for parking feature ideas (use craft:park) or building planned stories (use craft:build)."
argument-hint: "[symptom-or-id] [--task|-t <id>]"
metadata:
  short-description: "Investigate a bug symptom or issue in a diagnostic wisp. [symptom-or-id] [--task <id>]"
---

# Debug Workshop Skill

Isolate bug root causes in an ephemeral diagnostic wisp before deciding whether to fix inline, queue as a ready bug, or shape into multi-story work.

## Workflow

1. **Spawn or Attach Diagnostic Wisp**:
   - If an existing issue ID is passed, load it via `bd show <id> --json`.
   - Otherwise, check `bd list --status=in_progress --json` for an active task (`--task <id>` overrides) and create a diagnostic wisp:
     ```bash
     bd create "Investigate: <symptom>" -t bug --ephemeral -l debug-wisp [--deps discovered-from:<active-id>] --json
     ```
2. **Root-Cause Investigation**:
   - Use `superpowers:systematic-debugging` (fallback if unavailable: reproduce the failure with a test or command, trace data flow backward from symptom to source, and test one hypothesis at a time).
   - Record each hypothesis and test outcome via `bd note <wisp-id> "Hypothesis: ... Result: ..."`.
3. **Ponytail Caller & Blast-Radius Trace**:
   - Apply `ponytail:ponytail` (fallback if unavailable: grep every caller of the broken function/module, check whether the defect is a shared contract flaw, and fix the root cause once in shared code rather than patching callers).
   - Record the isolated root cause:
     ```bash
     bd note <wisp-id> "Root cause: <file:line> — <summary>. Callers checked: <list>"
     ```
4. **Resolution Exit (Ask User Once)**:
   - **Fix inline now**: Implement the minimal root-cause fix and regression test. Commit via `/commit-tools:commit` (fallback if unavailable: run `git commit` with the root-cause `why` context; never include `bd-xxx` issue IDs in git commit messages). Close the wisp via `bd close <wisp-id> --reason "Fixed: <root-cause>"` (or `bd mol squash <wisp-id> --summary "Fixed: <root-cause>"` if child wisps exist).
   - **Promote to ready bug**: Run `bd promote <wisp-id> --reason "Root cause isolated"` and `bd set-state <wisp-id> status=ready` for later `/craft:build <wisp-id>`.
   - **Promote & shape**: Run `bd promote <wisp-id> --reason "Multi-story fix"` and hand off to `/craft:shape <wisp-id>`.
   - **Discard (false alarm)**: Run `bd mol burn <wisp-id> --force`.
