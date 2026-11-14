# Goldfish Review Report: commit relay

**Target:** `docs/specs/2026-11-13-commit-relay-design.md` (whole document, candidate at `0aa9ad4` plus working-tree edits)
**Date:** 2026-11-14
**Mode:** REVIEW. The design is only a proposal: nothing is implemented, and no tests or measurements were run. Every finding comes from reading the spec and the evidence it cites.
**Out of scope:** the user's decisions are not reopened. Those decisions are one sub-agent that persists for the whole task, and a per-task lifetime. The findings judge whether the design delivers them safely and simply.

## Reviewer Status

| Reviewer | Status | Inputs |
| --- | --- | --- |
| `egm-structural` | completed | spec, commit `SKILL.md`, `craft/build/SKILL.md` |
| `egm-style` | completed | spec only |
| `egm-comprehension` | completed | spec only, as required |
| `egm-codebase-details` | completed | cited evidence; the char-count table was not recounted |
| `egm-design` | completed | cited evidence |
| `egm-implementation-readiness` | completed | cited evidence, `scripts/eval.mjs`, `scripts/listing-size.mjs` |
| `egm-zoom-out` | completed | cited evidence |
| `egm-inventive-catalyst` | completed | spec, commit references, hook |

**Severity breakdown (after deduplication):** 5 Blocker, 17 Major, 9 Minor.

**Main cause:** a drafted message is never tied to the exact index it describes, and the drafter is held back by prompt text, not by what it is able to do. B1, B3, M4, M5 and M8 all come from this. Two changes close most of the wrong-commit paths: (1) every `done` reply echoes the index it read, and (2) the drafter cannot commit or write.

---

## Blockers

### B1. A `done` reply carries a message and a staging proposal together, so the message describes the wrong files
- **Lenses:** design, codebase-details, implementation-readiness, comprehension
- **Scope:** §1 "Propose, never apply"; §3 Replies; R3-M1 "stale draft" (not taken up)
- **Problem:** `done` returns `result` together with `proposal` (`stage`, `unstage`, `split`). The drafter wrote the message against the index as it was *before* the proposal. The parent applies the proposal, takes a new baseline, and then shows and commits the old message. The spec also does not say whether the user approves the proposal, or what `result` covers when the proposal is a `split`.
- **Failure case:** Step 4e finds a related test (`references/atomicity-analysis.md:81-83`), and the user chooses "stage related". The drafter returns `done` with `stage: [tests/foo_test.go]` and a message about `src/foo.go` only. The parent stages the test and commits. The commit contains a file its message never mentions, and the parent cannot notice because it never saw the diff.
- **Fix:** A reply that carries a non-empty proposal gets its own status (`status: proposal`) and carries no `result`. The parent then:
  1. shows the proposal to the user;
  2. applies it;
  3. takes a new baseline;
  4. resumes the drafter once per group with `files: <group>`.

  Only that resume returns `done` with a message. Also define what `files: [paths]` means to the drafter.

### B2. Draft-only mode and sub-agent detection conflict; the drafter can run the full inline flow
- **Lenses:** structural, comprehension, style, inventive-catalyst, codebase-details, implementation-readiness, design
- **Scope:** §4 Nesting (claims to resolve R3-B4); §6 line 87; §7
- **Problem:** The drafter is a sub-agent, and it loads `SKILL.md`. Two rules then apply to it and contradict each other:
  - §6: "if the parent is itself a sub-agent, the whole flow runs inline".
  - §4: "only `relay-depth` makes a commit skill draft-only".

  The spec sets no order between them. It also names no signal that tells a skill it is running inside a sub-agent, which R3-B4 already flagged as "no detection".
- **Failure cases:**
  - **Inline check runs first:** the drafter runs Steps 1–9. It asks questions it cannot relay, and it stops at Step 8 ("No UI is not approval") without a `relay` block. That reply is malformed, so it counts as `failed`. The parent starts a second drafter, which fails the same way, and then falls back inline. Both drafter setups are wasted on every first commit.
  - **Implementer sub-agent:** a `craft:build` implementer finds no marker, reads the Claude Code dispatch instructions and tries the Agent tool. It has no fallback for a first dispatch that fails.
