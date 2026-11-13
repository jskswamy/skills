# SKILL.md at most 8,000 bytes

Part 2 of the token diet (`docs/specs/2026-11-13-token-diet-design.md`).
Issue: `skills-wisp-znn` (promoted). **Status: approved.**

## Why

- Codex cuts a `$skill` body off at 8,000 bytes (codex `ext/skills/src/extension.rs:433-447`, see `docs/research/2026-11-13-token-levers.md`). Thirteen skills lose their later steps there without any warning.
- omp never prunes a loaded skill (`compaction.md:251`), and on every harness a loaded body stays in history for the rest of the session. `commit-tools:commit` (17.7 KB) runs on almost every task and was 22% of the usage report that started this work.

## Evidence (at `de418b4`, v3.4.1, clean tree)

Sizes in bytes. "Max generated" is the largest copy across the seven harness trees from `npm run build`; rewriting `plugin:skill` references grows a body by up to about 130 bytes, and Codex's copy equals the source.

| Skill | Source | Max generated | Existing `references/` |
|---|---|---|---|
| `bivouac:session` | 24,534 | 24,643 | 0 |
| `commit-tools:commit` | 17,704 | 17,810 | 11 |
| `devenv:manage` | 15,352 | 15,444 | 6 |
| `codebase:seams` | 14,907 | 15,033 | 0 |
| `commit-tools:review-commits` | 14,883 | 15,005 | 9 |
| `sketch-note:sketch` | 14,014 | 14,109 | 7 |
| `refactor:scan` | 13,889 | 14,009 | 0 |
| `codebase:capabilities` | 11,883 | 12,002 | 0 |
| `commit-tools:validate-commits` | 9,324 | 9,436 | 0 |
| `codebase:ask` | 9,272 | 9,333 | 0 |
| `sketch-note:excalidraw-format` | 8,623 | 8,651 | 0 |
| `craft:shape` | 8,334 | 8,466 | 0 |
| `typst-notes:publish` | 7,950 | 8,018 | 0 |

Observed structure the design relies on:

- A skill already reads its own `references/<file>.md` on demand; `commit-tools:commit` does so for 11 files (`Read references/x.md and follow it`). `validateReferences` (`scripts/lib/skills.mjs`) requires every linked reference to exist and every reference to be linked. Every adapter copies `references/` with the skill (`copyRewrittenSkills`, `rewriteTree`), so the pattern works on all seven harnesses.
- References are read with the harness's file tool, not injected, so the Codex cut does not apply to them.
- `craft:build` Step 5 tells the model to "read and apply `craft:shape`'s **Evidence and review contract**". That section must stay in `craft:shape`'s SKILL.md; a reference path inside another skill does not resolve on every harness (the `agents/` path bug fixed in `e5bb221`).
- `scripts/validate.mjs` already builds every harness into a temp dir (`withTempBuild`) and runs adapter checks there.

Gaps: none design-critical. Whether a moved section is read when needed is a behavior question; it is covered by the per-story checks below.

## Design

### Change 1: move detail into `references/`, per skill

For each skill over the limit, move the longest self-contained sections (mode-specific branches, error tables, examples, settings formats, unattended contracts) into `references/<topic>.md`. The SKILL.md keeps:

