# Goldfish Review Report: commit relay design, round 6

**Target:** `docs/specs/2026-11-13-commit-relay-design.md` (candidate v6, all sections)
**Earlier rounds:** `docs/specs/reviews/2026-11-14-commit-relay-egm-review.md` (v1), `-r2.md`, `-r3.md`, `-r4.md`, `-r5.md`
**Mode:** REVIEW, round 6. This reviews a proposed design. Nothing is implemented, and no test, build, git or `claude -p` command was run.
**Settled decisions, not reopened:** one persistent sub-agent per task; Claude Code only; only the common case goes through the drafter, and every other branch runs inline; acceptance is measured in the Story 3 gate; Full review mode.

## Reviewer Status

| Reviewer | Status | Inputs |
| --- | --- | --- |
| `egm-structural` | completed | spec, round-5 report, commit skill |
| `egm-style` | completed | spec, round-5 report, commit skill |
| `egm-comprehension` | completed | spec only |
| `egm-codebase-details` | completed | spec, round-5 report, allowed sources |
| `egm-design` | completed | spec, round-5 report, commit skill, hook, adapters, registry |
| `egm-implementation-readiness` | completed | spec, round-5 report, allowed sources |
| `egm-zoom-out` | completed | spec, round-5 report, commit skill |
| `egm-inventive-catalyst` | completed | spec, round-5 report, commit skill, hook, registry |