- **Fix:**
  - Have the drafter skip `SKILL.md` entirely. Move Steps 3–7b into `references/draft.md`. The agent body reads `draft.md` directly, and the inline path in `SKILL.md` reads the same file. `relay-depth` can then be deleted.
  - Make the sub-agent test mechanical: dispatch only when the harness has the relay enabled and the dispatch tool is in the current tool list. In every other case, run inline. A first dispatch that fails goes straight to inline.

### B3. The drafter is able to commit or destroy work; the cited guard does not stop it
- **Lenses:** codebase-details, design, zoom-out, inventive-catalyst, implementation-readiness
- **Scope:** Evidence line 33; §1; §5; §7 (`tools: Read, Grep, Glob, Bash`); Risks
- **Problem:** Several facts combine:
  - The hook lets through any command prefixed `__GIT_COMMIT_PLUGIN__=1` (`hooks/commit-tools/scripts/intercept-git-commit.sh:118`), and `lib/commit.sh:45` accepts that prefix.
  - The drafter reads `SKILL.md`, which leads to `references/execute-commit.md:8`, which contains the exact command.
  - `relay-depth: 1` appears only in the first dispatch, so compacting the drafter's growing context can drop it.
  - `git checkout --`, `git restore` and `git reset` are never blocked.
  - The hook does nothing when `jq` is missing (line 8).
  - agent-plugins carries no hooks.

  The fingerprint only detects a change after it has happened. On a mismatch, the parent stops and does not repair anything.
- **Failure cases:**
  - After compaction the Sonnet drafter follows Steps 8–9. It reads "user asked to commit" in the session summary as approval and runs `commit.sh` with the token. An unconfirmed commit now exists.
  - The drafter runs `git checkout -- src/x.ts` while inspecting the file, and uncommitted work is lost with no recovery.
- **Fix:**
  - Pick a real control:
    - **Preferred:** the parent writes a snapshot (staged diff, status, log, `show HEAD`, amend facts) to a temp directory using shell redirects, passes `snapshot: <dir>`, and gives the drafter only `Read, Grep, Glob`. The parent runs `style-check.sh` on the returned message.
    - **Otherwise:** add a PreToolUse allowlist for the drafter only, and make `commit.sh` refuse to run when a drafter marker is set.
  - Put "draft only; never run `commit.sh`" in the agent body (its system prompt), and repeat it in every resume block.
  - Correct Evidence line 33.

### B4. The 3k target for later commits cannot be met as defined
- **Lenses:** implementation-readiness, zoom-out, codebase-details, design, structural, style
- **Scope:** §8; Why line 20; §3 (`result` up to 4,000 chars); §1 (session summary up to 1,000 chars)
- **Problem:** The spec says itself (line 20, and `SKILL.md:17`) that each `/commit` loads `SKILL.md` again: about 7.1k, up to 8,000 bytes. On top of that, the message enters the parent three times: the relay `result`, the confirmation dialog, and the Write of `MESSAGE_FILE` (`execute-commit.md:5`). Add the dispatch `context`, the Step 1 `--stat` output, two fingerprint runs, the `commit.sh` output and `git log -1`. Meanwhile §3 accepts a 4,000-char `result`, which is already over the 3k target.
- **Failure case:** The second `/commit` of a task fails Story 2's target as soon as `SKILL.md` loads, before any relay traffic.
- **Fix:** Pick one:
  - define how a later commit avoids the reload (for example, while a live `commit-drafter:` line exists, the parent follows a short block in `relay.md` instead of invoking the skill again); or
  - set the target to `SKILL.md` plus the measured relay parts, roughly 5–6k on top of `SKILL.md`.

  Then cap `result` at what the target can hold.

### B5. Story 2's eval cannot be built with the current eval runner
- **Lens:** implementation-readiness
- **Scope:** Stories, Story 2 Verify
- **Problem:** `scripts/eval.mjs` runs one non-interactive prompt per case, with `cwd: repoRoot`. Today's commit-tools cases allow only `[Read, Glob, Grep, Skill]`, and their graders forbid real commits.
- **Failure case:** A second commit requires the first one to be confirmed and executed. `SKILL.md:19` stops a non-interactive run before it commits, so no resume can happen. There is no fixture repository either, so a real commit would land in the skills repo itself. And without `Agent` and `SendMessage` in the allowed tools, the parent cannot dispatch at all.
- **Fix:**
  - Replace the eval with a scripted test:
    1. Build a temp git repo with two staged concerns.
    2. Run `claude -p`, then answer through `--resume <session>`.
    3. Parse the stream-json for exactly one `Agent` call with `subagent_type: commit-tools:commit-drafter` and one `SendMessage` to the same id.
  - Keep a plugin eval only for "first commit dispatches the drafter and stops at the confirm dialog", and list its `allowed_tools`.

