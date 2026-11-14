# Goldfish Review Report: commit relay design, round 2

**Target:** `docs/specs/2026-11-13-commit-relay-design.md` (candidate v2, all sections)
**Earlier round:** `docs/specs/reviews/2026-11-14-commit-relay-egm-review.md` (v1)
**Mode:** REVIEW, round 2. The design is only proposed: nothing is implemented, and no test or build was run. Every finding comes from reading the spec and the code it cites.
**Settled decisions, not reopened:** a sub-agent is used only if one persists for the task; its lifetime is per task; this epic covers Claude Code only, and other harnesses are parked.

## Reviewer Status

| Reviewer | Status | Inputs |
| --- | --- | --- |
| `egm-structural` | completed | spec, v1 report, allowed sources |
| `egm-style` | completed | spec, v1 report, allowed sources |
| `egm-comprehension` | completed | spec only |
| `egm-codebase-details` | completed | spec, v1 report, allowed sources |
| `egm-design` | completed | spec, v1 report, allowed sources |
| `egm-implementation-readiness` | completed | spec, v1 report, allowed sources |
| `egm-zoom-out` | completed | spec, v1 report, allowed sources |
| `egm-inventive-catalyst` | completed | spec, v1 report, allowed sources |

The synthesizer re-checked these load-bearing claims against the code:
- `SKILL.md:15`: `COMMIT_SKILL_DIR` comes from the loaded SKILL.md.
- `SKILL.md:19`: a non-interactive run stops before committing.
- `policy.mjs:25`: an optional hook is reported as `skipped`, and only when the harness cannot carry it.
- `repository-state.md:12`: tries the MCP staged-diff tool first.
- `skills.mjs:205-210`: fails any reference that nothing links to.
- Every commit-tools eval sets `allowed_tools: [Read, Glob, Grep, Skill]`.

**Summary:** 3 Blockers, 14 Majors, 9 Minors. Of the 36 v1 findings, 15 are resolved, 18 are partly resolved (B5 and Ponytail 3 share one row below), and 3 are not resolved.

---

## Task 1: Are the v1 dispositions resolved?

**Resolved by the v2 text:** B3, M1, M3, M5, M6, M7, M15, M16, N1, N2, N3, N4, N8, Ponytail 1, Ponytail 4.

**Not resolved, or only partly resolved:**