- frontmatter, the argument table, and every step heading in order;
- per moved section, one line that names when to read it: `Read references/<topic>.md and follow it.` This is the pattern commit already uses;
- any rule the model must hold for the whole run (for example commit's "never add Claude co-author", confirmation before committing).

No wording changes beyond the move and the pointer line. No behavior changes. Target: every generated copy at most 8,000 bytes, aiming for about 7,500 so small later edits do not trip the rule.

Candidate moves (the story picks the final split):

| Skill | Moves |
|---|---|
| `bivouac:session` | one reference per subcommand group: observe/attach, merge, images, config |
| `commit-tools:commit` | Step 7 generation guidance, Step 8 dialogs detail, Step 7b leak check already in references (tighten pointers) |
| `devenv:manage` | Step 2's per-state branches (11.5 KB) |
| `codebase:seams`, `codebase:capabilities`, `codebase:ask` | per-mode Step 3 branches; the index-freshness step |
| `commit-tools:review-commits`, `commit-tools:validate-commits` | unattended contract, failure handling, per-check detail, auto-fix |
| `sketch-note:sketch`, `sketch-note:excalidraw-format` | content gathering per mode, export methods; the complete example |
| `refactor:scan` | scanner input building, validator stage |
| `craft:shape` | trim Workflow wording only; keep the Evidence and review contract in SKILL.md |
| `typst-notes:publish` | Typst preflight install guidance |

### Change 2: validate fails a generated SKILL.md over 8,000 bytes

Export `skillSizeErrors(outRoot)` from `scripts/listing-size.mjs`, which already walks every generated harness tree, returning `<harness> <plugin>:<skill>: SKILL.md is N bytes (max 8000)` for each oversized copy. Call it inside the existing `withTempBuild` block in `scripts/validate.mjs`. Checking the generated copies, not the source, catches the reference-rewrite growth (`typst-notes:publish` is 7,950 in source and 8,018 generated). One test in `tests/build/` calls it on a temp tree with an oversized SKILL.md. Land it last, once every skill passes.

## Stories (one per plugin, rule last)

1. bivouac: split `session`.
2. commit-tools: split `commit`, `review-commits`, `validate-commits`.
3. devenv: split `manage`.
4. codebase: split `seams`, `capabilities`, `ask`.
5. sketch-note: split `sketch`, `excalidraw-format`.
6. refactor: split `scan`.
7. craft: trim `shape`.
8. typst-notes: trim `publish`.
9. validate rule (depends on 1–8).

Stories 1–8 are independent.

## Testing

- Per story: `npm run validate`, `npm test`, and the byte count of every generated copy of the touched skills.
- Behavior: only the commit-tools evals check the workflow (an `llm` grader requires message validation and confirmation), so story 2 runs `npm run eval -- commit-tools`. The codebase, craft and sketch-note evals check only that a skill fired; run them to guard triggering, not behavior. For every split skill except commit-tools, the story records one manual run that reaches a moved section and follows it.
- Story 9: the new test plus `npm run validate` on the full tree.

## Out of scope

- Rewording or shortening skill content beyond moves (separate, behavior-affecting).
- The commit relay (`skills-wisp-czi`), which builds on story 2.
- Shared references across skills (e.g. one index-freshness file for all codebase skills): no cross-skill path resolves on every harness.

## Review record

Review mode: Lightweight — user selected Ponytail only (2026-11-13) | Scope: moves within existing skills plus one validate rule; no public contract, adapter or harness change | Candidate: this file at `de418b4` evidence | EGM: skipped (user choice)

Ponytail review (proposed design, no implementation tests run):

| # | Finding | Severity | Disposition |
|---|---|---|---|
| 1 | Testing claimed evals check behavior; only commit-tools' do | Major | Fixed: Testing section separates behavior from trigger evals; manual run per other split skill |
| 2 | Size check inline in `validate.mjs` is untestable | Major | Fixed: `skillSizeErrors(outRoot)` exported from `listing-size.mjs` |
| 3 | ~7,500 aim has no check | Nit | Accepted as guidance |

Review status: Complete. Final approval: user, 2026-11-13 ("Approve and create").

## Outcome

Built as epic `skills-zip`, 9 stories. The largest generated SKILL.md on any harness is now 7,691 bytes (`bivouac:session`, from 24,643), and `npm run validate` fails any copy over 8,000.

- `craft:shape` was not reworded: its grounding test pins nearly every rule, so the user approved a word-for-word move of the Step 2 ideation routes instead, non-material.
- The bivouac and craft-grounding tests now read SKILL.md plus the skill's references.
- The craft `backlog-view` eval loads no skill, at the pre-split commit too; parked as `skills-wisp-ysa`.
