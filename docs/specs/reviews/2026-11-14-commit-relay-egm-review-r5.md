# Goldfish Review Report: commit relay design, round 5

**Target:** `docs/specs/2026-11-13-commit-relay-design.md` (candidate v5, all sections)
**Earlier rounds:** `docs/specs/reviews/2026-11-14-commit-relay-egm-review.md` (v1), `-r2.md`, `-r3.md`, `-r4.md`
**Mode:** REVIEW, round 5. This reviews a proposed design. Nothing is implemented, and no test, build or `claude -p` run was made.
**Settled decisions, not reopened:** one persistent sub-agent per task; Claude Code only; only the common case goes through the drafter, and every other branch runs inline; acceptance is measured in the Story 3 gate; Full review mode.

## Reviewer Status

| Reviewer | Status | Inputs |
| --- | --- | --- |
| `egm-structural` | completed | spec, round-4 report, commit skill |
| `egm-style` | completed | spec, `registry.json` |
| `egm-comprehension` | completed | spec only |
| `egm-codebase-details` | completed | spec, round-4 report, allowed sources |
| `egm-design` | completed | spec, round-4 report, commit skill, hook, adapters index, registry |
| `egm-implementation-readiness` | completed | spec, round-4 report, allowed sources |
| `egm-zoom-out` | completed | spec, round-4 report, commit skill references |
| `egm-inventive-catalyst` | completed | spec, commit skill references, `lib/commit.sh` |

The synthesizer checked these claims against the code:
- `references/execute-commit.md:5` writes the confirmed message to `MESSAGE_FILE` "using the file-write tool", and `lib/commit.sh:50,54` cannot run without that file (R5-M1).
- `references/message-validation.md:10-12` writes the style check as `SCRIPT=...; bash "$SCRIPT" ...` (R5-M1).
- `references/style-loading.md:12,22` reads the full style file, and v5 leaves it unchanged (R5-m8).
- `references/confirm-flow.md:22,26` asks the user to type `\n` for new lines and then parses the answer (R5-m7).

**Summary:** 0 Blockers, 4 Majors, 8 Minors. Seven round-4 rows are only partly resolved. Two Majors (R5-M1, R5-M2) stop Story 3's gate or check script from passing on a correct implementation, and every reviewer that read the sources found R5-M1 independently. R5-M3 leaves the acceptance assertion with nothing clean to measure. R5-M4 can commit a leak the user saw removed. The architecture holds. The open problems are the gate's allow list, which replies the binding check applies to, the measurement runs, and the edit path.

Two reviewers rated R5-M1 a Blocker. It is a Major here because the fix is one allow-list rule and the failure depends on `-p` default-mode behavior that no one ran. If `-p` turns out to grant Write, it drops to a Minor.

---

## Task 1: Round-4 dispositions not resolved by v5

Every row not listed here is resolved by the v5 text: R4-M1, M2, M3, N1, N2, N5, N6, N7.

| R4 | v5 says | Actual | Why | Tracked as |
|---|---|---|---|---|
| R4-M4 | Fixed | Partly | Auto-fix can now be built, but it patches "the user's text", which is undefined once a strip has happened. The `fix-subject` reply carries no leak verdict. | R5-M4 |
| R4-M5 | Fixed | Partly | The `stripped` check has no branch for a mismatch. A `draft` reply to an `edit:` is still accepted, so the drafter's copy can reach Commit. | R5-m1, R5-m2 |
| R4-M6 | Fixed | Partly | §8 defines clean runs, but Story 3 never performs them. The fixtures are created under "Then", after the gate measures the baseline on `change-a`. The script's only session (T1–T6) has the T2 redraft in its first-commit window, which §8 excludes, yet the script "asserts the section 8 acceptance from the counts". | R5-M3 |
| R4-M7 | Fixed | Partly | The bare remote fixes the amend half. "Copies the named fixtures in and stages them between turns" still allows copying every fixture at the start. | R5-m4 |
| R4-N3 | Fixed | Partly | "If the index is now empty, the commit goes back to Step 1" does not carry the user's edit. | R5-m6 |
| R4-N4 | Fixed | Partly | The assertion names only OpenCode, omp and Antigravity, while `registry.json` enables six other harnesses. Story 3's Touch list has no test file to hold the assertion. | R5-m5 |
| R4-N8 | Fixed | Partly | The allow list is exact but lacks Write. §8 still says "sidechain events" without naming the stream-json field (probably `parent_tool_use_id`), and the gate does not confirm the field. | R5-M1; name the field in §8 |

---

## Task 2: Findings