| v1 | Disposition says | Actual state | Why | Tracked as |
|---|---|---|---|---|
| B1 | Fixed | Partly | A split proposal carries no message, but the `group:` resume has no snapshot dir, so the drafter can draft a group from the stale diff and still pass the check. A `related` proposal and "Proceed anyway" have no resume at all. | R2-B1, R2-M2 |
| B2 | Fixed | Partly | The mode conflict is gone. But the drafter can no longer find `draft.md`, because `skill-dir` was dropped. And `draft.md`, moved "word for word", still contains git commands and user dialogs. | R2-B2, R2-B3 |
| B4 | Fixed | Partly | The targets were re-derived, but the listed files plus a capped draft cannot fit in 22k or 10k. | R2-M8 |
| B5 / Ponytail 3 | Fixed | Partly | A check script replaces the eval, but the spec does not say how it drives two confirmed commits. `SKILL.md:19` stops a headless run at confirmation, and the v1 fix's `--resume` mechanism was dropped. | R2-M10 |
| M2 | Fixed | Partly | "Optional agent, like an optional hook" does not match how hooks work. Copying the hook rule ships the drafter, with every tool, on OpenCode, omp and Antigravity. | R2-M7 |
| M4 | Fixed | Partly, reopened | The echoed id does not show which diff the drafter read (R2-B1). A redraft can also reach `commit.sh` without being confirmed (R2-M3). | R2-B1, R2-M3 |
| M8 | Fixed | Partly | Leaked text is now stripped and reported, but "Auto-fix" is tied to the leak result. Auto-fix answers a style failure, and nobody is assigned to perform it on the relay. | R2-M4 |
| M9 | Fixed | Partly | The `-z` flag was dropped, renames and quoted paths are not handled, and `git reset` during a split is not covered. | R2-N2 |
| M10 | Fixed | Partly | Several required resumes have no form, and the dispatch lost `skill-dir`. | R2-M2, R2-B2 |
| M11 | Fixed | Partly | No action is defined for a `snapshot.sh` failure, for `failed: other`, or for a reply carrying a stale id. | R2-M6, R2-N3 |
| M12 | Fixed | Partly | §6 says style and flags come from each dispatch, but a later commit in the task is a resume, and the resume row has no `style`, `amend`, `co_author` or `no_atomic_check` field. | R2-M2 |
| M13 | Fixed | Partly | One-commit tasks are now acknowledged. No total for parent plus drafter is given, and the claim that "the gain grows" is never checked, even though every resume re-sends a transcript that grows by one `staged.diff` per commit. | R2-M8 |
| M14 | Fixed | Partly | A counting rule now exists, but the relay files have no per-file budgets, `atomicity-warning-flow.md` is missing from the list, no fixture is named, and tool inputs are not counted. | R2-M8 |
| M17 | Fixed | Partly | §8 leaves out `repository-state.md` (which pulls the MCP diff), `message-validation.md` (split between two owners), the 4e dialog (in `atomicity-analysis.md`), and "New commit instead". | R2-M5, R2-M2, R2-M4 |
| M18 | Fixed | Conditional | It holds only if the Story 4 script can actually run (R2-M10). | R2-M10 |
| N5 | Fixed | Partly | The Files list does not mark Create, Modify or Delete, and Story 3 has no touch list. Validation depends on both. | R2-M9 |
| Ponytail 2 | Fixed | Partly | `atomicity-warning-flow.md` is still missing from the first-commit list, even though the parent reads it on every proposal. | R2-M8 |
| N6 | Fixed | **Not resolved** | The header still says "candidate v2, under review" and the record still says "v2 review: Pending", which is the pair v1 flagged. | R2-N9 |
| N7 | Fixed | **Not resolved** | Risks still says "one extra setup". The worst case is a replacement drafter that also fails: about 35k of setup plus the full inline flow (about 50k). | R2-N9 |
| N9 | Fixed | **Not resolved** | §8 puts Review in `confirm-flow.md`, which has no Review option (it offers Commit / Edit / Regenerate / Cancel). The Review options are at `atomicity-warning-flow.md:27` and `atomicity-analysis.md:77`, and §8 does not change either. | R2-M5 |

---

## Task 2: New findings

### Blockers

#### R2-B1. A resume has no snapshot dir, so a stale draft passes the binding check
- **Lenses:** inventive-catalyst, structural, comprehension
- **Section:** §3, §4, §5 (resume row, proposal flow)
- **Problem:** Each snapshot goes into a fresh temp dir. Only the first dispatch carries `snapshot-dir`. A resume carries only the new `snapshot` id. The drafter has no Bash, so it cannot work out the dir from the id, and it echoes whatever id it was sent.
- **Failure case:**
  1. The user runs `git add other.go` before confirming.
  2. The parent takes snapshot S2 in a new dir and resumes with `snapshot: S2`.
  3. The drafter re-reads S1's `staged.diff` and echoes S2.
  4. The binding check passes, and the commit includes a file its message never mentions.

  A split `group:` resume fails the same way. This is the v1 M4 failure again.
- **Fix:** Make the dir depend on the id: `<base>/<id>/`. Then either send `snapshot-dir` on every resume that follows a new snapshot, or have `snapshot.sh` write `<dir>/id` and require the drafter to echo the id it read from that file. Story 4's `git add` check should assert that the redrafted message covers the newly staged file.

#### R2-B2. The drafter cannot find `draft.md` or the style files
- **Lenses:** design, implementation-readiness, inventive-catalyst, codebase-details, structural
- **Section:** §2, §5 (dispatch fields), Story 4
- **Problem:** `COMMIT_SKILL_DIR` is set from the loaded `SKILL.md` (`SKILL.md:15`), and §2 says the drafter never loads `SKILL.md`. v2 removed v1's `skill-dir` dispatch field. Agent bodies are copied verbatim (`skills.mjs:156`). Glob starts from the user's repository, not the plugin cache. The drafter also needs `styles/<style>.md`, `content-leak-check.md` (`message-validation.md:23`) and `message-example.md` (`message-generation.md:64`).
- **Failure case:** On the first dispatch in a user repository, the drafter has no path to `references/draft.md`. One of three things happens:
  - It returns `failed: other`, every relay commit falls back inline, and the setup cost is wasted.
  - It drafts without the style rules, and 7b.1 checks only the subject line.
  - It globs the plugin cache and reads an older installed version.
