# Token diet: cut per-request and per-commit tokens across harnesses

> **Superseded on 2026-11-13: this spec was split at the user's request.** It is kept as v3 for history and review traceability, and is not approved for slicing.
>
> | Part | Spec | Status |
> |---|---|---|
> | 1 | `2026-11-13-listing-diet-design.md`: agent examples, `jot/capture.md`, hiding skills, listing count | being shaped |
> | 2 | `2026-11-13-skill-8kb-design.md`: SKILL.md at most 8,000 bytes | parked |
> | 3 | `2026-11-13-agent-models-design.md`: agent `model`/`tools` per harness | parked |
> | 4 | `2026-11-13-opencode-notes-design.md`: OpenCode runtime notes | parked |
> | 5 | `2026-11-13-commit-relay-design.md`: commit relay; depends on part 2 | parked |
>
> Research: `docs/research/2026-11-13-token-levers.md`. Reviews: `docs/specs/reviews/2026-11-13-token-diet-egm-review.md`.
> Note: the OpenCode listing baseline below (20,209) is wrong (R3-B1). The corrected figure is 12,420, in part 1.

## Problem

A Claude Code usage report (one 24h sample, one machine, shares of that machine's total usage) attributes:

- 54% to the skill listing, about 17k tokens per request. Most of it comes from third-party plugins.
- 22% to `/commit-tools:commit`.
- 16% to the superlogical MCP server (a Non-goal).

Cross-harness research (`docs/research/2026-11-13-token-levers.md`) shows that this repo's per-request cost on every harness is its skill listing **plus its agent listing**. A loaded skill body then stays in history: omp never prunes it, and Codex cuts a `$skill` body at 8,000 bytes.

Units: characters (chars) throughout.

## Measured baseline (revision `f262c96`)

### Listing chars

Listing chars is the name plus the listed description fields of every skill and agent the model can see, in this repo's generated tree.

| Harness | Listing chars | Skills | Agents |
|---|---|---|---|
| Claude Code | 21,947 | 32 | 11 |
| Antigravity | 22,014 | 32 | 12 |
| omp | 20,273 | 32 | 11 |
| OpenCode | 20,209 | 32 | 11 |
| Pi | 10,240 | 32 | 0 |
| Codex | 9,959 | 32 | 0 |
| agent-plugins | 9,959 | 32 | 0 |

- Agent frontmatter totals 11,416 chars, of which **7,931 are `<example>` blocks**.
- Measured with `docs/research/2026-11-13-token-levers.md` §4 and a scratch script. §1.1 below moves the count into the build.

### Commit main-context chars

The reference change is commit `a49bc4c` (6 files, 10,117-char diff), staged and committed with classic style and no flags. The parent reads:

- `SKILL.md` 17.7k
- `atomicity-analysis.md` 3.0k
- `session-context.md` 2.2k
- `message-dialogs.md` 1.9k
- `content-leak-check.md`
- `styles/classic.md` 8.3k

That is **35.4k static**, plus the 10.1k diff, plus tool output: **about 46k**.

The counting rule: sum the chars of every file read and every tool result in the main transcript between the commit skill being invoked and `commit.sh` returning.

### Targets

| Metric | Target |
|---|---|
| Listing chars, Claude Code / OpenCode / omp / Antigravity | ≤ 12.5k (about −40%) after Epic 1 |
| Listing chars, Pi / Codex | ≤ 8.5k after Epic 1 (hiding only) |
| Commit main-context chars, Claude Code, reference change | ≤ 15k (about −65%) after Epic 2 |

## Outcomes and checks

1. **Agent listings carry a one-line trigger, not examples.** Check: `listing:` build lines meet the targets.
2. **No SKILL.md body exceeds 8,000 bytes**, so no skill is cut off on Codex and omp keeps less in history. Check: `npm run validate` fails above 8,000 bytes.
3. **Skills only a human starts are absent from the model's listing.** They stay runnable as `/plugin:skill` (Claude Code, OpenCode, Antigravity), as `$plugin:skill` (Codex), and as `/skill:<id>` (Pi, omp). Check: the per-harness smoke checks in Testing.
4. **Agents run on a cheaper model where the harness can express it.** Check: build output for the 1.5 table.
5. **On harnesses where §2.3 marks the relay `enabled`, a commit puts only the entry skill, relayed questions and the drafted message into the main context.** Check: the commit target.
6. **Every harness either honors each change or emits a `degraded` report entry naming the field.** Check: `npm test` report assertions.

## Non-goals

- superlogical MCP and third-party plugin listings: user settings.
- Shortening skill descriptions or tightening the skill description caps. The 2026-11-02 spec, Alternative M (`docs/superpowers/specs/2026-11-02-consistent-skill-invocation-design.md:718-724`), rejected this to protect trigger accuracy.
- Delegating anything other than commit (codebase, validate-commits, review-commits, devenv, bivouac). That goes in a separate spec, gated on Epic 2's measured result.
- Sub-agents with irreversible side effects, and a two-hop relay.
- Enabling the commit relay on omp and Antigravity in Epic 2. Their switches stay `inline` until a smoke check passes; flipping the switch is a separate story.

## Epic 1: all harnesses, no new runtime protocol

### 1.1 Listing count in the build

- Each adapter's `generate` returns `{listingChars, skills, agents}`, computed from the fields it writes.
- `scripts/build.mjs` sums them per harness and prints `listing: <harness> <chars> chars (<skills> skills, <agents> agents)`.

| Adapter | Counted fields |
|---|---|
| claude-code | skill `name` + `description` + `when_to_use`; agent `name` + `description` |
| opencode | `resources.json` skill `description` where `autoinvoke` is not false; agent `description` |
| antigravity | skill `description` (picker line included); agent `description` |
| omp | skill `description`; agent `description` |
| pi, codex, agent-plugins | skill `description`; Codex skips skills with `allow_implicit_invocation: false` |

Skills with `disable-model-invocation: true` are excluded everywhere.

### 1.2 Agent descriptions without examples

- Each agent in `agents/<plugin>/` keeps a single-line `description` of 250 chars or less, with the trigger phrase first.
- Its `<example>` blocks move to an `## Examples` section in the agent body.
- Ten agents are dispatched by name from their skills (checked by grep), so routing does not depend on their examples.
- `sketch-note:sketch` is the exception: it is routed by its description alone, and its skill `sketch-note:sketch` covers the same triggers. Its one-line description keeps the trigger phrases ("visualize, diagram, sketch"). `npm run eval -- sketch-note` confirms routing.
- `scripts/validate.mjs` fails an agent description over 250 chars or one containing `<example>`.
- This saves about 8k listing chars on Claude Code, OpenCode, omp and Antigravity.
- `agents/jot/capture.md` has no frontmatter: give it one.

### 1.3 SKILL.md at most 8,000 bytes

These ten skills move detail into `references/`, with no behavior change:

| Skill | Bytes today |
|---|---|
| `bivouac:session` | 24,503 |
| `commit-tools:commit` | 17,704 |
| `devenv:manage` | 15,321 |
| `codebase:seams` | 14,907 |
| `commit-tools:review-commits` | 14,883 |
| `sketch-note:sketch` | 14,014 |
| `refactor:scan` | 13,889 |
| `codebase:capabilities` | 11,883 |
| `commit-tools:validate-commits` | 9,324 |
| `codebase:ask` | 9,272 |

- `scripts/validate.mjs` fails a SKILL.md over 8,000 bytes.
- The existing reference link check covers the moved files.
- The commit move here is plain extraction. Epic 2 later builds on the slimmer file.

### 1.4 Hide human-started skills

Canonical flag: `disable-model-invocation: true`.

Hide these skills. Each was checked by `plugin:skill` and bare name; no skill, agent or hook invokes them:

- `bivouac:session`
- `devenv:manage`
- `jot:setup`
- `jot:configure`
- `study:setup`

Keep these visible, because something invokes them:

- `commit-tools:validate-commits`: `review-commits/references/branch-flow.md:185,190`
- `sketch-note:sketch`: `jot:sketch-from-capture`
- `typst-notes:publish`: `jot-to-publish`
- `codebase:*`: `review-commits`, `refactor:scan`, craft
- `refactor:scan`, `review-commits`: `craft:build`
- `craft:*`, `commit-tools:commit`, `jot:capture`, `study:coach`, `study:recall`

Also drop the "Not for … (use jot:setup / jot:configure / study:setup)" clauses in `jot:capture` and `study:coach`.

| Harness | How the flag is carried | Source |
|---|---|---|
| Claude Code | copied through (native) | code.claude.com/docs/en/skills.md |
| OpenCode | existing `autoinvoke: false` (`harnesses/opencode/adapter.mjs:94`) | opencode `config/plugin/skill-file.ts` |
| Antigravity | copied through (native, same key) | `docs/harness-research.md:267-274` |
| Pi | copied through (native). **New:** no prompt wrapper is written for a hidden skill; the user runs `/skill:<id>`, which resolves references against the skill's own folder | `harness_dictionary.md:196`; `docs/harness-research.md:397` |
| omp | same as Pi; the user runs `/skill:<plugin>-<skill>` | `scripts/omp-smoke.sh:89-93` |
| Codex | **New:** after `rewriteTree`, write `codex-skills/<skill>/agents/openai.yaml` with `policy:\n  allow_implicit_invocation: false`. Fail the build if the source skill already ships that file | codex `skills/src/model.rs:23-28` |
| agent-plugins | `degraded` (`disable-model-invocation`): the spec has no such field | agentskills.io/specification |

The harness READMEs record the user's slash form for hidden skills.

### 1.5 Agent `model` and `tools` per harness

- `mapAgent` stays generic. Each adapter applies its own `models` table after `mapAgent`.
- A missing model, or `inherit`, drops the key silently.
- An unmapped value, or a field the harness cannot carry, emits `degraded` with the field name.

| Harness | `model` | `tools` |
|---|---|---|
| Claude Code | native | native |
| Antigravity | `sonnet`/`haiku` → `flash`, `opus` → `pro`. Confirmed by `scripts/agy-smoke.sh` (new); `degraded` until then | `degraded` (`tools:"*"` makes agy skip the agent) |
| OpenCode | `degraded`: `provider/model` is not portable | `degraded` |
| omp | `degraded`: Claude-dialect agents lose `model`; OMP-native agents are Epic 3 | `degraded` |
| Pi, Codex, agent-plugins | no agents in Epic 1 | – |

Existing agents get cheaper models. `npm run eval` on each affected plugin must stay green.

| Agent | Model |
|---|---|
| `jot:content-extractor`, `study:content-extractor` | `haiku` |
| `refactor:scanner`, `refactor:synthesizer`, `refactor:validator` | `sonnet` |
| `typst-notes:content-analyzer`, `typst-notes:typst-generator` | `sonnet` |
| `sketch-note:sketch` | `sonnet` |
| `study:coach-agent`, `study:recall-agent` | stay `inherit` |

### 1.6 OpenCode runtime injection

- `harnesses/opencode/runtime.mjs:128-132` pushes the SessionStart context and every accumulated tool note into `ev.system` on every request. Each new note changes a system part and busts the prompt cache.
- **Fix:** the start context is pushed unchanged on every request, so it stays cached. Tool notes are delivered once and then cleared from `state.notes`.
- **Accepted difference:** a cleared note is seen on one model call only, the call right after its tool event, because the system prompt is not history. On Claude Code, hook output stays in history. Notes (block reasons, tool context) only matter for that next call. Do not move them back into the per-request system prompt.
- **Check:** a test asserts that the system parts are identical across requests after start, and that each note appears once.

## Epic 2: commit drafting in a sub-agent

### 2.1 Relay protocol

The protocol lives in `skills/commit-tools/commit/references/subagent-relay.md`.

- The sub-agent never talks to the user. It ends every turn with one fenced `relay` block.

**Dispatch** (from the parent):

````
```relay
relay-depth: 1
skill-dir: /abs/path/to/commit
style: classic
amend: false
co_author: none
files: [all staged]
no_atomic_check: false
context: |
  <session summary, max 1k chars, plus any [context…] arguments>
```
````

**Replies** (from the drafter):

````
```relay
status: needs_input
questions:
  - id: atomicity.split
    text: Staged changes mix a refactor and a feature. Split?
    options: [split, proceed, review, cancel]
    recommended: split
```
````

````
```relay
status: done
result: |
  <commit message>
style_violation: none
warnings: []
proposal:
  unstage: []
  stage: []
  split: []
```
````

````
```relay
status: failed
reason: <one line>
```
````

**Answers** (the whole resume message):

````
```relay
answers:
  - id: atomicity.split
    choice: split
```
````

Free text uses `text:`.

**Reserved ids** the parent may send after `done`:

- `{id: regenerate, text?}`: draft again, optionally with more context.
- `{id: edit, text: <full message>}`: check only. The drafter replies `done`, with `result` equal to the user's text verbatim plus `warnings`/`style_violation`. The parent commits the user's text.
- `{id: amend, choice: false}`: the user picked "New commit instead".

**Rules:**

- **Malformed** means: no `relay` block, no `status:`, `needs_input` without question ids, or `result` over 4,000 chars.
- **Propose, never apply.** The drafter reads, runs `git diff`/`git status`/`git show` and `lib/style-check.sh`, and drafts. Index changes (stage, unstage, split groups) come back in `proposal`. The parent applies them and runs the split loop, re-dispatching once per concern.
- **Mutation check.** The parent records `git rev-parse HEAD` and `git write-tree` before dispatch and compares them after each reply. A change counts as `failed: drafter mutated repo`: the parent stops and reports, with no inline rerun.
- **Fallback.** A failure with the repo unchanged falls back inline from `references/drafting.md`. The parent passes its answer log and the last `result`; the inline path skips answered ids. A failure during `edit` runs only the leak and style checks inline, on the user's text.
- **`warnings` and `style_violation`** re-offer the dialog with the existing "Commit anyway" choice. They never block the commit on their own.
- **Nesting.** A commit skill that sees `relay-depth`, or that runs inside any sub-agent, drafts only: it follows `drafting.md` and returns `done`, never Steps 8–9. Inside a sub-agent without a relay (for example `craft:build` implementers), confirmation follows the existing rule "No UI is not approval" (`SKILL.md:19`): it stops unless the message was approved explicitly.
- **Build-time switch.** Each adapter writes `relay: enabled|inline` into the generated entry skill. The skill obeys it rather than probing for the tool. On `enabled` harnesses, the adapter also writes only that harness's resume row:

| Harness | Dispatch | Id source | Resume call |
|---|---|---|---|
| Claude Code | Agent `subagent_type: commit-tools:commit-drafter` | agent id in the Agent result | `SendMessage(to: <id>, message: <answers block>)` |

### 2.2 Commit split

| Step | Owner |
|---|---|
| Arguments; Step 1 "no staged changes, stage all?"; Step 2 settings and style resolution (flag, then settings, then default); Step 6 `--pair` selection and save; explicit `--amend` with its safety checks; `error-messages.md` | parent |
| Session summary for `context` | parent, using `references/session-context.md` |
| `git diff --staged`, style file, atomicity 4a–4e (4e and split come back as `proposal`), automatic amend detection (relayed as `amend.detected`), style check, leak check, drafting | `commit-drafter` |
| Applying `proposal`; the split next-concern loop | parent |
| Commit/Edit/Regenerate/Cancel dialog (`references/message-dialogs.md`) | parent |
| `lib/commit.sh --style <resolved>` | parent, after confirmation |
| `review-plan.md` history replay | parent; not delegated in Epic 2 |

- **Parent reads, always:** the entry SKILL.md (≤ 6k), `session-context.md`, `message-dialogs.md`, `subagent-relay.md`.
- **Parent reads, conditionally:** `pair-programming.md`, `settings-file.md`, `error-messages.md`, `review-plan.md`.
- Everything else is read by the drafter, or by the inline path from `references/drafting.md`.
- **Agent:** `agents/commit-tools/commit-drafter.md`, `name: commit-drafter`, `model: sonnet`, `tools: Read, Grep, Bash`, registered in `registry.json` `commit-tools.resources.agents`.

### 2.3 Per-harness switch in Epic 2

| Harness | `relay` | Report |
|---|---|---|
| Claude Code | `enabled` | – |
| OpenCode, omp, Antigravity | `inline` | `degraded` (`relay`): pending smoke check |
| Pi, Codex, agent-plugins | `inline` | `degraded` (`relay`): no plugin sub-agents |

- Enabling OpenCode (`subagent` + `sessionID`), omp (`task` + `agent://<id>`), Pi with `pi-subagents` (`resume`) and Antigravity is one story per harness. Each needs the harness's resume row and a passing smoke check.
- Antigravity sub-agents can ask the user directly (`AskQuestion`), so their row may skip `needs_input`.

## Alternatives considered

| Section | Alternative | Why rejected |
|---|---|---|
| 1.2 | Delete the agent examples | They still help readers; moving them costs nothing |
| 1.4 | Pi/omp prompt wrapper carrying the body | Links cannot resolve from `prompts/`; the native `/skill:<id>` already works |
| 1.4 | Also hide `validate-commits`, `sketch`, `publish` | Something invokes each of them |
| Non-goals | Cap skill descriptions at 300 chars and picker lines at 60 | Rejected by the 2026-11-02 spec, Alternative M; it would also lose flags where `argument-hint` is ignored |
| 2.1 | Claude Code `context: fork` | No conversation access, Claude Code only, cannot ask the user |
| 2.1 | Skill `model: sonnet` without a fork | Lasts only the current turn, the context still grows, and it causes a cache miss |
| 2.1 | Restart a fresh sub-agent with a saved state blob | Every enabled harness can resume |
| 2.1 | Relay file at the plugin root | Escapes reference validation |
| 2.2 | Drafter applies index changes | A failed resume could then commit the wrong files |
| Non-goals | Delegate bivouac | About 10 confirmations before irreversible steps, and it reads the conversation |

## Risks

- Hidden skills stop auto-triggering from plain phrasing. Accepted.
- Agents and the drafter on cheaper models may draft worse. Mitigation: evals, plus confirmation, Edit and Regenerate.
- The no-mutation rule is enforced by the prompt, backed by the parent's mutation check. On OpenCode, omp and Antigravity the drafter would get every tool, which is one reason those stay `inline`.
- `pi-subagents` and OpenCode change field names quickly. Mitigation: per-harness enable stories with smoke checks.
- Third-party listings (most of the 17k) are untouched. The user handles them.

## Testing strategy

- **`npm test`:**
  - listing count per adapter;
  - agent description validation;
  - SKILL.md 8,000-byte validation;
  - the Codex `openai.yaml` writer and its clash failure;
  - no Pi/omp wrapper for hidden skills;
  - the `models` tables and `degraded` entries;
  - the OpenCode runtime system parts stay stable and notes appear once;
  - the `relay:` line per adapter;
  - drafter registration and the dispatch-name rewrite.
- **`npm run validate`:** the new limits, and reference links.
- **`npm run build`:** `listing:` lines meet the targets, and `degraded` lines match the tables.
- **Smoke checks:**
  - `scripts/omp-smoke.sh`: a hidden skill is absent, and `/skill:<plugin>-<skill>` works.
  - `scripts/pi-smoke.sh` (new): the same for Pi.
  - `scripts/agy-smoke.sh` (new): a hidden skill is absent, `model: flash` is accepted, and an agent runs.
- **Manual, Claude Code:** commit on the reference change through the drafter:
  - atomicity split proposal applied by the parent;
  - Regenerate;
  - Edit;
  - the mutation check, by planting a stray `git add`;
  - the inline fallback, with the agent removed;
  - measure main-context chars.
- **`npm run eval`** on every plugin whose agents or skills change.
- **Accepted gaps:** resume on non-Claude harnesses (each has its own enable story); no load testing.

## Evidence

- Revision `f262c96`; a fresh build in a temp directory for the baseline.
- Code read:
  - `skills/*/*/SKILL.md`: sizes, invokers, questions, conversation use;
  - `agents/*`;
  - `hooks/*`;
  - `scripts/lib/{skills,layout,model}.mjs`, `scripts/lib/transforms/*`, `scripts/lib/adapters/index.mjs`;
  - `harnesses/*/adapter.mjs`, `harnesses/opencode/runtime.mjs`;
  - `harness_dictionary.md`, `docs/harness-research.md`, the 2026-11-02 spec.
- External sources: listed in `docs/research/2026-11-13-token-levers.md`. Highlights:
  - Claude Code docs (skills, sub-agents, hooks, mcp, prompt-caching);
  - codex source `16280e1`;
  - opencode source `fb11429`;
  - Pi 1.5.0 docs;
  - oh-my-pi docs;
  - `agy` 1.4.12 changelog;
  - pi-subagents;
  - the agentskills spec.
- Gaps:
  - output size of `discovery-augment.sh` not measured;
  - the commit baseline is computed from the files read, not from a recorded transcript;
  - Antigravity `flash` is not yet confirmed.

## Review record

- **Ideation:** grill-me, Q1–Q26; the reshape after EGM; then cross-harness research. The user accepted all recommendations and said "proceed" on 2026-11-13.
- **Mode:** Lightweight at first (Ponytail, user-selected). Then Full (EGM plus Ponytail), selected by the user on scope expansion on 2026-11-13.
- **Scope:** Epic 1 (all-harness levers) and Epic 2 (the commit relay; Claude Code enabled, other harnesses switched by enable stories). Other delegations get a separate spec.
- **Ponytail findings 1–12:** recorded in earlier revisions of this file (uncommitted working copy, 2026-11-13). Still in force:
  - `validate-commits` and `sketch` stay visible;
  - drafting steps in one file;
  - adapter `degraded` entries;
  - the nesting rule.
  Finding 12 is superseded by R-B2: no wrapper.
- **EGM round 1** (B1–B5, M1–M21) and **round 2** (R-B1, R-B2, R-M1–R-M14): `docs/specs/reviews/2026-11-13-token-diet-egm-review.md`.

### Round 2 dispositions

| Finding | Disposition |
|---|---|
| R-B1 | fixed: propose-never-apply, the parent applies changes and runs the split loop, mutation check, no inline rerun after a mutation |
| R-B2 | fixed: no wrapper; `/skill:<id>` on Pi and omp |
| R-M1 | fixed: reserved ids, the edit rule, the 4k cap counts as malformed, warnings never block |
| R-M2 | fixed: literal dispatch block with `skill-dir`, `style`, `co_author`, `files`, `context`; `style_violation` |
| R-M3 | fixed: every step has an owner; conditional reads listed |
| R-M4 | fixed: answer log and last result passed to the inline path; edit fallback |
| R-M5 | fixed: nested runs draft only; the sub-agent rule covers craft implementers |
| R-M6 | fixed: measured baseline, reference change, counting rule, grounded targets |
| R-M7 | partly fixed: only Claude Code `enabled` in Epic 2; the other harnesses are per-harness stories, because the user asked for all-harness coverage. The Epic 1 Pi/omp wrapper code is removed. |
| R-M8 | fixed: one `degraded` term, `inherit` silent, a check per outcome |
| R-M9 | fixed: build-time `relay:` switch; `agy-smoke.sh` named; Antigravity `inline` |
| R-M10 | fixed: registry entry |
| R-M11 | fixed: rows keyed by dispatch tool, with id source and literal call; answers-only resume message; the adapter writes only its own row |
| R-M12 | fixed: adapter return value and counted-fields table |
| R-M13 | moot in Epic 2: Pi is `inline`. Recorded for the Pi enable story: map tools through `PI_TOOLS`, and change `pi/adapter.mjs:65` and `:126` and `pi-adapter.test.mjs:118` |
| R-M14 | fixed: alternatives keyed by section; M7 and M8 recorded as partly fixed |

### Round 1 status

B1–B5 and M1–M6 and M9–M21 stand as dispositioned in the review file. M7 and M8 are partly fixed, superseded by R-M6 and R-M7.

- **New since round 2:** §1.2, §1.3, §1.5 (cheaper models for existing agents), §1.6. All come from the cross-harness research.
- **Ponytail round 4, finding 13** (Major, fixed): clearing OpenCode notes changes their visibility. Stated as an accepted difference in §1.6.
- **Next review:** focused EGM round 3, running.
- **Final approval:** pending.