---

## Major

### M1. The shared copy step misses three adapters, and the story order ships Claude Code relay text everywhere
- **Lenses:** codebase-details, zoom-out, implementation-readiness, style, structural
- **Scope:** Evidence line 32; §6; Stories 2–3
- **Problem:**
  - Evidence line 32 is wrong. `harnesses/claude-code/adapter.mjs:49`, `harnesses/antigravity/adapter.mjs:74` and `harnesses/agent-plugins/adapter.mjs:45` copy with `copyLayout`, not `copyRewrittenSkills` or `rewriteTree`.
  - The source `relay-dispatch.md` holds the Claude Code instructions, and Story 2 ships it before Story 3 adds the writer that replaces it.
  - The Story 3 test checks only Claude Code, Codex, Pi and agent-plugins.
- **Failure cases:**
  - Antigravity ships the Claude Code `subagent_type`/`SendMessage` text and dispatches before its smoke check, which is exactly what the rejected "probe at runtime" alternative was meant to prevent.
  - Between Stories 2 and 3, every harness gets that text.
  - If the writer runs after the name rewrite, OpenCode names an agent id that does not exist on that harness.
- **Fix:** Reverse the default:
  - The source `relay-dispatch.md` says `Relay: inline on this harness.`
  - The Claude Code adapter alone overwrites it, next to its `restatePicker` loop.
  - Each enable story adds its own override.

  This removes the `capabilities.relay` field and the shared writer. Fix Evidence line 32, and make the test cover all seven harnesses.

### M2. The drafter agent ships on harnesses whose relay is inline, with every tool
- **Lenses:** codebase-details, zoom-out, implementation-readiness
- **Scope:** §6 line 88; §7; R3-M6 (only partly addressed)
- **Problem:** "Ships where the harness ships agents" covers OpenCode, omp and Antigravity, which stay inline until their own stories. Their adapters drop `tools` and `model`:
  - OpenCode: `harnesses/opencode/adapter.mjs:113-117`
  - omp: `harnesses/omp/adapter.mjs:91-95`
  - Antigravity: `harnesses/antigravity/adapter.mjs:119`
- **Failure case:** After Story 2, OpenCode lists `commit-tools-commit-drafter` on every request. A model can dispatch it outside any relay or fingerprint, and it gets write tools there.
- **Fix:** Emit the agent only where the relay is enabled (Claude Code in this epic). Everywhere else, report `degraded (relay)`.

### M3. The Pi switch depends on a runtime fact, but the switch is decided at build time
- **Lenses:** structural, style, implementation-readiness
- **Scope:** §6 table; Story 3; Story 7; Alternatives
- **Problem:** "Only when `pi-subagents` is present" depends on whether an extension is installed, which only the user's machine knows, and the Alternatives table rejects runtime probing. Pi also has `agents: { mode: "none" }` (`harnesses/pi/adapter.mjs:21`), so Pi has no drafter to dispatch.
- **Failure case:** After Story 7, a Pi user without the extension gets instructions to `resume` and the commit fails. Story 3's Pi assertion also breaks once Story 7 lands.
- **Fix:** Move Stories 4–7 to follow-up issues (see M13). If Pi stays in this epic:
  - name the runtime check, listed as an exception in Alternatives;
  - say how the agent file reaches `pi-subagents`;
  - make Story 3's Pi assertion depend on the extension state.

### M4. No reply is tied to the index or turn it was drafted for
- **Lens:** design
- **Scope:** §2 (resume reuses context); §3; §5 lines 79–80
- **Problem:** The parent takes a new baseline before every resume, so the fingerprint only covers time while the drafter runs. Nothing checks that the index the drafter read on an earlier turn is still current. Replies carry no turn or drafter id, and a fallback can leave an earlier drafter still running.
- **Failure cases:**
  - While answering an atomicity question, the user runs `git add other.go` in a terminal. The parent takes a new baseline and resumes. The drafter writes from the diff it read earlier, and the commit includes a file its message does not describe.
  - A resume to drafter A times out and the parent starts drafter B. A's late `done`, written for the previous commit, arrives first and is shown for confirmation.