- **Fix:** Add `skill-dir: <absolute COMMIT_SKILL_DIR>` to the dispatch. The agent body reads `<skill-dir>/references/draft.md` first, and every path in `draft.md` resolves against `skill-dir`. Story 4 asserts this.

#### R2-B3. A "word for word" `draft.md` cannot serve a read-only drafter
- **Lenses:** all eight
- **Section:** §1, §2, §3, Story 3 ("word for word", "No behavior change")
- **Problem:** The text that moves into `draft.md` tells its reader to do four kinds of things the drafter cannot do:
  - Run git or MCP: `gather-context.md:3-12` (the MCP staged diff, `git diff --staged`, `git log`), `last-commit-comparison.md:6-22` (`git config user.email`, `for-each-ref`, `diff-tree`), `atomicity-analysis.md:51`.
  - Stage files: `atomicity-analysis.md:82` ("Run `git add <related-files>`").
  - Ask the user: the 4e dialog at `atomicity-analysis.md:63-90`, and the warning flow that `atomicity.md:13` points to.
  - Run the explicit-amend safety checks (`gather-context.md:14-17`), which §1 assigns to the parent.

  The drafter has only `Read, Grep, Glob` and must never talk to the user. A text that stays identical cannot also tell the inline reader to run git and ask the user.
- **Failure case:** The drafter reaches "Fallback: `git diff --staged`" and has no Bash, or it reaches 4e and writes the dialog as prose. Either reply has no `relay` block, so it counts as malformed. The parent retries once and then falls back inline. Every relay commit pays the drafter setup plus the full inline cost. If the steps are rewritten for the snapshot instead, Story 3's "No behavior change" is false, and the inline flow, which also reads `draft.md`, loses its inputs.
- **Fix:** Write `draft.md` as rules over named inputs ("staged diff", "unstaged files", "last commit") and named outcomes ("propose related", "propose split", "ask amend"). Each reader gets a short map:
  - Inline: inputs come from the current git commands, and outcomes go to the current dialogs.
  - Relay: inputs come from the snapshot files, and outcomes come back as `proposal` or `question`.

  Move the 4e dialog and the explicit-amend checks into parent-owned references. A simpler alternative: the inline flow also runs `snapshot.sh`, so there is a single input path. Either way, remove "word for word" and "No behavior change" from Story 3, verify the inline flow with the evals, and add `draft.md` to Story 4's touch list.

### Majors

#### R2-M1. "Task" cannot be told apart from "a request", so the drafter's lifetime is undefined
- **Lenses:** comprehension, style
- **Section:** §6, §9, Story 4
- **Problem:** §6 says "A new request or story retires the id". A `/commit` typed after a change request is itself a new request, and so is the user's reply to a confirm dialog.
- **Failure case:** Under the literal reading, every standalone `/commit` starts a new drafter and pays about 35k of setup. Story 4's check "resume to the same id across two commits" fails even when the design works, and the §9 "later commit" saving never happens.
- **Fix:** Define a request as "a user message asking for new work". Answers to commit dialogs, and a `/commit` that follows up the same change, are not new requests. Give one example of where a task ends. This defines the settled per-task decision; it does not reopen it.

#### R2-M2. The resume messages do not cover several required transitions
- **Lenses:** comprehension, style, structural, design, implementation-readiness, codebase-details, inventive-catalyst
- **Section:** §5 (resume row, proposal flow), §6, §8
- **Problem:** A resume can carry only `answer` (the only id is `amend.detected`), `regenerate`, `edit` or `group`. No form exists for:
  - (a) a redraft after the index changes (§4);
  - (b) a retry after `snapshot-unreadable`, or a retry asking for a `relay` block;
  - (c) accepting a `related` proposal, which has `stage` and no group;
  - (d) "Proceed anyway" or "Proceed without" (`atomicity-warning-flow.md:74`, `atomicity-analysis.md:89`);
  - (e) "New commit instead" in the amend dialog (`confirm-flow.md:9`);
  - (f) the next commit in the same task with a different `style`, `amend`, `co_author` or `no_atomic_check`. This leaves v1 M12 open.
