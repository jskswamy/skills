# Listing diet: smaller per-request skill and agent listings

Part 1 of the token diet (`docs/specs/2026-11-13-token-diet-design.md`). Research: `docs/research/2026-11-13-token-levers.md`. Review findings come from `docs/specs/reviews/2026-11-13-token-diet-egm-review.md`.

## Problem

Every harness sends, on every request, the name and description of each skill the model can see. Four harnesses (Claude Code, OpenCode, omp, Antigravity) also send each agent's description. In this repo:

- About 70% of agent frontmatter is `<example>` blocks: 7,931 of 11,416 chars.
- Three registered "agents" are really instruction files that a skill reads inline:
  - `jot/capture.md`
  - `study/coach-agent.md`
  - `study/recall-agent.md`

  They sit in the agent listing, and the skills read them from `<package-root>/agents/<plugin>/…`. That path does not exist in any generated tree:
  - Codex, Pi and agent-plugins don't ship the files at all.
  - The other four ship them flat, at `agents/<file>`.
- Five skills that nothing invokes are listed on every request: `bivouac:session`, `devenv:manage`, `jot:setup`, `jot:configure`, `study:setup`.

## Baseline and acceptance targets

**Listing chars** is the name plus the listed description fields of every skill and agent the model can see, in this repo's generated tree. The counting rules per harness are in §4.

- Revision `f262c96`, fresh `npm run build`.
- The installed v3.4.0 copies Claude Code loads are byte-identical to that build.
- "Projected" applies Changes 0–2 to the same build (Change 3 only measures), assuming each agent description is at most 250 chars.

| Harness | Baseline | Projected | Acceptance target |
|---|---|---|---|
| Claude Code | 21,971 | 12,105 | ≤ 12,300 |
| Antigravity | 22,038 | 12,167 | ≤ 12,400 |
| omp | 20,297 | 10,717 | ≤ 10,900 |
| OpenCode | 12,420 | 10,522 | ≤ 10,700 |
| Pi | 10,240 | 8,758 | ≤ 8,900 |
| Codex | 9,959 | 8,506 | ≤ 8,700 |
| agent-plugins | 9,959 | 9,959 | = 9,959 (hiding `degraded`) |

- The targets are a **one-time acceptance check**: they are recorded in the Review record when the epic closes.
- The `listing:` build lines (§4) are informational and never fail the build. Gating on them would make the next new skill fail the build, and would push authors to shorten descriptions, which the Non-goals rule out.
- The lasting guards are the per-item validate rules in Changes 0 and 1.

## Changes

### Change 0: inline instruction files move into their skills (ships first)

This is a correctness fix, independent of the token work. It ships as its own story before Changes 1–3.

| File today | Moves to | Read line updated |
|---|---|---|
| `agents/jot/capture.md` | `skills/jot/capture/references/capture-session.md` | `skills/jot/capture/SKILL.md:65` |
| `agents/study/coach-agent.md` | `skills/study/coach/references/coach-session.md` | `skills/study/coach/SKILL.md:75` |
| `agents/study/recall-agent.md` | `skills/study/recall/references/recall-session.md` | `skills/study/recall/SKILL.md:63` |

- `skills/study/coach/SKILL.md:97` reads recall's file today. It changes to invoke the `study:recall` skill with a new `--from-coach <note-path>` argument.
- `skills/study/recall/SKILL.md` Step 4 sets `from_coach: true` and uses that note path when the argument is present. Otherwise it keeps `from_coach: false` (`:71`). This keeps the coach → recall handoff: no prerequisite question, and no note re-selection.
- The moved files lose their agent frontmatter (`name`, `description`, `model`, `tools`, `color`) and become plain reference documents.
- The three files are removed from `registry.json` `resources.agents` (`jot`, `study`).
- `skills/craft/shape/SKILL.md:32` names the agent by id (`craft:issue-writer`), not by path. The agent stays registered and dispatched (`:35`).
- `scripts/validate.mjs` fails a SKILL.md whose body names an `agents/<plugin>/<file>.md` path, with or without a `<package-root>/` prefix. That covers the bare path at `craft/shape/SKILL.md:32` too.
- **Known issue, not fixed here:** `capture-session.md` still reads `${CLAUDE_PLUGIN_ROOT}/templates/capture/…` (`agents/jot/capture.md:438`), so template loading still depends on the harness. It is recorded in `harness_dictionary.md` as a follow-up.

