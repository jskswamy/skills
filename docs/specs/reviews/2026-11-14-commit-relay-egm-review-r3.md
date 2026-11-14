# Goldfish Review Report: commit relay design, round 3

**Target:** `docs/specs/2026-11-13-commit-relay-design.md` (candidate v3, all sections)
**Earlier rounds:** `docs/specs/reviews/2026-11-14-commit-relay-egm-review.md` (v1), `docs/specs/reviews/2026-11-14-commit-relay-egm-review-r2.md` (v2)
**Mode:** REVIEW, round 3. The design is only proposed: nothing is implemented, and no test, build or `claude -p` run was made. Byte counts are estimates from reading; no reviewer had a byte counter.
**Settled decisions, not reopened:** one persistent sub-agent per task; Claude Code only; only the common case goes through the drafter, and every other branch runs inline.

## Reviewer Status

| Reviewer | Status | Inputs |
| --- | --- | --- |
| `egm-structural` | completed | spec, earlier reports, allowed sources |
| `egm-style` | completed | spec, earlier reports, allowed sources |
| `egm-comprehension` | completed | spec only |
| `egm-codebase-details` | completed | spec, earlier reports, allowed sources |
| `egm-design` | completed | spec, earlier reports, allowed sources |
| `egm-implementation-readiness` | completed | spec, earlier reports, allowed sources |
| `egm-zoom-out` | completed | spec, earlier reports, allowed sources |
| `egm-inventive-catalyst` | completed | spec, earlier reports, allowed sources |

The synthesizer checked these load-bearing claims against the code:
- `tests/build/listing-size.test.mjs:24-30` counts the expected agents from the unfiltered `loadPluginModel` for antigravity, omp and opencode (R3-M11).
- `scripts/lib/adapters/index.mjs:41-48` calls `loadPluginModel` inside the adapter loop, once per adapter and plugin, not once per plugin (R3-N5).
- `confirm-flow.md:27-33`: after a failed style check on a user's edit, the flow offers Re-edit, Auto-fix (which rewrites the subject and keeps the body) and Commit anyway. It strips leaked text silently.
- `last-commit-comparison.md:5-16` needs `git config user.email` and `for-each-ref --contains=HEAD refs/remotes/`. Neither is in `head.txt`.
- `atomicity-analysis.md:47`: check 4e (related unstaged changes) exists, and §2 of the spec applies only 4a–4d.
- `repository-state.md:12` tries the MCP diff tool before `--stat`. `SKILL.md` reaches Step 1 before Step 3, where the relay pointer goes.

**Summary:** 0 Blockers, 12 Majors, 5 Minors. Of the round-2 rows, 16 are not fully resolved. Most of them are tracked in the findings below; four rows are records-only. v3's narrower scope works: every split, related-file and amend state-machine finding from round 2 is gone. The remaining problems sit at the edges of the common case: the user's edit, the binding check, the snapshot contents, and whether the stories can pass their own checks.

---

## Task 1: Round-2 dispositions not resolved by v3

Every row not listed here is resolved by the v3 text, or no longer applies because its branch now runs inline.