- **Failure cases:**
  - After "Proceed anyway", the parent re-sends the same snapshot. The drafter runs Step 4 again and returns the same proposal, so the flow loops.
  - After `--amend`, "New commit instead" keeps producing a combined message.
  - A second `/commit --style conventional` in the task cannot carry the new style, so the drafter writes classic and `commit.sh --style conventional` rejects the message.
- **Fix:** Add `redraft` (also meaning "a resume with a new `snapshot` and nothing else drafts again"), `proceed: {skip_atomicity: true}`, and `amend: true|false`, valid at any point. Alternatively, give proposals the fixed ids `atomicity.split` and `atomicity.related` for use with `answer`. Let a resume carry the full dispatch fields for a new commit. Add a worked example for each in `relay.md`.

#### R2-M3. A redraft can be committed without the user confirming it
- **Lenses:** design, comprehension
- **Section:** §4
- **Problem:** §4 says the parent "resumes the drafter to redraft". It does not say the redraft goes back to Step 8, and it does not say what happens to a message the user wrote with `edit:`.
- **Failure case:** The user confirms M1, then a file is staged in a terminal. The parent redrafts M2 and continues into `lib/commit.sh`. The user never saw M2, which violates `SKILL.md:19`. Or the user's own edited message is silently replaced.
- **Fix:** Every redraft returns to Step 8. If the confirmed text was the user's edit, show it next to the redraft.

#### R2-M4. No action is defined when 7b.1 fails on a draft, and Auto-fix has no owner
- **Lenses:** style, structural, design, codebase-details, implementation-readiness, inventive-catalyst
- **Section:** §1 (7b.1 belongs to the parent), §5 (Edit), §8
- **Problem:** Inline, a failed subject check silently regenerates the subject (`message-validation.md:15-16`). On the relay, the parent runs the check without the style file and has no resume for "fix the subject". §5 attaches "the existing Auto-fix choice" to a non-empty `removed`. But in `confirm-flow.md:27-33`, Auto-fix answers a style failure, and leaked text is stripped silently. `message-validation.md`, which holds both 7b.1 and 7b.2, is not in §8.
- **Failure case:** Sonnet returns a 54-character subject. The parent can show a draft that `commit.sh:96-100` will reject, load `classic.md` (8.3k) to fix it and lose the saving, or loop on `regenerate:`. If a user's edit fails the check and the user picks Auto-fix, nobody is assigned to do the rewrite. In addition, the parent checks the raw edit before the leak strip, so a subject shortened by the strip is never re-checked.
- **Fix:**
  - Add a resume `fix-subject: <check output>` that returns `draft`, at most once, then show the violation with Re-edit / Auto-fix / Commit anyway. Auto-fix is the same resume.
  - Run 7b.1 on the `checked` text, not on the raw edit.
  - Keep the leak strip silent as it is today, or name the new dialog as a behavior change.
  - Add `message-validation.md` to §8 and Files, and say where 7b.1 lives for each reader.
  - State the classic subject rules in `draft.md`, so the first draft usually passes.

#### R2-M5. Parent-side references still pull the full diff into the parent, and the 4e dialog has no parent copy
- **Lenses:** inventive-catalyst, structural, codebase-details, implementation-readiness
- **Section:** §3 ("The diff never enters the parent's context"), §5 (proposal flow), §8, §9
- **Problem:**
  - `repository-state.md:12` tries `mcp__1mcp__git_1mcp_git_diff_staged`, which returns the whole diff, and the parent reads this file on every commit.
  - §5 tells the parent to show "its existing dialog (`atomicity-warning-flow.md`)" for a `related` proposal. That dialog is at `atomicity-analysis.md:63-89`, and that file moves into the drafter's `draft.md`.
  - The Review options, "Show the full diff again" (`atomicity-warning-flow.md:27`) and "See the unstaged diff" (`atomicity-analysis.md:77,85-87`), are not changed. §8 puts Review in `confirm-flow.md`, which has no Review option. This leaves v1 N9 open.
- **Failure case:** With the 1mcp git server configured, Step 1 loads about 10k of diff into the parent on every commit. A user who picks Review on a proposal also gets a full `git diff` in the parent. Either breaks the §9 targets. For a `related` proposal, the parent has no dialog text to show.
- **Fix:** Add `repository-state.md` to §8: on the relay, Step 1 uses `git diff --staged --quiet` or the `staged.stat` from the snapshot. Keep the 4e dialog in a parent reference. Define Review on the relay as the `--stat` or `--name-status` output from the snapshot. Add these files to §9 and Files.