- **Fix:**
  - Each dispatch and resume sends `head`, `index` (from `git write-tree`) and `turn: <id>/<n>`.
  - `done` echoes the `index` it read in that same turn, plus the `turn`. Any mismatch counts as malformed.
  - The parent re-checks HEAD and the write-tree right before `commit.sh`, and redrafts if either changed.

### M5. The fallback "answer log" is undefined and can apply an answer to the wrong question
- **Lenses:** comprehension, structural, inventive-catalyst, design, style
- **Scope:** §2 line 57; §3 (question ids are free-form)
- **Problem:**
  - No dispatch field carries the log.
  - A compaction drops the log together with the id.
  - The drafter invents question ids, and a fresh drafter re-analyses the diff from scratch, so its ids and order differ.
  - "its answer log" and "once" are ambiguous.
- **Failure case:** The old `q1` was "stage the related test?" (the user answered yes). The new drafter's `q1` is the detected-amend question. The replayed "yes" amends HEAD instead of making a new commit.
- **Fix:** Drop the replay: a new drafter asks again, and only state the parent has already applied (the index) carries over. If you keep the replay, fix the question ids in `relay.md` (`atomicity`, `related_unstaged`, `split_order`, `amend_detected`), send them in an `answers` dispatch key, and drop any answer given against a different index.

### M6. The fingerprint misses changes that R3-M1 listed
- **Lenses:** structural, codebase-details, design, implementation-readiness
- **Scope:** §5; Risks ("checked by the fingerprint")
- **Problem:** The fingerprint uses:
  - plain `git diff`, not `--binary`;
  - untracked file names only, not their contents;
  - no `for-each-ref`;
  - nothing for the gitignored `.claude/git-commit.local.md` (`.gitignore:29`);
  - a hard-coded `.git/config`, which cannot be read in a linked worktree, where `.git` is a file.
- **Failure cases:** Each of these goes undetected while the parent reports success:
  - a rewrite of an already-modified binary;
  - edits to an existing untracked file;
  - `git branch -f other <sha>`;
  - a drafter changing `commit_style` or `pairs` in the settings file, which affects later commits.

  In a worktree, the script fails outright.
- **Fix:**
  - Use `git diff --binary`.
  - Hash untracked contents (`git ls-files -o --exclude-standard -z | xargs -0 git hash-object`).
  - Add `git for-each-ref`.
  - Hash the settings file.
  - Read config from `$(git rev-parse --git-common-dir)/config` plus `config.worktree`.
  - Extend the Story 1 test to cover each of these.

  Alternatively, B3's snapshot fix makes §5 unnecessary.

### M7. A single hash cannot report what changed, and outside edits stop the commit with a false accusation
- **Lenses:** comprehension, zoom-out, codebase-details, design, style
- **Scope:** §5 lines 77 and 81
- **Problem:** The script "prints one hash", yet the parent is expected to "report what differs". The working tree, the untracked files and the stash also change because of IDE autosave, formatters, file watchers, the user, or parallel `craft:build` implementers. Any such change produces `failed: drafter mutated repo`, a hard stop with no inline rerun.
- **Failure case:** The user saves a file during a `needs_input` round. The commit is refused, the drafter is blamed, and the user cannot tell what changed.
- **Fix:**
  - Print one line per component.
  - Changes to HEAD or the index mean redraft.
  - Changes to config, hooks, refs or the settings file mean a hard stop.
  - Changes to the working tree, untracked files or the stash mean "show the change, then Redraft / Stop".
  - Rename the failure to `repository changed during drafting`.