| R2 | Disposition says | Actual | Why | Tracked as |
|---|---|---|---|---|
| R2-B1 | Fixed | Partly | The echoed id is copied from the dispatch and the dir name, so it shows nothing about which diff the drafter read. A drafter that cannot read the new folder can draft from the diff in its history and still pass. Story 3 does not assert that the redraft covers the newly staged file. | R3-M5 |
| R2-M3 | Fixed | Partly | "Edit shown beside the new draft" needs a dialog that does not exist (`message-dialogs.md` offers one message with Commit / Edit / Regenerate / Cancel), and nothing says which message Commit commits. | R3-M2 |
| R2-M4 | Fixed | Not resolved | §5 answers every style failure with `regenerate:`, including a failure on the user's `checked` edit. That throws the edit away, while inline Auto-fix keeps the body (`confirm-flow.md:30`). | R3-M1 |
| R2-M5 | Fixed | Partly | "On the relay, Step 1 uses `--stat`" cannot be decided at Step 1. The switch is in `relay-dispatch.md`, which is reached from a pointer at Step 3. | R3-M3 |
| R2-M6 | Fixed | Partly | The recompute command and the exact id format are not defined. "Inside the working directory" is false for a linked worktree or a submodule, and the gate does not test either. | R3-M4, R3-N1 |
| R2-M8 | Fixed | Not resolved | The targets cannot be met under §8's own counting rule, `relay-dispatch.md` ≤ 2.5k cannot hold its listed content, and the two flows still use different re-read assumptions. | R3-M9 |
| R2-M9 | Fixed | Partly | Only Story 3's Touch list names `claude-snapshot.json`. Nothing inside the skill links `references/draft.md`. `listing-size.test.mjs` is missing from every story. | R3-N3, R3-M11 |
| R2-M10 | Fixed | Partly | The `-p` / `--resume` driving is named. Still unspecified: the plugin source, the permission mode, the turns that do the `git add` and the mixed stage, the confirm wording, the baseline build, and the event filter. | R3-M12 |
| R2-M11 | Fixed | Not resolved | The eval allows only `Agent` added to `[Read, Glob, Grep, Skill]`. The switch also needs SendMessage, the snapshot needs Bash, and the eval has no staged repository, so it can never dispatch. | R3-M10 |
| R2-M13 | Fixed | Partly | §5 has four separate fallbacks, not "one fallback rule". After a replacement drafter fails, nothing stops the next commit from starting two more. | R3-N4 |
| R2-N1 | Fixed | Not resolved | "The drafter only detects" still needs the amend prerequisites, and the snapshot does not carry them. | R3-M8 |
| R2-N6 | Fixed | Partly | Story 2 tests a synthetic exclusion. No test checks that the real `commit-drafter` is missing from OpenCode, omp and Antigravity. | R3-N3 |
| R2-N7 | Fixed | Partly | A new Evidence error: `runAdapters` does not load the model once per plugin (`index.mjs:41-48`). | R3-N5 |
| R2-N8 | Fixed | Partly, records only | Story 3 still uses bare paths (`references/draft.md`, `SKILL.md`, `registry.json`), Story 2 says only `tests/build/`, and the eval case has no folder name. | none |
| R2-N9 | Fixed | Partly, records only | The v1 report still says "17 Major" (`...egm-review.md:21`). v1 Ponytail findings 1–4 are no longer recorded anywhere, and the header says "disposition tables" when there is one table. | none |
| Ponytail v2-1 | Fixed | Partly | The gate checks a plain `.git/`. It does not check a linked worktree, where the git dir is outside the project. | R3-N1 |