### Change 1: agent descriptions are one line with no examples

- Each remaining agent gets a one-line `description` of at most 250 chars, trigger phrase first. The `<example>` blocks are deleted; git keeps them.
- `scripts/validate.mjs` checks every agent description:
  - it is one line, reusing `descriptionIsOneLine` (`scripts/lib/skills.mjs:143`, exported for this);
  - it is at most 250 chars;
  - it has no `<example>`;
  - its raw value is quoted or passes `isPlain` (`scripts/lib/transforms/frontmatter.mjs:22`, exported for this). Claude Code copies agents verbatim, so an unquoted `: ` would break loading there.
- Agents dispatched by id from a skill, checked by grep:
  - `jot:content-extractor`, `study:content-extractor`
  - `typst-notes:content-analyzer`, `typst-notes:typst-generator`
  - `refactor:scanner`, `refactor:synthesizer`, `refactor:validator`
  - `craft:issue-writer`
- **The `sketch-note:sketch` agent** is the one agent routed by its description alone. The `sketch-note:sketch` skill also fires on the same phrases and never dispatches it. The agent's one-line description keeps its triggers.
- **New eval** `evals/sketch-note/visualize-request/`:
  - `prompt.md`: "Draw me a diagram of how this repo's build turns registry.json into per-harness trees."
  - `graders/skill.md`: `type: tool_used`, `tool: Skill`, `min: 1`, the format `evals/craft/park-idea/graders/` uses. It asserts that the skill route fires. A `tool_used` grader cannot express "skill or agent", and the skill is the canonical route; the agent route is not asserted.
  - Merging the two routes is out of scope.

### Change 2: hide skills nothing invokes

- **Criterion:** no skill, agent or hook invokes the skill. Each was checked by `plugin:skill` and by bare name. Hidden skills can no longer be picked from plain phrasing; the user types the slash form.
- **Canonical flag:** `disable-model-invocation: true`.
- **Hide:** `bivouac:session`, `devenv:manage`, `jot:setup`, `jot:configure`, `study:setup`.
- **Keep visible**, because something invokes them:
  - `commit-tools:validate-commits` (`review-commits/references/branch-flow.md:185,190`)
  - the `sketch-note:sketch` skill (`jot:sketch-from-capture`)
  - `typst-notes:publish` (`jot-to-publish`)
- **Skill descriptions are not edited.** Pointers to hidden skills ("use jot:setup") stay in descriptions and bodies, because they tell the user what to type.
- **One `hidden` field** in `scripts/lib/model.mjs`, set by `String(frontmatter["disable-model-invocation"]) === "true"`. Every adapter and check uses it.

| Harness | Carried as | User runs | Change | Source |
|---|---|---|---|---|
| Claude Code | copied through | `/bivouac:session` | none | code.claude.com/docs/en/skills.md |
| OpenCode | `autoinvoke: false` | `/bivouac-session` | none (`harnesses/opencode/adapter.mjs:94`) | opencode `config/plugin/skill-file.ts` |
| Antigravity | copied through (same key) | `/bivouac:session` | none | `docs/harness-research.md:267-274` |
| Pi | copied through | `/skill:bivouac-session` | skip the prompt wrapper when `hidden` (filter at `harnesses/pi/adapter.mjs:72`; write at `:80`); `rewriteReferences` writes `/skill:<plugin>-<skill>` for hidden skills | `harness_dictionary.md:196`; `docs/harness-research.md:397` |
| omp | copied through **if observed** | `/skill:bivouac-session` if observed, else `/bivouac:session` | **First** observe over omp RPC whether a hidden skill runs by `/skill:<id>`. If yes, same changes as Pi. If no, the omp adapter strips `disable-model-invocation`, so skills stay listed and the wrappers stay live, and reports `degraded`. The omp target then becomes ≤ 12,400 (examples only, projected 12,199) | `docs/harness-research.md:516` (docs only) |
| Codex | **new** `codex-skills/<skill>/agents/openai.yaml` (`policy:` / `  allow_implicit_invocation: false`), written after `rewriteTree`; the build fails if the source ships one | `$bivouac:session` | Codex adapter | codex `skills/src/model.rs:23-28` |
| agent-plugins | not carried | – | `degraded` entry naming `disable-model-invocation` | agentskills.io/specification |