The synthesizer checked these claims against the code:
- `references/execute-commit.md:5` writes `MESSAGE_FILE` to "a temporary file" and names no folder. `:8-9` gives the `commit.sh` call as `"$COMMIT_SKILL_DIR/lib/commit.sh" \` split over two lines (R6-M1).
- `references/message-validation.md:10-12` still uses the `SCRIPT=...; bash "$SCRIPT"` form (R6-M1).
- `references/gather-context.md:3-5` reads the full diff itself, so Step 1's `--stat` does not starve the inline flow (dropped concern).
- `references/message-validation.md:15,26` silently regenerates a failing subject and a leaking message (R6-m1).
- `hooks/commit-tools/scripts/intercept-git-commit.sh:100-118` does not block `__GIT_COMMIT_PLUGIN__=1 bash <lib>/commit.sh ...`, because that command has no `git` word.

**Summary:** 0 Blockers, 2 Majors, 7 Minors. The architecture holds. Both Majors stop Story 3's Verify from passing on a correct implementation:
- **R6-M1:** the inline baseline session cannot create a commit under the gate's allow list. All eight reviewers found this.
- **R6-M2:** the measurement sessions share one repository and have no base version of `change-a`.

The Minors are on the edit path, the hand-off, a deletion guard and stale record rows.

---

## Task 1: Round-5 dispositions not resolved by v6

These rows are resolved by the v6 text: R5-M2, R5-m2, R5-m4, R5-m5, R5-m6, R5-m7, R5-m8.

| Row | v6 says | Actual | Why | Tracked as |
|---|---|---|---|---|
| R5-M1 | Fixed | Partly | The Write folder and the literal style-check call exist only in `relay-dispatch.md`. The inline flow never reads that file, but the gate runs it in `measure-inline`. The `commit.sh` call has no literal form on either flow. The rule's path syntax is unverified. | R6-M1 |
| R5-M3 | Fixed | Partly | The clean sessions are named, but they share "the same scratch repository", and `change-a` gives `a49bc4c`'s diff only if the repository is seeded with the `a49bc4c^` versions. | R6-M2 |
| R5-M4 | Fixed | Mostly | Every dialog choice acts on the text to commit. But the §4 binding-check redispatch sends the user's raw text, so a removed leak or an accepted Auto-fix can come back. | R6-m2 |
| R5-m1 | Fixed | Partly | "Deletes each `removed` item" does not say every occurrence. | R6-m3 |
| R5-m3 | Fixed | Partly | The split clause of the round-5 fix was dropped. "Continues with Step 7b" also silently rewrites the user's text. | R6-m1 |
| R4-N8 leftover (round-5 Task 1: "name the field in §8") | "Covered by the rows above" | Not resolved | No R5 row covers it. §8 still says "sidechain events" without naming the stream-json field. | R6-m6 |

---

## Task 2: Findings

### R6-M1. The inline baseline cannot create a commit under the gate's allow list - Severity: Major
* **Reviewer Lens:** all eight
* **Affected Scope:** Story 3 gate (`--allowedTools`, default mode, no bypass); §8 `measure-inline`; §1 ("the inline references ... do not change, apart from Step 1's `--stat`")
* **Failure case:**
  1. The gate's `measure-inline` session, and the check script's own run of it, use `--disallowedTools Agent,SendMessage`. The relay switch fails, so the parent follows the unchanged inline references. It never reads the relay-only rules in `relay-dispatch.md`, and in the gate's "First" phase that file does not exist yet.
  2. At Step 7b, `message-validation.md:10-12` runs the style check as `SCRIPT=...; STYLE_FILE=...; bash "$SCRIPT" ...`, which does not match `Bash(bash <lib>/*)`.
  3. At Step 9, `execute-commit.md:5` writes `MESSAGE_FILE` to a temporary file of the model's choosing, such as `/tmp/commit-msg.txt`. That path is outside `Write(<scratch-repo>/.git/commit-msg/**)`, so `claude -p` in default mode denies the write.
  4. Even if the write is allowed, `execute-commit.md:8-9` gives the commit as `__GIT_COMMIT_PLUGIN__=1 bash "$COMMIT_SKILL_DIR/lib/commit.sh" \` plus a continuation line. That is a quoted variable path split over two lines, and may not match the literal prefix rule. v6 gives a literal form only for the style check, so the relay's own `commit.sh` call has the same risk.
  5. `commit.sh` is never reached (`lib/commit.sh:50,54`). There is no baseline, so the 55% and 35% acceptance cannot be computed, and the gate and the check script fail on a correct implementation. Story 3's stop rule names only resume and read failures, so the cause gets misread.
  6. A second gap, unverified, from four reviewers:
     - Claude Code file rules read a single leading `/` as relative to the settings source, and need `//` for an absolute path.
     - File-path rules are documented for `Edit(...)`, which covers Write, so `Write(<abs path>)` may match nothing.
     - Claude Code may prompt for any write under `.git/` even when a rule matches.

     Any of these denies the relay's commit at T3, T5 and in `measure-relay`.
* **Smallest fix:**
  - Change two shared references by one line each, which is harmless on every harness, and add them to §1's exception list and Story 3's Touch list:
    - `execute-commit.md`: write `MESSAGE_FILE` under `$(git rev-parse --absolute-git-dir)/commit-msg/`, and give the `commit.sh` call as one line with the path expanded.
    - `message-validation.md`: give the literal `bash <lib>/style-check.sh "<subject>" <style-file>` call.
  - Write the gate rule in the form one `claude -p` probe confirms, for example `Edit(./.git/commit-msg/**)` relative to the scratch repository. If `.git/` writes always prompt, move the folder outside `.git`, but not into `commit-relay/`.
  - State that T1–T6 and both measured sessions use the gate's allow list.
  - Fail the gate when the stream-json result has a non-empty `permission_denials`, and print the denied calls.

### R6-M2. The measured sessions share one repository and have no base for `change-a` - Severity: Major
* **Reviewer Lens:** comprehension, style, structural, codebase-details, design, implementation-readiness, zoom-out, inventive-catalyst
* **Affected Scope:** §8 ("on the same scratch repository, with the same named changes"; `change-a/` "holds the six files changed by commit `a49bc4c`, so its diff is that commit's"); Story 3 "First" fixtures and check script
* **Failure case:**
  1. The script runs T1–T6, `measure-inline` and `measure-relay` in "the same scratch repository". T1–T3 has already committed and pushed `change-a`, or `measure-inline` has.
  2. The next session copies `change-a` in again. The files match `HEAD`, so nothing is staged. Step 1 (`repository-state.md:17-35`) shows the staging dialog, which `-p` cannot answer. There is no draft and no commit, so the acceptance assertion has no count.
  3. Even in a fresh repository, `change-a/` holds only the files as they were after `a49bc4c`. Unless the seed commit holds the `a49bc4c^` versions, the staged diff is six whole-file additions, not the ~10k change, and the baseline measures a change of a different size. New files across folders can also raise a Step 4 atomicity warning, which breaks "one approval, no redraft".
  4. If the seed is added but not pushed, `HEAD` is amend-eligible with near-total file overlap. T1 and `measure-relay` then get `inline: amend`.
* **Smallest fix:**
  - Store each change's base as well, for example `change-a/before/` and `change-a/after/`, or build both from this repository with `git show a49bc4c^:<path>` and `git show a49bc4c:<path>`. Do the same for `change-b`.
  - State that each run (T1–T6, `measure-inline`, `measure-relay`) starts from a fresh scratch repository and bare remote, with a pushed seed commit holding the base versions.
  - Define a measured commit as the `/commit` turn plus the approval `--resume` turn, with their counts summed.
  - Print the staged diff's size next to each measurement.

### R6-m1. A hand-off that carries a user edit rewrites it or reuses it - Severity: Minor
* **Reviewer Lens:** style, design, inventive-catalyst
* **Affected Scope:** §1 "Handing off to the inline flow", third bullet
* **Failure case:**
  - **Silent rewrite:**
    1. The user's edit has a 55-character classic subject. The staged files change, and the edit redispatch returns `inline: atomicity`.
    2. The inline flow takes the user's text at Step 7 and "continues with Step 7b". `message-validation.md:15,26` silently regenerates a failing subject, and regenerates the message to strip a leak.
    3. The dialog presents the result as a generated message. The user approves a text that is not the one they wrote, and the relay's "show both versions" rule does not apply.
  - **Split reuse:**
    1. The user picks "Split commits" at Step 4.
    2. `atomicity-warning-flow.md:72` repeats from Step 4 for each concern, and §1's rule has no "once", so every split commit gets the user's text.
    3. Two commits carry the same message, and each describes changes it does not contain.
* **Smallest fix:** "At Step 7, use the user's text once, for the first commit created. Apply the Edit branch's checks from `confirm-flow.md` (Re-edit / Auto-fix / Commit anyway on a style failure; strip leaks only), not Step 7b's silent regeneration. Later split commits generate as usual."

### R6-m2. The binding-check redispatch sends the raw edit, so a removed leak can come back - Severity: Minor
* **Reviewer Lens:** design
* **Affected Scope:** §4 ("the redispatch is an `edit:` of the user's text, not a regenerate") against §5 (one text to commit; "a removed leak is never brought back")
* **Failure case:**
  1. The user's edit contains `Part 5 of the token diet`. The drafter replies `checked` with that line in `removed`, and the dialog shows the stripped text.
  2. The user stages one more file in a terminal, then picks Commit. The `--id` check fails, so the parent sends `edit:` with the user's raw text.
  3. Leak judgment is borderline and not deterministic. This time `removed` is empty, so the text to commit contains the leak again.
  4. The dialog shows only the "staged files changed" notice. The user approves what looks like the same message, and the leak is committed.
  5. An Auto-fix the user accepted is undone on the same path.
* **Smallest fix:** in §4, redispatch `edit:` with the current text to commit, already stripped and auto-fixed, and carry that same text on every fallback.

### R6-m3. Only one occurrence of a removed item is guaranteed to be deleted - Severity: Minor
* **Reviewer Lens:** comprehension, style
* **Affected Scope:** §5, "the parent deletes each `removed` item from the user's text"
* **Failure case:** `beads-abc12` appears in both the subject and a `Refs:` line. The drafter quotes it once. A first-occurrence delete commits the second copy.
* **Smallest fix:** "deletes every exact occurrence of each item."

### R6-m4. "To keep something that was removed, the user picks Edit" cannot work - Severity: Minor
* **Reviewer Lens:** structural, design (zoom-out concurs)
* **Affected Scope:** §5, "The text to commit, for an edit"
* **Failure case:**
  1. The drafter flags an item in the user's edit, for example `Closes: skills-wisp-czi`, or a false positive such as "two-phase commit".
  2. Following the dialog's advice, the user picks Edit and types it back.
  3. Every edit goes through `edit:` and `checked` again, so the item is removed again. The loop never ends.
  4. The hook blocks a direct `git commit`, so the user cannot commit the text they asked for through the agent.
* **Smallest fix:** delete the sentence, and state that the leak check on edits is mandatory and cannot be overridden, as inline today (`confirm-flow.md:32-33`).

### R6-m5. `--prev` deletes whatever path it is given - Severity: Minor
* **Reviewer Lens:** design
* **Affected Scope:** §3 step 4, "It deletes the `--prev` folder"; Story 1 tests
* **Failure case:**
  1. The parent fills in `--prev` from its own context. After compaction, or in a task spanning two repositories, it passes a wrong path, such as the repository root or an empty string.
  2. A plain `rm -rf "$prev"` deletes the user's files. Nothing in §3 or the Story 1 test limits what can be deleted.
* **Smallest fix:** delete `--prev` only when it is a direct child of `$(git rev-parse --absolute-git-dir)/commit-relay/` whose name matches the nonce format, and ignore anything else. Add a Story 1 case for a bad `--prev`.

### R6-m6. §8 still does not name the stream-json field that marks sub-agent events - Severity: Minor
* **Reviewer Lens:** style, structural, codebase-details, implementation-readiness, zoom-out, inventive-catalyst
* **Affected Scope:** §8 counting rule
* **Failure case:**
  1. The implementer filters on `isSidechain`, a transcript-file field.
  2. Stream-json probably marks sub-agent events with a non-null `parent_tool_use_id` instead (unverified), so nothing is excluded.
  3. The drafter's ~35k setup is counted as parent context, and a correct relay fails the 55% cap.
* **Smallest fix:** in §8, define a parent event as one with a null `parent_tool_use_id`, or the field one probe confirms. Have the gate assert that at least one `measure-relay` event is excluded by it.

### R6-m7. Disposition rows describe mechanisms v6 removed - Severity: Minor
* **Reviewer Lens:** comprehension, codebase-details, structural
* **Affected Scope:** Review record
* **Failure case:** an implementer reading the record builds something v6 dropped. Stale rows:
  - R4-M4 says `fix-subject:`.
  - R4-M5 and R3-M2 say `stripped`.
  - R3-M1 says "Auto-fix as `edit:`" and "a reply to `edit:` is never `inline`".
  - R4-N7 says "Steps 5 and 6 before the dispatch".

  Line 15 also promises "Ponytail findings and the round-3 dispositions at the end", but the tables run rounds 4, 5, then 3.
* **Smallest fix:** mark each of these rows "superseded by R5-…", and fix line 15.

---

## Considered and dropped

- **Linked worktree: the snapshot folder is outside the working directory** (zoom-out). The drafter's read may prompt. That is exactly what the gate's worktree read check exists to find, so it is not a defect in the spec. If it fails, an optional cheap fallback is `snapshot-failed outside-project`, which sends worktree commits inline, so the whole story does not stop.
- **Shell quoting of the subject in the style-check call** (comprehension). Backticks or `$(...)` in a subject inside double quotes. The inline flow has the same issue today, and `commit.sh` rechecks the subject from the file.
- **No allowed command for deleting the parent's last snapshot folder** (comprehension). The 24-hour cleanup removes it. Cost only.
- **`inline: other` as a reply to `edit:` is malformed** (comprehension, design). It costs one turn and then falls back inline with the edit. No wrong commit.
- **The Story 1 tests do not cover `--token` output or the printed line** (implementation-readiness). Story 3 would catch a wrong format. It does not stop any Verify from passing.
- **The gate's resume and read probe could pass falsely if done ad hoc** (implementation-readiness). This is a false pass, not a Verify that cannot pass, and T1–T4 exercise the real path.
- **Multi-line YAML fields as plain scalars** (style). An LLM reads the dispatch, not a strict YAML parser.
- **Evidence line on the hook** (codebase-details, Nit). `intercept-git-commit.sh:118` lets a `git commit` through only when the token is the single word directly before `git`. The relay's `bash commit.sh` passes because it contains no `git` word. The conclusion stands; rephrasing the line is optional.
- **The base comparison uses the gate's measurement taken before the `--stat` change** (comprehension). With `--setting-sources project` there is no MCP diff, so Step 1 already falls back to `--stat` (`repository-state.md:13`).

## Unverified assumptions

- `claude -p` in default mode denies an unlisted Write. The `SCRIPT=` form, quoted and line-continued commands do not match Bash prefix rules. `Write(<abs path>)` needs `//` or `Edit(...)`. Writes under `.git/` may always prompt (R6-M1). One `claude -p` probe settles all four.
- The stream-json sub-agent field is `parent_tool_use_id` (R6-m6).
- `a49bc4c`'s six files and diff size (R6-M2). No git was run.
