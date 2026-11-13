# Goldfish Review Report

**Target:** `docs/specs/2026-11-13-token-diet-design.md` (lines 1-203), repo at `f262c96`
**Mode:** REVIEW (design review; task/TDD planning out of scope)
**Date:** 2026-11-13

## Reviewer Status

| Reviewer | Status |
| --- | --- |
| `egm-structural` | completed |
| `egm-style` | completed |
| `egm-comprehension` (spec only, no source or other reports) | completed |
| `egm-codebase-details` | completed |
| `egm-design` | completed |
| `egm-zoom-out` | completed |
| `egm-implementation-readiness` | completed |
| `egm-inventive-catalyst` | completed |

**Severity breakdown (after deduplication):** 5 Blockers, 21 Majors, 20 Nits.

The synthesizer re-checked these claims against source before grading:
- Antigravity documents `disable-model-invocation` (`docs/harness-research.md:267-274`, `harness_dictionary.md:88`).
- Pi prompt wrappers break for hidden skills (`harness_dictionary.md:196`).
- Two agents are both named `content-extractor` (`agents/jot/content-extractor.md:2`, `agents/study/content-extractor.md:2`).
- `skills/typst-notes/jot-to-publish/SKILL.md` is `user-invocable: false` and depends on the publish pipeline (lines 4, 60-74).

Reviewers graded some findings differently. Where they did, the synthesizer set the final grade and notes the original grade in the finding.

**Verdict:** Not ready. All five Blockers concern the relay protocol (R), the delegation table (E) and the per-harness mapping. Each has a small fix.

---

## Prioritized Findings (Blockers -> Major -> Nits)

### B1. The fallback rule contradicts itself, and the blanket stop rule breaks commit on harnesses whose resume is unverified (Blocker)
* **Reviewer Lens:** `design`, `inventive-catalyst`, `structural`, `style`, `comprehension`
* **Affected Scope:** R line 27; Risks lines 144-145; Evidence line 176.
* **Discrepancy Description:** Line 27 says that after dispatch the skill reports and stops, and never runs inline. Line 144 says the mitigation is "the inline fallback on any failure". Line 145 says the analyst falls back inline when its MCP tools are absent, but that can only be found out after dispatch. Resume always happens after dispatch, and line 176 says it has been run end to end only on Claude Code.
  * **Read literally (line 27):** on OpenCode (where `task_id` is being renamed), omp, Antigravity and Pi, the first atomicity or amend question ends `/commit-tools:commit` with no recovery. Commit stops working on those harnesses instead of degrading.
  * **Read the other way (line 144):** the double-commit and second-VM hazard that Ponytail finding 8 fixed comes back.
  * **Cost of the uniform rule:** commit-drafter, commit-validator and codebase-analyst change no state, so a rerun is safe for them. They give up recovery for nothing.
* **Rationale & Recommendation:**
  * Classify each agent in `subagent-relay.md` as `side_effects: none | irreversible`.
  * `none`: any failure, before or after dispatch, falls back inline.
  * `irreversible` (session-runner, devenv): keeps report-and-stop.
  * Rewrite lines 144-145 to match, and check that MCP tools exist before dispatch.

### B2. The relay reply and answer formats are too loose to parse, and a parse failure is a hard stop (Blocker)
* **Reviewer Lens:** `implementation-readiness` (Blocker), `design`, `comprehension`
* **Affected Scope:** R lines 22-27.
* **Discrepancy Description:** The format is "plain text with fixed headings". The spec does not define:
  * how `questions`, `options` and `recommended` are encoded (index or text);
  * a delimiter or version marker;
  * how answers go back on resume;
  * what "malformed" means;
  * what the parent does on `status: failed`.
  
  The reply also has no field recording what the sub-agent already did. So after a malformed reply, the parent cannot "report what the sub-agent did", for example whether a VM exists. Four agents built against different guesses will disagree, and line 27 turns every disagreement into a stop.
* **Rationale & Recommendation:**
  * Put one literal fenced example each of `needs_input`, `done`, `failed` and an `answers: [{id, choice|text}]` message in `templates/shared/subagent-relay.md`, and quote them in R.
  * Add an `actions:` list of steps already taken, with resource ids.
  * Define malformed as: no `status:` line, or `needs_input` without question ids.

### B3. The bivouac delegation rests on wrong facts: it says 0 questions and no conversation use (Blocker)
* **Reviewer Lens:** `codebase-details`, `implementation-readiness` (Blocker), `design`, `inventive-catalyst`, `style` (Blocker), `comprehension`
* **Affected Scope:** E table line 89; E rule line 81; R line 28.
* **Discrepancy Description:**
  * `skills/bivouac/session/SKILL.md` asks or confirms at lines 78, 80, 86, 91-94, 268, 315, 332, 403 and 433. Most of these come before irreversible steps.
  * R line 28 requires relayed approval for VM create and delete.
  * Start derives `--task` from conversation context (lines 77 and 165). That breaks E's own rule, "does not need the conversation history".
  * The table therefore hides the riskiest resume path, the irreversible one, behind "0".
* **Rationale & Recommendation:**
  * List bivouac's real confirmation points as relay question ids, and have the parent pass a task summary.
  * Or invert the flow: the agent returns a command manifest, and the parent gets approval and runs it. That makes the agent `side_effects: none` under B1.
  * Otherwise move bivouac to Epic 2.

### B4. Hidden skills break `/name` on Pi and omp, contrary to Risks and Testing (Blocker)
* **Reviewer Lens:** `codebase-details`
* **Affected Scope:** Per-harness mapping line 121 (Pi "copied through (native)") and line 123 (omp); Risks line 142; Testing line 153.
* **Discrepancy Description:**
  * `harnesses/pi/adapter.mjs:72-81` writes a prompt wrapper for each runnable skill that says "Invoke the `id` skill" (`scripts/lib/transforms/names.mjs:41-47`).
  * `harness_dictionary.md:196` records that for a skill with `disable-model-invocation`, this wrapper "cannot work … such a skill's wrapper must carry its own body".
  * All six skills to be hidden are runnable.
  * omp uses the same wrapper (`harnesses/omp/adapter.mjs:76-84`).
  * Result: on Pi, `/bivouac:session` and the other five do nothing useful.
* **Rationale & Recommendation:** For hidden skills on Pi and omp, make the wrapper carry the skill body, or point it at `/skill:<id>`. Add this to the Pi and omp rows, with one test.

### B5. Commit stays in the main context at full size: the A and B targets conflict, and B's moves are already done (Blocker)
* **Reviewer Lens:** `codebase-details`, `implementation-readiness`, `design`, `comprehension`, `inventive-catalyst`
* **Affected Scope:** A lines 44-47; B lines 51-53; E line 81 and line 87; Outcome 1 line 13.
* **Discrepancy Description:**
  * **Targets conflict:** B sets "≤9k" for `SKILL.md`, while E sets a "thin entry about 1k" for the same skill.
  * **B's moves are already done:** amend lives in `references/last-commit-comparison.md`, pair in `pair-programming.md`, settings in `settings-file.md` and errors in `error-messages.md` (commit `SKILL.md:120,132,179,357,364`). B's listed moves cannot reach 9k.
  * **The main context still pays for:**
    * `session-context.md`, to build the summary;
    * `message-dialogs.md` and the error prose;
    * the "staged diff summary", which on a large diff may cost more than the style file it saves.
  * **Unassigned work:**
    * Edit re-runs the leak check (`SKILL.md:310-316`), but that check now lives only in the drafter.
    * Regenerate needs resume after `done`, which R does not define.
    * The Step 4e prompt and the `review-plan.md` branch go to neither side.
    * Amend detection is claimed by both B (main context) and A (drafter relays amend questions).
  * **Effect:** Outcome 1 cannot be met or checked as written. This is the 22% cost driver the spec exists to fix.
* **Rationale & Recommendation:**
  * State one target: entry `SKILL.md` about 1k, holding dispatch, fallback and dialogs.
  * Give `drafting.md` plus references the inline budget.
  * The drafter runs `git diff --staged` itself.
  * The parent detects amend and passes `amend: true|false`.
  * Assign Edit and Regenerate: Regenerate resumes the drafter after `done`, and Edit re-runs the leak check in the drafter.
  * List the files the parent reads, with a size budget.

---

### M1. The nesting rule has no detection signal and no way to relay across two hops (Major)
* **Reviewer Lens:** `implementation-readiness` (Blocker), `design`, `inventive-catalyst`, `codebase-details`, `comprehension`
* **Affected Scope:** R line 29; Epic 2 line 94; `review-commits/references/branch-flow.md:185,190`.
* **Discrepancy Description:**
  * The spec never says how a skill knows it is running inside a sub-agent.
  * On harnesses that allow nesting (OpenCode `task`, omp), a skill delegates again. The inner agent's `needs_input` then reaches an outer agent that "never talks to the user", so the questions are lost.
  * An inline commit inside a sub-agent cannot get confirmation, because of `SKILL.md:19`, "No UI is not approval".
  * This becomes a Blocker before Epic 2 moves review-commits into a sub-agent.
* **Rationale & Recommendation:**
  * Detection: "the dispatch tool is absent" counts as a failure before dispatch. Optionally the parent also passes a `relay-depth: 1` line, which a delegating skill checks first.
  * Relay across hops: a nested skill returns its questions inside the outer agent's `needs_input`, with ids prefixed by skill (for example `validate-commits.q1`).

### M2. The approval gate for irreversible steps is enforced only by the prompt (Major)
* **Reviewer Lens:** `design`, `inventive-catalyst`
* **Affected Scope:** R line 28; A line 45; Per-harness mapping.
* **Discrepancy Description:**
  * The drafter has Bash. It can run `__GIT_COMMIT_PLUGIN__=1 bash lib/commit.sh`, which the commit guard allows on purpose (`hooks/commit-tools/scripts/intercept-git-commit.sh:118`).
  * OpenCode, omp and Antigravity drop agent `tools` (`opencode/adapter.mjs:113-116`, `omp/adapter.mjs:89-92`, `antigravity/adapter.mjs:119`), so sub-agents there get every tool.
* **Rationale & Recommendation:**
  * State that the rule is enforced by the prompt.
  * Report `degraded` ("agent tool restriction not carried") on those harnesses.
  * Optionally, have the commit guard reject commits when a sub-agent marker is set.

### M3. The Antigravity hide cell is wrong, and the omp row has no default (Major)
* **Reviewer Lens:** `codebase-details` (Blocker), `implementation-readiness`, `design`
* **Affected Scope:** Per-harness mapping lines 123-124; Evidence line 177.
* **Discrepancy Description:**
  * **Antigravity:** it documents `disable-model-invocation` with the same key (`docs/harness-research.md:267,270,274`), and `antigravity/adapter.mjs:71-74` copies `SKILL.md` unchanged. The planned degraded entry and its test would assert something false, against Outcome 4.
  * **omp:** support is already documented (`harness-research.md:516`), yet the row waits on a manual smoke check, and `scripts/omp-smoke.sh` has no assertion for it.
* **Rationale & Recommendation:**
  * Antigravity: "copied through (native)".
  * omp: "copied through (documented)", and add the assertion to `omp-smoke.sh`.

### M4. Hiding `typst-notes:publish` breaks the model-only `jot-to-publish` path (Major)
* **Reviewer Lens:** `codebase-details` (Blocker; the synthesizer downgraded it because the user can still type the command)
* **Affected Scope:** C lines 59-63 (the claim that nothing invokes the hidden skills).
* **Discrepancy Description:**
  * `skills/typst-notes/jot-to-publish/SKILL.md` is `user-invocable: false`.
  * It activates when the user says something like "publish this jot note".
  * It sketches the pipeline: template choice, content-analyzer, typst-generator, compile. The real steps live in `publish`, and once `publish` is hidden the model cannot load it.
* **Rationale & Recommendation:** Keep `publish` visible, listed with `validate-commits` and `sketch`. Or have `jot-to-publish` tell the user to run `/typst-notes:publish`.

### M5. Pi sub-agent shipping is underspecified (Major)
* **Reviewer Lens:** `codebase-details` (Blocker; downgraded because the fix is a naming rule), `implementation-readiness`, `design`
* **Affected Scope:** Per-harness mapping line 121; Contracts line 135.
* **Discrepancy Description:**
  * **Name collision:** `agents/jot/content-extractor.md` and `agents/study/content-extractor.md` are both `name: content-extractor`. OpenCode and omp prefix agent ids for this reason; Pi has no such rule.
  * **Tool names:** agent `tools` use Claude names, which Pi does not use (`harnesses/pi/tools.mjs`).
  * **Unstated changes:** `capabilities.agents` (`pi/adapter.mjs:21`), the "Pi has no sub-agents" report entry and the `canCarry` reason (`:85`, `:126`), and `tests/build/pi-adapter.test.mjs:118`.
  * **Unknowable at build time:** the build cannot tell whether `pi-subagents` is installed.
* **Rationale & Recommendation:**
  * Ship agents always, with `derivedId` names.
  * Map or drop `tools`, as Antigravity does.
  * Report `degraded` with "requires pi-subagents".
  * Extend `validatePiPackage` for the new key.
  * Give one literal shipped agent file as an example.