Updated with the wrapper skip:

- `tests/build/pi-adapter.test.mjs:69` (and `tests/build/omp-adapter.test.mjs:72`, if omp is observed) expect wrappers only for `userInvocable && !hidden` skills.
- `tests/build/wrapper-thinness.test.mjs:23` applies the same filter to the Pi expectation only; OpenCode keeps its commands.
- `scripts/omp-smoke.sh:56` derives its expected commands from the build, so it needs no change.
- `tests/build/picker-lines.test.mjs` is unchanged, because hidden skills stay runnable and keep their picker lines.
- `tests/fixtures/claude-snapshot.json` is regenerated (Changes 0–1 change the agent hashes).

Each harness README records the hidden-skill slash form.

### Change 3: listing size in the build

- New `scripts/listing-size.mjs` exports `listingSize(outRoot)`, returning `{harness: {chars, skills, agents}}`.
- `scripts/build.mjs` calls it after `runAdapters` and prints `listing: <harness> <chars> chars (<skills> skills, <agents> agents)`.
- Reading the generated tree avoids `runAdapters`, which discards adapter return values (`scripts/lib/adapters/index.mjs:48`).

| Harness | Skill files | Skill fields | Hidden marker (skip) | Agent files | Agent fields |
|---|---|---|---|---|---|
| claude-code | `plugins/*/skills/*/SKILL.md` | `name`, `description`, `when_to_use` | `disable-model-invocation: true` | `plugins/*/agents/*.md` | `name`, `description` |
| antigravity | `plugins/*/skills/*/SKILL.md` | `name`, `description` | `disable-model-invocation: true` | `plugins/*/agents/*.md` | `name`, `description` |
| omp | `plugins/*/skills/*/SKILL.md` | `name`, `description` | `disable-model-invocation: true` | `plugins/*/agents/*.md` | `name`, `description` |
| opencode | `plugins/*/resources.json` skill entries | `name`, `description` | `autoinvoke: false` | `plugins/*/opencode-agents/*.md` | `name`, `description` |
| pi | `plugins/*/skills/*/SKILL.md` | `name`, `description` | `disable-model-invocation: true` | none | – |
| codex | `plugins/*/codex-skills/*/SKILL.md` | `name`, `description` (not `short-description`) | sibling `agents/openai.yaml` with `allow_implicit_invocation: false` | none | – |
| agent-plugins | `plugins/*/skills/*/SKILL.md` | `name`, `description` | none (all count) | none | – |

- **Values:** values come from `parseFrontmatter` (`scripts/lib/skills.mjs:6`), or from parsed JSON for `resources.json`. Lengths are JS string lengths, in chars, not bytes.
- **Names:** counted as written in the generated file. OpenCode agent files carry no `name`, so the file stem (for example `study-content-extractor`) counts as the name.
- A test runs `listingSize` on a real `withTempBuild` output and asserts:
  - the five hidden skills count 0 on every harness that honors hiding;
  - the three moved files count 0 as agents;
  - **drift guard:** each harness's skill count equals the registry's skills minus the hidden ones (where honored), and each agent-listing harness's agent count equals the registry's agents.

  So an adapter layout change that the counting table does not follow fails the test.

## Outcomes and checks

1. **The acceptance targets are met.** Check: `listing:` lines, recorded in the Review record.
2. **The three inline instruction files ship inside their skills on all seven harnesses**, and no SKILL.md reads `<package-root>/agents/`. Check: `npm test` asserts the files exist in every tree; `npm run validate` passes.
3. **Every agent description is one valid line of at most 250 chars, with no examples.** Check: `npm run validate`.
4. **The five hidden skills are absent from the listing on every harness except agent-plugins** (reported `degraded`), and each runs in the harness's documented form. Check: `npm test`, plus the omp observation and smoke check.
5. **The `sketch-note` visualize eval passes.** Check: `npm run eval -- sketch-note`.

## Non-goals

These are parked as separate specs:

