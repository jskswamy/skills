# craft

Spec-driven development workshop backed by `beads` (`bd`) wisps and thin vertical-slice stories. Capture side thoughts as ephemeral wisps without breaking flow, isolate bug root causes before deciding whether to fix inline or promote, shape specifications into thin stories with `--spec-id` pointers, and build stories just-in-time with subagents, Ponytail proportion checks, refactor scans, and commit hygiene.

## Workshop Commands

| Command | Purpose |
|---------|---------|
| `/craft:park` | Park a quick thought as an ephemeral wisp (`-l parked-idea`), or `list`, `promote [--shape]`, `drop`, and `review` parked wisps |
| `/craft:debug` | Diagnose a bug symptom or issue in a diagnostic wisp (`-l debug-wisp`) with root-cause and caller tracing |
| `/craft:shape` | Shape an idea, promoted wisp, or design doc into a spec, epic, and thin vertical-slice stories in `.beads/` |
| `/craft:build` | Pick, plan just-in-time, execute, refactor-scan, and polish commits for a story or epic |

## Swimlanes

Stories move across four hyphenated swimlanes (`bd set-state <id> status=<lane>`):

- `status:backlog` — Parked wisps in `.beads-wisp/`, promoted unshaped ideas, or stories blocked by upstream dependencies
- `status:ready` — Shaped stories (`--spec-id` attached) with zero open blockers (`bd ready`)
- `status:in-progress` — Claimed by `/craft:build` (`Plan: <path> | Base: <sha>`)
- `closed` — Implemented, verified, refactor-scanned, and committed (`bd close`)

## Skills & Agents

- `craft:park` — Ephemeral wisp capture and triage (`list`, `promote`, `drop`, `review`)
- `craft:debug` — Diagnostic wisp investigation, caller blast-radius trace, and resolution routing
- `craft:shape` — Architecture-grounded spec acquisition (`egm`, `superpowers`, `grill-me`, or Socratic fallback), selected-depth review and approval, then thin story slicing
- `craft:build` — Swimlane picker, complete-scope evidence/approval check (including resumes), JIT TDD planning, subagent execution, post-story `refactor:scan` + Ponytail filter, and `commit-tools:review-commits` polish
- `craft:issue-writer` — Batched `bd` graph creation agent (`--dolt-auto-commit=batch` + `bd swarm validate`)

## Grounding and review checkpoints

Shape checks existing capability/seam evidence before invoking `codebase:capabilities` or `codebase:seams`, then investigates only missing, changed or uncertain scope. Specs distinguish existing capabilities from proposed changes and record ownership, contracts, dependencies, testing boundaries and uncertainties. Ideation stops at the spec: EGM draft Step 5 detailed task/TDD planning, like other ideation flows' planning, is deferred to Build.

Review depth is independent of ideation and persists per spec:

- **Full (default):** EGM plus Ponytail.
- **Lightweight:** Ponytail only, requiring explicit user selection with a scope-based rationale. Grounding remains required. Silence, `--auto` and missing/failed reviewers cannot authorize a downgrade.

Context-aware reviewers receive the candidate and shared architecture evidence. EGM comprehension receives only the self-contained candidate, not supplementary evidence or prior reviews. Ponytail reviews the proposed design; it does not attest that implementation tests ran. Shape owns the **Evidence and review contract**, including provenance, reviewer completion, finding dispositions and final approval. Blockers/Majors require resolution or individual user risk acceptance; Nits receive a disposition. Acceptance does not substitute for an unrun reviewer or unresolved critical evidence.

Build selects the complete scope before planning and validates every included spec and the combination's interactions. Each spec retains its review mode; a Full spec is not downgraded by bundling. Wisps are ephemeral parked ideas; promotion makes them persistent issues, not approved specs. Unshaped work must be shaped/approved or excluded. Saved plans retain their entire bundle and story base SHA. Legacy or missing review records enter Shape's review-depth checkpoint before planning/execution; historical approval alone is insufficient. Later scope additions repeat affected checks, including under `--auto`.

Reuse sufficient current evidence for back-to-back work and unrelated changes; age alone does not invalidate it. Verify relevant changed-source graph claims through confirmed-current index coverage or direct inspection of affected contracts, callers and dependencies. Existing index-consent rules apply. Source inspection is the fallback for unavailable skills/indexes, with explicit gaps and no graph-backed claim; unresolved design-critical gaps stop approval/execution.

Material changes include ownership, contracts, dependency direction, security/data assumptions and testing boundaries—not just visible behavior. Moving policy and contract tests between modules needs selected-mode re-review and approval; refreshing references or repairing internal plan steps within approved boundaries does not. Expanded Lightweight scope requires EGM or narrowing back to reviewed scope; uncertain classification requires clarification.

Specs and plans keep evidence/review records; stories stay thin using the Positive Slot Template owned by `agents/craft/issue-writer.md`. Static instruction/packaging tests and routing walkthroughs do not prove end-to-end agent adherence or token savings. Park, Debug, commit confirmation and user-owned remote synchronization are unchanged.

## Hook

A `Stop` hook (`hooks/craft/scripts/check-parked-ideas.sh`) checks `.beads-wisp/` for open `parked-idea` wisps at session end and reminds you to run `/craft:park review` or `/craft:park promote <id> --shape`.

## Install

```text
/plugin install craft@skills
```