### M6. The agent model mapping has no configuration home and no rule for `inherit`, and model is already dropped silently (Major)
* **Reviewer Lens:** `implementation-readiness`, `design`, `codebase-details`
* **Affected Scope:** Per-harness mapping lines 120-124; Contracts line 132; Outcome 4.
* **Discrepancy Description:**
  * **Already dropped:** OpenCode and omp drop `model` today with no report entry (`opencode/adapter.mjs:113-117`, `omp/adapter.mjs:89-92`). That already breaks Outcome 4, and those cells are not marked **new**.
  * **No configuration home:** "Configured per tier" refers to settings that exist nowhere in the registry or the adapters.
  * **Unknown provider:** a package built once cannot know the user's provider for Pi or OpenCode.
  * **`inherit` unhandled:** 10 of the 11 agents use `inherit`, and no row covers it.
  * **Wrong place in the code:** `mapAgent` is a generic keep/rename/set filter with no access to the report. Antigravity agents are written by `antigravityAgent` (`antigravity/adapter.mjs:111-120`). Whether agy accepts `flash`/`pro` is unverified.
* **Rationale & Recommendation:**
  * Keep `mapAgent` generic. Each adapter passes a small `models` table through `set`.
  * `inherit`, a missing model or an unmapped value drops the key, and the adapter reports it.
  * Report OpenCode and Pi as `degraded` until a tier configuration is designed.

### M7. No baseline, no numeric target, and delegation overhead is not counted (Major)
* **Reviewer Lens:** `zoom-out`, `design`, `comprehension`, `implementation-readiness`
* **Affected Scope:** Problem lines 5-9; Outcomes lines 13-16; Testing.
* **Discrepancy Description:**
  * The figures come from one 24-hour sample on one machine, and the outcomes contain no numbers.
  * Prompt caching is ignored: content that is re-sent is billed at cache-read rates.
  * Delegation overhead is not counted: the sub-agent's system prompt and tools, a turn per resume, reading the relay file, and returned results. Unsummarised `codebase:*` graph output comes straight back into the main context.
  * As a result, nothing can show whether Epic 1 succeeded or whether the relay contract was worth it.
* **Rationale & Recommendation:**
  * Add a "Baseline and targets" block covering listing chars and commit main-context chars, measured before and after.
  * Add one Claude Code measurement of a commit run from the same transcript.
  * Cap the size of `result`.

### M8. The scope is out of proportion to the measured win; stage it (Major)
* **Reviewer Lens:** `zoom-out`
* **Affected Scope:** Problem line 7; C; D; E; Per-harness mapping.
* **Discrepancy Description:**
  * **The listing is not the lever here:** this repo contributes about 3k of the 17k listing tokens. C plus D likely save about 1k tokens per request, because the median description is already 298 chars.
  * **The cheap fix comes after the expensive one:** B plus on-demand references, the cheapest commit fix, runs alongside the relay, four agents, Pi agent shipping and Pi/Antigravity model mapping, instead of before them.
  * **Unmeasured targets:** validate-commits, bivouac and codebase are not in the Problem figures.
  * **Epic 2 is unrelated:** moving agents to cheaper models and turning reference skills into files are not about token cost, and a quality regression from them would be blamed on this spec.
* **Rationale & Recommendation:**
  * **Stage 0:** B, C, and the light part of D (drop flags and clauses pointing at hidden skills), then re-measure.
  * **Stage 1:** a commit-only drafter on Claude Code, only if the target is missed.
  * **Defer:** non-Claude agent work and Epic 2 go to separate specs.

### M9. D reverses a recorded decision and misstates the current caps (Major)
* **Reviewer Lens:** `zoom-out`, `codebase-details`, `implementation-readiness`
* **Affected Scope:** D lines 108-111.
* **Discrepancy Description:**
  * **Reversed decision:** `docs/superpowers/specs/2026-11-02-consistent-skill-invocation-design.md:718-724` (Alternative M) rejected shortening descriptions to protect trigger accuracy. D does not cite or answer it.
  * **Misstated caps:**
    * `COMBINED_MAX = 1024` (`skills.mjs:54`) limits picker line plus description, not description alone.
    * The description limit is a separate hardcoded 1024 at `skills.mjs:115`.
    * Antigravity enforces another 1024 (`layout.mjs:101`).
  * **Flags lost:** dropping `[--flags]` from the picker line loses them on Codex, Antigravity and OpenCode, which ignore `argument-hint` (`harness_dictionary.md:80`). The flag check at `skills.mjs:128-130` becomes dead code.
* **Rationale & Recommendation:**
  * Cite Alternative M and say why it no longer holds, or drop the description cap.
  * Name each cap that changes.
  * Have those three adapters append `argument-hint` to the picker line, or record the loss per harness.

### M10. The relay file at the plugin root breaks the skill's self-containment, escapes validation, and costs main-context tokens (Major)
* **Reviewer Lens:** `codebase-details`, `design`, `implementation-readiness`
* **Affected Scope:** R line 30.
* **Discrepancy Description:**
  * Commit `SKILL.md:15` says "no plugin root or sibling skill is needed".
  * Link validation covers only `references/*.md` (`skills.mjs:150`).
  * The Codex reference rewrite does not cover root files (`codex/adapter.mjs:70-72`).
  * Every delegated call reads the whole six-harness table, and the model must work out which harness it is on.
* **Rationale & Recommendation:**
  * Copy the file into each delegating skill's `references/`.
  * Have each adapter trim the table to its own harness row at build time.
  * Put the parent half of the protocol in the entry skill and the sub-agent half in the agent body.

### M11. The resume table names mechanisms that cannot be followed (Major)
* **Reviewer Lens:** `design`, `implementation-readiness`, `style`, `comprehension`
* **Affected Scope:** R lines 35-37; mapping line 123.
* **Discrepancy Description:**
  * **Antigravity:** "message the agent conversation id" names no tool.
  * **omp, two mechanisms:** sub-agents start with `task`, but resume uses `write agent://<id>`. Nothing says the two ids are the same.
  * **omp and OpenCode, renamed ids:** agents are renamed `<plugin>-<name>` (`omp/adapter.mjs:91`, `opencode/adapter.mjs:111`). If the entry skill's dispatch target is not rewritten to match, dispatch fails and the skill silently runs inline.
  * **OpenCode, field name:** `task_id` versus `sessionID` is unresolved.
* **Rationale & Recommendation:**
  * Name the Antigravity call.
  * Confirm that omp's ids match.
  * Rewrite dispatch names through `state.pairs`, with a test.
  * Accept both OpenCode field names.

### M12. The codebase-analyst MCP tool list cannot be fixed in advance (Major)
* **Reviewer Lens:** `implementation-readiness`, `design`
* **Affected Scope:** E line 90; Risks line 145.
* **Discrepancy Description:**
  * The plugin does not ship the MCP server (its registry `extra` is only the README). So `mcp__<server>__*` names depend on the user's server name.
  * `tools` is dropped on non-Claude harnesses anyway.
  * When tools are absent, the run has already dispatched, so under R it stops.
* **Rationale & Recommendation:** Omit `tools`, so the agent inherits them, or have the parent check that the MCP tools exist before dispatch. This also depends on B1.

### M13. Payload contracts exist only for commit-drafter (Major)
* **Reviewer Lens:** `implementation-readiness`
* **Affected Scope:** E lines 87-90.
* **Discrepancy Description:** commit-validator, session-runner and codebase-analyst have no defined inputs, `result` shape, question ids or tools, so each implementer will invent them.
* **Rationale & Recommendation:** Add one line per agent covering inputs, result, question ids and tools.

### M14. The Codex `openai.yaml` path and schema are ambiguous (Major)
* **Reviewer Lens:** `implementation-readiness`, `design`
* **Affected Scope:** Mapping line 122; Contracts line 133.
* **Discrepancy Description:**
  * The Codex adapter drops the plugin-level `agents/` folder (`codex/adapter.mjs:64`). So `<plugin>/agents/openai.yaml` is a plausible wrong guess; the correct place is per skill.
  * `rewriteTree` also rewrites `.yaml` files (`adapter.mjs:71`).
  * The spec does not say what happens if a skill ships its own `openai.yaml`.
* **Rationale & Recommendation:**
  * Specify `codex-skills/<skill>/agents/openai.yaml` with the literal YAML, written after `rewriteTree`.
  * Fail the build if the source skill already has that file.

### M15. Outcome 4 coverage gap: sub-agent degradation and agent listing cost (Major)
* **Reviewer Lens:** `comprehension`, `design`
* **Affected Scope:** Outcome 4 line 16; line 127; Outcome 3; D line 112.
* **Discrepancy Description:**
  * Line 127 requires report entries only for hiding and for `model`. Sub-agent degradation on Codex, agent-plugins and Pi without the extension is not reported.
  * The new agents' descriptions add to the per-request agent listing, and neither D's limits nor its totals count them.
* **Rationale & Recommendation:**
  * Require report entries for sub-agent degradation.
  * Apply the 300-char cap to agent descriptions and include them in the totals.

### M16. "Listing chars" is undefined, and the report has no slot for it (Major)
* **Reviewer Lens:** `implementation-readiness`, `codebase-details`
* **Affected Scope:** D line 112; Testing line 152.
* **Discrepancy Description:**
  * The fields that make up the listing differ by harness.
  * The spec does not say whether hidden skills count.
  * Report entries are `{kind, resource, status, reason}` (`scripts/lib/adapters/index.mjs:70-80`), with no numeric field.
* **Rationale & Recommendation:**
  * Define the count per harness as the chars of the listing fields of every skill the model can see.
  * Print it as a new summary line, and give one example.

### M17. Testing does not cover most delegations or resume harnesses (Major)
* **Reviewer Lens:** `comprehension`
* **Affected Scope:** Testing lines 150-154; Risks line 144.
* **Discrepancy Description:**
  * Risks promises "smoke checks per harness", but only omp and Pi have scripts.
  * Antigravity resume is never tested.
  * Only commit is tested end to end; validate-commits, bivouac, codebase and the report-and-stop path are not.
* **Rationale & Recommendation:** Name a check for each delegating skill and each harness with resume, or list the untested ones as accepted gaps.

### M18. Epic 2: reference-skill conversion has no target location and loses content in inline runs (Major)
* **Reviewer Lens:** `codebase-details`, `zoom-out`
* **Affected Scope:** E line 97.
* **Discrepancy Description:**
  * Nothing loads `excalidraw-format`, `typst-format` or `infographics` by name; the model picks them up from their descriptions.
  * Inline runs on Codex, Pi without the extension and agent-plugins would lose that content if it becomes agent-only.
* **Rationale & Recommendation:** Name the location, for example `templates/<plugin>/…`, which every adapter already copies, and have both the agent and the inline skill reference it. Or defer this item, per M8.

### M19. The review record is stale and contradicts the body (Major)
* **Reviewer Lens:** `structural`, `comprehension`, `style`, `zoom-out`
* **Affected Scope:** Review record lines 183-186, against line 196, E and line 136.
* **Discrepancy Description:**
  * It says "Lightweight", but line 196 says the user selected Full.
  * It says "One new agent", but E has four.
  * It says "No change to the cross-harness public contract", but line 136 adds a new cross-plugin contract.
  * It says "EGM skipped", but EGM is running.
* **Rationale & Recommendation:** Mark lines 183-186 as superseded, or update them.

### M20. No Alternatives Considered or Non-Goals section (Major)
* **Reviewer Lens:** `structural`
* **Affected Scope:** The whole document; rejections at line 27, line 43 and line 201; scope exclusions at line 9 and line 146.
* **Discrepancy Description:**
  * C, D and E list no rejected options.
  * Out-of-scope items appear under Problem and under Risks.
* **Rationale & Recommendation:** Add `## Non-goals` after Outcomes and `## Alternatives considered` after Decisions, with one line per option keyed by decision letter.

### M21. Units and baseline numbers do not reconcile (Major)
* **Reviewer Lens:** `style` (Blocker), `comprehension`, `structural`, `zoom-out`
* **Affected Scope:** Problem lines 5-8; E table lines 87-90; line 103.
* **Discrepancy Description:**
  * The 54%, 22% and 16% have no stated base, and the remaining 8% is not mentioned.
  * Tokens and chars are mixed with no stated conversion.
  * The "Loads" column has no unit.
  * "54k" for commit does not reconcile with 17.7k + 8-10k on line 8.
  * "Under 5k" on line 103 has no unit.
* **Rationale & Recommendation:**
  * Label the column "Loads (chars)" and explain how 54k is made up.
  * State the base of the percentages and the chars-per-token rate.

---

## Nits