#### R2-M6. `snapshot.sh`: no HEAD case, undefined id, a race, no failure action, no dir location
- **Lenses:** comprehension, structural, design, codebase-details, implementation-readiness, inventive-catalyst, style
- **Section:** §3, §4, §5 (Failures), Story 1
- **Problem:**
  - The id uses the short hash of `HEAD`, and `head.txt` and `last-commit.diff` (`git show HEAD`) both need a commit. The inline flow handles a repository with no commits (`last-commit-comparison.md:6`).
  - `git write-tree` fails when the index has unmerged entries.
  - "Short hash of HEAD plus write-tree" can be read as two joined hashes or as one hash over both.
  - The diff and `write-tree` are separate commands, so a `git add` between them binds the id to an index the diff does not show.
  - `<dir>` is described both as an argument and as "a fresh temp dir".
  - The recompute before commit is not named.
  - Dirs are never removed, and each one holds a full binary diff, secrets included.
  - Unverified: a sub-agent reading a temp dir outside the project may need a permission prompt, which a headless run would deny.
- **Failure case:** On the first commit in a new repository, `snapshot.sh` exits non-zero. §5 defines failures only for drafter replies, so the parent has no rule.
- **Fix:**
  - Take the tree first, then derive every file from it (`git diff --binary HEAD <tree>`).
  - Use the id format `<head-short|root>-<tree-short>`.
  - Write to `$(git rev-parse --git-dir)/commit-relay/<id>/`, which is inside the project and never tracked.
  - Add `snapshot.sh --id` for the recompute.
  - Any failure of `snapshot.sh` means run inline.
  - Remove the dir after the commit or on cancel.
  - Story 1 tests no HEAD, an unmerged index and cleanup.
  - Add "the drafter reads the snapshot without a permission prompt" to the Unverified list and to Story 4, including a linked worktree, where the git dir is outside the working tree.

#### R2-M7. "Optional agent, like an optional hook" ships the drafter with every tool
- **Lenses:** codebase-details, zoom-out, structural, implementation-readiness
- **Section:** §7, Story 2, Files
- **Problem:** `applyHookPolicy` uses `optional` only when the harness cannot carry the resource, and it then reports `skipped`, not `degraded` (`policy.mjs:19-25`). OpenCode, omp and Antigravity carry agents natively. Story 2 says "four agent-carrying adapters", but Files lists three. The OpenCode adapter copies canonical agents through `copyLayout` and also writes its mapped `opencode-agents/` copy, so both copies would need filtering. Pi, Codex and agent-plugins already report every agent as degraded, so their entries change nothing. `scripts/lib/registry.mjs` has no optional handling; the real touch points are `scripts/validate.mjs:22` and `scripts/lib/transforms/README.md:20-29`.
- **Failure case:** An implementer copies the hook rule. The drafter then ships on OpenCode, omp and Antigravity, whose adapters drop `tools` (`opencode/adapter.mjs:113-117`, `omp:92-95`, `antigravity:119`). The drafter gets every tool, which reopens v1 M2 and B3.
- **Fix:** Either:
  - Use a separate key, such as `harnesses.<id>.exclude`, meaning "never ship", with one stated status. List only OpenCode, omp and Antigravity, and filter both OpenCode copies.
  - Or, more simply: keep the drafter out of the canonical `agents/`, and have the Claude Code adapter write it from `harnesses/claude-code/`, the same way `relay-dispatch.md` is handled. Story 2 is then no longer needed.

