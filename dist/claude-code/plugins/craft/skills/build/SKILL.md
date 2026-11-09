---
name: build
description: "Build or resume a beads story or epic. [story-id|epic-id] [--auto] [--no-commit]"
when_to_use: "Use when picking what to work on next, or when starting, resuming, or implementing a beads story or epic. Not for shaping new specs into stories (use craft:shape) or diagnosing unknown bug root causes (use craft:debug)."
argument-hint: "[story-id|epic-id] [--auto|-a] [--no-commit]"
metadata:
  short-description: "Build or resume a beads story or epic. [story-id|epic-id] [--auto] [--no-commit]"
---

# Build Workshop Skill

Pick, plan just-in-time, execute, refactor-scan, and commit stories across `status:in-progress`, `status:ready`, and `status:backlog`.

## Workflow

1. **Interactive Picker (no ID passed)**: Query `bd list --status=in_progress --json`, `bd ready --json`, and `bd mol wisp list --json` (open `parked-idea` wisps). Set `bd set-state <id> status=ready` on any `bd ready` story still labeled `status:backlog`. Prompt user to pick an `in-progress` story, an Epic, or a `ready` story.
2. **Epic Ready-Front (Epic ID passed/picked)**: Run `bd ready --parent <epic-id> --json` and pick the next unblocked story.
3. **Claim & Recover Plan**: Run `bd update <id> --claim` and `bd set-state <id> status=in-progress`. Check `bd show <id> --json` notes for `Plan: <path> | Base: <sha>` (fallback glob: `docs/superpowers/plans/*-<id>-*.md`). Recover an existing plan and set `STORY_BASE_SHA` from its stored `Base: <sha>` (fallback: `git merge-base HEAD main`). Continue through Steps 4–5 for both fresh and resumed work before planning/execution.
4. **Select Complete Scope (new or saved bundle)**:
   - On resume, recover the saved plan's complete bundle, not just the primary story. Preserve the saved bundle and stored story base SHA; never silently add or drop bundled work. If saved scope is unclear, clarify it before proceeding.
   - For new work, read `--spec-id` and `Touch:` files. Scan `bd ready` stories and `parked-idea` wisps touching the same files/seams; ask (unless `--auto`) whether to bundle them. A wisp is an ephemeral parked idea; promotion makes it a persistent issue, not an approved spec. An unshaped wisp must get an approved spec via `craft:shape` or be excluded before execution. For included wisps/stories: promote as needed with `bd promote`, claim, and set `status=in-progress`.
   - Finish selecting scope before Step 5. `--auto` may suppress bundling/approach prompts but never required review-depth decisions, review completion or approval gates. After any later scope addition, repeat affected checks before planning/execution.
5. **Validate Scope, Evidence & Approval**:
   - Read and apply `craft:shape`'s **Evidence and review contract** (Evidence, Review records, Findings and Material changes) to every included story and spec, plus combined interactions. Shared files do not imply shared approval. Each spec retains its mode: Full keeps Full when bundled with Lightweight. Check a Lightweight formatter story plus a new public-option change as expanded scope, not automatically approved small work.
   - A missing mode, required authorization, applicable completed-review outcomes, finding dispositions or final approval means an unestablished gate. Historical approval alone is insufficient. Enter Shape Step 3: Full by default, explicit user-selected Lightweight allowed. Reuse historical results only with established candidate/evidence coverage; run missing/inapplicable reviews and obtain approval. With no linked spec, shape a minimal candidate or exclude the item. Preserve saved plans/base during recovery.
   - Compare and reuse sufficient current architecture evidence before invoking `codebase:capabilities` / `codebase:seams`; refresh affected/uncertain coverage only. Apply the Evidence and Material changes contract: relevant changed-source claims need confirmed-current index coverage or direct verification of contracts, callers and dependencies. Respect index consent; source-inspection fallback records gaps and blocks unresolved design-critical assumptions.
   - Material changes require affected selected-mode re-review, finding disposition and approval. Expanded Lightweight scope requires EGM or narrowing to reviewed scope; reference refresh/internal plan repairs within approved boundaries need no automatic spec review. Reflect accepted findings in target files, integration points and tests. Critique the approach via `ponytail:ponytail` (fallback: reuse helpers, inspect callers, cut single-caller abstractions) and get approach approval unless `--auto`; this never substitutes for the spec gate.
6. **Story TDD Plan**: After Step 5 passes, run `superpowers:writing-plans` with `ponytail:ponytail` active (fallback: write `docs/superpowers/plans/YYYY-MM-DD-<id>-<slug>.md` with Red-Green-Refactor tasks tagged `### Task N [bd-xxx]`). For a new plan only, set `STORY_BASE_SHA=$(git rev-parse HEAD)`. On resume, reuse or repair the plan without resetting `STORY_BASE_SHA`. Record the complete bundle and refreshed implementation evidence in the plan, distinct from the story review base; update spec evidence if its assumptions changed. Run `bd note <id> "Plan: <path> | Base: $STORY_BASE_SHA"` on primary and bundled stories.
7. **Execute**: After Steps 4–6, run `superpowers:subagent-driven-development` (fallback: `superpowers:executing-plans` or sequential task execution running `Verify:` tests). **Caller Overrides**: Commit completed tasks via `/commit-tools:commit` (fallback: `git commit` with story `why` context, zero `bd-xxx` IDs); suppress `superpowers:finishing-a-development-branch`.
8. **Post-Story Refactor Scan (`+ Ponytail`), Commit Polish & Close**: Unless `--no-commit`:
   - **Scan + Ponytail**: Run `/refactor:scan --scope diff --base "$STORY_BASE_SHA"` stopping after candidate check (suppress `refactor-validator` `bd create`; fallback: inspect `git diff "$STORY_BASE_SHA"..HEAD`). Filter candidates with `ponytail:ponytail` (drop YAGNI abstractions; keep real deduplication/simplifications).
   - **Fix or Park**: Ask user to **Fix now** (apply with `ponytail:ponytail`, test, and commit via `/commit-tools:commit`) or **Park** (`/craft:park` as wisps with `discovered-from:<id>`).
   - **Polish Commits**: Run `/commit-tools:review-commits --base "$STORY_BASE_SHA"` in-branch Steps 1–7 only (suppress Merge to Main, Tag, and branch/worktree deletion; fallback: `git rebase -i "$STORY_BASE_SHA"`).
   - Run `bd close <id> --reason "Completed"`, update newly unblocked `bd ready` stories to `status=ready`, and loop to Step 2 if building an Epic.