| # | Location | Issue | Smallest fix |
|---|---|---|---|
| N1 | Decisions, lines 20-115 | Order is R, A, B, C, E, D; "Per-harness mapping" has no letter. | Move D before E; letter the mapping F. |
| N2 | Lines 32-39 vs 117-125 | The two harness tables differ in row order and how Pi is split. | Use one order, or merge resume into the mapping table. |
| N3 | Lines 121, 122, 125 | JSON in a table cell; "–" cells are neither honored nor degraded. | Move the JSON below the table; write "n/a (no sub-agents)". |
| N4 | Line 46 | Pi listed as having no sub-agents. | "Pi without `pi-subagents`". |
| N5 | Line 144 vs 176 | "nothing run end to end" vs "except Claude Code". | Pick one. |
| N6 | Lines 144, 173 | Codex resume discussed as if in scope. | Drop it from Risks; mark the citation as future work. |
| N7 | Lines 68-77 | Blank line splits the "Keep visible" list. | Remove it or add a lead-in. |
| N8 | Lines 96-97 | Model reassignment and reference conversion sit under "which skills delegate"; agents not named. | Move them; name the agent files (`jot/`, `study/content-extractor`, `typst-notes/content-analyzer`, `typst-generator`). |
| N9 | E, C | No decision for `refactor:validator`, `refactor:synthesizer`, `jot:capture` agents, the model-only skills (`commit-style`, `codebase:explore`, `capture-for-sketch`, `jot-to-publish`), or `codebase:index`. | One line each. |
| N10 | Contracts, line 131 | `disable-model-invocation` is not validated as a boolean (Pi requires a real boolean, `harness-research.md:440`). | Reuse the `user-invocable` check (`skills.mjs:110-111`); document it in `docs/authoring-skills.md`. |
| N11 | Contracts, lines 129-137 | Missing: `skills.mjs` caps, per-plugin `extra` entries, report format, Pi `package.json` key, removed reference skills, hidden-skill list. | Add a bullet for each. |
| N12 | Lines 113, 154 | Eval step stated twice; the plugin list ends in "...". | Keep it in Testing only; list every plugin (bivouac, devenv, typst-notes, sketch-note, refactor included). |
| N13 | Throughout | Mixed terms: parent / main context, sub-agent / subagent / agent; mixed bare and `plugin:` names. | Add a short terms list; qualify every name. |
| N14 | Throughout | Undefined: harness, omp, Pi, agent-plugins, EGM, Ponytail, grill-me, "tier", "global role only", "Pi's field", "index consent", "model-only", Epic 1/2. | Add a one-line glossary. |
| N15 | Lines 13, 81, 77, 110 | Vague: "heavy", "loads a lot", "few questions", "really collide", "small". | Give thresholds. |
| N16 | Line 137 | "user-visible behavior does not change" overstates it: questions now pass through the relay and Sonnet drafts. | "confirmation and commit execution stay in the main context." |
| N17 | Outcomes | Outcomes do not name the decision that delivers each one. | Add "(R, A, B, E)" and similar after each. |
| N18 | R line 27 | No idempotency, so report-and-stop is the only safety net. | Later: `commit.sh` checks the expected HEAD, VM create checks the name first. |
| N19 | C, Risks line 142 | Hidden skills lose phrase triggering. | Optional prompt hook that suggests `/name` on matching phrases, if eval shows the loss matters. |
| N20 | Title, Evidence | "per-commit tokens" is never measured; evidence sources are not links. | Drop the phrase or measure it; optionally add links. |

---

## Not verified

- The character counts in the spec (17.7k, 9.3k, 24.5k, 54k, 12k) were not measured; reviewers had no shell.
- External harness documentation was not opened. This covers `SendMessage`, the `pi-subagents` API and package key, whether agy accepts `flash`/`pro`, and the Codex `openai.yaml` schema.
- No build, test or smoke check was run.

---
---

# Re-review 2026-11-13

**Target:** rewritten `docs/specs/2026-11-13-token-diet-design.md` (lines 1-273). This version has Epic 1 (hide skills, per-harness hiding, measurement) and Epic 2 (a commit-only relay). Epic 3 is deferred.

**Scope:** this pass checks only the dispositions and the changed design. Nits are out of scope.

**Concurrent edit:** the coordinator edited the spec while this pass ran. Line 74 now says the Pi wrapper rewrites relative links "to the skill's path inside the package", and line 271 records Ponytail round 3, finding 12. Reviewers who read the file after the edit (codebase-details, implementation-readiness, zoom-out) reviewed that text. The findings below apply to the edited version.

## Reviewer Status

| Reviewer | Status |
| --- | --- |
| `egm-comprehension` (spec only, no source, no prior report) | completed |
| `egm-structural` | completed |
| `egm-style` | completed |
| `egm-codebase-details` | completed |
| `egm-design` | completed |
| `egm-zoom-out` | completed |
| `egm-implementation-readiness` | completed |
| `egm-inventive-catalyst` | completed |

**Severity breakdown (re-review, deduplicated):**
- 2 Blockers. Both are unresolved earlier findings: B1 comes back in a new form, and B4 is still open.
- 14 Majors. Some are residues of partly resolved findings; the rest are new.

**Verdict:** not ready. The rewrite fixes most of the scope, structure and code-accuracy findings. But the central safety argument of Epic 2, "the drafter has no side effects, so any failure can fall back inline", is false for the commit steps it assigns to the drafter. The Pi/omp hiding fix also still cannot work.

## Disposition verification

| ID | Spec's disposition | Verified status | Note |
|---|---|---|---|
| B1 | fixed | **Not resolved, becomes R-B1** | The text is consistent now, but the premise is false. See R-B1. |
| B2 | fixed | Mostly resolved | First-dispatch formats are literal and "malformed" is defined. Regenerate, Edit and dispatch payloads have no format (R-M1, R-M2). |
| B3 | fixed | Resolved | Bivouac is hidden only. |
| B4 | fixed | **Not resolved, becomes R-B2** | The rewritten links cannot be resolved. See R-B2. |
| B5 | fixed | Partly resolved, becomes R-M3 | The ownership table exists, but several steps have no owner and the read budget is missing files. |
| M1 | fixed | Resolved as scoped | Two-hop relay is a legitimate non-goal. The new rule's wording introduces R-M5. |
| M2 | accepted | Legitimate acceptance, but now load-bearing | The fallback's safety now rests on the same prompt-only rule (R-B1). |
| M3 | fixed | Resolved | |
| M4 | fixed | Resolved | |
| M5 | fixed | Partly resolved, becomes R-M13 | |
| M6 | fixed | Resolved, with a caveat | `mapAgent`'s `set` cannot drop a key or add a report entry, so this needs code in each adapter. Reporting `inherit` floods the report (R-M8). |
| M7 | fixed | Partly resolved, becomes R-M6 | The baseline is not measured, and the targets are not grounded in it. |
| M8 | fixed | Partly resolved, becomes R-M7 | Non-Claude machinery still ships before Claude Code proves the target. |
| M9 | fixed | Resolved | D was dropped, and Alternative M is cited. |
| M10 | fixed | Resolved | The relay file is under `references/`, which the link check covers (`skills.mjs:150-183`). |
| M11 | fixed | Resolved | `copyRewrittenSkills` already rewrites the dispatch name to `derivedId` (`layout.mjs:68`). It only takes effect once the agent is registered (R-M10). |
| M12, M13, M18 | moved to Epic 3 | Legitimate deferral | |
| M14 | fixed | Resolved | `codex-skills/` is the real output directory (`codex/adapter.mjs:13,65`). |
| M15 | fixed | Resolved | |
| M16 | fixed | Partly resolved, becomes R-M12 | The metric is defined, but no code location computes it. |
| M17 | fixed | Resolved, except the Antigravity smoke check, which does not exist (R-M9) | |
| M19 | fixed | Resolved, but the record now overstates some fixes (R-M14) | |
| M20 | fixed | Resolved | Alternatives still use the old letter keys (R-M14). |
| M21 | fixed | Partly resolved | The percentages still have no stated base. Folded into R-M6. |

---

## Re-review findings

### R-B1. The drafter is not side-effect free, so the inline fallback can commit the wrong set of files (Blocker)
* **Reviewer Lens:** `design`, `codebase-details`, `implementation-readiness`, `inventive-catalyst`, `comprehension`
* **Affected Scope:** 2.1 line 125; 2.2 line 136; 2.2 line 145; 2.3 line 152; Risks line 182.
* **Discrepancy Description:** The steps 2.2 gives the drafter change the index or write files:
  * Atomicity "Split" runs `git reset HEAD <files>`, then loops "commit the next concern" across several commits (`references/atomicity-warning-flow.md:52-72`).
  * The 4e prompt's "stage related" option runs `git add` (`references/atomicity-analysis.md:76-83`).
  * `--pair` saves `.claude/git-commit.local.md` (`pair-programming.md:28`).
  
  This contradicts "never stages, commits or writes files", which is the stated reason "a rerun is always safe".
  * **Failure case:** the user picks Split, and the drafter unstages files. The resume then fails. Inline re-runs on the reduced index, drafts and commits one concern, and the remaining concerns are silently lost.
  * **Not enforced anywhere:** the no-side-effects rule is prompt-only on every harness. On Claude Code the drafter has Bash. On OpenCode, `tools` are dropped, so it also has write and edit.
* **Rationale & Recommendation:**
  * Make the drafter propose, never apply. Its `done` reply carries `stage:` / `unstage:` file lists, or a `split: {concern, files}`.
  * The parent applies the index changes, owns the next-concern loop, and re-dispatches once per concern.
  * Move the pair prompt and its save to the parent.
  * Optionally, the parent records `git rev-parse HEAD` and `git write-tree` before dispatch and compares them after each reply. If either changed, the run counts as `failed: drafter mutated repo`, with no inline rerun.
  * Until this is done, do not enable the relay on harnesses that drop `tools`.

### R-B2. B4 is still open: the Pi/omp wrapper's rewritten links cannot be resolved (Blocker)
* **Reviewer Lens:** `codebase-details`, `implementation-readiness`, `zoom-out`
* **Affected Scope:** 1.3 Pi row line 74, omp row line 75; Testing line 189; Review record line 271 (Ponytail finding 12).
* **Discrepancy Description:** The wrapper rewrites relative links "to the skill's path inside the package". The model has no base to resolve that path against:
  * Pi prompt templates carry no location (`harness_dictionary.md:196`).
  * The install root is unknown at build time.
  * The read tool resolves relative paths against the user's working directory.
  
  `devenv:manage` is the skill the spec names for this test, and it has 9 `references/` links (`skills/devenv/manage/SKILL.md:34,55,66,144,…`). Every one would fail to load on Pi and omp.
  
  The spec also leaves two things open: whether frontmatter is stripped, and where `$ARGUMENTS` goes (`names.mjs:41-47`).
  
  Pi already solves this natively. `/skill:<id>` injects the body with "References are relative to <baseDir>" (`docs/harness-research.md:397`), and it works for hidden skills (`harness_dictionary.md:196`). omp has `/skill:<plugin>-<skill>` (`scripts/omp-smoke.sh:89-93`).
* **Rationale & Recommendation:**
  * For hidden skills on Pi and omp, write no prompt wrapper. Record that the slash form there is `/skill:<id>`.
  * Drop the body-carrying and link-rewriting work, and update Outcome 1's "`/name` still works everywhere".

### R-M1. The relay formats are still missing Regenerate, Edit and amend, the result cap's behavior, and authority over the user's edited text (Major)
* **Reviewer Lens:** all eight
* **Affected Scope:** 2.1 lines 112-127; 2.2 lines 138-139.
* **Discrepancy Description:**
  * **Regenerate:** `answers: [{id: regenerate}]` has no `choice:` or `text:`, and `regenerate` is not a question the drafter asked. So it breaks the 2.1 answer schema, and the optional "more context" from `message-dialogs.md:40` has nowhere to go.
  * **Edit:** no payload or reply is defined. The drafter's `done.result` could quietly rewrite the user's text, and nothing says whether the parent commits `result` or the user's version.
  * **Warnings:** nothing says whether `warnings` blocks the commit.
  * **Amend:** the amend dialog's "New commit instead" has no resume message.
  * **Result cap:** going over the 4k `result` cap is neither a truncation nor a malformed reply.
* **Rationale & Recommendation:**
  * Define reserved ids in `subagent-relay.md`:
    * `{id: regenerate, text?}`;
    * `{id: edit, text: <full message>}`, where the drafter returns only `warnings` and the parent commits the user's text verbatim;
    * `{id: amend, choice: false}`.
  * Add "over 4k" to the definition of malformed.
  * State that `warnings` re-offers the dialog and does not block the commit on its own.

### R-M2. The dispatch payload is undefined, including the style and the skill directory (Major)
* **Reviewer Lens:** `design`, `implementation-readiness`, `codebase-details`
* **Affected Scope:** 2.1 line 126; 2.2 lines 134-144.
* **Discrepancy Description:** Only `relay-depth` and `amend` are specified. These inputs have no defined field:
  * the session summary;
  * `[context…]` arguments;
  * `--no-atomic-check`;
  * the co-author;
  * the file subset after a split;
  * on amend, the previous message and diff.
  
  Two gaps cause concrete failures:
  * **Style:** `commit.sh` needs `--style` (`SKILL.md:329-333`), but style resolution (flag, then settings file, then default) has no owner. If settings say `conventional` and the parent passes the default `classic`, the executor rejects every message. "Commit anyway" needs a structured `style_violation` field, not free-text `warnings`.
  * **File paths:** the agent lives under `agents/`, so its relative paths to `drafting.md`, the styles and `lib/style-check.sh` have no base directory.
* **Rationale & Recommendation:**
  * Put one literal dispatch example in `subagent-relay.md` with `relay-depth`, `skill-dir` (absolute), `style` (resolved by the parent), `amend`, `co_author`, `files`, `context` and `no_atomic_check`.
  * Add `style_violation: <reason>|none` to `done`.

