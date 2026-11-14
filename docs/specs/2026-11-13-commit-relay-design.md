# Commit drafting in a per-task sub-agent

Part 5 of the token diet (`docs/specs/2026-11-13-token-diet-design.md`). Issue: `skills-wisp-czi`. **Status: approved (v7.1: drafter rules copied into the snapshot after the Story 3 gate spike).**

Reviews so far:

| Round | Spec | Report |
|---|---|---|
| 1 | v1 | `docs/specs/reviews/2026-11-14-commit-relay-egm-review.md` |
| 2 | v2 | `docs/specs/reviews/2026-11-14-commit-relay-egm-review-r2.md` |
| 3 | v3 | `docs/specs/reviews/2026-11-14-commit-relay-egm-review-r3.md` |
| 4 | v4 | `docs/specs/reviews/2026-11-14-commit-relay-egm-review-r4.md` |
| 5 | v5 | `docs/specs/reviews/2026-11-14-commit-relay-egm-review-r5.md` |
| 6 | v6 | `docs/specs/reviews/2026-11-14-commit-relay-egm-review-r6.md` |

Ponytail findings and the round-3 dispositions are at the end.

## Why

`commit-tools:commit` runs on almost every task. Each run puts its workflow and the staged diff into the main conversation, and every later request sends that again.

File sizes at `0aa9ad4`, read by the inline flow on every commit:

| What | Chars |
|---|---|
| `SKILL.md` (loaded again on every `/commit`) | 7,113 |
| `styles/classic.md` | 8,331 |
| 13 references: repository-state, gather-context, last-commit-comparison, atomicity, atomicity-analysis, style-loading, session-context, message-generation, message-validation, content-leak-check, confirm-flow, message-dialogs, execute-commit | 22,623 |
| Staged diff of the 6-file commit `a49bc4c` (about 10k), plus git status, log and check output (about 2k) | ~12,000 |
| **Per commit** | **~50,000** |

These are estimates from file sizes. Story 3's gate measures both flows with one counting rule (section 8), and the acceptance is set against that measurement.

## Decisions (user, 2026-11-14)

- A sub-agent is acceptable only if **one sub-agent stays for the whole task**, so its setup is paid once.
- **Lifetime: per task.**
- **Claude Code only** in this epic; the other harnesses are parked.
- **Common case only.** The drafter drafts the message for what is staged, and redrafts on Regenerate or Edit. A split, related unstaged files, an amend, or nothing staged runs the existing inline flow for that commit.

## Evidence

- **Resume.** Claude Code resumes a sub-agent with `SendMessage(to: <id>)` (`docs/research/2026-11-13-token-levers.md:39`).
- **No direct questions.** A Claude Code sub-agent cannot ask the user (`:38`).
- **Tool limits.** Claude Code honors an agent's `tools` and `model`. The OpenCode, omp and Antigravity adapters drop or remap them, so a drafter shipped there would get every tool.
- **Model loading.** `runAdapters` loads each plugin's model inside the per-adapter loop, just before calling `adapter.generate` (`scripts/lib/adapters/index.mjs:46-48`). A filter applied right after that call reaches every adapter. `tests/build/listing-size.test.mjs:24-30` counts agents from the unfiltered model and must use the same filter.
- **`optional` won't work as a filter.** `harnesses.<id>.optional` names hooks only, and skips one only when the harness cannot carry it (`scripts/lib/transforms/policy.mjs:25`). It cannot leave a resource out.
- **The commit guard has a bypass.** `hooks/commit-tools/scripts/intercept-git-commit.sh:118` lets through any command prefixed `__GIT_COMMIT_PLUGIN__=1`, and `references/execute-commit.md` documents that command. A drafter with Bash could commit by copying it.
- **Step 1 pulls in the whole diff.** `references/repository-state.md:12` reads the staged changes with an MCP tool that returns the full diff into the parent.
- **Approval rule.** `SKILL.md:19`: a non-interactive run stops before committing unless the exact message was approved.
- **Size cap.** `SKILL.md` is 7,113 bytes against the 8,000 cap.
- **Evals.** The commit-tools evals allow only `[Read, Glob, Grep, Skill]`, run without a staged repository and grade read-only. They cannot exercise the drafter.
- **Gate spike, 2026-11-14** (a probe plugin with a `Read, Grep, Glob` agent, `claude -p` in default mode):
  - a later `claude -p --resume` turn reached the same agent with `SendMessage`, and the agent quoted its earlier reply, so the per-task drafter works;
  - `SendMessage` is a deferred tool (the parent loads it first), and the resumed agent's reply arrives after the turn's first result;
  - the agent read files under `.git/` with no rule;
  - **neither the agent nor the parent could read a file in the plugin folder** (outside the repository) without a rule, including a skill reading its own `references/`. This holds for today's inline flow too. Hence §3 copies the drafter's rule files into the snapshot.