#### R2-M8. The §9 targets cannot be met from the listed files, and are not counted the same way for both flows
- **Lenses:** zoom-out, structural, style, implementation-readiness
- **Section:** §9, Story 4
- **Problem:** The listed parent files come to about 15.3k without `relay.md` and `relay-dispatch.md`. These are estimates from reading; no byte counter was run. The remaining 6.7k must hold both relay files, which carry a seven-message table, a worked example for every message, and the rules in §4–§6 (about 4.5k in the spec alone, with no examples), plus up to 2k of draft shown twice, the snapshot and check lines, and the `commit.sh` output. `atomicity-warning-flow.md` (about 1.9k) is left out, even though the parent reads it on every proposal. For later commits, the SKILL.md reload (about 7.5k) leaves about 2.5k, and a 2,000-character draft, shown in the reply and again in the dialog, needs about 4k. The counting rule covers skill injections and tool results, which leaves out the dispatch and resume prompts and the Write of `MESSAGE_FILE` that §9 lists. The inline "~50k each later commit" assumes every file is re-read, while the relay figure does not, so the two flows are counted differently. No total for parent plus drafter is given.
- **Failure case:** The first commit after a split proposal measures about 26–28k, and a later commit with a draft at the cap measures about 11–12k. Story 4 fails on both targets.
- **Fix:**
  - Give `relay.md` and `relay-dispatch.md` together a budget of about 3k, with one compact example.
  - Replace the parent's read of `session-context.md` with one line in `relay-dispatch.md`, which saves about 2k.
  - Lower the `message` cap, or set the targets from a measured dry run.
  - Count tool_use inputs too, under the same re-read rule for both flows.
  - Name the fixture and which run each target applies to.
  - Report a total for parent plus drafter.

#### R2-M9. Stories 1 and 3 leave `npm test` and `npm run validate` failing on main
- **Lenses:** implementation-readiness, codebase-details
- **Section:** Stories 1 and 3, Files
- **Problem:**
  - `tests/build/claude-snapshot.test.mjs` hashes the Claude output, and the fixture lists the commit skill's files (`tests/fixtures/claude-snapshot.json:50-73`). Story 1 adds `lib/snapshot.sh` and Story 3 moves references, but only Story 4 updates the snapshot.
  - `validateReferences` (`skills.mjs:205-211`) fails any `references/*.md` that nothing links to. Story 3 does not say which old references are deleted.
  - Nothing in the source skill names `relay.md`. The string `relay-dispatch.md` does not contain `relay.md`.
- **Failure case:** After Story 1 merges, `npm test` fails with "Claude output changed". After Story 3, any reference kept but no longer linked fails validation. After Story 4, `relay.md` fails validation unless something links it.
- **Fix:** Add `tests/fixtures/claude-snapshot.json` to Stories 1 and 3. Give Story 3 an exact list of files to create, modify and delete. Mark Files the same way. Link `relay.md` from the source `relay-dispatch.md` or from the SKILL.md pointer. Name the test files.

#### R2-M10. The Story 4 check script has no way to drive two confirmed commits
- **Lenses:** implementation-readiness, structural
- **Section:** Story 4, §9
- **Problem:** `SKILL.md:19` stops a non-interactive run before committing unless the exact message was approved, and that message cannot be known in advance. Checks 1 and 3 need two confirmed commits and a `git add` between the draft and its confirmation. v2 does not say how the script drives the session: stream-json input in one process, or `-p` followed by `--resume`. It also does not say how the built plugin is loaded, which tools are allowed (Agent, SendMessage, Bash, Write, Skill, Read; AskUserQuestion is not available headless), how the script recognises the confirm step, what the scratch repository holds, or which stream-json pattern decides each check.
- **Failure case:** The implementer runs one `claude -p "commit this"`. The run stops at confirmation and nothing is committed. The resume check cannot pass, so the key unverified fact, that a finished sub-agent can be resumed, stays unverified.
- **Fix:** Specify the driving protocol (stream-json input in one process lets the script interleave answers and the `git add`). Give the scratch repository as a shell recipe, list the allowed tools, give one stream-json pattern per check, and load the build with `--plugin-dir`. State that the script is run by hand and is not part of `npm test`.

#### R2-M11. The evals never exercise the drafter, but Risks relies on them
- **Lenses:** codebase-details, implementation-readiness, style
- **Section:** Risks (first bullet), Stories 3–4
- **Problem:** Every commit-tools eval sets `allowed_tools: [Read, Glob, Grep, Skill]`. With no Agent tool, the §7 switch always runs them inline.
- **Failure case:** A Sonnet drafter that drafts worse passes every eval, so the stated mitigation does not exist.
- **Fix:** Have `commit-relay-check.sh` grade the drafted messages: they pass `style-check.sh` and cover every staged path. Or add an eval that allows Agent and SendMessage and stops at the confirm step. Either way, reword Risks.