### R5-M1. The gate's allow list has no Write rule, so no flow can create a commit - Severity: Major
* **Reviewer Lens:** structural, codebase-details, design, implementation-readiness, inventive-catalyst
* **Affected Scope:** Story 3 gate (`--allowedTools`, default permission mode, no bypass); §8 counting window ("to the commit being created")
* **Failure case:**
  1. The parent reaches Step 9 on either flow. `execute-commit.md:5` says to write the confirmed message to `MESSAGE_FILE` with the file-write tool, and v5 does not change that.
  2. The list contains only `Agent`, `SendMessage`, `Skill`, `Bash(git:*)` and the two `lib/` rules. Under `claude -p` in default mode an unlisted Write cannot be approved, so it is denied. A Bash redirect matches no rule either.
  3. `commit.sh` is never reached. The gate gets no inline baseline count, T3 and T5 create no commit, and the gate and check script both fail on a correct implementation. Story 3's stop rule names only resume and read failures, so the cause can be misdiagnosed.
  4. The same list has a second gap. `message-validation.md:10-12` writes the style check as `SCRIPT=...; bash "$SCRIPT" ...`, which does not match `Bash(bash <lib>/*)` if the model copies it literally.
* **Smallest fix:** add one path-scoped Write rule for a named message-file folder outside `.git/commit-relay/`, so it cannot make the drafter's read check pass. Name that folder in `relay-dispatch.md`. Have `relay-dispatch.md` call the style check as the literal `bash <lib>/style-check.sh ...`. Optionally, fail the gate when the stream-json result lists `permission_denials`, so a denial is reported as such.

### R5-M2. An `inline` reply fails the binding check, so T6 sees a second dispatch - Severity: Major
* **Reviewer Lens:** style, comprehension, structural, codebase-details, implementation-readiness, inventive-catalyst
* **Affected Scope:** §4 (every reply echoes `token` and `files`; discard on either failure, then dispatch again); §5 `inline` row (`token`, `reason` only); §2 (`inline: other` for an unreadable snapshot); Story 3 T6
* **Failure case:**
  1. At T6 the drafter correctly replies `inline: atomicity` with `token` and `reason`, as §5 defines.
  2. The reply has no `files`, so §4's count check fails. The parent discards it and dispatches again.
  3. T6 asserts "no second dispatch for this commit", so the check script fails even though the drafter and the parent each followed the spec.
  4. `inline: other` exists for the case where a snapshot file cannot be read, so it often cannot carry the token. It always fails the check and always costs a wasted second dispatch.
* **Smallest fix:** in §4, apply the binding check only to `draft` and `checked`, the replies whose content can be committed. Act on an `inline` reply at once. That is safe, because the inline flow reads git again from Step 1. Drop `token` from the `inline` row.

### R5-M3. Story 3 cannot produce the measurements its acceptance needs - Severity: Major
* **Reviewer Lens:** style, comprehension, structural, codebase-details, implementation-readiness, zoom-out
* **Affected Scope:** §8 (clean runs; "the next commit in that session"); Story 3 gate ("inline baseline count") and "Then" list; check script T1–T6
* **Failure case:**
  1. The gate must measure the inline baseline on `tests/fixtures/commit-relay/change-a/`, but that folder is created only under "Then". At gate time it does not exist.
  2. The check script drives one session, T1–T6. Its first commit is T1–T3, which includes the T2 binding-check redraft that §8 says is "not part of the measurement". "That session" in §8's later-commit row can mean either session.
  3. The script "asserts the section 8 acceptance from the counts". An implementer either asserts the 55% cap over T1–T3, where the redraft adds about 4–6k against a cap of about 27.5k, or invents sessions the spec does not define.
  4. The pass mark also depends on the size of `change-a/`'s diff, which is not stated. The ~50k baseline assumes `a49bc4c`'s ~10k diff. With a ~3k fixture diff the baseline drops to about 41k, and 55% of that falls below the relay's own lower estimate.
* **Smallest fix:** move `tests/fixtures/commit-relay/` into Story 3's "First" step, and make `change-a/` a copy of `a49bc4c`'s six files or state a minimum diff of about 10k. Add two named clean sessions to the script: the inline baseline with `--disallowedTools Agent,SendMessage`, and a relay session that stages change-a, shows a draft, approves, then stages change-b, shows a draft, approves. State that T1–T6 checks behavior only and is not counted.