- **Still unverified until the Story 3 gate:**
  - whether a Claude Code sub-agent can be resumed from a later `claude -p --resume` turn of the same session;
  - whether a sub-agent can read files under `.git/` and under the plugin's skill folder without a permission prompt, in a normal checkout and in a linked worktree. The main session can: a probe on 2026-11-14 read under `.git/` with no rule. The same probe showed that writes under `.git/` are refused whatever the rule, and that writes outside the repository need an `Edit(//<path>/**)` rule.

## Design

### 1. Who does what

| Step | Owner |
|---|---|
| Arguments; Step 1; Step 2 settings and style; Step 6 `--pair`; the session summary | parent |
| Snapshot and binding check (sections 3–4) | parent |
| Drafting a message for the staged changes; the leak check on drafts and edits; deciding whether the commit is the common case | drafter |
| Subject style check (`lib/style-check.sh`) on every draft and every edit | parent |
| Confirmation dialog and `lib/commit.sh` | parent |
| Splits, related files, amends, nothing staged, history replay | parent, inline flow, unchanged |

- **Step 1 always uses `git diff --staged --stat`**, on both flows, instead of the MCP diff. Step 1 only needs to know what is staged. On the inline flow, Step 3 still reads the full diff as today.
- **The parent goes inline before dispatching** when any of these holds: an explicit `--amend`, nothing staged after Step 1, `snapshot-failed`, or this commit was already handed to the inline flow. Everything else is dispatched, and the drafter decides whether it is the common case.
- **On the relay, Step 6 runs before the dispatch,** so the `--pair` co-author goes in the dispatch.
- **The parent does not run Step 5 on the relay.** It sends the style name resolved in Step 2, and the drafter reads the style file. The parent passes only the file's path to `lib/style-check.sh`, never its content.
- **Every relay rule lives in `references/relay-dispatch.md`.** The inline references (`confirm-flow.md`, `message-dialogs.md` and the rest) keep their behavior, so the inline flow never dispatches, and the harnesses without a drafter are unaffected. Three one-line changes apply to both flows:
  - `repository-state.md`: Step 1 uses `--stat`.
  - `execute-commit.md`:
    - the message file goes in `/tmp/commit-tools-msg/`, outside the repository, written directly with the file-write tool (the gate run on 2026-11-14 showed `${TMPDIR:-/tmp}`, `mkdir` and `mktemp` resolving to different folders) (Claude Code refuses writes under `.git/` whatever the allow rule, observed 2026-11-14);
    - the `commit.sh` call is written on one line with a literal path.
  - `message-validation.md`: the style check is called as the literal `bash <lib>/style-check.sh "<subject>" <style-file>`.
- **Handing off to the inline flow.**
  - It runs from Step 1, keeping the style, co-author and `args` already resolved, so `--pair` is not asked again.
  - The commit is marked as handed off, so the relay switch (section 7) skips the relay for it and the hand-off cannot loop.
  - If a user edit exists, the inline flow still runs from Step 1. At the confirmation step it applies the user's current text to commit once, through the Edit branch of `confirm-flow.md` (its checks, no rewrite). On an inline split, the edit applies only to the first commit, and later concerns get generated messages.

### 2. The drafter

- **Agent:** `agents/commit-tools/commit-drafter.md`, with:
  - `name: commit-drafter`;
  - `model: sonnet`;
  - `tools: Read, Grep, Glob`: no Bash and no Write, so it cannot run git, commit or change files;
  - a one-line description saying that only the commit skill dispatches it.

  Its prompt: read `<snapshot-dir>/rules/references/draft.md`, follow it, and end every turn with one `relay` block. The drafter reads only under the snapshot folder, which needs no permission rule.
- **`references/draft.md`** is new and written for the drafter. It is linked from `relay-dispatch.md`, so reference validation passes.
  - **Inputs:** the snapshot files and the dispatch fields.
  - **Outputs:** the replies in section 5.
  - **Rule references it applies by name:**
    - `message-generation.md` and `message-example.md` for the message;
    - `content-leak-check.md` for the leak check;
    - `atomicity-analysis.md` checks 4a–4e, to detect a case that is not the common one;
    - `last-commit-comparison.md`'s overlap heuristic, only when the snapshot says `amend-eligible: yes`;
    - the style file named in the dispatch.
- **`draft.md` instructions:**
  - Use the snapshot files wherever a reference says to run git, and never run a command.
  - Where a reference says to ask the user or offer a choice, reply `inline` with the reason instead.
  - Read `staged.diff` to the end, in pages if needed, and check that every file in `staged.files` was covered.
  - Echo the token on the last line of `staged.diff`. It appears nowhere else, so it proves the diff was read to the end in this turn.
  - Treat the current dispatch as the only commit being drafted. Earlier snapshots in your history are not part of it.
  - If any snapshot file cannot be read, reply `inline: other`.
- **Related files (4e).** Unstaged or untracked files listed in the dispatch's `declined` are not reported as related. The parent adds paths to `declined` when the user picks "Proceed without" in an inline 4e dialog. The list lasts for the rest of the task.

### 3. Snapshot

`lib/snapshot.sh [--prev <dir>]`, run by the parent. It:

0. **Takes `--style <classic|conventional>`** for the rules copy below. With no style, it uses `classic`. Any other value prints `snapshot-failed bad-style`, and the commit runs inline.
1. **Computes the id:** `<head>-<tree>`, where `<head>` is the 12-character `HEAD` hash, or `root` when there are no commits, and `<tree>` is the 12-character `git write-tree` hash. `lib/snapshot.sh --id` prints only this id and is what the binding check calls.
2. **Writes a new folder** at `$(git rev-parse --absolute-git-dir)/commit-relay/<nonce>/`, where `<nonce>` is random. The folder holds:
   - `id.txt`;
   - `staged.diff` (`git diff --staged`, text only, no `--binary`), followed by one last line `relay-token: <token>`, where `<token>` is a second random value that appears in no other file, dispatch or path;
   - `staged.files` (`git diff --staged --name-only`, full paths) and `staged.stat` (for the drafter's reading only);
   - `unstaged.files` (`git diff --name-only`) and `untracked.txt`;
   - `head.txt`: the last 5 subjects, and the last commit's author and stat, or `no commits`;
   - `last-commit.diff` (`git show HEAD`; absent with no commits);
   - `amend-eligible.txt`: `yes` only when the last commit exists, its author email equals `git config user.email`, and no remote-tracking branch contains `HEAD` (`git branch -r --contains HEAD` is empty). Otherwise `no`.
   - `rules/`: copies of the drafter's files, laid out as in the skill, so every path the copied files already use resolves against `rules/` unchanged and the drafter never reads the plugin folder. The copies are:
     - `rules/references/draft.md`;
     - the rule references `draft.md` names: `message-generation.md`, `message-example.md`, `content-leak-check.md`, `atomicity-analysis.md`, `last-commit-comparison.md`;
     - `rules/styles/<style>.md`.

     That is about 30 KB. The list lives in `snapshot.sh`, and a test checks that every file `draft.md` and the copied references name is copied.
3. **Recomputes the id.** If the id changed while writing, it starts over once. If it changes again, it fails.
4. **Cleans up.** It deletes the `--prev` folder, which is the caller's own earlier snapshot, but only if that path is a direct child of this repository's `commit-relay/` folder; any other path is ignored. It also deletes any other `commit-relay/` folder whose modification time is more than 24 hours old. A folder modified within 24 hours, such as another session's, is never touched.
5. **Prints** `snapshot <id> <nonce> <files> <dir>`, where `<files>` is the number of lines in `staged.files`, and keeps the token to itself. The folder path comes last because it may contain spaces. On failure it prints `snapshot-failed <reason>`, for example `too-large` when `staged.diff` is over 400,000 chars. The commit then runs inline.
6. **`lib/snapshot.sh --token <dir>`** prints that folder's token. The parent calls it only when checking a reply, so the token never appears in a dispatch.

The diff never enters the parent. The parent never deletes snapshot folders itself (writes under `.git/` are refused); `--prev` and the 24-hour rule clean up.

### 4. Binding check

- **Every dispatch carries** the snapshot `id`, `dir` and `nonce`. Every reply echoes:
  - the `token` it read from the last line of that folder's `staged.diff`;
  - the `files` count it covered.
- **The check applies to `draft` and `checked` replies only.** The parent acts on an `inline` reply at once, without checking it, because handing off inline is always safe.
- **The parent discards a `draft` or `checked` reply** when either check fails:
  - its token differs from `lib/snapshot.sh --token <dir>`;
  - its `files` count differs from the count `snapshot.sh` printed for the current snapshot.

  It then dispatches once more. On a second failure, the commit runs inline, carrying the user's edit if one exists.
- **Right before `lib/commit.sh`, the parent runs `lib/snapshot.sh --id`.** If the id changed, the parent takes a new snapshot and dispatches again with a regenerate. It shows the new draft for confirmation, so a draft the user has not seen is never committed.
- **If the index is now empty**, the commit goes back to Step 1. A user edit is carried along and used once something is staged again.
- **If the user had edited the message**, the redispatch is an `edit:` of the current text to commit (section 5, with any leak removal or Auto-fix already applied), not a regenerate. The edit is kept, and a new leak and style check run on it. The dialog then shows the new `staged.stat` and says the staged files changed since the user's edit. The drafter may also reply `inline: atomicity` to an edit redispatch, which hands off with the edit (section 1).
- **Unstaged edits** do not change the id and do not stop the commit, because they are not part of it.

### 5. Relay messages

Relay messages are YAML in a fenced `relay` block. `references/relay-dispatch.md` defines each one, with an example.

**Parent to drafter: a dispatch.** Every message is a complete dispatch, so any field can change between commits.

| Field | Value |
|---|---|
| `snapshot`, `snapshot-dir`, `nonce` | from `snapshot.sh` |
| `style` | `classic` or `conventional` |
| `co_author` | `none` or `Name <email>` |
| `no_atomic_check` | true or false |
| `declined` | list of paths the user declined to stage in this task |
| `args` | the user's explicit `[context...]` text, which outranks `context` |
| `context` | session summary, at most 1,000 chars |
| one optional action | `regenerate: <text>` or `edit: <full message>` |

**Drafter to parent: one reply per turn.**

| `status` | Fields | Parent does |
|---|---|---|
| `draft` | `token`, `files`, `message` (at most 2,000 chars), `warnings` | the style check, then the dialog |
| `checked` (reply to `edit:`) | `token`, `files`, `removed` (leaked items found in the user's text, each quoted exactly), `warnings` | builds the text to commit (below), then the style check and the dialog |
| `inline` | `token` (optional), `reason` (`atomicity`, `related`, `amend`, `other`) | runs the inline flow (section 1 hand-off) at once, and keeps the drafter for later commits |

- **The text to commit, for an edit.** The user's text is the text as parsed from the Edit prompt (its `\n` convention applied), kept byte for byte from then on.
  - With `removed` empty, the text to commit is the user's text. `checked` is only a verdict.
  - With `removed` not empty, the parent deletes every exact occurrence of each `removed` item from the user's text itself, and that result is the text to commit. If an item does not appear verbatim in the user's text, the reply is malformed.

  The dialog shows both versions and names what was removed. The leak check on edits is mandatory, as it is on the inline flow: a removed item cannot be kept by editing it back in.
- **Order for an edit:** leak check (`edit:` then `checked`), then the text to commit, then the style check, then the dialog. Every choice in the dialog acts on the text to commit, so a removed leak is never brought back.
- **The status must fit the action.**
  - A reply to a plain dispatch or `regenerate:` must be `draft` or `inline`.
  - A reply to `edit:` must be `checked`, or `inline: atomicity` after the staged files changed (section 4).

  Anything else is malformed. If the drafter cannot check an edit, it replies `checked` with `removed` empty and a warning.
- **Malformed reply** (no `relay` block, no `status`, an unknown status, a status that does not fit the action, or a `draft` message over 2,000 chars): the parent resumes once, asking for a valid block. On a second malformed reply, the commit runs inline, with the user's edit if one exists.
- **Resume error:** the parent starts one new drafter for the rest of the task and records its id, replacing the old one (section 6). If that also fails:
  - the commit runs inline, with the user's edit if one exists;
  - the parent records `commit-drafter: none`, so the rest of the task runs inline.

**Dialogs.** These are defined in `relay-dispatch.md`, with the existing choices.

- **Draft dialog:** Commit / Edit / Regenerate / Cancel.
- **Style check fails on a draft:** the parent resumes once with `regenerate: subject failed the style check: <reason>`. If the subject still fails, the dialog adds Re-edit and "Commit anyway".
- **Style check fails on an edit:** the dialog offers Re-edit, Auto-fix and "Commit anyway", all acting on the text to commit.
  - **Auto-fix:** the parent rewrites line 1 itself to satisfy the reported rule, keeps every other line byte for byte, and runs the style check again. No drafter turn is needed.
  - **"Commit anyway"** commits the text to commit.

### 6. Per-task lifetime

- **Recording the id.** On the first dispatch, and whenever a replacement starts, the parent writes `commit-drafter: <id> | task: <one line>` into its reply, so the current id stays in the conversation.
- **One `/commit` is not a new task.** The parent reuses the drafter for every commit until one of these happens:
  - the parent compacts and the id is gone;
  - the current `craft:build` story closes;
  - the user starts a new piece of work, or says the task is done.
- **A wrong guess on the last point** costs one extra setup, or leaves the drafter carrying an unrelated earlier diff. Each dispatch is complete, and `draft.md` says to ignore earlier snapshots, so a wrong guess does not reach the message.
- **Inside a sub-agent** (for example a `craft:build` implementer) there is no Agent tool, so the commit runs inline.

### 7. Where it runs

- **New registry key:** `harnesses.<id>.exclude`, a map of resource path to reason.
- **New helper:** `applyExclude(model, plugin, harnessId)` in `scripts/lib/model.mjs` removes excluded agents from a model.
  - `runAdapters` calls it right after `loadPluginModel` and reports `excluded <path>: <reason>`.
  - `tests/build/listing-size.test.mjs` calls it too.
  - Validation rejects an excluded path the plugin does not list.
- **The drafter is excluded on every harness except Claude Code.** It is never generated there, so nothing can dispatch it.
- **The switch is the agent's presence.** At the start of Step 3, `SKILL.md` gains one pointer line, about 150 bytes, to `relay-dispatch.md`, which says:
  - use the relay only if all of these hold:
    - the `commit-tools:commit-drafter` agent is in your agent list;
    - you have the Agent and SendMessage tools;
    - the recorded drafter is not `none`;
    - this commit was not already handed to the inline flow;
  - otherwise continue inline.

### 8. Cost and acceptance

**Counting rule, the same script for both flows.** Over the `/commit` turn and the approval turn together, count the characters of the parent's own events in the stream-json. Sub-agent events are excluded: those with a non-null `parent_tool_use_id`. The gate confirms the field by asserting that the relay run excludes at least one event. The counted characters are:

- skill injections;
- tool inputs;
- tool results;
- the parent's text.

Story 3 measures both flows on the same named changes. Each fixture stores `before/` and `after/` versions of its files:

- `tests/fixtures/commit-relay/change-a/` holds the six files of commit `a49bc4c` at `a49bc4c^` (`before/`) and at `a49bc4c` (`after/`), so its staged diff is that commit's 10,233 bytes;
- `change-b/` is a second single-concern change of at least 3 files, with `before/` and `after/` versions.

**Each run starts from a fresh scratch repository** with a local bare remote, and every fixture's `before/` files committed as a seed commit and pushed. Applying a change copies its `after/` files over and stages them. The seed is pushed, so `HEAD` is never amend-eligible.

**Two named clean sessions**, each measured over the `/commit` turn and the approval turn, with no redraft:

- **`measure-inline`:** stage `change-a`, commit with `--disallowedTools Agent,SendMessage`, so the relay switch fails and the flow runs inline.
- **`measure-relay`:**
  - stage `change-a` and commit, which is the first commit of a task;
  - push;
  - stage `change-b` and commit in the same session, which is a later commit.

The T1–T6 run below checks behavior only and is not counted.

**Acceptance:**

| Commit | Relay parent context |
|---|---|
| First of a task | at most 55% of the measured inline baseline |
| Each later one | at most 35% |

Reading-based estimates for the reference change:

| | Estimate |
|---|---|
| Inline | ~50k |
| Relay, first commit | ~24–27k |
| Relay, later commit | ~13–17k |

- **The drafter's setup** is paid once per task, on Sonnet, outside the main context: about 35k for `draft.md`, the style file, its rule references and the diff.
- **One-commit tasks** cost more in total than today. The gain grows with every later commit in the task.
- **Common cases that turn out not to be** (`inline`) cost today's inline price, plus the drafter's setup if it was the task's first commit.
- **`craft:build` implementer sub-agents** gain nothing.

## Stories

1. **Snapshot and binding.**
   - **Touch:**
     - create `skills/commit-tools/commit/lib/snapshot.sh`;
     - create `tests/build/commit-snapshot.test.mjs`;
     - update `tests/fixtures/claude-snapshot.json`.
   - **The test, in temporary repositories, checks that:**
     - the folder and files are written under `--absolute-git-dir`, from the top level and from a linked worktree;
     - `--id` changes on `git add` and on a new commit, but not on an unstaged edit;
     - a repository with no commits works;
     - `amend-eligible` is `no` for another author and for a pushed `HEAD`;
     - `--prev` and 24-hour cleanup leave another folder alone, and `--prev` with a path outside `commit-relay/` deletes nothing;
     - `too-large` fails cleanly.
   - **Verify:** `npm test`, `npm run validate`.
2. **Excluding a resource per harness.**
   - **Touch:**
     - modify `scripts/lib/model.mjs` (`applyExclude`), `scripts/lib/adapters/index.mjs` (call and report) and `scripts/lib/registry.mjs` (shape and path validation);
     - modify `tests/build/listing-size.test.mjs`;
     - update `scripts/lib/README.md` and `CLAUDE.md` (the registry rules);
     - add a test under `tests/build/`.
   - **The tests check that:**
     - an excluded agent is missing from that harness's output only, and reported;
     - an unknown excluded path fails validation;
     - listing sizes still match.
     - **Absence in the real registry** (once Story 3 registers the drafter): every harness build except Claude Code contains no `commit-drafter`, and the Claude Code build does. This lands in Story 3, in `tests/build/commit-drafter-exclude.test.mjs`.
   - **Verify:** `npm test`, `npm run validate`.
3. **The drafter on Claude Code.**
   - **First:**
     - create and register the agent and `draft.md`, so the gate checks the real drafter;
     - extend `lib/snapshot.sh` with `--style` and the `rules/` copy, with tests in `tests/build/commit-snapshot.test.mjs` (the copy mirrors the skill layout, `rules/styles/` holds only the chosen style, every file named by `draft.md` and the copied references is copied, an unknown style fails with `bad-style`, and the token appears in no copied file);
     - create `tests/fixtures/commit-relay/` (`change-a/`, `change-a-extra.md`, `change-b/`, `change-mixed/`), so the gate can measure on it.
   - **Gate.** `scripts/commit-relay-check.mjs --gate`. It:
     - runs in a scratch repository with a local bare remote, pushing after every commit, so routine commits are never amend-eligible;
     - uses the plugin from a temp build (`--plugin-dir <build>/dist/claude-code/plugins/commit-tools`);
     - runs with `--setting-sources project`, so the user's own settings and allow rules do not apply;
     - runs in the default permission mode, with `--allowedTools` set to exactly:
       - `Agent`, `SendMessage`, `Skill`;
       - `Bash(git:*)`;
       - `Bash(bash <build>/dist/claude-code/plugins/commit-tools/skills/commit/lib/*)`;
       - `Bash(__GIT_COMMIT_PLUGIN__=1 bash <same lib>/commit.sh:*)`;
       - `Edit(//tmp/commit-tools-msg/**)` and `Edit(//private/tmp/commit-tools-msg/**)` (macOS resolves `/tmp` to `/private/tmp`).

       The commit executor writes the message file with the Write tool into the folder that `execute-commit.md` now names (section 1). Observed on 2026-11-14:
       - an `Edit(//<absolute path>/**)` rule allows that write;
       - `Write(...)` rules and any path under `.git/` are refused;
       - Read under `.git/` needs no rule.

       The literal style-check and `commit.sh` lines (section 1) match the `lib/*` and `commit.sh` rules on both flows.
     - fails the gate if any session reports a non-empty `permission_denials`;
     - grants `Read(//<build>/dist/claude-code/plugins/commit-tools/**)`, so the parent can read its skill's references on both flows, as it needs today. It grants no other Read rule, so the drafter, which reads only under `.git/`, fails the gate if it needs anything else;
     - never uses a bypass mode.

     It checks:
     - that a sub-agent resumes across `claude -p --resume` turns;
     - that the drafter reads `.git/commit-relay/` and the skill folder, in a normal checkout and a linked worktree;
     - the `measure-inline` session count (section 8).

     If the resume or read check fails, the story stops and returns to shaping.
   - **Then:**
     - create `references/relay-dispatch.md`, `tests/build/commit-drafter-exclude.test.mjs` and the rest of `scripts/commit-relay-check.mjs`;
     - modify `SKILL.md` (one pointer), `references/repository-state.md` (Step 1 `--stat`), `references/execute-commit.md` and `references/message-validation.md` (the one-line changes in section 1), and `registry.json` (the agent, excluded on the six other harnesses);
     - update `tests/fixtures/claude-snapshot.json`.
   - **Check script, behavior run.** The script uses a fresh scratch repository with the pushed seed (section 8). It copies each fixture's `after/` files in just before staging them, never earlier, so no fixture shows up as a related unstaged file. It drives one session with `claude -p`, then `claude -p --resume <session>`:
     - **Before T1:** the script applies and stages `change-a` (6 files, one concern, no related unstaged files).
     - **T1:** `/commit-tools:commit`. A draft is shown.
     - **Between turns:** the script runs `git add` on `tests/fixtures/commit-relay/change-a-extra.md`, a file of the same concern.
     - **T2:** "Commit. I approve the message shown." A new draft is shown, from the binding check, with 7 files.
     - **T3:** "Commit. I approve the message shown." A commit is created, then pushed to the bare remote.
     - **Between turns:** the script stages `tests/fixtures/commit-relay/change-b/`, one concern unrelated to the last commit.
     - **T4:** `/commit-tools:commit`. It expects a `SendMessage` to the same drafter id and a draft.
     - **T5:** approve. A commit is created, then pushed.
     - **Between turns:** the script stages `tests/fixtures/commit-relay/change-mixed/`, a refactor and a feature together.
     - **T6:** `/commit-tools:commit`. It expects `inline: atomicity`, the inline flow's split dialog, and no second dispatch for this commit.

     The script also runs the `measure-inline` and `measure-relay` sessions and asserts the section 8 acceptance from their counts. It prints each drafted message, so the user can judge its quality.
   - **Verify:** `scripts/commit-relay-check.mjs`, `npm test`, `npm run validate`, and `npm run eval -- commit-tools` (the inline flow, unchanged).

Stories 1 and 2 are independent. Story 3 depends on both. Parked follow-ups: enabling OpenCode, omp, Antigravity, and Pi with `pi-subagents`.

## Outcome (Story 3 check, 2026-11-14)

`node scripts/commit-relay-check.mjs` passed every check on Sonnet: the gate measurements and the T1–T6 behavior run.

| Parent context per commit (the same `change-a`, then `change-b`) | Chars | Of inline |
|---|---|---|
| Inline baseline | 49,219 | |
| Relay, first commit of a task | 19,231 | 39% (target ≤ 55%) |
| Relay, later commit | 5,399 | 11% (target ≤ 35%) |

What the gate runs changed while building:

- **Script calls are literal one-liners.** `relay-dispatch.md`, `execute-commit.md` and `message-validation.md` call each script as its own command with literal paths. Quoted paths and chained commands never match an allow rule, and the relay then fell back inline.
- **A fixed message folder.** The message file goes in `/tmp/commit-tools-msg/`, written directly. `${TMPDIR:-/tmp}`, `mkdir` and `mktemp` resolved to different folders.
- **No deletes under `.git/`.** The parent never deletes snapshot folders; `--prev` and the 24-hour rule do.
- **The check is a Node script,** `scripts/commit-relay-check.mjs`, because it parses stream-json. Its fixtures carry a `.fixture` suffix, so the test runner and validators ignore them.

## Alternatives considered

| Alternative | Why rejected |
|---|---|
| Stateless re-dispatch per answer | User decision: setup is paid on every dispatch |
| A drafter for the whole session | Its context grows with every diff, and it is lost on compaction anyway |
| Every branch through the relay (v2) | The split, related, amend and edit branches drew most of the findings; they are rare and stay inline |
| Drafter with Bash and a mutation fingerprint (v1) | It could commit or destroy work before the check noticed |
| Moving the inline text word for word into `draft.md` (v2) | That text tells the reader to run git and ask the user |
| Relay branches inside the shared references (v3) | The inline flow and harnesses without a drafter would follow them |
| `optional` for agents, or a per-harness overlay (v2) | `optional` means "cannot carry"; presence plus `exclude` needs no overlay |
| A new eval case for the drafter (v3) | Evals cannot stage, resume or commit; the check script does it instead |
| `context: fork`, or skill `model: sonnet` | No resume or no conversation access; lasts one turn and busts the cache |

## Risks

- **Weaker drafts.** A drafter on Sonnet may draft worse. Mitigations: the check script prints each drafted message for review, and Edit and Regenerate stay available.
- **Worst case for one commit.** A drafter setup (about 35k on Sonnet), a failed resume, a second setup, then the inline flow (about 50k in the parent). This happens only when Claude Code's resume breaks, and the gate catches that before shipping.
- **One-commit tasks cost more in total.** Accepted.
- **Claude Code may change** how sub-agents resume or what they may read. The gate and the check script catch it, and the relay then falls back inline.

## Review record

Review mode: Full (EGM + Ponytail), user-selected default, 2026-11-14 | Scope: new agent, relay for the common case, registry `exclude`, Step 1 `--stat`; Claude Code only | Rounds 1–6 complete and dispositioned | v7: approved by the user on 2026-11-14 ("Approve v7 and create"), after six Full rounds. The round-6 fixes were not re-reviewed by EGM, by the user's explicit choice; the Story 3 gate is the empirical check.

**v7.1 (2026-11-14), after the Story 3 gate spike:** the drafter's rule files are copied into the snapshot (§3), and the gate allows the parent to read the plugin folder (Story 3). The user chose a Lightweight check (Ponytail) for this change.

**v7.1 change review (Ponytail):**

| Finding | Severity | Disposition |
|---|---|---|
| A flat `rules/` breaks `message-generation.md`'s link to `references/message-example.md` | Major | Fixed: `rules/` mirrors the skill layout |
| An unknown `--style` has no defined result | Nit | Fixed: `snapshot-failed bad-style`, then inline |

v7.1 approved by the user on 2026-11-14 ("Approve and continue").

Disposition rows from earlier rounds describe the version they fixed. Where a later version replaced a mechanism (`fix-subject:`, `stripped`, Steps 5 and 6 before the dispatch, "never `inline`"), the later row is the current one.

### Round-4 disposition

| Finding | Disposition |
|---|---|
| R4-M1 `files` count vs Step 1 | Fixed: §3 `snapshot.sh` prints the count; §4 compares against it; fallback carries the edit |
| R4-M2 hand-off loop | Fixed: §1 marked as handed off; §7 switch skips it |
| R4-M3 nonce proves nothing | Fixed: §3 a separate token as the last line of `staged.diff`, never in a dispatch or path; §4 checked with `--token` |
| R4-M4 Auto-fix cannot be built | Fixed: §5 `fix-subject:`; the reply is a subject only; the parent replaces line 1 |
| R4-M5 drafter's copy committed | Fixed: §5 the user's text is committed byte for byte; `stripped` is verified |
| R4-M6 measurement windows and baseline | Fixed: §8 named fixture, clean runs, baseline with `--disallowedTools Agent,SendMessage` |
| R4-M7 uncontrolled scratch repo | Fixed: Story 3 bare remote with pushes, named fixtures per turn |
| R4-N1 `--stat` shortens paths | Fixed: §3 `staged.files` and `unstaged.files` with `--name-only` |
| R4-N2 dead replacement id | Fixed: §5 `commit-drafter: none`; §7 switch |
| R4-N3 edit redispatch notice, empty index | Fixed: §4 |
| R4-N4 absence test | Fixed: Story 2 note, lands in Story 3 |
| R4-N5 gate before the agent exists | Fixed: Story 3 creates the agent first |
| R4-N6 cleanup contradiction | Fixed: §3 one rule by modification time |
| R4-N7 co-author after dispatch | Fixed: §1 Steps 5 and 6 before the dispatch |
| R4-N8 allow list and environment | Fixed: Story 3 exact `--allowedTools`, `--setting-sources project`, no Read rule |
| Round-4 "not resolved" R3 rows | Covered by the rows above |

### Round-5 disposition

| Finding | Disposition |
|---|---|
| R5-M1 no Write rule; style-check form | Fixed: Story 3 allow list adds a scoped Write rule; `relay-dispatch.md` names the message folder and the literal style-check call |
| R5-M2 `inline` fails the binding check | Fixed: §4 the check applies to `draft` and `checked` only; `inline` acted on at once, token optional |
| R5-M3 no clean measurement run | Fixed: §8 `change-a` is `a49bc4c`'s six files; two named clean sessions; T1–T6 behavior only; Story 3 creates fixtures first |
| R5-M4 Auto-fix can commit a removed leak | Fixed: §5 one "text to commit"; leak check first; every dialog choice acts on it; Auto-fix is the parent rewriting line 1; `fix-subject:` dropped |
| R5-m1 `stripped` mismatch | Fixed: §5 `stripped` dropped; the parent deletes `removed` items; a missing item is malformed |
| R5-m2 status/action mismatch | Fixed: §5 the status must fit the action |
| R5-m3 hand-off contradiction | Fixed: §1 runs from Step 1; the user's text replaces generation at Step 7 |
| R5-m4 fixtures copied up front | Fixed: Story 3 copies each fixture just before staging |
| R5-m5 absence on 3 of 6 harnesses | Fixed: Story 2 every harness except Claude Code; test file named |
| R5-m6 empty index drops the edit | Fixed: §4 the edit is carried back |
| R5-m7 `\n` convention | Fixed: §5 the parsed text is kept byte for byte |
| R5-m8 Step 5 reads the style file into the parent | Fixed: §1 the parent skips Step 5 on the relay; the drafter reads the style file |
| Round-5 "partly resolved" R4 rows | Covered by the rows above |

### Round-6 disposition

| Finding | Disposition |
|---|---|
| R6-M1 inline baseline cannot commit under the allow list | Fixed. A `claude -p` probe on 2026-11-14 showed writes under `.git/` are refused whatever the rule, `Edit(//abs/**)` allows a write outside the repository, and Read under `.git/` needs no rule. §1 adds one-line changes to `execute-commit.md` (message folder outside the repository, one-line `commit.sh` call) and `message-validation.md` (literal style-check call). The Story 3 allow rule is the probed form, and the gate fails on any `permission_denials`. |
| R6-M2 measurement sessions cannot produce counts | Fixed: §8 `before/` and `after/` fixtures, a fresh repository per run with a pushed seed, counting the `/commit` and approval turns together |
| R6-m1 hand-off rewrites the edit and reuses it for every split | Fixed: §1 applied once through the Edit branch; on a split, first commit only |
| R6-m2 redispatch sends the raw edit | Fixed: §4 sends the current text to commit |
| R6-m3 only one occurrence removed | Fixed: §5 every exact occurrence |
| R6-m4 "pick Edit to keep" loops | Fixed: §5 the leak check on edits is mandatory |
| R6-m5 `--prev` deletes any path | Fixed: §3 direct `commit-relay/` children only; Story 1 test |
| R6-m6 sub-agent field unnamed | Fixed: §8 `parent_tool_use_id`, asserted by the gate |
| R6-m7 stale disposition rows | Fixed: note in the Review record |

### Round-3 disposition

| Finding | Disposition |
|---|---|
| R3-M1 edit lost three ways | Fixed: §5 the edit gets its own style dialog with Auto-fix as `edit:`; `checked` has no cap; a reply to `edit:` is never `inline`; fallbacks carry the edit |
| R3-M2 which version is committed | Fixed: §5 the dialog commits the stripped text and shows both |
| R3-M3 relay edits in shared references | Fixed: §1 every relay rule is in `relay-dispatch.md`; Step 1 `--stat` on both flows; `confirm-flow.md` untouched |
| R3-M4 recompute undefined | Fixed: §3 `--id` and a fixed format |
| R3-M5 deleted or unreadable snapshot | Fixed: §2 `inline: other`; §3 nonce folders and cleanup that leaves other sessions alone; §4 nonce echoed |
| R3-M6 truncated diff | Fixed: §2 paged reads and the `staged.stat` check; §3 no `--binary` and `too-large`; §4 `files` count |
| R3-M7 4e missing | Fixed: §2 4e with `declined` |
| R3-M8 amend detection on routine commits | Fixed: §3 `amend-eligible`; §2 heuristic only when eligible |
| R3-M9 targets | Fixed: §8 parent-only counting rule, acceptance against a measured baseline |
| R3-M10 eval case | Fixed: dropped; the check script prints drafts; Risks updated |
| R3-M11 listing-size test | Fixed: §7 `applyExclude` shared; Story 2 |
| R3-M12 gate and script | Fixed: Story 3 plugin source, permission mode, turn list with staging, approval wording |
| R3-N1 git dir | Fixed: §3 `--absolute-git-dir`; worktree in the Story 1 test and the Story 3 gate |
| R3-N2 hand-off | Fixed: §1 from Step 1, keeping resolved values |
| R3-N3 links, fixtures, real-registry test | Fixed: §2 link; Stories 1–3 update the fixture; Story 2 checks the real registry via listing sizes |
| R3-N4 replacement id | Fixed: §6 and §5 record it |
| R3-N5 Evidence | Fixed |
| Round-3 "not resolved / partial" rows for R2-B1, M3, M4, M5, M6, M8, M9, M10, M11, M13, N1, N6, N7, N8, N9, Ponytail v2-1 | Covered by the rows above, with the same fixes |

Ponytail on v3 found nothing beyond the EGM findings. Its v2 finding (temp-dir read permission) is covered by §3 and the gate.
