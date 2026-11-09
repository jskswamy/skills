---
name: shape
description: "Use when turning a feature request, rough idea, promoted wisp, or design document into a specification, epic, and thin vertical-slice stories in beads. Not for mid-flow quick thoughts (use craft:park), bug root-cause diagnosis (use craft:debug), or implementing ready stories (use craft:build)."
argument-hint: "[feature-or-spec] [--with egm|superpowers|grill-me] [--dry-run|-d]"
metadata:
  short-description: "Shape an idea or spec into an epic and thin stories. [feature-or-spec] [--with egm|superpowers|grill-me] [--dry-run]"
---

# Shape Workshop Skill

Turn an idea, promoted wisp, or design doc into an approved markdown spec and thin vertical-slice stories in `.beads/`.

## Workflow

1. **Ground Architecture (including existing specs)**:
   - Establish the feature scope and check existing capability/seam evidence against relevant current source using the Evidence contract below. If unchanged and sufficient, reuse it without invoking analysis. Investigate only missing, changed or uncertain coverage: invoke `codebase:capabilities` for relevant behavior and `codebase:seams` for affected boundaries. Whole-repo discovery is only needed when the feature cannot be located.
   - Carry reuse opportunities, owning modules, shared dependencies, public contracts, dependency direction, testing boundaries and gaps into ideation and the spec. Distinguish observed structure from proposed changes; metrics alone do not justify redesign.
2. **Acquire Specification (Fast-Path or Ideation)**:
   - **Fast-Path**: Read an existing file or already-approved spec; it still passes grounding and the review gate before slicing. Propose material changes for approval rather than silently changing an approved design.
   - **Ideation Selector**: Otherwise (unless `--with` is set), ask the user to pick from available ideation skills:
     - `egm`: Run `/egm-brainstorm` → `/egm-draft` → `docs/designs/<slug>.md`. **Caller Override**: EGM draft Step 5 detailed task/TDD planning is deferred to `craft:build`; retain high-level architecture, contracts, risks and testing strategy.
     - `superpowers`: Run `superpowers:brainstorming` → `docs/superpowers/specs/YYYY-MM-DD-<slug>-design.md`.
     - `grill-me`: Run `/grill-me` → `docs/specs/YYYY-MM-DD-<slug>-design.md`.
     - **Fallback** (if none installed): Ask 3 Socratic questions (goal, scope, edge cases) one at a time and write `docs/specs/YYYY-MM-DD-<slug>-design.md`.
   - **All ideation paths** return with a candidate spec to Step 3, before detailed planning or execution. Do not copy or modify the delegated skills.
3. **Spec Review Depth & Approval**:
   - Choose per spec, independent of ideation: **Full (default)** runs `/egm-review` plus `/ponytail-review`; **Lightweight** requires explicit user selection and runs `/ponytail-review` only. Recommend Lightweight with a concrete scope-based reason when work fits existing capabilities and boundaries. Architecture grounding and Ponytail are mandatory in both modes.
   - Silence, `--auto`, missing tools or failed reviewers never authorize a downgrade. A missing/failed required reviewer blocks approval; only an explicit user-selected mode change can remove EGM. Mark intentionally omitted EGM as skipped, not completed. EGM never substitutes for Ponytail.
   - Give context-aware reviewers the candidate and the same capability/seam evidence. EGM comprehension receives only the self-contained candidate with its embedded architecture context: no source, supplementary reports or earlier review results. Adapt Ponytail to proposed-design checks; do not claim implementation tests ran.
   - Apply the Review records, Findings and Material changes contracts below. Reuse valid results and the recorded mode for unchanged scope instead of asking again. Resolve/disposition findings and re-review affected changes under the selected mode, then obtain final user approval before slicing.
4. **Slice into Thin Vertical Stories & Preview**:
   - Recheck evidence and approval at handoff. Derive thin stories from accepted architecture using `agents/craft/issue-writer.md`, **Positive Slot Template**: `Touch:` names concrete file paths or module seams; `Verify:` contains 1–3 runnable validation commands. Keep analysis/review reports in the spec, not copied into Beads stories.
   - Preview the Epic, Stories, and DAG for user approval (exit here if `--dry-run`).
5. **Batched Beads Creation**:
   - Dispatch `craft:issue-writer` to create the Epic, Stories, swimlanes, and dependencies via `--dolt-auto-commit=batch`, `bd dolt commit`, and `bd swarm validate <epic-id>`.

## Evidence and review contract

Shape owns this contract; Build applies it to every included spec and its execution scope before planning or execution.

### Evidence

Persist analyzed scope and paths, source references, code revision, relevant uncommitted changes and coverage gaps with the spec. Compare relevant source, contracts, dependencies and scope at handoff and every new/resumed build. Back-to-back work and unrelated changes reuse current sufficient evidence; elapsed time alone does not invalidate it. Refresh only affected or uncertain coverage.

Follow the codebase skills' transport, project-selection and index-consent rules. A query succeeding or a recent index timestamp does not prove changed-source coverage. For relevant source changes, confirm index coverage of current source or directly verify affected contracts, callers and dependencies. With stale/uncertain index coverage or declined/unavailable refresh, inspect current source and record gaps. If skills/index are unavailable, scoped source inspection is the fallback, not graph-backed analysis. Unresolved design-critical gaps block approval/execution; obtain clarification. Index creation/refresh still requires consent. Keep refreshed implementation evidence in the story plan; update spec evidence when its assumptions change. No separate cache service is needed.

### Review records

Persist mode, required user authorization, scope/rationale, reviewed candidate and evidence provenance, applicable completed-review outcomes, finding dispositions and final user approval with the spec. For example: `Review mode: Lightweight — user selected Ponytail only | Scope: existing formatter, no public contract changes | Review status: Pending`.

If any required field is missing, the gate is unestablished, including for legacy specs and saved-plan resumes. Historical approval or unchanged source is insufficient. Enter Step 3 before planning/execution; Full defaults unless the user explicitly selects Lightweight. Reuse historical results only with established reviewer identity, candidate/evidence and scope coverage; run missing/inapplicable reviews and obtain approval. If no spec exists, shape a minimal candidate or exclude the item. Preserve saved plans and their story review base SHA during recovery.

### Findings

Map Ponytail `Must fix` → Blocker, `Should fix` → Major, `Nice to have` → Nit. For each Blocker or Major, resolve it or record the user's explicit individual risk acceptance and consequences. Record Nits as fixed, deferred or accepted; Nits alone do not block approval. Re-review affected changes after fixes under the selected mode. Risk acceptance cannot replace a required reviewer having run or clarify missing design-critical evidence; accepted residual findings stay visible rather than being relabeled fixed.

### Material changes

Changes to approved outcomes/acceptance conditions, owning modules, public/cross-module contracts, dependency direction, security/data assumptions or testing/isolation boundaries are material in either mode. Moving policy ownership and its contract tests is material even if behavior is unchanged. Re-review affected design in the selected mode and obtain approval before execution.

Source-reference refresh confirming the same design, or internal helper/TDD-plan repairs within approved ownership/contracts, is non-material: update evidence/plan without automatically repeating spec review. Uncertain classification pauses for user clarification. If Lightweight work expands beyond its recorded scope, introduces a boundary/public-contract change or reveals unresolved safety concerns, pause and ask for EGM or a return to reviewed scope before execution.