### R-M3. B5 residue: some steps have no owner, and the parent read budget contradicts the parent's own steps (Major)
* **Reviewer Lens:** `design`, `codebase-details`, `implementation-readiness`
* **Affected Scope:** 2.2 table lines 134-140; budget line 142.
* **Discrepancy Description:**
  * **Amend detection** is owned by the parent. It needs `last-commit-comparison.md` and, on the LLM path, `git show HEAD` plus the staged diff (`SKILL.md:120-132`). Both are outside the budget, and the diff is the very cost Epic 2 is meant to remove.
  * **`review-plan.md`** is owned by the parent, but it reads every original diff plus the style and leak rules (`review-plan.md:5-12`), all outside the budget.
  * **No owner:**
    * Step 1, "no staged changes, stage all?" (`SKILL.md:66-84`);
    * Step 2, settings;
    * Step 6, `--pair` selection;
    * `error-messages.md`;
    * the split next-concern loop.
* **Rationale & Recommendation:**
  * The parent handles only the explicit `--amend` flag and the deterministic checks. Automatic amend detection moves to the drafter as a relayed `amend.detected` question.
  * Add rows for the unowned steps, and list `review-plan.md`, `pair-programming.md` and `error-messages.md` as conditional parent reads.

### R-M4. A fallback after the user has answered questions re-asks them or throws away the user's edit (Major)
* **Reviewer Lens:** `design`, `inventive-catalyst`
* **Affected Scope:** 2.1 line 125; 2.2 lines 138-139; Risks line 181.
* **Discrepancy Description:** "Any failure falls back inline" means starting from the top.
  * If resume fails after `atomicity.split` was answered, the user is asked again.
  * If it fails during Edit, a fresh draft replaces the user's text.
  
  Resuming an agent after it has replied `done` (Regenerate, Edit) is the least verified path, so this is where the fallback fires most often.
* **Rationale & Recommendation:**
  * The parent keeps an answer log and the last `result`, and passes both to the inline path, which skips answered ids.
  * An Edit failure runs only the leak and style checks inline, on the user's text.

### R-M5. The nesting rule runs the full commit flow inside a sub-agent and misses the real nested caller (Major)
* **Reviewer Lens:** `design`, `inventive-catalyst`, `comprehension`
* **Affected Scope:** 2.1 line 126; Non-goals line 34.
* **Discrepancy Description:**
  * **Full flow inside the drafter:** "A skill that sees `relay-depth` runs inline", and inline means Steps 1-9, including confirmation and `commit.sh`. If the drafter loads the commit skill, it either tries to talk to the user or commits.
  * **Missed caller:** `craft:build` and `craft:debug` invoke `/commit-tools:commit` from implementer sub-agents (`skills/craft/build/SKILL.md:28`), and those never carry `relay-depth`. Where dispatch exists (OpenCode, Pi), that creates the two-hop relay the spec excludes. Elsewhere, confirmation never reaches the user.
* **Rationale & Recommendation:**
  * Reword: "A skill that sees `relay-depth` drafts only, following `drafting.md`, and returns `done`. It never runs Steps 8-9."
  * Define the inline trigger as "running inside any sub-agent", using a marker that craft passes on, and state what counts as confirmation in that mode.

### R-M6. The targets have no grounding: the baseline is unmeasured, and the 15% listing target is probably out of reach (Major)
* **Reviewer Lens:** `zoom-out`, `design`, `codebase-details`, `implementation-readiness`, `style`, `comprehension`
* **Affected Scope:** Problem lines 5-11; Baseline table lines 15-20; 1.1 line 42; Evidence line 230; Outcome 4.
* **Discrepancy Description:**
  * **Listing target (15%):**
    * Hiding five skills and dropping two "Not for" clauses removes about 2.0k chars.
    * Agent descriptions with `<example>` blocks run about 1k each (`agents/refactor/scanner.md:3-25`), so counting agents puts the denominator at about 20-22k. The likely saving is then about 9-11%.
    * "Every skill … the model can see" could also include third-party plugins, while 1.1 counts only the generated tree.
  * **Commit target (60%):**
    * The parent's fixed floor is about 11-15k.
    * The baseline is unmeasured, it grows with diff size, and no reference change is named. Depending on the diff picked, the target is either impossible or trivial.
  * **Unclear wording:**
    * Line 15 says the before and after measurements happen "at the same revision", which is impossible.
    * Line 42 says the baseline is "recorded in this spec", but it is not.
    * The base of the 54/22/16% figures is still unstated.
* **Rationale & Recommendation:**
  * Measure both baselines before approval, using the existing 1.1 procedure, which is cheap.
  * Name a fixed reference change and a transcript counting rule. Add a "Measured baseline" subsection.
  * Scope the listing metric to "this repo's generated tree". Set the targets from the measured numbers, optionally as an absolute cap next to the percentage.

### R-M7. Scope: Epics 1 and 2 still build non-Claude machinery before Claude Code proves the win (Major)
* **Reviewer Lens:** `zoom-out`, `design`
* **Affected Scope:** 1.3 lines 74-76; 2.3 lines 147-164; Testing lines 188-197.
* **Discrepancy Description:**
  * **Epic 2 enables OpenCode and Pi** before Claude Code proves anything. That brings in Pi agent shipping, the `package.json` key, `models` tables, `pi-smoke.sh` and the omp resume probe. Yet the only measured cost and the only end-to-end resume run are on Claude Code.
  * **On OpenCode the relay saves less and costs more:** `model` is dropped, so the main model's price applies. `tools` are dropped, so the drafter has write and edit while owning steps that change the index (R-B1).
  * **Epic 1 adds hiding code for unmeasured harnesses:** the Pi/omp body wrapper (R-B2) and the Codex writer, while its target is Claude Code only.
* **Rationale & Recommendation:**
  * Epic 2: Claude Code enabled, every other harness inline and `degraded` (the inline fallback already costs nothing).
  * Epic 1: hide natively where it costs no new code (Claude Code, OpenCode, Antigravity), and report the rest as `degraded`.
  * Move the rest to Epic 3.

### R-M8. Reporting terms are inconsistent, so the expected build-report lines cannot be derived (Major)
* **Reviewer Lens:** `comprehension`, `style`, `implementation-readiness`, `codebase-details`
* **Affected Scope:** Outcomes 2-3 lines 25-26; 1.3 and 2.3 tables; Risks line 182; Testing line 195; line 158.
* **Discrepancy Description:**
  * **Mixed terms:** the tables say "dropped and reported", "inline until the smoke check…", "enabled" and "`degraded`". OpenCode is "enabled" in 2.3 but "`degraded`" in Risks.
  * **Gated harnesses:** nothing says what omp and Antigravity report while they are held inline.
  * **Outcome 2:** "wherever a sub-agent is available" includes omp and Antigravity, which stay inline.
  * **`inherit`:** reporting it adds a note per agent per harness for 10 agents, rewriting every existing report assertion, and it is not a real degradation.
  * **No pass/fail:** Outcomes 1-3 have no check.
* **Rationale & Recommendation:**
  * Define "reported" once as "emits a `degraded` entry naming the field", and use `degraded` in every table cell that means it.
  * Give the exact expected entries for each harness.
  * Drop `inherit` silently.
  * Change Outcome 2 to "on harnesses 2.3 marks enabled".
  * Add a check line under each outcome.

### R-M9. The gates on omp and Antigravity have no mechanism: the smoke check does not exist, and the skill will dispatch anyway (Major)
* **Reviewer Lens:** `codebase-details`, `comprehension`, `style`, `inventive-catalyst`
* **Affected Scope:** 2.3 lines 154-155; Risks line 181; Testing line 203; line 15 ("story").
* **Discrepancy Description:**
  * **No Antigravity check:** only `omp-smoke.sh` and `pi-smoke.sh` exist or are planned, and `flash` appears nowhere in the code. "Its smoke story" is undefined.
  * **Gates not enforced at runtime:** on omp and Antigravity the dispatch tool exists, but nothing in the generated entry skill tells it to stay inline. So the skill will dispatch on harnesses the spec calls inline-only.
  * **No way to open a gate:** nothing says what change turns a gated harness on.
* **Rationale & Recommendation:**
  * Mark Antigravity inline for all of Epic 2, and move the `flash` cell to Epic 3.
  * Have each adapter write a build-time `relay: inline|enabled` line into the entry skill, which the skill obeys instead of probing for the tool.
  * Replace "story" with section references.

### R-M10. The new agent is never registered, so nothing ships (Major)
* **Reviewer Lens:** `codebase-details`
* **Affected Scope:** 2.2 line 144.
* **Discrepancy Description:** `commit-tools` has `"agents": []` in `registry.json`. Agents enter `model.agents` and `state.pairs` only through `resources.agents` (`model.mjs:38`, `names.mjs:16`). Without that entry, the drafter is never copied, and the dispatch name is never rewritten.
* **Rationale & Recommendation:** Add "register `commit-tools/commit-drafter.md` in `registry.json` `resources.agents`". The agent's frontmatter `name` must equal its file name.