#### R2-M12. A message-only amend regresses under the relay
- **Lenses:** implementation-readiness, design, inventive-catalyst
- **Section:** §5 (Failures: `nothing-staged`), §1
- **Problem:** `--amend` with an empty index is supported (`repository-state.md:15`, eval `clean-index-amend`). In that case `staged.diff` is empty, and `nothing-staged` means "report, no retry".
- **Failure case:** Running `/commit --amend` to reword the last commit reports "nothing staged" and exits.
- **Fix:** State that with `amend: explicit` and an empty `staged.diff`, the drafter drafts from `last-commit.diff` and skips Step 4, and that `nothing-staged` does not apply. Or always run an empty-index amend inline.

#### R2-M13. The relay switch and the fallback rules contradict each other
- **Lenses:** comprehension, design, implementation-readiness, style
- **Section:** §6 (last bullet), §7, Evidence, Risks
- **Problem:**
  - The switch checks only for the Agent tool, but every resume needs SendMessage.
  - "Works either way" (Evidence) is not backed up: if a sub-agent does have Agent, a `craft:build` implementer would relay, and it cannot show the dialog or the `amend.detected` question.
  - §6 says a failed resume starts a new drafter, Risks says it falls back inline, and §7 says a failed first dispatch goes inline.
  - The dispatch has no `group` field, so a new drafter started in the middle of a split cannot be told which group it is drafting.
- **Failure case:** SendMessage cannot reach a finished sub-agent, which is still unverified. After a split proposal, the `group:` resume fails, and a new drafter re-analyses the snapshot with group 1 staged and may propose again. Every group pays a new setup. Separately, if Story 4 finds that sub-agents do have Agent, the "sub-agent stays inline" check fails, and the spec gives no rule.
- **Fix:** The switch requires both Agent and SendMessage by exact name, plus "you are the top-level conversation". Any failed resume falls back inline for the rest of the task, which makes Risks correct. Alternatively, add `group` to the dispatch.

#### R2-M14. The split loop's order is ambiguous, and a `group:` resume can undo the split
- **Lenses:** comprehension, design
- **Section:** §5 (proposal flow)
- **Problem:** "Applies the choice, takes a new snapshot, and resumes the drafter once per group" can mean drafting all groups up front, or a loop of stage, snapshot, draft, confirm and commit for each group. `atomicity-warning-flow.md:72` says "repeat from Step 4".
- **Failure case:** If every group is drafted against one snapshot, the §4 check fails for every commit after the first, and each one is redrafted. If the drafter runs 4e on group B, it sees group C's files unstaged in the same directory and proposes them as "related", which undoes the split.
- **Fix:** Spell out the loop: unstage everything, stage group N, take a snapshot, resume with `group:`, confirm, commit, then go to the next group. `draft.md` says a `group:` resume skips Step 4.

### Minors

#### R2-N1. The snapshot does not have what the amend prerequisites need
- **Section:** §3 (`head.txt`), §5 (Amend)
- **Problem:** Step 3b needs the current user's `user.email` and "no remote-tracking ref contains HEAD" (`last-commit-comparison.md:7-16`). `head.txt` holds only the last author and "whether an upstream contains HEAD". In addition, "before amending" allows the safety check to run after the combined message has already been drafted.
- **Failure case:** HEAD is on `origin/x` and no upstream is set. The drafter asks `amend.detected`, the user answers `amend`, and the parent then refuses. The user answered a question that could never succeed, and the draft is thrown away. With no email to compare, a drafter that treats the prerequisite as failed never detects an amend, which is a silent regression from inline.
- **Fix:** Add `git config user.email` and the `for-each-ref --contains=HEAD refs/remotes/` result to `head.txt`, or compute `amend-candidate: no|yes|ambiguous` in `snapshot.sh`. Run the parent's checks before sending `answer: amend`.

#### R2-N2. Path safety does not handle `-z`, renames or `git reset`
- **Section:** §5 (Path safety)
- **Problem:** Plain `--porcelain` quotes paths that contain spaces and shows renames as `old -> new`. The split flow unstages with `git reset HEAD <files>` (`atomicity-warning-flow.md:54`), which the rule does not cover.
- **Failure case:** `a b.txt` is dropped as "unknown". If a rename's two paths land in different groups, the deletion and the addition go into separate commits.
- **Fix:** Match against `git status --porcelain -z`, treat a rename as one unit, and apply the same literal pathspec to `git reset -q HEAD --` and `git restore --staged --`.