- Part 2: SKILL.md at most 8 KB (`skills-wisp-znn`)
- Part 3: agent models per harness (`skills-wisp-k9i`)
- Part 4: OpenCode runtime notes (`skills-wisp-20a`)
- Part 5: the commit relay (`skills-wisp-czi`)

Also out of scope:

- Shortening skill descriptions. The 2026-11-02 spec, Alternative M, rejected it.
- Merging the `sketch-note` skill and agent routes.
- The capture template path.
- Third-party plugins and MCP servers.

## Alternatives considered

| Change | Alternative | Why rejected |
|---|---|---|
| 0 | Add frontmatter to the inline files | That turns instruction files into dispatchable agents |
| 1 | Move the examples into the agent body | They would load on every dispatch, and the agents dispatched by id never use them |
| 1 | Trim examples per adapter | The Claude Code adapter copies agents verbatim; one source edit covers every harness |
| 2 | Pi/omp wrapper carrying the skill body | Relative links cannot resolve from `prompts/`; `/skill:<id>` is native |
| 2 | Drop the "use jot:setup" pointers | They are the user's only route to a hidden skill |
| 3 | Gate the build on the targets | It would break on the next new skill |
| 3 | Return counts through `runAdapters` | Needs a new return channel |

## Risks

- Hidden skills no longer trigger from plain phrasing. Accepted.
- The `sketch-note` agent may be picked less often. Mitigation: the trigger line, the overlapping skill, and the eval.
- omp may not run hidden skills by id. Mitigation: observe first, and keep the wrapper if not.

## Testing strategy

- **`npm test`:**
  - `listingSize` on a real temp build, with the hidden-skill and moved-file assertions;
  - the agent description validation, including a colon case;
  - the `<package-root>/agents/` validation;
  - the Codex `openai.yaml` writer and its clash failure;
  - Pi (and omp, if observed) write no wrapper for hidden skills;
  - the `/skill:<id>` rewrite;
  - the agent-plugins `degraded` entry;
  - the moved files exist in all seven trees;
  - the updated Pi/omp adapter and wrapper-thinness tests;
  - the regenerated snapshot.
- **`npm run validate`.**
- **`npm run build`:** read the `listing:` lines.
- **`scripts/omp-smoke.sh`:** unchanged (expectations come from the build), plus the RPC observation of `/skill:<id>` for a hidden skill.
- **Pi:** a manual check that `/skill:bivouac-session` runs and the skill is absent from the listing.
- **Manual, Claude Code:**
  - a `jot:capture` and a `study:coach` session, end to end;
  - the hidden skills are absent from the skill list;
  - `/bivouac:session` runs.
- **`npm run eval -- sketch-note craft commit-tools codebase`.** Those are the existing eval folders plus the new one.

## Evidence

- Revision `f262c96`; a fresh temp build. The installed copies were compared with `/usr/bin/diff -rq`.
- Code read:
  - `agents/*`
  - `skills/{jot/capture,study/coach,study/recall,craft/shape}/SKILL.md`
  - `harnesses/*/adapter.mjs`
  - `scripts/lib/{skills,model}.mjs`, `scripts/lib/transforms/{agents,frontmatter,names}.mjs`, `scripts/lib/adapters/index.mjs`
  - the tests named above
- External sources: in the research doc.
- Gaps: whether omp runs hidden skills by `/skill:<id>` (to be observed); whether Claude Code and Antigravity list a frontmatter-less agent.

## Review record

- **Origin:** split from the token-diet spec v3 on 2026-11-13, at the user's request.
- **Mode:** Full (EGM plus Ponytail), the user's selection on the parent spec.
- **Earlier findings in this scope**, from the review file:

| Finding | Disposition |
|---|---|
| B4 / R-B2 | fixed: no wrapper; `/skill:<id>` |
| M3 | fixed: Antigravity native |
| M4 | fixed: `publish` visible |
| M9 | fixed: no skill description edits at all |
| M14 | fixed: Codex path and clash failure |
| M15 / M16 / R-M12 / R3-M7 | fixed by LD-B2's table |
| R3-B1 | fixed: OpenCode baseline 12,420 |
| R3-B2 | fixed: Change 0 |
| R3-M2 | fixed in this scope; the commit part goes to part 5 |
| R3-M3 | reopened by LD-B1, now fixed: Change 0 covers the study files |