### R-M11. The resume rows in `subagent-relay.md` cannot be followed (Major)
* **Reviewer Lens:** `implementation-readiness`
* **Affected Scope:** 2.1 line 128; 2.3 table.
* **Discrepancy Description:** The cells do not say:
  * where the id comes from (the Agent result, `task_id`/`sessionID`, or Pi's `id`);
  * the literal resume call;
  * how the model picks its row;
  * whether the resume message is the bare `answers` block.
* **Rationale & Recommendation:**
  * Key each row by the name of the dispatch tool the model can see, with the id source field and a literal call.
  * State that the resume message is the `answers` block only.
  * Combined with R-M9's build-time line, the adapter can write only the active harness's row.

### R-M12. The listing count has no code location (Major)
* **Reviewer Lens:** `implementation-readiness`, `codebase-details`
* **Affected Scope:** 1.1 lines 40-41; metric line 19.
* **Discrepancy Description:**
  * **Where the listed text lives differs per harness:** OpenCode's descriptions come from `resources.json` (`opencode/adapter.mjs:92-95`), and Antigravity's description starts with the picker line (`antigravity/adapter.mjs:87-90`).
  * **What "hidden" means differs per harness.**
  * **No place to total it:** `createReport.lines()` is per plugin and has no numeric field (`scripts/lib/adapters/index.mjs:78-91`).
* **Rationale & Recommendation:** Each adapter's `generate` returns `{listingChars, skills, agents}`, computed from the fields it writes. The build runner sums these per harness and prints the summary line. Add one table naming the counted fields per adapter.

### R-M13. M5 residue: Pi adapter details (Major)
* **Reviewer Lens:** `codebase-details`
* **Affected Scope:** 2.3 lines 153, 160-164.
* **Discrepancy Description:**
  * **False precedent:** line 153 maps Pi tools "as Antigravity does", but Antigravity drops `tools` (`antigravity/adapter.mjs:107-110,119`; spec line 155).
  * **Missing change, layout filter:** the filter that excludes agents (`pi/adapter.mjs:65`) must change.
  * **Missing change, `canCarry`:** the "Pi has no sub-agents" reason for `subagent-start` hooks (`:126`), which `pi-adapter.test.mjs:118` asserts.
* **Rationale & Recommendation:** Write "mapped through `PI_TOOLS`" with no precedent, and list `:65` and `:126` with the other Pi changes.

### R-M14. Alternatives are keyed by retired letters, and the review record overstates fixes (Major)
* **Reviewer Lens:** `structural`, `zoom-out`, `comprehension`
* **Affected Scope:** Alternatives lines 168-175; Review record lines 239, 257-259, 271.
* **Discrepancy Description:**
  * **Retired letters:** the labels A, R, C and D no longer match any heading.
  * **Clashing labels:** "Alternative M" clashes with the EGM ids M1-M21, and "(M10)" in the body points at the review, not at an alternative.
  * **Overstated fixes:** the record says "M7 fixed" and "M8 fixed", but those are only partly fixed (R-M6, R-M7).
  * **Stale wording:** "M9: D dropped" uses a retired letter, and "phases" conflicts with "Epics".
  * **Untraceable findings:** Ponytail findings 1-12 point at "the history of this file", with no commit.
* **Rationale & Recommendation:**
  * Key the Alternatives by section (2.1, 2.2, 1.2, Non-goals). Cite the earlier decision as "2026-11-02 spec, Alternative M".
  * Mark M7 and M8 as partly fixed.
  * Cite a commit for the Ponytail findings.

## Not verified (re-review)

- External harness APIs were not checked:
  - Claude Code `SendMessage` to a finished agent;
  - the `pi-subagents` key and resume call;
  - omp `agent://` ids;
  - OpenCode `permission` mapping;
  - any Pi prompt-template variable for the package directory.
- Character sizes were estimated from file reads, not measured.
- No build, test or smoke check was run.

---
---

# Re-review round 3

**Target:** `docs/specs/2026-11-13-token-diet-design.md` v3 (lines 1-422), plus the research input `docs/research/2026-11-13-token-levers.md`.

**Scope:** this pass covers three things:
- the "Round 2 dispositions" table;
- the new sections: Measured baseline and targets, §1.1, §1.2, §1.3, §1.5 and §1.6;
- Blockers and Majors only.

**Concurrent edit:** the coordinator edited the spec during this pass. It added §1.6's "Accepted difference" (line 185), which moved every later line down by one, and "Ponytail round 4, finding 13" (line 420). Line numbers below follow the edited file. Reviewers who read it before the edit cite lines from 185 onward one lower.

## Reviewer Status

| Reviewer | Status |
| --- | --- |
| `egm-comprehension` (spec only) | completed |
| `egm-structural` | completed |
| `egm-style` | completed |
| `egm-codebase-details` | completed |
| `egm-design` | completed |
| `egm-zoom-out` | completed |
| `egm-implementation-readiness` | completed |
| `egm-inventive-catalyst` | completed |

**Synthesizer spot-checks against source:** each claim below was confirmed by reading the files.
- `harnesses/opencode/adapter.mjs:116` already passes `trimExamples: true`, and `scripts/lib/transforms/agents.mjs:12` strips `<example>` from agent descriptions.
- `agents/jot/capture.md:13` says "This spec is run inline by the capture command". `skills/jot/capture/SKILL.md:65` reads it, yet it is still registered as an agent at `registry.json:244`.
- In `harnesses/opencode/runtime.mjs`:
  - `state.notes` is a per-session `Set` (lines 65-69).
  - It is filled at lines 92 and 110.
  - It is never cleared.
  - It is pushed after the start context on every request (line 132).

**Severity breakdown (round 3, deduplicated):** 4 Blockers, 9 Majors.

**Verdict:** not ready. Most round-2 relay fixes hold. The problems are elsewhere:
- Three of the new Epic 1 sections rest on wrong facts about the code: the OpenCode baseline, `capture.md`, and the §1.6 cache mechanics.
- The nesting rule now breaks `craft:build` commits.
- Two targets, Pi listing and commit main-context, cannot be met as set.

Each problem has a small fix.

## Round 2 disposition verification

| ID | Spec's disposition | Verified status | Note |
|---|---|---|---|
| R-B1 | fixed | **Partly resolved, becomes R3-M1** | Propose-never-apply and the parent-run split loop hold. The mutation check is narrower than claimed, and when its baseline is taken is undefined. |
| R-B2 | fixed | Resolved | No wrapper. `/skill:<id>` on Pi and omp. |
| R-M1 | fixed | Resolved | The `amend` and `amend.detected` overlap is in R3-M8. |
| R-M2 | fixed | Mostly resolved | Value formats for `files:` and `co_author:` are missing (R3-M8). |
| R-M3 | fixed | Resolved, with one gap | After `amend.detected` is accepted, nothing says the parent runs the explicit `--amend` safety checks (R3-M8). |
| R-M4 | fixed | Resolved | |
| R-M5 | fixed | **Not resolved, becomes R3-B4** | The rule contradicts itself and breaks craft commits. |
| R-M6 | fixed | **Partly resolved, becomes R3-B1 and R3-M2** | The baseline and counting rule exist, but the arithmetic does not hold. |
| R-M7 | partly fixed | **Acceptable, with conditions (R3-M6)** | Claude Code `enabled`, every other harness `inline` plus `degraded`, a build-time switch and one enable story per harness is a proportionate answer to the all-harness requirement. Zoom-out would close it. Two conditions: define the `inline` path so it is no heavier than today, and do not ship the drafter agent where the relay is `inline`. |
| R-M8 | fixed | Resolved | Exception: "excluded everywhere" conflicts with agent-plugins (R3-M7). |
| R-M9 | fixed | **Partly resolved, becomes R3-M6** | The switch exists, but where the line and resume row are written is unspecified. |
| R-M10 | fixed | Resolved | `registry.json:166` has `"agents": []`, so the entry must be the path `commit-tools/commit-drafter.md`. |
| R-M11 | fixed | Resolved for Claude Code | Where the row lives is in R3-M6. |
| R-M12 | fixed | **Not resolved, becomes R3-M7** | `runAdapters` discards the value `generate` returns (`scripts/lib/adapters/index.mjs:48`). |
| R-M13 | moot | Legitimate deferral | The cited lines are accurate. |
| R-M14 | fixed | Resolved | The Ponytail findings are honestly marked "uncommitted". |

---

## Round 3 findings

### R3-B1. OpenCode already strips agent examples, so its baseline, its saving and its target are wrong (Blocker)
* **Reviewer Lens:** `codebase-details` (Blocker), `implementation-readiness`, synthesizer-verified
* **Affected Scope:** Measured baseline line 26; §1.2 line 98; Targets line 53.
* **Discrepancy Description:**
  * **Already stripped:** `opencode/adapter.mjs:116` (`trimExamples: true`) already removes `<example>` blocks from OpenCode agent descriptions.
  * **The baseline doesn't match the §1.1 rule:** the 20,209 sits within 64 chars of omp's 20,273, and omp keeps its examples. So the 20,209 was not measured with the §1.1 counted fields from `resources.json`.
  * **Consequence:** §1.2 saves about 0 chars on OpenCode, not about 8k. OpenCode's ≤12.5k target is then probably out of reach, because only hiding (about 1.5k) applies.
* **Rationale & Recommendation:**
  * Re-measure OpenCode from the generated `resources.json` using the §1.1 rule.
  * Take OpenCode out of the "saves about 8k" sentence.
  * Set its target from the new measurement.
  * Remove `trimExamples`, which §1.2 makes redundant.

### R3-B2. `agents/jot/capture.md` is an inline spec, not an agent; giving it frontmatter turns it into one (Blocker)
* **Reviewer Lens:** `codebase-details` (Blocker), `implementation-readiness` (Blocker), `comprehension`, synthesizer-verified
* **Affected Scope:** §1.2 line 99; Baseline line 24 (Antigravity shows 12 agents).
* **Discrepancy Description:**
  * **What the file is:** `skills/jot/capture/SKILL.md:65` reads the file, which describes itself as "run inline by the capture command" (`capture.md:13`). `CHANGELOG.md:1505-1507` records that its frontmatter was removed on purpose. The `name: [TYPE_ID]` at line 155 belongs to a fenced template, not to the file.
  * **Effect of adding frontmatter:** it would become a listed agent the model can dispatch. That runs an AskUserQuestion workflow away from the user and adds listing chars on every harness.
  * **Why Antigravity counts 12 agents:** the file is still registered (`registry.json:244`), and `antigravity/adapter.mjs:114-117` makes up a name and description for it.
* **Rationale & Recommendation:**
  * Move the file to `skills/jot/capture/references/`.
  * Remove it from `jot.resources.agents`.
  * Update `SKILL.md:65`.
  
  This also takes Antigravity from 12 agents to 11.

### R3-B3. §1.6 doubles OpenCode cache misses, loses notes on retry, and its own test contradicts it (Blocker)
* **Reviewer Lens:** `codebase-details` (Blocker), `design`, `implementation-readiness`, `inventive-catalyst`, `style`, `structural`, synthesizer-verified
* **Affected Scope:** §1.6 lines 183-186; Testing line 338.
* **Discrepancy Description:**
  * **Today's behaviour:** `state.notes` is a per-session `Set` that is never cleared (`runtime.mjs:65-69,92,110`). A new note changes the system prefix once, and the prefix then stays stable.
  * **What the fix does:** under "deliver once, then clear", the note is in the system prompt on call N and gone on call N+1. That changes the system prefix twice per note. Each change invalidates the cached history behind it.
  * **The cost is frequent, not rare:** `hooks/codebase/discovery-augment.sh` adds a note on every Grep and Glob. That is close to a miss on every request.
  * **Lost notes:** the note is cleared when the context hook pushes it. If that model request fails or is retried, the note is gone.
  * **Auxiliary requests:** they may also fire `context` on the same session and use up the note first. This is unverified.
  * **The test contradicts the fix:** the check "system parts identical across requests after start" cannot pass while a note appears in exactly one request.
  * **The research disagrees:** it (finding 4) recommended injecting notes into messages, not the system prompt. The added line 185 rejects that without giving a reason.
* **Rationale & Recommendation:**
  * Attach each note to its tool's result in `execute.after` (`runtime.mjs:107`). Pre-tool notes are held by `ev.id`. The system prompt then never changes, and the note stays in history as it does on Claude Code. This depends on `ev.result` being mutable, which needs to be checked in opencode `fb11429`.
  * If it is not mutable, keep today's sticky notes, cap them, and drop the cache rationale.
  * Rewrite the check: "start parts are an identical prefix on every request".

### R3-B4. R-M5 is still open: the nesting rule contradicts itself and breaks `craft:build` commits on every harness (Blocker)
* **Reviewer Lens:** `design`, `inventive-catalyst`, `comprehension`, `style`
* **Affected Scope:** §2.1 Nesting, line 271.
* **Discrepancy Description:**
  * **The contradiction:** sentence 1 says a commit skill "inside any sub-agent … drafts only … returns `done`, never Steps 8-9". Sentence 2 then lets the same run commit once approval is explicit.
  * **No detection:** nothing detects "inside any sub-agent". No marker was added.
  * **The failure:** `craft:build` implementers run `/commit-tools:commit` (`skills/craft/build/SKILL.md:28`). Under sentence 1, they get back a `relay` block that nothing reads, and no commit is made. The next task's commit then mixes in two tasks' changes.
  * **Scope:** this hits `inline` harnesses too. It is a regression of a workflow that ships today.
* **Rationale & Recommendation:**
  * Trigger draft-only on `relay-depth` alone.
  * Any other run inside a sub-agent keeps today's inline flow, unchanged, under `SKILL.md:19` ("No UI is not approval").
  * Name the steps it skips ("the confirmation dialog and `commit.sh`") instead of "Steps 8-9", since §1.3 may renumber them.

### R3-M1. The mutation check is narrower than the Risks section claims, and its baseline goes stale after the parent's own writes (Major)
* **Reviewer Lens:** `design`, `inventive-catalyst`, `style`
* **Affected Scope:** §2.1 lines 267-268; Risks line 325.
* **Discrepancy Description:**
  * **What the check misses:** `HEAD` plus `write-tree` covers only what the next commit would contain. With unrestricted Bash, the drafter could still do any of these undetected:
    * edit files that are already modified;
    * create untracked files;
    * `git stash`, or `git checkout -- f` (destroys unstaged work);
    * create refs;
    * write `git config`;
    * write `.git/hooks/*` (a prompt-injected diff can plant a hook that `commit.sh` then runs);
    * write `.claude/git-commit.local.md`.
  * **When the baseline is taken:** the spec says "before dispatch", but never says it is re-taken after the parent applies a `proposal` or runs `commit.sh` in the split loop. Resuming the same drafter afterwards then reports "drafter mutated repo" and hard-stops.
  * **Stale draft:** a `done` with a non-empty `stage` list (4e) leaves the confirmed message drafted from the old diff.
* **Rationale & Recommendation:**
  * A `done` with any non-empty `proposal` ends that drafter. The parent applies the proposal, re-takes the baseline, and dispatches a fresh drafter.
  * Widen the fingerprint to cover:
    * `git status --porcelain=v2 --untracked-files=all`;
    * `git diff --binary`;
    * `git stash list`;
    * `for-each-ref`;
    * local config;
    * `.git/hooks`.
  
    Optionally add a PreToolUse Bash allowlist for the drafter (`git diff|status|show|log`, `lib/style-check.sh`).
  * Or reword Risks to "guards commit content only".
  * No enable story may flip a harness that drops `tools` until one of these is in place.

### R3-M2. Two targets cannot be met as set, and the commit baseline is incomplete (Major)
* **Reviewer Lens:** `zoom-out`, `design`, `codebase-details`, `style`, `comprehension`
* **Affected Scope:** Commit main-context lines 36-47; Targets lines 53-55; §2.2 line 290; Problem lines 7 and 13.
* **Discrepancy Description:**
  * **Pi ≤8.5k:** hiding removes about 1.5-1.7k, so Pi lands at 10,240 − 1.6k ≈ 8.6k. The "`listing:` lines meet targets" build check fails as soon as it is written. Codex (≈8.2-8.35k) and Claude Code (≈11.5-12.4k) pass.
  * **Commit ≤15k:**
    * The parent's always-read floor is the entry (≤6k), plus session-context (2.2k), message-dialogs (1.9k) and subagent-relay.md (≈3-3.5k): about 13.5k.
    * On top of that come the dispatch block, the `done` reply, the agent wrapper, Step 1 git output, both mutation checks and `commit.sh` output. That puts the reference run at about 15-17k, before any `needs_input` round or Regenerate.
    * The counting rule also leaves out parent-authored relay text.
  * **Baseline gaps:**
    * Step 3b reads `last-commit-comparison.md` (≈2k) on every non-amend commit (`SKILL.md:130-132`), and the baseline leaves it out.
    * `content-leak-check.md` has no size. The 35.4k total only works if it is ≈2.3k.
    * Line 47 counts file reads twice, as files and again as tool results.
  * **Units:** "chars throughout" (line 13) sits beside 17k tokens (line 7) and the 8,000-byte cap. The entry cap "≤ 6k" (line 290) has no unit and nothing enforces it.
* **Rationale & Recommendation:**
  * Set Pi's target from the per-skill arithmetic (≤8.7-9k).
  * For the commit target, either cap the parts (entry ≤4k; the parent half of subagent-relay.md ≤1.5-2.5k, with the drafter half moved into the agent body) or raise the target to about 18k.
  * Add `last-commit-comparison.md` and the leak-check size, and restate the total (≈37.5k).
  * Change line 13 to "chars, except SKILL.md caps (bytes) and the usage report (tokens)".

### R3-M3. §1.2: the moved examples cost every dispatch, two "agents" are read inline, and the routing evals don't exist (Major)
* **Reviewer Lens:** `implementation-readiness`, `inventive-catalyst`, `codebase-details`
* **Affected Scope:** §1.2 lines 93-98; Alternatives line 310; §1.5 line 171.
* **Discrepancy Description:**
  * **The cost moves rather than disappears:** the agent body becomes the sub-agent's system prompt on Claude Code, OpenCode (`adapter.mjs:122`), omp and Antigravity. Moving about 7.9k of `<example>` blocks into `## Examples` puts them into every dispatch, and the examples address the parent, not the agent. "Moving them costs nothing" (line 310) is false.
  * **Count of name-dispatched agents:** only eight are dispatched by name. `study:coach-agent` and `study:recall-agent` are read inline in the main conversation (`study/coach/SKILL.md:75-76,97-98`; `study/recall/SKILL.md:63`). Their moved examples would land in the main context.
  * **"Single-line" is not enforced:** nine agents use `description: |`, and the validator doesn't catch it.
  * **Missing eval:** `npm run eval -- sketch-note` is the routing guard, but `evals/` has only `codebase`, `commit-tools` and `craft`. The sketch-note skill already carries the same triggers, so two listings compete for one intent.
* **Rationale & Recommendation:**
  * Delete the examples, or move them to a file no harness loads (for example `agents/<plugin>/examples/<agent>.md`), and fix the rationale on line 310.
  * Say eight agents. Treat coach-agent and recall-agent like `capture.md` (R3-B2).
  * Fail validation on a newline in the description.
  * Give the sketch agent a functional description with no trigger phrases, so the skill owns routing, and add the sketch-note routing eval.

### R3-M4. §1.3: SKILL.md files over the cap are missing from the table, and the rule blocks Epic 1 on ten unrelated refactors (Major)
* **Reviewer Lens:** `codebase-details`, `zoom-out`, `inventive-catalyst`
* **Affected Scope:** §1.3 lines 101-120; Outcome 2 line 60.
* **Discrepancy Description:**
  * **Missing from the table:** `sketch-note/excalidraw-format` (469 lines, ≈11-12k bytes) and `typst-notes/typst-format` (387 lines, ≈12-13k) are absent, and `typst-notes/infographics` is probably over too. The new validate rule fails them, so Epic 1 cannot pass.
  * **Not this problem:** none of the ten refactors moves a listing target. Only commit feeds the commit target, and Epic 2 rewrites that file anyway. The other nine fix Codex truncation, which is a real bug but a different one.
  * **"No behavior change" is not guaranteed:** content moved to `references/` only loads if the model chooses to read it. If the moved text is always on the main path, it costs the same tokens plus a round trip, and omp keeps it in history anyway.
  * **Bytes check is sound:** implementation-readiness confirmed the research claim. Codex cuts the injected `$skill` at 8,000 bytes, and references are not affected. The source byte check is sound.
* **Rationale & Recommendation:**
  * Measure all 32 files and list every one over the cap.
  * Move only conditional material (modes, error paths, rare flags) to references.
  * Slim only `commit` in this spec. Turn the 8,000-byte rule into a validate warning plus a Codex `degraded` entry naming the skill, and move the rest to a separate spec. Or keep the rule and accept that Epic 1 includes about 13 refactors, each with its plugin's eval.

### R3-M5. §1.5 brings back unmeasured model downgrades, with wrong agent ids and missing evals (Major)
* **Reviewer Lens:** `zoom-out`, `inventive-catalyst`, `codebase-details`, `implementation-readiness`, `comprehension`, `style`
* **Affected Scope:** §1.5 lines 157-179; Outcome 4 line 62; Review record line 419.
* **Discrepancy Description:**
  * **Out of scope:** the usage report attributes no cost to these agents, and a downgrade changes the price per token, not the token count. Round 1 deferred this work as unrelated (M8), and nothing records why it is back.
  * **"Evals stay green" tests nothing:** jot, study, refactor, typst-notes and sketch-note have no evals.
  * **Wrong ids:** the refactor agents are named `refactor-scanner`, `refactor-synthesizer` and `refactor-validator`.
  * **Agents unaccounted for:** `craft:issue-writer` is already `sonnet` and isn't mentioned, and `jot/capture` has no row.
  * **Wrong Antigravity reason:** no agent uses `tools: "*"`. The adapter drops `tools` and `model` for every agent (`antigravity/adapter.mjs:107-110,119`).
  * **Unstated Antigravity behaviour:** the spec doesn't say whether Epic 1 writes `model: flash` with a degraded entry or drops the key, and `keep` would need `model`.
* **Rationale & Recommendation:**
  * Preferred: remove §1.5's downgrade table and Outcome 4 to a separate spec, keeping only the `degraded` entries for dropped `model`/`tools`.
  * Otherwise: record the user's decision, gate each downgrade on an eval that exists, fix the ids, and use the existing `UNVERIFIED` pattern for Antigravity (`antigravity/adapter.mjs:55,141`) with a `MODELS` map and `keep: [..., "model"]`.

### R3-M6. The `relay:` switch has no location, the `inline` path is undefined, and the drafter ships where it is never dispatched (Major)
* **Reviewer Lens:** `implementation-readiness` (Blocker), `design`, `inventive-catalyst`, `zoom-out`
* **Affected Scope:** §2.1 line 272; §2.2 lines 290-293; §2.3 lines 297-304; Non-goals line 72.
* **Discrepancy Description:**
  * **Where the line goes:** the spec doesn't say whether `relay:` goes in frontmatter (OpenCode strips it, `adapter.mjs:95`) or in the body. It also doesn't say which file holds the resume row, or what the canonical copy contains. Each of the 7 adapters needs new code.
  * **The `inline` path is undefined:** six of seven harnesses run `inline`, but they would still "always" read `subagent-relay.md` and `session-context.md` for a dispatch they never make. That is heavier than today. `drafting.md` is also written for the drafter ("return `done`").
  * **Drafter shipped where unused:** registering `commit-drafter` ships it on OpenCode, omp and Antigravity. There it is listed, adding listing chars, and the model can dispatch it with every tool and no relay.
  * **Scope wording:** Non-goals names only omp and Antigravity, yet OpenCode and Pi also stay `inline`.
* **Rationale & Recommendation:**
  * The canonical entry has one body line, `Relay: inline`, which a shared helper in `scripts/lib/layout.mjs` rewrites. The resume rows sit between markers in `subagent-relay.md`, and `inline` adapters delete them.
  * `inline` reads the entry, `drafting.md` (with a relay/inline mode line) and the conditional files only. Add a target: inline main-context chars no higher than today.
  * Adapters emit `commit-drafter` only where the relay is `enabled`, with a `degraded` entry elsewhere.
  * One Non-goal line: "enabling the relay anywhere but Claude Code".

### R3-M7. Listing-count plumbing and definitions (R-M12 residue) (Major)
* **Reviewer Lens:** `implementation-readiness`, `codebase-details`, `comprehension`, `style`
* **Affected Scope:** §1.1 lines 78-89; Baseline lines 19, 27-29; Targets.
* **Discrepancy Description:**
  * **Plumbing:** `runAdapters` discards the return value of `generate` (`scripts/lib/adapters/index.mjs:48`), and `build.mjs:34` receives only the report.
  * **Definitions don't match:**
    * Line 19 counts `name` everywhere, but §1.1 counts it only for claude-code.
    * Pi (10,240) and Codex (9,959) count the same fields, yet differ, with no explanation.
    * "Excluded everywhere" contradicts agent-plugins, where hiding is `degraded`, so the hidden skills stay listed there.
  * **Missing:** agent-plugins has no target, and the spec doesn't say whether omp lists `commands/` to the model.
* **Rationale & Recommendation:**
  * `runAdapters` collects each return value into `report.listing[adapter.id]`, and `build.mjs` prints from that.
  * State that the baseline and targets use the §1.1 counter, and re-measure.
  * Count hidden skills on agent-plugins, and give it "no target".

### R3-M8. Relay leftovers (Major)
* **Reviewer Lens:** `comprehension`, `style`, `implementation-readiness`, `design`
* **Affected Scope:** §2.1 lines 199-271; §2.2 lines 282-293; Outcome 5 line 63; Testing line 340.
* **Discrepancy Description:**
  * **Amend has two paths:** `amend.detected` (`needs_input`) and the reserved id `amend` (after `done`) overlap. Accepting `amend.detected` doesn't trigger the explicit `--amend` safety checks.
  * **Malformed:** "malformed" is defined, but nothing says it is treated as `failed`.
  * **Value formats:** `files:` and `co_author:` have no format, and the split loop needs a list of paths for each concern.
  * **Outcome 5:** "only the entry skill …" contradicts the §2.2 always-reads.
  * **Testing:** the "dispatch-name rewrite" test has no matching design text.
* **Rationale & Recommendation:**
  * One end-to-end amend sentence: `amend.detected` before the draft, `amend` after `done`, and the parent runs the safety checks on accept.
  * "Malformed is handled as `failed`."
  * `files: all | [<path>…]`, `co_author: none | "<Name> <email>"`.
  * Outcome 5 becomes "only the §2.2 parent reads, relay blocks and `commit.sh` output".
  * Add one line saying the rewrite is the existing `copyRewrittenSkills` pass (`layout.mjs:68`).

### R3-M9. Structure: the new sections have no alternatives, and §1.6 maps to no outcome (Major)
* **Reviewer Lens:** `structural`, `comprehension`
* **Affected Scope:** Alternatives lines 306-319; §1.3, §1.5 and §1.6; Outcomes lines 57-64; Epic 1 title line 74; "Epic 3" line 168.
* **Discrepancy Description:**
  * **No alternatives:**
    * §1.6 sends notes to history, not the system prompt, and the table doesn't weigh this, though the research recommends it.
    * §1.3 has per-skill exemptions and a commit-only scope as alternatives, and they aren't weighed.
    * §1.5 has per-harness frontmatter and staying on `inherit` as alternatives, and they aren't weighed.
  * **§1.6 is orphaned:** it maps to no outcome or risk. The Epic 1 title says "all harnesses", but §1.6 is OpenCode-only.
  * **Undefined term:** "Epic 3" is never defined.
* **Rationale & Recommendation:**
  * Add Alternatives rows for §1.3, §1.5 and §1.6.
  * Add outcome 7 for §1.6, and add its visibility change to Risks.
  * Retitle Epic 1.
  * Replace "Epic 3" with "a separate spec".

## Not verified (round 3)

- No build, so these were not measured: the baseline listing numbers, the 11,416/7,931 agent totals, the byte sizes, and the 6-file/10,117-char diff of `a49bc4c`. The commit itself exists (`.git/logs/HEAD`).
- These OpenCode behaviours were not checked against opencode `fb11429`: whether `ev.result` is mutable in `execute.after`, and whether title or compaction requests fire `context`.
- These were not checked: Claude Code `SendMessage` to a finished agent, the Claude Code PreToolUse `agent_type` field, and whether omp lists `commands/` to the model.

---
---

# Listing-diet spec review

**Target:** `docs/specs/2026-11-13-listing-diet-design.md` (part 1 of the split; lines 1-197). Parts 2-5 are parked and out of scope.

**Scope:** Blockers and Majors only. Checked items:
- the spec's facts, against the repo at `f262c96` and the committed `dist/`;
- its baseline and projection numbers.

## Reviewer Status

| Reviewer | Status |
| --- | --- |
| `egm-comprehension` (spec only) | completed |
| `egm-structural` | completed |
| `egm-style` | completed |
| `egm-codebase-details` | completed |
| `egm-design` | completed |
| `egm-zoom-out` | completed |
| `egm-implementation-readiness` | completed on retry (first run found no persona) |
| `egm-inventive-catalyst` | completed |

**Persona path change:** partway through this pass, the persona files under `distributions/claude/` stopped existing. Every reviewer used the same-named persona and standards from that bundle's `content/agents/` and `content/resources/document_standards/`. Several reviewers withheld a formal verdict because of this. Their findings are consolidated below.

**Synthesizer spot-check:** confirmed by grep that `skills/study/coach/SKILL.md:75-76,97-98` and `skills/study/recall/SKILL.md:63-64` read `<package-root>/agents/study/{coach,recall}-agent.md` and say "do not spawn an agent".

**Severity breakdown:** 2 Blockers, 7 Majors.

## Fact check

| Claim | Result |
|---|---|
| `jot/capture.md` path bug: not shipped on Codex, Pi or agent-plugins; at `agents/capture.md` on the other four; `SKILL.md:65` reference not rewritten | Confirmed |
| Hidden-skill invokers: no skill, agent or hook invokes the five | Confirmed. The only hits are user-facing text and READMEs. |
| Pi `adapter.mjs:72` and omp `76-84` are the wrapper points | Confirmed. Pi:72 is the `runnable` filter; the write is at :80. |
| OpenCode slash form `/bivouac-session` | Confirmed (`derivedId`, `opencode/adapter.mjs:99-106`) |
| Codex `codex-skills/<skill>/agents/openai.yaml` written after `rewriteTree` | Feasible (`codex/adapter.mjs:70-72`); no source skill ships one today |
| `$plugin:skill` still works on Codex with implicit invocation off | Confirmed (`docs/harness-research.md:177-181`) |
| `index.mjs:48` discards the value `generate` returns; `outRoot` is in scope at `build.mjs:31-34` | Confirmed |
| Dispatch-by-name list (§1, lines 46-51) | **Wrong for 3 of 10.** `study:coach-agent` and `study:recall-agent` are read inline (see LD-B1). `craft:issue-writer` is a path reference at `craft/shape/SKILL.md:32`. |
| "Removes the agent from four listings" (§2, line 64) | **Overstated.** OpenCode already rejects the frontmatter-less file (`opencode/adapter.mjs:76-86`) and writes no `opencode-agents/jot-capture.md`. Only omp is certain to list it. |

## Number check

Codebase-details recomputed these by reading files, not by running a build. **Nothing is off by more than 10%.**

| Check | Recomputed |
|---|---|
| Hidden-skill name and description chars | ≈1,450-1,550 (spec: 1,482) |
| Claude Code minus Pi | ≈7,940, matching the 7,931 example chars |
| Claude Code vs Antigravity deltas | Nearly equal, as expected: both count a picker plus a description field |
| OpenCode 12,420 | Includes about 2.2k of trimmed `opencode-agents/` |
| OpenCode delta vs Pi delta | Equal, as expected, because OpenCode already trims examples |

**But the projections and agent counts go stale once LD-B1 is fixed.** Two more agents leave the listing on four harnesses.

## Findings

### LD-B1. The study coach and recall "agents" are inline instruction files with the same path bug as `capture.md` (Blocker)
* **Reviewer Lens:** `codebase-details` (Blocker), `zoom-out`, `inventive-catalyst`, `design`, `structural`; synthesizer-verified
* **Affected Scope:** §1 line 47; §2 lines 59-65; Outcome 4 line 111; Review record line 193 (R3-M3 marked "fixed").
* **Discrepancy Description:** `study:coach` and `study:recall` read `<package-root>/agents/study/{coach,recall}-agent.md` and run them in the main conversation. Nothing dispatches them by name. The consequences:
  * **Wrong locations:** they ship flat at `agents/coach-agent.md` and `agents/recall-agent.md` on four harnesses, and not at all on Codex, Pi or agent-plugins. Study coaching hits the same missing-file read that §2 fixes for jot.
  * **Still listed:** they remain registered agents (`registry.json:611,613`). Their descriptions compete with the `study:coach` skill for "coach me on X".
  * **Wrong numbers:** the targets omit the effect of fixing them.
  * **Overstated record:** R3-M3 is recorded as "fixed", but it flagged exactly these two files.
* **Rationale & Recommendation:**
  * Treat all inline-read files as one class.
  * Move `coach-agent.md` and `recall-agent.md` into their skills' `references/`, unregister both, and fix the three Read lines. Coach's recall step should invoke `study:recall` rather than read into another skill's folder.
  * Extend Outcome 4 to cover study, and recompute the projections.
  * Optionally, have `validate.mjs` fail any SKILL.md that reads `<package-root>/agents/`.

### LD-B2. `listingSize` has no per-harness read map, hiding rule or name form, and the Codex field is undecided (Blocker)
* **Reviewer Lens:** `implementation-readiness` (3 Blockers merged), `design`, `inventive-catalyst`, `style`, `comprehension`
* **Affected Scope:** Baseline lines 17-33; §4 lines 100-104; Risks line 143.
* **Discrepancy Description:** The "Counted" column names fields but gives no rules. An implementer cannot reproduce the baseline without inventing four things:
  * **Paths per harness:** for example `resources.json` plus `opencode-agents/`, or `codex-skills/`.
  * **Hidden-skill markers:** each harness marks hidden skills differently:
    * frontmatter on Claude Code, Antigravity, Pi and omp;
    * `autoinvoke:false` on OpenCode;
    * `openai.yaml` on Codex;
    * none on agent-plugins, where hidden skills are still counted.
  * **Name form:** bare `capture`, prefixed `jot-capture`, or `jot:capture`. It differs per tree.
  * **Codex field:** whether Codex counts `description` or `metadata.short-description`. 24 skills carry the latter.
  
  If the counter counts hidden skills, the Pi, OpenCode and Codex targets fail even when the code is correct. The rules are also written separately from the adapters, so they can drift without notice. The planned test runs on a hand-made fixture, which would not catch that.
* **Rationale & Recommendation:**
  * Add one table with a row per harness: path glob, fields counted, hidden-skill marker, and name form ("as written in the generated file"). Fix Codex to `description`.
  * Add one test that runs `listingSize` on a real `withTempBuild` output and asserts the five hidden skills count 0 everywhere except agent-plugins.
  * Optionally, each adapter exports its own `listing` descriptor next to `capabilities`.

### LD-M1. The Pi and omp wrapper skip breaks existing tests and the omp smoke check; the omp evidence is Pi's (Major)
* **Reviewer Lens:** `design`, `zoom-out`
* **Affected Scope:** §3 lines 93-94; Testing lines 147-158.
* **Discrepancy Description:**
  * **Tests that expect a wrapper for every runnable skill:** these would fail on the hidden skills:
    * `tests/build/wrapper-thinness.test.mjs:23`;
    * `tests/build/picker-lines.test.mjs:100`;
    * `scripts/omp-smoke.sh:87`.
  * **Stale snapshot:** `tests/fixtures/claude-snapshot.json` hashes the agents, so Changes 1 and 2 invalidate it.
  * **String values:** `parseFrontmatter` returns strings, so a check written as `=== true` never matches and the wrappers silently stay. OpenCode uses `String(...) === "true"` for this reason.
  * **omp evidence:** the omp skip rests on Pi's observation (`harness_dictionary.md:196`). For omp, only docs (`harness-research.md:516`) say it honours the flag, and nobody has observed `/skill:<id>` working for a hidden skill on omp. If omp can load hidden skills by id, the skip removes `/bivouac:session` for no reason.
* **Rationale & Recommendation:**
  * Add one `hidden` field in `scripts/lib/model.mjs`, using a String comparison.
  * Filter on `userInvocable && !hidden` in both adapters and the three checks, and regenerate the snapshot.
  * Make one omp RPC observation before skipping its wrapper.

### LD-M2. Skill bodies keep pointing hidden skills at slash names that no longer exist on Pi and omp (Major)
* **Reviewer Lens:** `inventive-catalyst`
* **Affected Scope:** §3 lines 86 and 93-94.
* **Discrepancy Description:**
  * **omp:** it keeps `/study:setup` in bodies because "the command wrappers provide that slash name" (`omp/adapter.mjs:73`, `names.mjs:28-34`). With no wrapper, the name points nowhere.
  * **Pi:** it rewrites the name to `/study-setup`, which is the prompt being removed.
  * **Affected references:**
    * `study/coach/SKILL.md:37`;
    * `jot/setup/SKILL.md:44,53`;
    * `jot/configure/SKILL.md:27`;
    * `bivouac/session/SKILL.md:100`;
    * the bivouac README.
  
  Combined with dropping the description pointers (line 86), these two harnesses are left with no way to find setup.
* **Rationale & Recommendation:**
  * Have `rewriteReferences` write `/skill:<plugin>-<skill>` for hidden skills on Pi and omp, with one test.
  * Keep the body pointers. They cost nothing in the listing.

### LD-M3. The targets are not enforced, and enforcing them would break on the next skill added (Major)
* **Reviewer Lens:** `zoom-out`, `inventive-catalyst`, `design`, `comprehension`, `implementation-readiness`, `style`
* **Affected Scope:** Baseline lines 23-33; §4 line 103; Outcome 1 line 108; Testing line 155.
* **Discrepancy Description:**
  * **Unclear behaviour:** §4 only prints the counts, but Testing says the build lines "meet the targets", and no file holds the targets.
  * **Headroom:** each target is 142-228 chars above its projection, and one average skill description is about 280 chars. If the build gates on the targets, the next new skill fails it. That pushes authors toward shortening descriptions, which the Non-goals rule out.
  * **Unwritten descriptions:** the projection depends on 10 agent descriptions that are not written yet.
  * **agent-plugins:** its target ("unchanged") is not a number.
* **Rationale & Recommendation:**
  * State that the `listing:` lines are informational and the targets are a one-time acceptance check, recorded in the Review record.
  * The lasting guards are the per-item validate rules.
  * Give agent-plugins "= 9,959".
  * State the assumed per-agent description budget.

### LD-M4. The one-line agent description rule lets invalid YAML through on Claude Code (Major)
* **Reviewer Lens:** `design`, `implementation-readiness`
* **Affected Scope:** §1 lines 39-41.
* **Discrepancy Description:**
  * **Today:** descriptions are `|` blocks, which tolerate colons.
  * **After the change:** a plain one-line value with `: ` is invalid in strict YAML. The repo's own lenient parser accepts it, so validate and test both pass.
  * **Effect:** Claude Code copies agents verbatim, so it fails to load that agent. Other harnesses re-serialise the value and hide the problem.
  * **Also missing:** nothing enforces "one line".
* **Rationale & Recommendation:** The validate rule should reuse `descriptionIsOneLine` (`skills.mjs:143`). It should also require the raw line to pass `isPlain` or be quoted (`frontmatter.mjs:17,22`).

### LD-M5. The sketch-note mitigation can't fail: there are two routes for one intent, and the eval has no expected winner (Major)
* **Reviewer Lens:** `inventive-catalyst`, `implementation-readiness`, `structural`
* **Affected Scope:** §1 lines 54-57; Risks line 142; Testing line 160.
* **Discrepancy Description:**
  * **Two independent routes:** the sketch skill never dispatches the agent. Both are listed and both fire on the same phrases. One-line trigger-first descriptions make them more alike.
  * **The eval cannot fail:** `evals/sketch-note/visualize-request/` has no prompt or grader specified, and no expected route (`Skill` versus agent).
  * **Missing eval folders:** Testing line 160 names eval folders that don't exist (`jot`, `study`, `refactor`, `typst-notes`). Only `codebase`, `commit-tools` and `craft` exist.
* **Rationale & Recommendation:**
  * Make the skill the single router: it dispatches the agent by name, and the agent gets a description with no triggers. Or delete the agent.
  * Specify `prompt.md` and a `tool_used` grader that asserts the skill.
  * Trim line 160 to evals that exist, plus the new one.

### LD-M6. §2 claims to fix more than it does, and the fix should ship first on its own (Major)
* **Reviewer Lens:** `design`, `zoom-out`, `codebase-details`
* **Affected Scope:** §2 lines 64-65; Problem line 13; Outcome 4 line 111.
* **Discrepancy Description:**
  * **Overstated claims:** "four listings" is overstated (see the fact check). The moved file still reads `${CLAUDE_PLUGIN_ROOT}/templates/capture/...` (`agents/jot/capture.md:438`), so capture still fails at template load outside Claude Code. "Finds its session file on every harness" is true; "fixes the bug" is not.
  * **Bundling:** the path fix is an independent correctness fix, but it is bundled behind the Codex writer, the wrapper skip, the counter and the eval.
* **Rationale & Recommendation:**
  * Narrow the claims, and record the template path as a known issue.
  * Ship the inline-file moves for jot and study (LD-B1) as a patch first, then rebase the projections.

### LD-M7. Spec and record hygiene (Major)
* **Reviewer Lens:** `structural`, `style`, `comprehension`
* **Affected Scope:** Problem line 12; §3 lines 67-86; Outcome 3 line 110; Non-goals lines 118-125; Review record lines 180-197.
* **Discrepancy Description:**
  * **Outcome 3 vs agent-plugins:** Outcome 3 says the skills are absent "in each harness's form", which contradicts the agent-plugins `degraded` row.
  * **"Only a human starts":** this contradicts Risks, where the model is admitted to start them from plain phrasing. The real criterion is "no skill, agent or hook invokes them".
  * **Clause drops vs Non-goals:** line 86's clause drops shorten skill descriptions, which the Non-goals exclude. The drop for `jot:configure` saves nothing, because that skill is hidden.
  * **Numbering clash:** Non-goals are numbered 2-5, which clashes with Changes 1-4.
  * **Same name, two things:** `sketch-note:sketch` names both the skill and the agent.
  * **Disposition table:**
    * it doesn't name the review file its IDs come from;
    * R3-M2's remainder has no stated home;
    * Ponytail finding 14 sits outside the table.
* **Rationale & Recommendation:**
  * Add "except agent-plugins" to Outcome 3, and restate the hiding criterion.
  * Mark the clause drops as an exemption: they remove pointers to hidden skills.
  * Write "Part 2:" through "Part 5:".
  * Qualify every mention as "skill" or "agent" `sketch-note:sketch`.
  * Cite this review file, point R3-M2's remainder at the commit-relay spec, and mark R3-M3 as reopened (LD-B1).

## Not verified (listing-diet)

- No build or scratch script was run. All numbers are estimates from reading files.
- Not checked: whether Claude Code or Antigravity lists a frontmatter-less agent, and whether omp loads hidden skills by id.
- The eval runner's grader types were not checked.
---
---

# Listing-diet re-review

**Target:** `docs/specs/2026-11-13-listing-diet-design.md` (revised; lines 1-241).

**Scope:** a narrow pass, Blockers and Majors only:
- whether each "Listing-diet review" disposition resolves its finding;
- the new Change 0;
- the Change 3 counting table.

Nits and content that passed earlier were skipped.

**Baseline:** repo at `f262c96` and the committed `dist/`. No build was run.

## Reviewer Status

| Reviewer | Status |
| --- | --- |
| `egm-codebase-details` | completed |
| `egm-design` | completed |
| `egm-implementation-readiness` | completed |
| `egm-comprehension` (spec only) | completed |

**Synthesizer spot-check:** grep confirmed two facts:
- `skills/study/recall/SKILL.md:71` sets `from_coach: false`, while `skills/study/coach/SKILL.md:105` expects `from_coach: true`.
- `agents/study/{coach,recall}-agent.md` carry `name`, `description`, `model` and `tools` frontmatter.

**Severity breakdown:** 1 Blocker, 8 Majors.

## Fact check

| Claim | Result |
|---|---|
| Read lines `jot/capture/SKILL.md:65`, `study/coach/SKILL.md:75,97`, `study/recall/SKILL.md:63` read `<package-root>/agents/...` | Confirmed. No other SKILL.md reads `<package-root>/agents/`. |
| `craft/shape/SKILL.md:32` names the agent by id; `:35` dispatches it | `:35` confirmed. `:32` **still names the path** `agents/craft/issue-writer.md`, so the spec must say the line is edited. |
| `registry.json` jot and study agents | Confirmed (`:243-246`, `:610-614`). Each plugin's `content-extractor.md` stays. |
| `descriptionIsOneLine` at `skills.mjs:143`; `isPlain` at `frontmatter.mjs:22` | Lines confirmed. **Neither is exported**, so validate cannot reuse them until they are. |
| `wrapper-thinness.test.mjs:23` is the wrapper filter | Confirmed |
| `picker-lines.test.mjs:100` is the wrapper filter | **Off.** Line 100 sits in an all-skills loop (`:85`) and reads the Pi prompt. Lines 91-99 must keep checking hidden skills. |
| `omp-smoke.sh:87` filters on `userInvocable` | **Wrong.** It only checks results. `expected` is built at `:56` from `*/commands/*.md`. |
| `pi/adapter.mjs:72,80`; `opencode/adapter.mjs:94` | Confirmed |
| `agents/jot/capture.md:438` reads `${CLAUDE_PLUGIN_ROOT}/templates/capture/` | Confirmed |
| `references/` ships on all seven harnesses | Confirmed. Three copy paths cover it: `copyLayout`, the Codex `codex-skills/` rewrite (`codex/adapter.mjs:62-66`) and `copyRewrittenSkills` (`layout.mjs:59-73`). |
| Change 3 globs vs `dist/*/plugins/` | Correct, except OpenCode agents (LR-M1). Claude Code carries `when_to_use`. Pi, Codex and agent-plugins ship no agents. |

## Disposition verification

| Finding | Verdict | Remaining gap |
|---|---|---|
| LD-B1 | **Partial** | Move, unregister, validate rule and projections are in. Routing coach to the `study:recall` skill breaks the handoff (LR-B1). The rule's scope is narrow (LR-M5). |
| LD-B2 | **Partial** | The table and the real-build test are in. The OpenCode agent row and the value rules can't reproduce the baseline (LR-M1). |
| LD-M1 | **Partial** | `hidden` field and snapshot are fine. Two test instructions point at the wrong lines (LR-M2). The omp fallback is unsafe (LR-M4). |
| LD-M2 | Resolved | — |
| LD-M3 | Resolved | — |
| LD-M4 | Resolved | One caveat: the two helpers must be exported (LR-M5). |
| LD-M5 | **Partial** | A `tool_used` grader can't express "skill or agent" (LR-M3). |
| LD-M6 | Resolved | — |
| LD-M7 | Resolved | — |

## Findings

### LR-B1. Calling the `study:recall` skill from coach loses the coach handoff (Blocker)
* **Reviewer Lens:** `design`; synthesizer-verified
* **Affected Scope:** Change 0, line 54; Alternatives table, lines 154-162; Testing, line 188.
* **Discrepancy Description:** The handoff breaks in two ways:
  * The recall skill always passes `from_coach: false` (`recall/SKILL.md:71`). So right after coaching, the user gets the prerequisite question that `recall-agent.md:55` skips for `from_coach: true` (`coach/SKILL.md:105`).
  * The recall skill takes only `<topic|url> [--depth]`, so coach's `NOTE_PATH` and `SLUG` are dropped. Recall then searches for the note again, and may ask the user to pick a note or offer a cold recall for a note saved seconds earlier.

  The planned manual check would not catch either problem.
* **Rationale & Recommendation:**
  * Use one of two fixes:
    * a coach-only argument on recall (for example `--from-coach <note-path>`) that skips its note search and sets `from_coach: true`;
    * or have coach read `../recall/references/recall-session.md`.
  * Record the rejected option in Alternatives.
  * Add a check that coach flows into recall with no prerequisite question.

### LR-M1. The Change 3 counting rules can't reproduce the baselines (Major; reopens part of LD-B2)
* **Reviewer Lens:** `codebase-details`, `implementation-readiness`, `comprehension`
* **Affected Scope:** Change 3 table and notes, lines 115-126; Baseline, lines 28-36.
* **Discrepancy Description:**
  * **OpenCode agent names:** `opencode-agents/*.md` has no `name` field (only `description` and `mode`; `opencode/adapter.mjs:113-117`). Under "names as written in the generated file", those names count 0. The id exists only as `agents[].id` in `resources.json`.
  * **Unstated value rules:** raw or parsed value (quotes, `|` indentation), and chars or bytes. Raw counting could add a few hundred chars, which is about the 180-230 headroom per target.
  * **Frontmatter-less agents:** the count for `dist/claude-code/plugins/jot/agents/capture.md`, which has no frontmatter, is unstated.
  * **Unexplained baselines:** a reader can't see why OpenCode is about 9.5k below Claude Code (it already trims the examples). That also makes the "Trim examples per adapter" rejection look inconsistent. The reader also can't see why Antigravity is above Claude Code (it merges `when_to_use` into `description`).
* **Rationale & Recommendation:**
  * Read OpenCode wholly from `resources.json`: `skills[].name` and `description`, skipping `autoinvoke === false`, plus `agents[].id` and `description`.
  * Name the parser (`parseFrontmatter`) and the unit (`String.length`).
  * Say that a file with no frontmatter counts 0.
  * Add one sentence explaining each baseline gap.

### LR-M2. Two of the LD-M1 test instructions point at the wrong lines (Major)
* **Reviewer Lens:** `codebase-details`, `implementation-readiness`
* **Affected Scope:** Change 2, lines 97 and 103-104; Testing, line 185.
* **Discrepancy Description:**
  * **picker-lines:** filtering `picker-lines.test.mjs` on `!hidden` at `:15` or `:90` would silently drop the Claude, Antigravity and Codex checks for hidden skills (`:91-99`).
  * **omp smoke check:** `omp-smoke.sh:87` has no filter. Its expected list adapts on its own from `commands/*.md`.
  * **Unclear assertion:** "a hidden skill is absent" doesn't say absent from what: `get_commands` or the model's skill list.
  * **omp wrapper file:** the omp wrapper is `commands/<skill>.md`, not a Pi `prompts/` file, so "same changes as Pi" needs to name it.
* **Rationale & Recommendation:**
  * Guard only `picker-lines.test.mjs:100-101` with `!skill.hidden`, and assert that no Pi prompt exists for hidden skills.
  * Replace the `omp-smoke.sh` edit with a named absence assertion.
  * Name the omp `commands/<skill>.md` wrapper.

### LR-M3. A `tool_used` grader can't express "skill or agent" (Major; LD-M5 partial)
* **Reviewer Lens:** `implementation-readiness`, `design`
* **Affected Scope:** Change 1, line 76; Risks, line 167.
* **Discrepancy Description:**
  * **Grader type:** every existing `tool_used` grader checks one tool name (`tool: Skill, min: 1`, as in `evals/craft/park-idea/graders/skill-fired.md`). It can't tell which skill ran, and it can't OR the Skill tool with an agent dispatch.
  * **The risk is not measured:** an either-route grader can't measure the stated risk that the agent "may be picked less often".
* **Rationale & Recommendation:**
  * Use a `type: llm, focus: trace` grader, as in `evals/commit-tools/commit-trigger/graders/workflow.md`.
  * Drop the eval from that risk's mitigation list.

### LR-M4. The omp fallback would ship a broken command and leaves the target undefined (Major)
* **Reviewer Lens:** `implementation-readiness`, `comprehension`
* **Affected Scope:** Change 2 omp row, line 97; Risks, line 168; Outcome 4, line 133; omp target, line 32.
* **Discrepancy Description:**
  * **Broken wrapper:** `harness_dictionary.md:196` records that a "invoke the skill" wrapper can't run a hidden skill on Pi. omp writes the same `wrapperText` (`omp/adapter.mjs:76-83`). So if omp hides the skill but rejects `/skill:<id>`, "keep the wrapper" ships a dead command.
  * **Unclear fallback:** the spec doesn't say whether the skill stays out of the listing, so the omp target (10,717) and Outcome 4 are undefined in that case.
  * **Underspecified observation:** the omp check has no command, version, pass criterion or record location.
* **Rationale & Recommendation:**
  * In the fallback, omp drops `disable-model-invocation`, keeps the wrapper, and reports `degraded`. The omp projection and Outcome 4 change accordingly; state both.
  * Specify the observation:
    * the command;
    * the pass criterion: the body is injected, and the skill is absent from the model's list;
    * a `harness_dictionary.md` row for the result;
    * that it gates the start of the Change 2 story.

### LR-M5. The Change 0 validate rule is too narrow, and the craft line and helper exports are not stated (Major)
* **Reviewer Lens:** `design`, `codebase-details`, `implementation-readiness`
* **Affected Scope:** Change 0, lines 56-57; Change 1, lines 63-67.
* **Discrepancy Description:**
  * **Narrow rule:** it matches only `<package-root>/agents/` in SKILL.md. It misses:
    * the bare `agents/craft/issue-writer.md` at `craft/shape/SKILL.md:32`, which line 56 describes as if it were already fixed;
    * the moved `references/*.md` files.
  * **Helpers not exported:** `isPlain` and `descriptionIsOneLine` are private to their files. `descriptionIsOneLine` also throws on a file with no frontmatter.
* **Rationale & Recommendation:**
  * Match `(<package-root>/)?agents/<plugin>/` in every `.md` under `skills/`. Anchor the pattern so the `${CLAUDE_CONFIG_DIR}/jot/agents/` config paths don't match.
  * State that `:32` is edited from the path to the id.
  * List exporting both helpers in the changes.

### LR-M6. The moved study files keep their agent frontmatter (Major)
* **Reviewer Lens:** `design`, `comprehension`; synthesizer-verified
* **Affected Scope:** Change 0 table; Alternatives, line 156; Evidence gaps, line 203; Change 3 test, line 126.
* **Discrepancy Description:**
  * **Frontmatter:** `coach-agent.md` and `recall-agent.md` carry `name`, `description` (with `<example>` blocks), `model` and `tools`. Only `capture.md` has none.
  * **Alternatives row:** "Add frontmatter to the inline files" therefore assumes something false for two of the three files.
  * **Confusing Problem section:** it reads as if all three files have no frontmatter, which leaves unclear what the moved files' "count 0" test actually proves.
  * **Stale README:** `templates/study/README.md:20` still lists both files as agents.
* **Rationale & Recommendation:**
  * Strip the frontmatter during the move.
  * Correct the Alternatives row and the Problem section.
  * Update the study README.

### LR-M7. The counting table can drift from the adapters without anything noticing (Major)
* **Reviewer Lens:** `design`
* **Affected Scope:** Change 3, lines 115-126.
* **Discrepancy Description:**
  * **Duplicated facts:** the table repeats facts each adapter already owns: markers, folders, and the Claude Code `when_to_use` split.
  * **Weak test:** the real-build test only checks that eight items count 0. If an adapter moves agents or renames a marker, the counts shift and nothing fails.
* **Rationale & Recommendation:** Either:
  * have each adapter export a `listing` descriptor; or
  * assert per harness that the counted totals equal the items in that harness's tree.

### LR-M8. The spec contradicts itself on Change numbering and on which harnesses ship the files (Major)
* **Reviewer Lens:** `comprehension`
* **Affected Scope:** Baseline, line 26; Change 0, line 46; Outcome 2, line 131.
* **Discrepancy Description:**
  * **No Change 4:** Change 0 ships "before Changes 1–4", but there is no Change 4.
  * **Change 3 changes no counts:** "Projected" applies Changes 0–3, but Change 3 only measures.
  * **Outcome 2:** it says all seven harnesses ship the files, but never states that `references/` copying is what newly brings them to Codex, Pi and agent-plugins.
* **Rationale & Recommendation:**
  * Write "Changes 1–3".
  * Say the projection comes from Changes 0–2.
  * Add one line stating that each skill's `references/` folder ships on every harness. Codebase checks confirm it does.

## Not verified (listing-diet re-review)

- No build was run. The baseline and projected numbers were not recomputed.
- The `dist/` spot-checks covered only the study, bivouac, craft and jot plugins.
- Not checked:
  - whether OpenCode and Antigravity drop hidden skills from the model's listing;
  - whether omp runs hidden skills by `/skill:<id>`.
