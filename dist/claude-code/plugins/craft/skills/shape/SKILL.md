---
name: shape
description: "Shape an idea or spec into an epic and thin stories. [feature-or-spec] [--with egm|superpowers|grill-me] [--dry-run]"
when_to_use: "Use when turning a feature request, rough idea, promoted wisp, or design document into a specification, epic, and thin vertical-slice stories in beads. Not for mid-flow quick thoughts (use craft:park), bug root-cause diagnosis (use craft:debug), or implementing ready stories (use craft:build)."
argument-hint: "[feature-or-spec] [--with egm|superpowers|grill-me] [--dry-run|-d]"
metadata:
  short-description: "Shape an idea or spec into an epic and thin stories. [feature-or-spec] [--with egm|superpowers|grill-me] [--dry-run]"
---

# Shape Workshop Skill

Turn an idea, promoted wisp, or design doc into an approved markdown spec and thin vertical-slice stories in `.beads/`.

## Workflow

1. **Acquire Specification (Fast-Path or Ideation)**:
   - **Fast-Path**: If `<feature-or-spec>` is a file path on disk or a spec was already approved in this session, skip to Step 2.
   - **Ideation Selector**: Otherwise (unless `--with` is set), ask the user to pick from available ideation skills:
     - `egm`: Run `/egm-brainstorm` → `/egm-draft` (and optional `/egm-review`) → `docs/designs/<slug>.md`.
     - `superpowers`: Run `superpowers:brainstorming` → `docs/superpowers/specs/YYYY-MM-DD-<slug>-design.md`. **Caller Override**: Return to Step 2 once the spec file is approved; do not invoke `superpowers:writing-plans`.
     - `grill-me`: Run `/grill-me` → `docs/specs/YYYY-MM-DD-<slug>-design.md`.
     - **Fallback** (if none installed): Ask 3 Socratic questions (goal, scope, edge cases) one at a time and write `docs/specs/YYYY-MM-DD-<slug>-design.md`.
2. **Ponytail Spec Critique**:
   - Skip if just audited by `/egm-review`. Otherwise apply `ponytail:ponytail` / `ponytail:ponytail-review` (fallback: reuse existing helpers, cut single-caller abstractions, merge micro-concerns) and update the spec on disk.
3. **Slice into Thin Vertical Stories & Preview**:
   - Slice into 1 Epic (`-t epic`) and cohesive vertical Stories (`-t story`) using the Positive Slot Template:
     - `--description`: `1-2` sentence user/system outcome.
     - `--spec-id`: `"<spec-path>#<section-anchor>"`.
     - `--design`: `"Touch: <comma-separated file paths or seams>"`.
     - `--acceptance`: `"Verify: <1-3 runnable test commands>"`.
     - Swimlane: `-l status:ready` (unblocked) or `-l status:backlog` (blocked).
   - Preview the Epic, Stories, and DAG for user approval (exit here if `--dry-run`).
4. **Batched Beads Creation**:
   - Dispatch `craft:issue-writer` to create the Epic, Stories, swimlanes, and dependencies via `--dolt-auto-commit=batch`, `bd dolt commit`, and `bd swarm validate <epic-id>`.