Records-only rows (R2-M2 mentions a "proceed" branch v3 no longer has; R2-M13's "one fallback rule") change no behavior and are not carried as findings.

---

## Task 2: Findings

There are no Blockers. Every finding below either has a concrete failure sequence or fails a story's own verification step.

### Majors

#### R3-M1. The user's edited message is lost on three paths
- **Lenses:** design, style, structural, codebase-details, inventive-catalyst, comprehension, zoom-out
- **Section:** §5 (style check result, `checked` row, malformed rule, `inline` row), §2
- **Failure case:**
  1. **Style regenerate.** The user picks Edit, rewrites the body and leaves a 55-character subject. The drafter returns `checked`, `style-check.sh` fails, and the parent sends `regenerate: subject failed…`. A dispatch carries only one of `regenerate` or `edit`, so the drafter writes a new message from the diff and the user's body is gone. Inline Auto-fix would have kept it. Any context the user typed for a Regenerate is dropped the same way.
  2. **Cap.** The user's edit is 2,300 characters. The `checked` reply goes over the 2,000-character `message` cap, so it is "malformed" twice, and the commit runs inline from Step 3, which generates a fresh message.
  3. **Late `inline` reply.** Every dispatch is complete, and the drafter decides the common case on every turn. An `edit:` dispatch can come back `inline: atomicity`, and the inline flow restarts at Step 3 without the edit.
- **Smallest fix:**
  - When the failing text came from `edit:`, skip the automatic regenerate and show the existing Re-edit / Auto-fix / Commit anyway choices.
  - Auto-fix sends `edit: <text>` plus `fix-subject: <reason>`, meaning rewrite only the subject.
  - Apply the 2,000-character cap to `draft` only.
  - `draft.md`: on `edit:` or `regenerate:` for the same snapshot, skip the common-case check.
  - Any fallback after an edit enters the inline Edit branch of `confirm-flow.md` with the user's text, not Step 3.
  - The automatic regenerate keeps the user's earlier regenerate text.

#### R3-M2. The dialog with two messages does not say which one Commit commits
- **Lenses:** style, design, codebase-details, comprehension
- **Section:** §4 (edit shown beside the new draft), §5 (`removed` not empty: "both versions"), Story 3 Touch list
- **Failure case:**
  1. The user edits the message.
  2. They run `git add test.go` in a terminal.
  3. The binding check redrafts, and the dialog shows the old edit beside the new draft under the standard Commit / Edit / Regenerate / Cancel options.
  4. The user picks Commit expecting their edit, and the new draft is committed. Or the old edit is committed, and it never mentions `test.go`.

  In the leak case, a user shown both versions can pick the unstripped one and commit the leak. Showing both versions also replaces today's silent strip (`confirm-flow.md:32-33`, `message-validation.md:28`) without saying so.
- **Smallest fix:**
  - Add `message-dialogs.md` to Story 3 with a two-version dialog: "Commit new draft" / "Keep my edit" / Edit / Cancel. "Keep my edit" sends `edit:` against the new snapshot, so the leak and style checks run again.
  - In the leak case, Commit always uses the stripped text. Keep the strip silent, or name the dialog as a behavior change.

#### R3-M3. Relay-only changes land in references the inline flow shares
- **Lenses:** design, style, implementation-readiness, zoom-out, comprehension
- **Section:** §1 ("Step 1 uses `--stat`"), §2 ("the inline flow and its references do not change"), §7 (pointer at Step 3), Story 3 (edits to `repository-state.md` and `confirm-flow.md`)
- **Failure case:**
  - **Step 1.** It runs before the parent reads the switch. With the 1mcp git server configured, `repository-state.md:12` puts about 10k of diff into the parent on every relay commit, and both §8 targets fail.
  - **`confirm-flow.md`.** Story 3 adds "Regenerate and Edit resume the drafter" and "the binding check before the executor" to it, with no gate. That file is also read on inline commits, after an `inline` handoff, and on the six other harnesses.
    1. The drafter replies `inline: atomicity`, and the inline flow splits the commit.
    2. The edited `confirm-flow.md` sees the index has changed, takes a new snapshot and dispatches the drafter for a split group, which §1 forbids.
    3. On OpenCode, Regenerate tells the parent to resume an agent that was never built.
- **Smallest fix:**
  - Make Step 1 use `git diff --staged --stat` always. Inline Step 3 fetches the full diff itself (`gather-context.md:3-5`).
  - Put the relay Regenerate, Edit and binding rules in `relay-dispatch.md`, applied only when the current message came from a drafter reply. Give `confirm-flow.md` one pointer line.
  - Replace "do not change" with the exact lines that change.

#### R3-M4. The recompute before commit has no command, so the binding check can loop forever
- **Lenses:** structural, design, style, codebase-details, implementation-readiness, inventive-catalyst
- **Section:** §3 (id), §4 (recompute)
- **Failure case:**
  1. The id is "the short hash of `HEAD` … plus `git write-tree`", with no separator and no length. `snapshot.sh` has only a write-everything mode.
  2. The parent improvises the recompute, for example `rev-parse --short HEAD` plus the full tree hash, and gets a different format.
  3. Every pre-commit check now reports a change, so the parent takes a new snapshot, redrafts and asks for confirmation, then mismatches again. The commit never happens.

  `--short` also gets longer as the repository grows. A `git add` made between the recompute and `commit.sh`, which are separate Bash calls, is committed unseen.
- **Smallest fix:**
  - Add `snapshot.sh --id`, which prints the id and writes nothing.
  - Fix the id format, for example `<head12|root>-<tree12>`.
  - Name the command in §4. Optionally add `commit.sh --expect-id <id>`, which exits with a distinct code on mismatch and closes that last gap.
  - Test the format in Story 1.

#### R3-M5. A stale or unreadable snapshot can still produce a stale draft that passes the binding check
- **Lenses:** inventive-catalyst, design, style, comprehension
- **Section:** §2, §3 (cleanup), §4 (echoed id)
- **Failure case:**
  - A Read of the new snapshot can fail for several reasons:
    - it was denied (see R3-N1);
    - the folder is mid-rewrite;
    - a second Claude Code session in the same checkout ran `snapshot.sh`, which "deletes earlier snapshot folders" across the whole git dir, or retired its drafter and deleted all of `commit-relay/`.
  - `draft.md` has no rule for an unreadable snapshot. A per-task drafter still has the previous commit's diff in its history, so it can draft from that and echo the id from the dispatch.
  - The binding check passes, and the user confirms a message written for the earlier commit.
- **Smallest fix:**
  - `draft.md`: if any snapshot file cannot be read, reply `inline: other`, and never draft from history.
  - `snapshot.sh` writes a random nonce into a file in the folder. The drafter echoes the nonce it read.
  - `snapshot.sh` writes into a temp folder and renames it into place, and deletes only folders it created, for example under a per-session subfolder.
  - Story 3's `git add` check asserts that the redraft names the newly staged file.

#### R3-M6. A large or binary staged diff is cut off silently, so the message leaves out files
- **Lenses:** comprehension, inventive-catalyst, structural, codebase-details
- **Section:** §3 (`staged.diff` from `git diff --staged --binary`)
- **Failure case:**
  1. The user stages a 1 MB PNG and some text changes.
  2. `--binary` writes the PNG as about 20k lines of base85 text.
  3. The Read tool returns 2,000 lines by default, so the drafter never sees the text changes after the blob. A large refactor without any binary does the same.
  4. The id matches, and the user confirms a message that leaves out files in the commit.

  The inline flow has no such problem, because it uses plain `git diff --staged`, which prints "Binary files differ".
- **Smallest fix:**
  - Drop `--binary`.
  - `draft.md`: read `staged.diff` in pages to the end, check every path in `staged.stat` is covered, and reply `inline: other` above a stated size.

#### R3-M7. The drafter never runs check 4e, so related unstaged files are dropped silently
- **Lenses:** codebase-details, design, zoom-out, style
- **Section:** §2 ("checks 4a–4d"), §5 (`inline` reason `related`), §3 (`unstaged.stat`, `untracked.txt`)
- **Failure case:**
  1. The user stages `src/auth/login.ts` and leaves `src/auth/login.test.ts` unstaged.
  2. Inline, 4e (`atomicity-analysis.md:47-90`) would offer "Stage related files".
  3. On the relay, the drafter drafts, and the commit leaves the test out. This quietly regresses the most common case.

  The `related` reason has no producer, and `unstaged.stat` and `untracked.txt` have no reader.

  If 4e is added as it stands, a related file the user declined once ("Proceed without") is seen again on every later dispatch. Every later commit in the task then goes `inline: related` at full inline cost. This repository's current state is an example: a spec is modified while review files sit untracked.
- **Smallest fix:**
  - Add 4e to `draft.md` as detection only, replying `inline: related`.
  - Add a dispatch field `declined: [paths]`, which the parent fills when the user picks "Proceed without" during the task.
  - Write unstaged paths with `git diff --name-only`, because `--stat` shortens long paths.

#### R3-M8. Amend detection without its prerequisites sends routine later commits inline
- **Lenses:** zoom-out, codebase-details, design, inventive-catalyst, structural, style
- **Section:** §2 (the `last-commit-comparison.md` heuristic), §3 (`head.txt`), Story 3 check script
- **Failure case:**
  1. Later commits in a task usually touch the files of the previous commit, so overlap is above 0.5 (`last-commit-comparison.md:32`), or they share a top-level directory, which sends the decision to the LLM path.
  2. `head.txt` has neither `user.email` nor the remote-ref result, so the drafter cannot apply prerequisites 2 and 3.
  3. If it assumes the prerequisites pass, a pushed HEAD or a teammate's HEAD gives `inline: amend`. Inline Step 3b then rejects the amend and makes a normal commit, after paying the drafter turn plus about 50k of inline flow. If it assumes they fail, amends are never detected, a silent regression.
  4. Story 3's "commit, stage again, commit" in a fresh scratch repository with no remote hits exactly this path. The scripted "Commit" answer matches nothing in the amend dialog (Amend / Edit / New commit instead / Cancel). The resume and ≤ 12k assertions then fail or flake.
- **Smallest fix:**
  - `snapshot.sh`, which has Bash, writes `amend-check: no|amend|ambiguous` from the three prerequisites and the Jaccard table, using the checks `commit.sh:115-119` already runs. The drafter runs only the LLM path, and only on `ambiguous`.
  - On `inline: amend`, the inline flow enters with `AMEND_MODE=true` instead of deciding again.
  - The check script's second commit stages a file under a top-level directory the first commit did not touch. Add one separate amend case.

#### R3-M9. The §8 targets cannot be met under §8's own counting rule
- **Lenses:** zoom-out, structural, inventive-catalyst, implementation-readiness, codebase-details, design, style, comprehension
- **Section:** §8, Story 3 check script
- **Failure case:** With a correct implementation, the check script fails both targets. The counting rule includes every tool input and result, which brings in costs the §8 arithmetic leaves out:
  - **The message three times.** It appears in the Agent or SendMessage result, the AskUserQuestion input and the `MESSAGE_FILE` Write.
  - **Bash calls.** Step 1, `snapshot.sh`, `style-check.sh`, the recompute, `commit.sh` and `git log -1` add about 1.5–2k.
  - **Line numbers.** The `cat -n` prefixes on Read results add about 1.8k.
  - **`relay-dispatch.md` itself.** It must hold the switch, a 9-field dispatch table, 3 statuses, the error, stale, binding and lifetime rules, and an example of each message. That is about 4.5k, not ≤ 2.5k.

  | Commit | Realistic total | Target |
  |---|---|---|
  | First | about 24–27k | ≤ 22k |
  | Later, 800-character message | about 13k | ≤ 12k |
  | Later, 2,000-character message | about 17k | ≤ 12k |

  These later-commit totals assume nothing is re-read. The reloaded `SKILL.md` says "Read references/X and follow it", so a parent that re-reads adds about 9k. The inline baseline (about 50k) still assumes it re-reads everything, so the two flows are counted differently. Counted the same way, the real later-commit saving is about 8–12k, not about 38k.

  `claude -p` stream-json also includes the drafter's own events. Counting them puts its 35k of setup into the parent's figure.
- **Smallest fix:**
  - Set the targets from the gate's measured dry run, or state them as formulas (later commit ≈ `SKILL.md + 3 × message + 3k`).
  - Count only events with a null `parent_tool_use_id`.
  - Apply one re-read rule to both flows.
  - Drop the per-message examples from `relay-dispatch.md`.
  - Report parent plus drafter for a later commit.

#### R3-M10. The new eval case can never dispatch the drafter
- **Lenses:** all context-aware lenses
- **Section:** Story 3 (eval case), Risks
- **Failure case:**
  1. The case adds only `Agent` to `[Read, Glob, Grep, Skill]`.
  2. §7's switch also requires SendMessage, so the parent runs inline.
  3. With SendMessage allowed, it still has no Bash for Step 1 or `snapshot.sh`, so the snapshot fails and the commit runs inline.
  4. With Bash allowed, `eval.mjs` runs from the repository root with nothing staged, which also goes inline.

  "Drafter is dispatched" fails on every run, so `npm run eval -- commit-tools` fails Story 3's Verify step. Risks still names this eval as the mitigation for weaker Sonnet drafts.
- **Smallest fix:** Drop the eval case. Have `commit-relay-check.sh` grade each drafted message instead: it passes `style-check.sh` and names every path in `staged.stat`. Reword Risks to match.

#### R3-M11. Excluding the drafter breaks `npm test`
- **Lenses:** codebase-details, implementation-readiness (the synthesizer confirmed this in the code)
- **Section:** Stories 2–3, §7
- **Failure case:** `tests/build/listing-size.test.mjs:24-30` expects `model.agents.length` from the unfiltered model for antigravity, omp and opencode. After Story 3 those builds have one fewer agent, so the test fails on "antigravity agents", "omp agents" and "opencode agents". No story lists this file.
- **Smallest fix:** Export the exclude filter from `scripts/lib/adapters/index.mjs`, use it in both `runAdapters` and the test, and add the test to Story 2's Touch list.

#### R3-M12. The Story 3 gate and check script can pass or fail for reasons unrelated to the design
- **Lenses:** implementation-readiness, structural, design, inventive-catalyst
- **Section:** Story 3 (gate, check script)
- **Failure case:**
  - **Gate passes when it should fail.** It runs with `bypassPermissions` or `--dangerously-skip-permissions`, the easy way to let the parent use Bash under `-p`. "Read under `.git/` without a prompt" then passes trivially, and users in the default mode get prompts on every commit.
  - **Script runs a build without the drafter.** It loads the committed `dist/` or an installed copy, and every check fails.
  - **Two assertions are never exercised.** The listed turn sequence (commit, confirm, stage again, commit, confirm) has no `git add` between a draft and its confirmation, and no mixed-concern stage.
  - **The confirm turn may not count.** A bare "Commit" may not satisfy `SKILL.md:19`.
- **Smallest fix:**
  - Build into a temp folder, as `eval.mjs` does, and load it with `--plugin-dir`.
  - Run in the default permission mode with an explicit `--allowedTools` list.
  - List every turn, including the `git add`, the mixed stage and the confirm wording.
  - Assert that no commit exists before the confirm turn.
  - Say how the baseline is built with the agent excluded.
  - State that the script is run by hand and stays out of `npm test`.

### Minors

#### R3-N1. The snapshot path can be relative, or outside the project
- **Section:** §3 (`git rev-parse --git-dir`), §5 (`snapshot-dir` absolute), Story 3 gate
- **Failure case:**
  - At the repository top level, `--git-dir` prints `.git`, so `snapshot-dir` is relative, and the drafter's Read, which needs an absolute path, fails.
  - In a linked worktree or a submodule, the git dir is outside the working directory, so the Read may prompt, and a headless run denies it.
  - Either way, every commit pays the drafter setup, a retry, and then the inline flow.
- **Smallest fix:** Use `git rev-parse --absolute-git-dir`. Add a linked worktree to the gate, or print `snapshot-failed worktree` there.

#### R3-N2. The inline handoff "from Step 3" skips Step 1 and repeats Step 6
- **Section:** §5 (`inline` row), §4 (redispatch)
- **Failure case:**
  - The user commits the staged files in a terminal before confirming. The binding check takes a new snapshot of an empty index, and the drafter replies `inline: other`. Inline starts at Step 3, skips Step 1's staging dialog, and `commit.sh` fails with "nothing to commit".
  - With `--pair`, an `inline` handoff runs Step 6 again, so the user picks a co-author twice. A pair added with "save" can be saved twice.
- **Smallest fix:** After any new snapshot, an empty `staged.stat` returns to Step 1. The handoff reuses `style`, `co_author` and the session summary, and skips Steps 2, 6 and 6b.

#### R3-N3. Story verification gaps
- **Section:** Stories 1–3
- **Failure case:**
  - Nothing inside the skill names `references/draft.md`. Only the agent file outside the skill does, so `validateReferences` (`skills.mjs:205-211`) fails `npm run validate`, and Story 3's Verify step does not run validate.
  - Story 1 adds `lib/snapshot.sh` without updating `tests/fixtures/claude-snapshot.json`, so `npm test` fails after Story 1 merges.
  - No test checks the real registry. If the `opencode` exclude entry is lost, OpenCode ships a drafter with every tool and every check still passes.
- **Smallest fix:**
  - `relay-dispatch.md` names `references/draft.md`.
  - Add `npm run validate` to Story 3's Verify.
  - Add the fixture to Stories 1 and 2.
  - Add one assertion that the built output for OpenCode, omp and Antigravity has no `commit-drafter`.

#### R3-N4. A failed replacement drafter is retried on every later commit
- **Section:** §5 (resume error), §6
- **Failure case:** The replacement drafter's id is never written back into the conversation, and §5 does not say what the next commit does after the replacement fails. Each later commit resumes a dead id and starts a new drafter, paying about 35k of setup every time.
- **Smallest fix:** Write the `commit-drafter:` line again whenever a new drafter starts. After a replacement fails, run the rest of the task inline.

#### R3-N5. One Evidence claim is wrong
- **Section:** Evidence ("Model loading")
- **Failure case:** `runAdapters` calls `loadPluginModel` inside the adapter loop, once per adapter and plugin (`scripts/lib/adapters/index.mjs:41-48`). An implementer who trusts "loads once" may put the filter in a shared spot and filter every harness.
- **Smallest fix:** Reword the claim. The planned per-harness filter goes after the `loadPluginModel` call on line 47.

---

## Raised but not carried

These were dropped because they had no concrete failure, or because the code shows the problem does not happen:
- "The inline flow from Step 3 has no full diff in context." `gather-context.md:3-5` fetches it at Step 3.
- "History replay has no owner." `SKILL.md:21` branches to it before the normal flow.
- `warnings` has no defined parent action; mixed dash and underscore key names; the `exclude` key format. Validation would catch the key format at once.
- `exclude` entries for Pi, Codex and agent-plugins change nothing, because those adapters already report every agent as degraded. This is harmless.
- `exclude` reaching both OpenCode agent copies. Checked: `wrapperLayout` derives both from `model.agents` (`scripts/lib/layout.mjs:13`), so it works.

## Suggested order of work

1. **R3-M1, R3-M2, R3-M5, R3-M6.** These can lose the user's text or commit a wrong message.
2. **R3-M3, R3-M4, R3-M7, R3-M8.** These are the edges of the common case: the shared references, the recompute, 4e and amend detection.
3. **R3-M9, R3-M10, R3-M11, R3-M12, R3-N3.** Without these, the stories cannot pass their own checks.
4. The remaining Minors.