### M8. Edited messages lose the mandatory leak strip and the Auto-fix path
- **Lenses:** inventive-catalyst, codebase-details, design
- **Scope:** §3 reserved id `edit`; `references/confirm-flow.md:27-33`
- **Problem:** Today an edited message must pass the content leak check, and leaked content is stripped silently. A style failure offers Re-edit / Auto-fix / Commit anyway. Under the relay, the drafter returns the text "verbatim with `warnings`". The parent does not have `content-leak-check.md`, and `commit.sh` does not check for leaks (`execute-commit.md:12`). If the parent commits the drafter's echo, it may also commit text the user never approved.
- **Failure case:** The user adds `Closes: beads-xyz` while editing. The drafter returns it unchanged with a warning, and the tracker reference is committed.
- **Fix:**
  - The parent commits the user's own text.
  - For `edit`, the drafter returns the leak-stripped text plus what it removed, and the style result arrives as `needs_input` id `edit_style` (Re-edit / Auto-fix / Commit anyway).
  - Any text the drafter changed goes back through the confirm dialog before the commit.

### M9. Proposal paths reach `git add` and `git reset` unchecked
- **Lens:** design
- **Scope:** §1; §3 `proposal`
- **Problem:** The drafter reads diffs it does not control, so a diff can steer what it proposes. The `stage` and `unstage` path lists have no format and no validation.
- **Failure case:** The drafter proposes `stage: ["."]`, or an untracked `.env`. The parent stages a secret, and under B1 commits it under a message that does not mention it.
- **Fix:** Accept only paths that are in the parent's own `git status --porcelain -z` output and in the list the user approved. Apply them as literal pathspecs after `--`. Treat anything else as malformed.

### M10. The relay block format is underspecified
- **Lenses:** implementation-readiness, comprehension, style, codebase-details
- **Scope:** §3
- **Problem:** The spec does not settle:
  - whether the block body is YAML;
  - the shape of a `split` group;
  - whether `options` are strings or objects;
  - whether `choice` is a label or an index;
  - the types of `amend.detected`, `style_violation` and `warnings`;
  - what `result` contains when an amend is detected, and what answer accepts the amend (only `choice: false` is defined);
  - which keys a resume must repeat;
  - the types of `style` and `skill-dir`.

  In addition, `[all staged]` parses in YAML as a one-item list. Keys mix dashes and underscores (`relay-depth` versus `co_author`), and `amend` names three different things (a dispatch flag, a reply field and an answer id). R3-M8 is fixed in substance but never cited.
- **Failure case:** Story 2 writes the parent and the agent prompt separately. They disagree on label versus index, so every answer is misread. Or the split groups come back as prose, the malformed rule does not catch it, and `git reset HEAD <files>` has nothing to parse.
- **Fix:**
  - Give one worked YAML example per message: dispatch, resume, `needs_input`, `done`, `proposal` with split, `failed`, answers.
  - Add a field table with types.
  - Use `files: all`.
  - Define `split: [{label, files: [...]}]`.
  - Add `amend: accept | new`.
  - Use one key naming style throughout.
  - Tag the section "resolves R3-M8".

### M11. Failure kinds have no defined actions
- **Lenses:** comprehension, implementation-readiness, design
- **Scope:** §2 fallback; §3 malformed and `failed`
- **Problem:** §2 covers only a lost id and a failed resume with the repository unchanged. The spec does not say how each of these is handled:
  - a drafter-reported `failed`;
  - a malformed reply;
  - a tool error;
  - a failed first dispatch.
- **Failure case:** The drafter correctly returns `failed: nothing staged`. The parent restarts it, it fails again, and the parent loads the roughly 38k inline flow just to report an error. The reverse also happens: a single malformed reply ends a commit that one restart would have recovered.
- **Fix:** Add a table that maps each failure kind (tool error, malformed reply, drafter `failed`, mutation, first dispatch) to one action: restart, inline, or stop and report.

### M12. "Task" and drafter freshness are left to model judgement
- **Lenses:** comprehension, design
- **Scope:** §2 line 56
- **Problem:** No rule decides when a request is new, and no mechanism retires an old id. The resumed drafter "already holds the style", but the spec does not say it reloads when `style`, `co_author` or `skill-dir` change.
- **Failure cases:**
  - The user moves from "fix login redirect" to "update README badges". The parent resumes the old drafter, and the new body explains the login change.
  - The user passes `--style conventional` on the second commit. The drafter keeps the classic rules, and `commit.sh --style conventional` rejects the result.
- **Fix:** Record `commit-drafter: <id> scope=<story-id|user-turn> style=<s> dir=<skill-dir>`, and resume only when all of these match. Each dispatch's `context` replaces the previous one.