- **Listing-diet review** (LD-B1, LD-B2, LD-M1–LD-M7):

| Finding | Disposition |
|---|---|
| LD-B1 | fixed: Change 0 moves both study files, unregisters them, routes coach to the `study:recall` skill, and adds a validate rule; projections recomputed |
| LD-B2 | fixed: per-harness table in Change 3; Codex counts `description`; real-build test |
| LD-M1 | fixed: `hidden` field with a String comparison; tests, smoke check and snapshot updated; omp observed before skipping |
| LD-M2 | fixed: `/skill:<id>` rewrite for hidden skills; descriptions and bodies keep their pointers |
| LD-M3 | fixed: one-time acceptance targets; informational build lines; agent-plugins = 9,959; per-agent budget stated |
| LD-M4 | fixed: one-line, `isPlain` or quoted |
| LD-M5 | fixed: eval prompt and either-route grader; eval list trimmed to existing folders; route merge is a Non-goal |
| LD-M6 | fixed: claims narrowed; template path recorded as a known issue; Change 0 ships first |
| LD-M7 | fixed: hiding criterion restated; Outcome 4 excepts agent-plugins; no clause drops; parts named; skill and agent qualified; review file cited |

- **Ponytail finding 14:** fixed, and broadened by Change 0.
- **Listing-diet re-review** (LR-B1, LR-M1–LR-M8, in the review file):

| Finding | Disposition |
|---|---|
| LR-B1 | fixed: `study:recall --from-coach <note-path>` keeps the handoff |
| LR-M1 | fixed: parsed values, chars; OpenCode agent name is the file stem |
| LR-M2 | fixed: test references corrected; `omp-smoke.sh` self-derives; `picker-lines` unchanged |
| LR-M3 | fixed: `tool_used` `Skill` grader |
| LR-M4 | fixed: if omp rejects, the flag is stripped and wrappers stay live; the target is restated |
| LR-M5 | fixed: the path pattern covers bare paths; helpers exported |
| LR-M6 | fixed: frontmatter stripped from the moved files |
| LR-M7 | fixed: drift-guard counts against the registry |
| LR-M8 | fixed: Changes 0–2 projected; no "Change 4" |
- **Review status:** focused EGM re-review done (4 reviewers); dispositions above. Ponytail checked the fixes. No further EGM round, unless the user asks for one.
- **Final approval:** the user approved on 2026-11-13 ("Approve and create"), with the 8-story split.

## Acceptance (2026-11-13, at `fa3538a`)

`npm run build` `listing:` lines, against the one-time targets:

| Harness | Baseline | Measured | Target | Change | Result |
|---|---|---|---|---|---|
| Claude Code | 21,971 | 11,816 | ≤ 12,300 | −46% | met |
| Antigravity | 22,038 | 11,835 | ≤ 12,400 | −46% | met |
| omp | 20,297 | 10,438 | ≤ 10,900 | −49% | met |
| OpenCode | 12,420 | 10,438 | ≤ 10,700 | −16% | met |
| Pi | 10,240 | 8,758 | ≤ 8,900 | −14% | met |
| Codex | 9,959 | 8,506 | ≤ 8,700 | −15% | met |
| agent-plugins | 9,959 | 9,959 | = 9,959 | 0% | met (hiding `degraded`) |

**Other checks:**

- `npm test`: 202 of 202 pass. `npm run validate` passes.
- The omp RPC checks (part of `scripts/omp-smoke.sh`) pass on omp 18.18.6: the 5 hidden skills are absent from the system prompt and still run as `/skill:<id>`. The model-driven commit-guard step was not re-run.
- `npm run eval -- sketch-note`: 3 of 3 runs pass.

**Commits:**

| Commit | Change |
|---|---|
| `e5bb221` | Change 0: inline files |
| `51028ab` | Change 2: hide, Pi and agent-plugins |
| `6c9aac2` | Change 2: Codex |
| `35ce284` | Change 2: omp |
| `32b9b1f` | Change 1: agent descriptions |
| `1f00977` | Change 1: eval |
| `fa3538a` | Change 3: listing size |

**Not checked:**

- the Pi `/skill:bivouac-session` run, by hand;
- a manual Claude Code `jot:capture` or `study:coach` session;
- template paths, a known issue left out of scope.