#### R2-N3. Three failure outcomes have no next step
- **Section:** §4, §5 (Failures)
- **Problem:** `failed: kind: other` has no action. A reply with the wrong snapshot id is "discarded", and then nothing happens. "A second failure of either kind" can be counted per kind or in total.
- **Failure case:** A drafter that echoes an earlier id from its own history leaves the parent waiting with nothing to do.
- **Fix:** `other` means inline. A stale-id reply counts as malformed (resume once, then inline). Count failures in total per commit.

#### R2-N4. The user's explicit arguments lose their priority
- **Section:** §5 (dispatch)
- **Problem:** `message-generation.md:36` ranks explicit user arguments above session context. The dispatch has only `context`, so the drafter cannot tell the two apart.
- **Failure case:** The user runs `/commit fix the retry bug`. The drafter weighs that text like any other session summary and may lead with something else.
- **Fix:** Add an `args` field to the dispatch.

#### R2-N5. A split group has no description for the warning dialog
- **Section:** §5 (`proposal`)
- **Problem:** `atomicity-warning-flow.md:12-19` shows a description and line ranges for each concern, but `groups` carries only `{name, paths}`.
- **Failure case:** The parent cannot fill in the existing dialog without reading the diff.
- **Fix:** Add `summary` to each group.

#### R2-N6. No test checks that the other harnesses keep the inline text
- **Section:** §7, Story 4
- **Problem:** Only the Claude Code snapshot is checked, and v1 M1's test across all seven harnesses is in no story.
- **Failure case:** A later adapter refactor copies the Claude Code override to other harnesses, and nothing fails.
- **Fix:** Add one assertion to `tests/build/adapters.test.mjs`: every harness except Claude Code ships `Relay: inline on this harness.`

#### R2-N7. Evidence makes several inaccurate claims
- **Section:** Evidence
- **Problem and failure case:** Each wrong claim points an implementer at the wrong touch point.
  - Codex uses `copyLayout` (`codex/adapter.mjs:67`) and then `rewriteTree`; it does not use `copyRewrittenSkills`.
  - Antigravity also drops `tools` and `model` (`antigravity/adapter.mjs:119`), but only OpenCode and omp are cited.
  - The `eval.mjs` claim about one case and read-only graders cannot be checked from `eval.mjs`, which hands off to `claude plugin eval --runs 3`. The graders live in `evals/`.
- **Fix:** Correct the three claims and cite `evals/commit-tools/*/prompt.md` for the eval limits.

#### R2-N8. The brace path in Files puts the references in the wrong folder
- **Section:** Files
- **Problem:** `commit/{…, references/draft.md, relay.md, relay-dispatch.md, confirm-flow.md, atomicity-warning-flow.md}` expands to `commit/relay.md` and so on.
- **Failure case:** An implementer creates `commit/relay.md` outside `references/`.
- **Fix:** Add the `references/` prefix to each of these entries.

#### R2-N9. The header and Risks repeat v1 N6 and N7, and the counts do not reconcile
- **Section:** Header, Review record, Risks
- **Problem:**
  - The status mismatch v1 flagged as N6 is still there.
  - The worst case v1 flagged as N7 (setup plus inline, about 85k) is still not stated.
  - The header says "18 Majors", but the v1 report's breakdown line says 17 while listing M1–M18.
  - The four Ponytail findings are dispositioned, but they are not in the linked report.
- **Failure case:** A reader cannot check the Ponytail dispositions or reconcile the counts.
- **Fix:** Use one status in both places, add the worst case to Risks, fix the count in the v1 report, and link the Ponytail output.

---

## Raised but not carried

These were left out because they had no concrete failure case:
- Key naming that mixes dashes and underscores.
- The terms "omp" and "Full" left undefined.
- The element type of `warnings`.
- Where the Claude Code adapter's overwrite sits relative to `restatePicker`.
- Naming the Story 1 test file. This is folded into R2-M9.

## Suggested order of work

1. **R2-B1, R2-B2, R2-B3.** Without these fixes, the relay either never works or commits a stale message.
2. **R2-M2, R2-M3, R2-M4, R2-M14.** These complete the relay's state machine.
3. **R2-M6, R2-M12, R2-M13.** These cover the failure and edge paths.
4. **R2-M8, R2-M9, R2-M10, R2-M11.** These make the stories verifiable.
5. **R2-M1, R2-M5, R2-M7**, then the Minors.