### M13. The cost argument counts only the parent, so total cost can rise
- **Lenses:** zoom-out, structural
- **Scope:** Why; §8
- **Problem:**
  - "150k chars" measures how much text sits in the context, not what is billed. Cached re-sends bill at about 0.1x, the point round 1 raised in M7.
  - The drafter's own system prompt, the ~38k of skill text, the diffs and every resume are never counted.
  - `craft:build` makes its commits inside implementer sub-agents (`skills/craft/build/SKILL.md:28`), and §4 runs those inline, so they gain nothing.
- **Failure cases:**
  - A task with one commit: the parent uses up to 18k and the new drafter about 48k or more, all as cache writes, against about 50k inline today. The task costs more.
  - Commits more than 5 minutes apart: each resume re-bills the drafter's growing transcript at the full rate.
- **Fix:**
  - Add a total-token target (parent plus drafter) for two reference tasks: one with a single commit, and one with three commits spaced more than 5 minutes apart.
  - Restate 150k as context occupancy, not billed cost.
  - Name `model: sonnet` as the saving that applies even to a single commit.
  - Add a Goals and Non-goals section that lists implementer commits, inline harnesses and history replay as non-goals.

### M14. Neither target has a defined way to measure it, and the two are counted on different bases
- **Lenses:** implementation-readiness, structural, style, codebase-details
- **Scope:** §8
- **Problem:**
  - "Headless session, summing what enters the parent's context" has no script, no counting rule and no fixture.
  - The first-commit target counts skill text only, but the "~50k today" figure includes the diff and the git output.
  - The 18k list leaves out files the parent owns: `repository-state.md` (Step 1), `atomicity-warning-flow.md`, `pair-programming.md`, `error-messages.md`.
  - The estimated parent files already total about 17k before `relay.md` is counted.
  - `a49bc4c` is a single commit, so it has no "later commit" to measure.
- **Failure case:** Two implementers count the same run differently, and one passes Story 2 while the other fails it.
- **Fix:**
  - Name a script (for example `scripts/commit-context-size.mjs` over a stream-json transcript) and state what counts.
  - Give the fixture: `git checkout a49bc4c^ && git cherry-pick -n a49bc4c`, plus a second staged change for the later commit.
  - Give each parent file its own budget.
  - Split the files into those read on every commit and those read only on some paths.

### M15. No byte budget for what `SKILL.md` must gain
- **Lens:** implementation-readiness
- **Scope:** Story 2; §4, §6
- **Problem:** The generated copy is checked against 8,000 bytes (`scripts/listing-size.mjs:66`). On Claude Code, `restatePicker` adds about 105 bytes, which leaves about 750 bytes free. The spec implies that `SKILL.md` gains several rules: dispatch-first, the inline conditions, draft-only mode, the id rule, the fallback rule and the fingerprint rule. Meanwhile the inline flow must stay "unchanged".
- **Failure case:** A natural write-up of those rules fails `skillSizeErrors`.
- **Fix:** Specify the exact lines `SKILL.md` gains, at most about 500 bytes: a three-line Relay section that points to `relay.md`. Everything else goes into `relay.md`.

### M16. Antigravity's direct asks contradict "the drafter never talks to the user"
- **Lenses:** comprehension, style, implementation-readiness
- **Scope:** §3; Story 6
- **Problem:** Story 6 lets `needs_input` be skipped because Antigravity sub-agents can ask the user directly. §3 says the drafter never talks to the user.
- **Failure case:** The drafter calls `AskQuestion`. The parent never sees the answer, which bypasses the parent-owned dialogs and breaks the §2 fallback.
- **Fix:** Keep the drafter relay-only on every harness, and drop the aside in Story 6.

### M17. Reference files that need a relay branch are not listed
- **Lens:** implementation-readiness
- **Scope:** §1; Story 2
- **Problem:** Some references describe the inline flow only:
  - `confirm-flow.md` says "re-run Step 7b" for Edit and "regenerate from Step 7" for Regenerate;
  - `atomicity-warning-flow.md` describes the split loop;
  - `execute-commit.md` item 3 describes the continue prompt.

  In relay mode these steps belong to the drafter or the parent, and the inline path must not change.
