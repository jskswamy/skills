# Goldfish Review Report: commit relay design, round 4

**Target:** `docs/specs/2026-11-13-commit-relay-design.md` (candidate v4, all sections)
**Earlier rounds:** `docs/specs/reviews/2026-11-14-commit-relay-egm-review.md` (v1), `-r2.md` (v2), `-r3.md` (v3)
**Mode:** REVIEW, round 4. This reviews a proposed design. Nothing is implemented, and no test, build or `claude -p` run was made. Byte counts are estimates made by reading.
**Settled decisions, not reopened:** one persistent sub-agent per task; Claude Code only; only the common case goes through the drafter, and every other branch runs inline; acceptance is measured in the Story 3 gate.

## Reviewer Status

| Reviewer | Status | Inputs |
| --- | --- | --- |
| `egm-structural` | completed | spec, earlier reports, allowed sources |
| `egm-style` | completed | spec, earlier reports, commit skill |
| `egm-comprehension` | completed | spec only |
| `egm-codebase-details` | completed | spec, earlier reports, allowed sources |
| `egm-design` | completed | spec, earlier reports, allowed sources |
| `egm-implementation-readiness` | completed | spec, earlier reports, allowed sources, plus `package.json` (to see how `npm test` finds tests) |
| `egm-zoom-out` | completed | spec, earlier reports, allowed sources |
| `egm-inventive-catalyst` | completed | spec, earlier reports, allowed sources |

The synthesizer checked these claims against the code:
- In `SKILL.md`, Step 3 (line 74) comes before Step 6 `--pair` (line 98). The relay pointer goes at the start of Step 3, so a hand-off that "runs from Step 1" passes the pointer again (R4-M2), and `co_author` is not known yet when the parent dispatches (R4-N7).
- `lib/commit.sh:54-55,125-127` commits the exact bytes of the message file. Whatever text the parent writes to that file is what gets committed (R4-M5).
- §3 names the folder `commit-relay/<nonce>/`, and §4 and §5 put `nonce` in every dispatch (R4-M3).

**Summary:** 0 Blockers, 7 Majors, 8 Minors. Eleven round-3 rows are not fully resolved. Every reviewer found R4-M1 on its own. R4-M1, R4-M2 and R4-M6/M7 each stop Story 3's check script from passing on a correct implementation. The core architecture holds up. The open problems are in the binding check's details, the hand-off, the edit path and the check script's fixture.

---

## Task 1: Round-3 dispositions not resolved by v4

Every row not listed here is resolved by the v4 text.

| R3 | v4 says | Actual | Why | Tracked as |
|---|---|---|---|---|
| R3-M3 | Fixed | Partly | The claim that "the inline flow never dispatches" is false. The hand-off runs from Step 1, reaches the new Step 3 pointer, and dispatches again. | R4-M2 |
| R3-M5 | Fixed | Not resolved | The nonce is the folder name and is sent in every dispatch. Echoing it proves nothing about reading `nonce.txt`, the same flaw R3 found in the echoed id. | R4-M3 |
| R3-M6 | Fixed | Partly | The new `files` guard compares against Step 1's stale count. `--stat` shortens long paths, so the coverage check cannot match them. | R4-M1, R4-N1 |
| R3-M7 | Fixed | Partly | `declined` holds full paths, but `unstaged.stat` holds `--stat` paths shortened to `.../tail`. The `--name-only` part of the round-3 fix was not adopted. | R4-N1 |
| R3-M8 | Fixed | Partly | The snapshot part is fixed. The check-script part (what T1 and T4 stage) is not, so `inline: amend` can come back at T4. | R4-M7 |
| R3-M1 | Fixed | Partly | Auto-fix has no field to carry its instruction. Separately, the automatic style `regenerate:` drops any context the user typed for an earlier Regenerate. That second gap is records only, because the user sees the result before committing. | R4-M4 |
| R3-M2 | Fixed | Partly | The leak case is fixed. An edit redispatched after the staged set changed is shown with nothing to say the staged set changed. | R4-N3 |
| R3-M9 / R3-M12 | Fixed | Partly | The baseline's diff, the windows being measured, the event filter, the allow list, where the baseline comes from once the drafter exists, and the assertion that no commit exists before the confirm turn are all unstated. | R4-M6, R4-N8 |
| R3-N2 | Fixed | Partly | Nothing covers an empty index after a binding-check re-snapshot. | R4-N3 |
| R3-N3 | Fixed | Not resolved | The listing-size test runs `applyExclude` on both sides, so a lost exclude entry still passes. | R4-N4 |
| R3-N4 | Fixed | Partly | After a replacement drafter fails, the dead id is still the recorded one, so every later commit pays again. | R4-N2 |

