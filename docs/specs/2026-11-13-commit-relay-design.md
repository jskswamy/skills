# Commit drafting in a sub-agent, through a relay

Part 5 of the token diet (`docs/specs/2026-11-13-token-diet-design.md`). **Status: parked candidate, not yet shaped.** Depends on part 2, which slims commit's SKILL.md first.

## Why

One commit on the reference change `a49bc4c` (6 files, a 10,117-char diff) puts about 46k chars into the main context:

- `SKILL.md`, `atomicity-analysis.md`, `session-context.md`, `message-dialogs.md`, `content-leak-check.md` and `styles/classic.md`: about 35.4k
- the diff
- tool output

All of it is re-sent on every later request.

## Design so far

The full text is the "Epic 2" section in the history of the token-diet spec v3 (uncommitted working copy, 2026-11-13). Its main points:

- **Propose, never apply.** The drafter, a read-only sub-agent on `sonnet`, drafts the message and proposes index changes. The parent applies the changes, runs the split loop, shows the confirmation and runs `commit.sh`.
- **Literal relay blocks** for dispatch, `needs_input`, `done`, `failed` and `answers`, plus the reserved ids `regenerate`, `edit` and `amend`.
- **Mutation check.** The parent compares `HEAD` and `write-tree` before and after each sub-agent reply.
- **Inline fallback** with an answer log, so the user is not asked twice.
- **Build-time switch.** Each adapter writes `relay: enabled|inline`. Claude Code starts `enabled`. Every other harness gets one enable story with a smoke check:
  - OpenCode: `subagent` + `sessionID`
  - omp: `task` + `agent://<id>`
  - Pi: `pi-subagents` `resume`
  - Antigravity: sub-agents can ask the user directly (`AskQuestion`)

## Open findings to resolve when shaping

From `docs/specs/reviews/2026-11-13-token-diet-egm-review.md`, round 3:

- **R3-B4:** the nesting rule contradicts itself. Make only `relay-depth` trigger draft-only, so `craft:build` sub-agent commits keep working.
- **R3-M1:** the mutation check must also cover working-tree edits, stash, config and `.git/hooks`, and take a new baseline after the parent's own writes.
- **R3-M2:** the ≤ 15k commit target sits at or below the parent's fixed reading. Re-derive it after part 2 slims SKILL.md, and add `last-commit-comparison.md` and `content-leak-check.md` sizes to the baseline.
- **R3-M6:** define where the `relay:` line lives and what the inline path is. Don't ship the drafter on harnesses that never dispatch it.
- **R3-M8:** fix the leftovers:
  - two amend paths;
  - malformed-reply routing;
  - the `files:` and `co_author:` formats.