### R5-M4. Auto-fix on an edit can commit a leak the user saw removed - Severity: Major
* **Reviewer Lens:** design, zoom-out, comprehension
* **Affected Scope:** §5 `checked` row for `edit:` + `fix-subject:`; "Style check fails on an edit"; "`checked` with a non-empty `removed`"; §1 (parent style check on every edit)
* **Failure case:** the spec does not say whether the parent's style check runs before or after the drafter's leak check on an edit. It also does not say which text "the user's text" means after a strip. Both orders go wrong:
  - **Leak check first.** The user's edit has the body line `Closes: beads-abc12` and a 60-character subject. The drafter replies `checked` with that line in `removed`, and the user sees the stripped text. The subject fails the style check, and the user picks Auto-fix. The reply carries only `subject`. §5 replaces line 1 "of the user's text", which is the unstripped text, and keeps every other line byte for byte. The leak is committed.
  - **Style check first.** The subject fails and the user picks Auto-fix before any `edit:` is sent. The parent swaps line 1, the style check passes, and the body is committed without the leak check `confirm-flow.md:32` makes mandatory.
  - "Commit anyway" after a failed style check also does not say which text it commits.
* **Smallest fix:** add one rule to §5 and `relay-dispatch.md`: after a `checked` reply, the text to commit is the user's text, or the stripped text when `removed` is not empty. The style check, Auto-fix and "Commit anyway" all act on that one text, and the plain `edit:` check always runs first. A simpler option, from zoom-out: drop `fix-subject:` and let the parent rewrite line 1 itself, as the inline Auto-fix does (`confirm-flow.md:30`). It needs no diff, so the round trip goes away.

### R5-m1. A `stripped` mismatch has no defined outcome - Severity: Minor
* **Reviewer Lens:** all except style
* **Affected Scope:** §5, "The parent first checks that `stripped` equals the user's text with each `removed` item deleted"
* **Failure case:**
  1. The user's edit has the line `Refs: skills-wisp-czi`. The drafter quotes it in `removed` and drops the whole line from `stripped`.
  2. Deleting the quoted text literally leaves an empty line, so the check fails. Inline deletions leave a double space the drafter tidied, and they fail the same way.
  3. Nothing says what happens next. It is not in the malformed-reply list. One implementer commits `stripped` anyway, which commits the drafter's copy (the R4-M5 problem). Another commits the user's unstripped text with the leak, and a third loops or drops the edit.
* **Smallest fix:** drop the `stripped` field. The parent deletes every exact occurrence of each `removed` item, plus a line left empty by it, and treats an item that does not appear verbatim as a malformed reply. This also gives R5-M4 its single "text to commit".

### R5-m2. A reply whose status does not fit the action is accepted - Severity: Minor
* **Reviewer Lens:** design
* **Affected Scope:** §5 reply table and malformed-reply rule
* **Failure case:**
  1. The user edits the body, and the parent sends `edit: <user text>`.
  2. Sonnet "improves" the text and replies `status: draft` with correct `token` and `files`. `draft` is a known status, so the malformed rule does not apply.
  3. The parent runs the `draft` path: style check, then the Commit / Edit / Regenerate / Cancel dialog. The rewrite looks like the user's text, and the user picks Commit. The drafter's version is committed. This is R4-M5 returning by a different status. The reverse case, a `checked` reply to a regenerate, tells the parent to commit "the user's own text", and there is none.
* **Smallest fix:** in §5, treat a reply as malformed when its status does not match the action. A regenerate or no action takes `draft` or `inline`. `edit:` takes `checked` or `inline`. `edit:` plus `fix-subject:` takes `checked` with one `subject` line.

### R5-m3. The hand-off with a user edit says two different things - Severity: Minor
* **Reviewer Lens:** comprehension, inventive-catalyst
* **Affected Scope:** §1 "Handing off to the inline flow"; §4 `inline: atomicity` on an edit redispatch
* **Failure case:** §1 says the hand-off "runs from Step 1" and also that it "starts at its Edit branch with the user's text". After the staged files change, the edit is redispatched and the drafter replies `inline: atomicity`.
  - If the flow starts at the Edit branch, Step 4 is skipped. The split dialog the reply asked for never appears, and the old edit goes to the standard dialog for a staged set that is not atomic.
  - If it runs from Step 1, the split flow generates new messages and the edit is lost.
* **Smallest fix:** "Run from Step 1. At Step 7, use the user's text instead of generating a message, then apply the Edit branch's checks. If the user splits, offer the text for the first commit."

### R5-m4. If fixtures are copied in up front, T1 gets `inline: related` - Severity: Minor
* **Reviewer Lens:** structural, codebase-details, implementation-readiness, inventive-catalyst
* **Affected Scope:** Story 3 check script ("copies the named fixtures in and stages them between turns")
* **Failure case:** the wording allows copying every fixture before T1. `change-a-extra.md`, which is the same concern by design, is then untracked at T1. The 4e same-directory heuristic (`atomicity-analysis.md:58`) flags it, and the drafter replies `inline: related`. T1's "a draft is shown" fails, which contradicts the "no related unstaged files" bullet. change-b and change-mixed carry the same risk through T1–T5.
* **Smallest fix:** "Each fixture is copied into the scratch repository immediately before it is staged. No fixture file exists in the working tree earlier."