---

## Task 2: Findings

### R4-M1. The `files` check discards every correct redraft after a change in what is staged - Severity: Major
* **Reviewer Lens:** all eight
* **Affected Scope:** §4 bullets 2–3; Story 3 T2
* **Failure case:**
  1. T1: Step 1's `--stat` shows N files, and a draft is shown.
  2. The script runs `git add` on one more file.
  3. T2: `snapshot.sh --id` sees the change, so the parent takes a new snapshot and redispatches.
  4. The drafter correctly replies `files: N+1`. §4 compares that with "the staged file count in Step 1's `--stat`", which is still N. The parent discards the reply, discards the retry the same way, and runs the commit inline.
  5. T2's "new draft from the binding check" never comes from the drafter, and the first-commit count takes a full inline run. §4's second-failure rule also does not say "with the user's edit", so a user who edited and then staged loses the edit when the inline flow restarts at Step 1.
* **Smallest fix:** `snapshot.sh` prints the count, as `snapshot <id> <nonce> <dir> <files>`. The parent compares each reply with the count of the snapshot that dispatch carried. Add "with the user's edit if one exists" to §4's second-failure rule.

### R4-M2. The inline hand-off goes back through the relay pointer and dispatches again - Severity: Major
* **Reviewer Lens:** structural, design, codebase-details, inventive-catalyst
* **Affected Scope:** §1 (hand-off "runs from Step 1"; "the inline flow never dispatches"); §7 (pointer at the start of Step 3; the switch checks only that the agent and tools exist)
* **Failure case:**
  1. T6: the drafter replies `inline: atomicity`.
  2. The parent restarts at Step 1 and reaches the Step 3 pointer. The agent is listed and Agent and SendMessage are available, so `relay-dispatch.md` says to use the relay.
  3. The parent takes a snapshot and dispatches again, and the drafter replies `inline: atomicity` again. Nothing written ends the loop.
  4. `related`, `amend`, and the malformed-reply and resume-error fallbacks (including the one that carries the user's edit) loop the same way. T6 reaches the split dialog late or not at all.
* **Smallest fix:** add one clause to the switch: "skip the relay for a commit already handed off inline". Or have the hand-off enter at `gather-context.md`, below the pointer.

### R4-M3. The nonce echo does not prove the drafter read the new snapshot - Severity: Major
* **Reviewer Lens:** design, inventive-catalyst, implementation-readiness (zoom-out rated it Minor)
* **Affected Scope:** §3 step 2 (the folder is named `<nonce>`); §4; §5 dispatch table
* **Failure case:**
  1. A later commit in the task: the parent dispatches the new folder.
  2. The drafter's Read fails, because of a denied read in a linked worktree or a cleanup race.
  3. The drafter writes the message from the previous diff in its history, and copies the nonce from the dispatch or the folder path. On a small commit, the `files` count often matches as well.
  4. The binding check passes, and the user is shown, and may confirm, a message written for the previous commit. Only the drafter's compliance with `draft.md` prevents this.
* **Smallest fix:** keep the token out of the dispatch and the path. `snapshot.sh` writes a separate random token as the last line of `staged.diff` and prints it only to the parent. The drafter echoes it, which proves it read this snapshot's diff to the end. `draft.md` says to ignore that last line when drafting.

### R4-M4. Auto-fix has no field for its instruction, and `checked` is not allowed to change the subject - Severity: Major
* **Reviewer Lens:** comprehension, style (design and zoom-out rated it Minor)
* **Affected Scope:** §5 dispatch table (one action, `edit: <full message>`); the `checked` row ("the edit after the leak strip"); Auto-fix
* **Failure case:** "Auto-fix resumes with `edit:` plus 'fix only the subject line'". The implementer can do either of two things, and both fail:
  - Append the sentence to the `edit:` text. The leak strip does not remove it, so it comes back in `checked` and is committed if the user does not notice it.
  - Send the edit unchanged. Under the `checked` contract the drafter only strips leaks, so the subject fails again and the user is stuck between Re-edit and Auto-fix.

  As written, Auto-fix cannot be built.
* **Smallest fix:** add an optional field `fix-subject: <reason>`, allowed only with `edit:`. For that case, `checked` is the edit with only line 1 rewritten, then leak-stripped. The parent accepts it only if lines 2 onward match the user's text byte for byte (see R4-M5).

### R4-M5. The committed edit is the drafter's copy, not the text the user typed - Severity: Major
* **Reviewer Lens:** design
* **Affected Scope:** §5 `checked` row; §5 "`checked` with a non-empty `removed`"
* **Failure case:**
  1. The user edits a long message.
  2. Sonnet echoes it back in `checked` with small changes: a rewrapped line, a corrected word, or dropped trailing whitespace. `removed` is empty.
  3. The dialog shows only that copy, which looks like the user's own text. The user picks Commit.
  4. `commit.sh` commits the bytes in the message file (`lib/commit.sh:54-55`), which are the drafter's version. The inline flow commits the user's parsed text (`confirm-flow.md:26`).
* **Smallest fix:** the parent keeps the user's text. When `removed` is empty, it writes the user's text to the message file byte for byte and uses `checked` only as a verdict. When `removed` is not empty, it keeps the dialog that shows both versions.

### R4-M6. Story 3's acceptance compares windows that do not match, on a diff nobody defined - Severity: Major
* **Reviewer Lens:** comprehension, structural, zoom-out, implementation-readiness, inventive-catalyst
* **Affected Scope:** §8; Story 3 gate and check script
* **Failure case:**
  - The relay's "first of a task" count runs from T1 to T3. That includes the forced binding redraft: a second snapshot, dispatch, reply, style check and dialog, roughly 4–6k. The spec's own estimate is 24–27k, so the result lands around 28–33k against a 55% cap of about 27.5k.
  - The baseline's diff is not named. The ~50k estimate includes about 12k of `a49bc4c`'s diff, which the relay never loads into the parent. With a small scratch diff, the baseline falls to about 39k, and 55% of that is about 21k, below the relay estimate.
  - Story 3's later Verify runs after the drafter exists, and nothing says how it gets an inline baseline then.

  A correct implementation can fail the gate.
* **Smallest fix:**
  - Measure the first commit on a clean draft-then-approve run.
  - Keep the T2 binding scenario as a functional check only, outside the counts.
  - Stage the same named diff on both flows, for example the files of `a49bc4c`, and make the baseline a first-of-session inline commit.
  - Take the baseline in the same run with `--disallowedTools Agent,SendMessage`, so the §7 switch falls through to inline.

### R4-M7. The check script's scratch content can trigger the amend, related or atomicity branches - Severity: Major
* **Reviewer Lens:** style, structural, design, zoom-out, codebase-details, implementation-readiness, inventive-catalyst
* **Affected Scope:** Story 3 check script T1–T6; carried over from R3-M8
* **Failure case:**
  1. The scratch repository has no remote, and one author makes every commit, so `amend-eligible` is `yes` after T3. That is also true at T1 if a seed commit exists.
  2. If T4's change shares a file with T3's commit (overlap above 0.5, `last-commit-comparison.md:32-35`) or shares a top-level folder (which sends the decision to the LLM path), the drafter replies `inline: amend`.
  3. T4's expected SendMessage and draft fail, and T5's "approve" lands in the amend dialog. T6 can come back `amend` instead of `atomicity`, a T2 file of a different concern can give `atomicity`, and pre-existing unstaged siblings can give `related` at T1.
* **Smallest fix:** give the scratch repository a local bare remote and push after each commit, so `amend-eligible` is always `no`. Name the fixture layout: T1 under `a/`, the T2 file in `a/` with the same concern, T4 under a new `b/`, and T6 a mixed change under `c/` and `d/`. Create each file just before it is staged.

### R4-N1. `--stat` shortens paths, so `declined` and the coverage check cannot match them - Severity: Minor
* **Reviewer Lens:** style, implementation-readiness, inventive-catalyst
* **Affected Scope:** §3 (`staged.stat`, `unstaged.stat`); §2 (4e and `declined`; the coverage check)
* **Failure case:** with no terminal, `git diff --stat` shortens a long path to `.../tail`. A declined full path never matches it, so the drafter reports `related` again and every later commit in the task goes inline and asks the same question.
* **Smallest fix:** add `staged.names` and `unstaged.names` from `git diff [--staged] --name-only`, and match against those.

### R4-N2. A failed replacement leaves the dead id recorded - Severity: Minor
* **Reviewer Lens:** zoom-out, codebase-details, implementation-readiness, inventive-catalyst
* **Affected Scope:** §5 resume error; §6
* **Failure case:** the replacement also fails, and that commit runs inline. The next commit resumes the dead id, starts another drafter at about 35k, and fails again, on every commit for the rest of the task.
* **Smallest fix:** after a replacement fails, write `commit-drafter: none`, and run the rest of the task inline.

### R4-N3. A redispatched edit after the staged set changed: no notice, no atomicity check, empty index - Severity: Minor
* **Reviewer Lens:** structural, style, zoom-out, codebase-details
* **Affected Scope:** §4 "If the user had edited the message"; §5 "A reply to `edit:` is never `inline`"
* **Failure case:**
  1. The user edits the message. While the dialog is open, they stage an unrelated file, or they commit everything in a terminal.
  2. The redispatch is `edit:`, which can never be answered `inline`, so no 4a–4e check runs. The dialog shows the user's old text with nothing to say the staged set changed. The new file is committed under a message that does not describe it, or, with an empty index, `commit.sh` fails.
* **Smallest fix:** when a redispatch follows an id change, the dialog shows the new `staged.stat` and the words "staged changes changed since your edit", and `checked` may carry an `atomicity` warning. If the new snapshot stages nothing, return to Step 1.

### R4-N4. No test catches a lost `exclude` entry - Severity: Minor
* **Reviewer Lens:** structural, zoom-out, codebase-details, implementation-readiness
* **Affected Scope:** Story 2; §7; R3-N3
* **Failure case:** the `opencode` exclude entry is dropped. `listing-size.test.mjs` applies the same `applyExclude` to the expected and the actual counts, so both include the drafter and the test passes. OpenCode then ships the drafter with every tool, Bash included.
* **Smallest fix:** in Story 3, assert that the temp builds for opencode, omp and antigravity contain no `commit-drafter`.

### R4-N5. The gate checks a drafter that does not exist yet - Severity: Minor
* **Reviewer Lens:** codebase-details
* **Affected Scope:** Story 3, "Gate, first" and "Then"
* **Failure case:** the gate checks that "the drafter reads" `.git/commit-relay/`, but `commit-drafter.md` is created only under "Then". The implementer improvises a probe, for example an `--agents` session agent, whose read permissions may differ from those of a plugin agent.
* **Smallest fix:** create and register the agent file before the gate. Without the `SKILL.md` pointer, nothing dispatches it.

### R4-N6. The two cleanup rules contradict each other - Severity: Minor
* **Reviewer Lens:** style, design
* **Affected Scope:** §3 step 4; Story 1 test
* **Failure case:** "delete any folder older than 24 hours" conflicts with "another session's current folder is never touched" when a live session's folder is older than 24 hours. `snapshot.sh` cannot tell the two cases apart, so the Story 1 test can be written against either reading.
* **Smallest fix:** "another session's folder younger than 24 hours (by mtime) is never touched".

### R4-N7. `co_author` is dispatched before Step 6 resolves `--pair` - Severity: Minor
* **Reviewer Lens:** comprehension (the synthesizer confirmed the step order in `SKILL.md:74,98`)
* **Affected Scope:** §1 ownership table; §5 `co_author`; §7 pointer at the start of Step 3
* **Failure case:** the parent dispatches at Step 3, before Step 6 asks about `--pair`, so it sends `co_author: none`. The drafted message has no `Co-Authored-By` trailer, and nothing adds it later.
* **Smallest fix:** one line in `relay-dispatch.md`: run Step 5 (style) and Step 6 (`--pair`) before the first dispatch. This is the relay's own file, so the shared references stay unchanged.

### R4-N8. The gate's allow list and environment are unstated, so the read check can pass trivially - Severity: Minor
* **Reviewer Lens:** implementation-readiness
* **Affected Scope:** Story 3 gate; §8 counting rule
* **Failure case:**
  - A bare `Read` in `--allowedTools`, or an allow rule in the user's own `~/.claude/settings.json`, makes the worktree read check pass. A user in default mode would still be prompted for `.git/worktrees/<name>/`.
  - User hooks and plugins add parent events to both counts.
  - "Sidechain" names no stream-json field.

  The stream-json field names and how Bash allow rules match an `__GIT_COMMIT_PLUGIN__=1` prefix were not verified.
* **Smallest fix:** write the exact `--allowedTools` string into Story 3, with no bare Read, Glob or Grep. Run with `--setting-sources project` in a scratch repository that has no settings. Name the field used to drop sub-agent events, and confirm it in the gate.

### Considered and dropped
- **Index changes between `--id` and `commit.sh`.** This is the same window the inline flow has today, and round 3 marked `--expect-id` optional.
- **`inline: amend` deciding Step 3b again.** This costs tokens only.
- **The automatic style regenerate dropping earlier Regenerate text.** The user sees the result before committing.
- **The SKILL.md size after the pointer.** About 7.26k against the 8,000 cap. It fits.