- **Failure case:** The parent follows `confirm-flow.md` as written and regenerates inline. That loads the style and generation references, and the savings are lost.
- **Fix:** Add a per-story file-change list. For each reference, give the relay-mode change and the inline behavior that must not change.

### M18. No story verifies the R3-B4 or R3-M1 fixes end to end
- **Lens:** structural
- **Scope:** Stories 1–2
- **Problem:** Story 1 tests the fingerprint script, not how the parent uses it. Story 2 checks the evals, dispatch-once and the targets only.
- **Failure case:** B2 ships, or the parent never compares fingerprints, and every story still passes.
- **Fix:** Add three checks:
  - a commit made inside a sub-agent runs inline;
  - the drafter never reaches Step 8 or Step 9;
  - a changed fingerprint makes the parent stop.

---

## Minor (Nit)

| ID | Scope | Problem and failure case | Fix |
| --- | --- | --- | --- |
| N1 | §1, §4 | Only Steps 1, 2, 6 and 8–9 have owners. The implementer has to guess who owns Steps 3–5 and 7, and a dialog step (for example the leak confirmation) can land in the drafter. | List every `SKILL.md` step with its owner. |
| N2 | §3 one amend path | Amend detection runs in the drafter, which sees only a 1,000-char summary. `commit.sh` checks local refs only. The user said "I pushed that from my laptop", the local refs are stale, and a published commit is amended. | When `amend.detected` is accepted, the parent runs the conversation part of the safety check (`last-commit-comparison.md:15-16`). |
| N3 | §6 | The Claude Code relay text lives in two places: the source `relay-dispatch.md` and `capabilities.relay`. They drift apart. | State which one is the source of truth. M1's fix removes the duplicate. |
| N4 | Header, §4–§8 | `R3-*`, `skills-wisp-czi`, "promoted", "executor token", "omp" and the bare `:38`/`:39` are not linked or defined. Readers cannot check what the spec claims to resolve. | Link `docs/specs/reviews/2026-11-13-token-diet-egm-review.md`, write full `file:line` references, and define each term in one line. |
| N5 | Whole doc | There is no file list. The following are not named, so `tests/build/claude-snapshot.test.mjs` breaks unexpectedly: the fingerprint test path, the Story 3 test, the eval directory, the `tests/fixtures/claude-snapshot.json` update, the `registry.json` entry and the harness READMEs. | Add exact repository-relative paths for each story. |
| N6 | Header vs Review record | The header says "candidate, under review" and the record says "Pending". A reader cannot tell whether review has started. | Use one status in both places. |
| N7 | Risks, last bullet | "Costs one extra setup" leaves out the case where the restart also fails and the commit falls back inline (about 50k). The risk is understated. | Add the inline worst case. |
| N8 | §8, Why | "6-file reference change" reads as "a change to 6 reference files", and the later-commit diff is never named. The measurements cannot be compared. | Refer to `a49bc4c` by hash in §8, and name the second change. |
| N9 | §1, §8 | The "Review changes" option (atomicity warning, 4e) means "show the diff". If the parent runs `git diff` for it, both targets fail. | Say whether the parent shows `git diff --stat` or the drafter returns a summary as `needs_input`. |

---

## Verified as accurate (no finding)

`codebase-details` confirmed these claims:
- Every reference listed on line 15 exists.
- `lib/commit.sh` and `lib/style-check.sh` exist.
- The `SKILL.md:19` quote is exact.
- Steps 1, 2, 6, 8 and 9 mean what the spec says.
- `commit-tools.resources.agents` is `[]` (`registry.json:166`).
- `validateAgents` checks only the description (`scripts/lib/skills.mjs:158-176`), so `model` and `tools` are allowed.
- `validateReferences` accepts `relay-dispatch.md` when a source copy exists.
- The resume and ask claims match `docs/research/2026-11-13-token-levers.md:38-39`.

`codebase-details` did not recount the char-count table. Its rows sum consistently.

## Unverified

- Whether a Claude Code sub-agent lacks the Agent tool. B2's mechanical detection depends on this.
- Whether a repeat Skill invocation puts `SKILL.md` back into the context. B4 depends on this.
- The cache lifetime for sub-agent resumes. M13 depends on this.
- Whether plugin agents support PreToolUse hooks scoped to that agent. One of B3's alternatives depends on this.
