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
3. **Claim & Fast-Resume**: Run `bd update <id> --claim` and `bd set-state <id> status=in-progress`. Check `bd show <id> --json` notes for `Plan: <path> | Base: <sha>` (fallback glob: `docs/superpowers/plans/*-<id>-*.md`). If the plan exists on disk, set `STORY_BASE_SHA` from `Base: <sha>` (fallback: `git merge-base HEAD main`) and jump to Step 6.
4. **Expand, Adaptive Scope & Ponytail Critique**: Read `--spec-id` and `Touch:` files. Scan `bd ready` stories and `parked-idea` wisps touching the same files/seams; ask (unless `--auto`) whether to bundle them (if yes: `bd promote`, `bd update <other-id> --claim`, `bd set-state <other-id> status=in-progress`). Critique approach via `ponytail:ponytail` (fallback: reuse helpers, grep callers, cut 1-caller abstractions) and get approval (unless `--auto`).
5. **Story TDD Plan**: Run `superpowers:writing-plans` with `ponytail:ponytail` active (fallback: write `docs/superpowers/plans/YYYY-MM-DD-<id>-<slug>.md` with Red-Green-Refactor tasks tagged `### Task N [bd-xxx]`). Set `STORY_BASE_SHA=$(git rev-parse HEAD)` and run `bd note <id> "Plan: <path> | Base: $STORY_BASE_SHA"` on primary and bundled stories.
6. **Execute**: Run `superpowers:subagent-driven-development` (fallback: `superpowers:executing-plans` or sequential task execution running `Verify:` tests). **Caller Overrides**: Commit completed tasks via `/commit-tools:commit` (fallback: `git commit` with story `why` context, zero `bd-xxx` IDs); suppress `superpowers:finishing-a-development-branch`.
7. **Post-Story Refactor Scan (`+ Ponytail`), Commit Polish & Close**: Unless `--no-commit`:
   - **Scan + Ponytail**: Run `/refactor:scan --scope diff --base "$STORY_BASE_SHA"` stopping after candidate check (suppress `refactor-validator` `bd create`; fallback: inspect `git diff "$STORY_BASE_SHA"..HEAD`). Filter candidates with `ponytail:ponytail` (drop YAGNI abstractions; keep real deduplication/simplifications).
   - **Fix or Park**: Ask user to **Fix now** (apply with `ponytail:ponytail`, test, and commit via `/commit-tools:commit`) or **Park** (`/craft:park` as wisps with `discovered-from:<id>`).
   - **Polish Commits**: Run `/commit-tools:review-commits --base "$STORY_BASE_SHA"` in-branch Steps 1–7 only (suppress Merge to Main, Tag, and branch/worktree deletion; fallback: `git rebase -i "$STORY_BASE_SHA"`).
   - Run `bd close <id> --reason "Completed"`, update newly unblocked `bd ready` stories to `status=ready`, and loop to Step 2 if building an Epic.