### R5-m5. The absence assertion covers three of six harnesses and has no home - Severity: Minor
* **Reviewer Lens:** style, comprehension, structural, codebase-details, implementation-readiness, zoom-out, inventive-catalyst
* **Affected Scope:** Story 2 note; Story 3 Touch list; §7
* **Failure case:** `registry.json` enables antigravity, opencode, pi, codex, agent-plugins and omp for commit-tools, and the codex, pi and agent-plugins adapters also emit agents. The assertion names only OpenCode, omp and Antigravity, and no Story 3 Touch item creates or modifies a test to hold it. If the codex or pi `exclude` entry is lost, the drafter ships there without tool limits and no test fails.
* **Smallest fix:** assert that every enabled harness except Claude Code has no `commit-drafter` and that the Claude Code build has it. Name the test file in Story 3's Touch list, for example the Story 2 test under `tests/build/`.

### R5-m6. An index emptied after the user's edit drops the edit - Severity: Minor
* **Reviewer Lens:** design
* **Affected Scope:** §4, "If the index is now empty, the commit goes back to Step 1"
* **Failure case:** the user edits the message, then unstages everything in a terminal. On Commit, the `--id` check sees the change and the index is empty, so the flow returns to Step 1. The user stages again, and a fresh dispatch (no `edit:`) or the inline flow generates a new message. Nothing carries the edit on this path, so it is lost.
* **Smallest fix:** add "carrying the user's edit if one exists; the first dispatch after restaging is `edit:`" to that bullet.

### R5-m7. "Byte for byte" conflicts with the Edit prompt's `\n` convention - Severity: Minor
* **Reviewer Lens:** codebase-details
* **Affected Scope:** §5 "Edits are committed as the user wrote them"; Dialogs "with the existing choices"
* **Failure case:** the reused Edit prompt tells the user to "Use \n for new lines" (`confirm-flow.md:22`), and the inline flow then parses the answer (`:26`). The relay keeps "the user's text" byte for byte, and `commit.sh` commits the file's exact bytes. If the user types `Fix redirect\n\nBody ...`, the message is one line with literal `\n`. The subject fails the style check, and "Commit anyway" commits it.
* **Smallest fix:** in §5, define "the user's text" as the edit after `\n` parsing, as `confirm-flow.md:26` does. That parsed text is what is kept byte for byte.

### R5-m8. Step 5 before the dispatch puts the whole style file in the parent - Severity: Minor
* **Reviewer Lens:** inventive-catalyst (synthesizer verified `style-loading.md`)
* **Affected Scope:** §1 "On the relay, Steps 5 and 6 run before the dispatch"; §8 acceptance
* **Failure case:** `style-loading.md:12,22` tells the reader to read the full style file, and v5 leaves it unchanged. So the relay parent reads `styles/classic.md` (8,331 chars) plus `style-loading.md` on every commit. That puts the later-commit estimate of 13–17k at about 22–26k, against a 35% cap of about 17.5k. A faithful implementation of §1 then fails the check script's assertion. The parent does not need the contents: `style-check.sh` takes the path, and `commit.sh` builds `styles/$style.md` from the name Step 2 already resolved.
* **Smallest fix:** in `relay-dispatch.md`, "On the relay, skip Step 5. Send Step 2's style name as `style`; the drafter reads the file." Step 6 stays before the dispatch.

---

## Considered and dropped

- **Grep can fetch the token without reading the diff** (comprehension). §2 overclaims "proves the diff was read to the end". Every draft is still shown before commit, so this affects draft quality, not what is committed.
- **The drafter cannot tell an edit redispatch after restaging from a plain edit** (style). The parent shows the "staged files changed" notice, and the user confirms the result. A `restaged: true` field would make "may reply `inline: atomicity`" exact, but no wrong commit follows.
- **`relay-token:` text inside a staged diff.** It causes a mismatch, a retry, then the inline flow. No wrong commit.
- **Unpushed real-world branches make later commits amend-eligible.** Affects cost and how representative the gate is, not correctness.
- **Body lines over 72 characters** are unchecked before `commit.sh` on both flows today. This is not new to the relay.
- **The parent's own reads of the plugin folder under "no Read rule".** Only the gate can show this, and it already runs that check for the drafter.

## Unverified assumptions

- R5-M1 assumes `claude -p` in default mode denies an unlisted Write and that Bash prefix rules do not match the `SCRIPT=` form. One `claude -p` probe confirms both.
- The stream-json field that marks sub-agent events is not confirmed (R4-N8 row).
