# Handoff: unattended mode for `review-commits` and `validate-commits`

**Repo:** `github.com/jskswamy/skills` (canonical `skills/`, pi package `@jskswamy/skills`)
**Consumer:** ulai's `finish` step, run by an agent (pi, via Omnigent) inside a
Kubernetes phase pod with no human attached.
**Base read:** commit `22cc32c` (2026-09-30).

## Why

ulai's `finish` step regroups the build step's test-driven commits into logical
commits on a separate **delivery branch** before the user opens a PR. That is
exactly what `review-commits` does, and ulai should use it rather than keep its
own copy. Today the skill cannot run unattended:

- it gates on `AskUserQuestion` (hygiene findings, cluster proposals, plan review,
  per-commit modify, main-flow options, first-time style setup);
- its Branch Flow ends by **merging to main** (`git checkout main && git merge
  --ff-only`) and offering to **delete the branch**;
- it may invoke `/codebase:index`, which can prompt.

An unattended caller has nobody to answer, and must never merge, delete or push.

## The contract

Add one flag, `--unattended`, to both skills. When set:

1. **Never ask.** Every place the skill would call `AskUserQuestion`, take the
   option the skill itself marks as recommended/default, and record the decision
   (see *Outputs*). No other behaviour changes.
2. **Never leave the current branch's scope.** No merge, no checkout of another
   branch, no branch deletion, no worktree removal, no tag (ignore `--tag`), no
   push. The skill rewrites only `<base>..HEAD` of the current branch.
3. **Never block on setup.** Do not run first-time style setup; take the style
   from `--style` (new), else the repo's `.claude/git-commit.local.md`, else
   `classic`. Do not invoke `/codebase:index`; run Layer 3 only if the index
   already exists and is fresh, else skip it (as it already does when MCP is
   unavailable) and record that.
4. **Fail loudly, not interactively.** Anything that would need a human (a
   rebase conflict, tests failing before the rebase, a revalidation drift with no
   saved message, a missing base) stops the run with a non-zero exit and a
   machine-readable reason in the result file. Leave the repository as it was
   (`git rebase --abort`; the original HEAD recorded in the result).
5. **Tree invariant.** After the rebase, `git diff <original HEAD> HEAD` must be
   empty. If not, abort and restore the original HEAD. (ulai's gate checks this
   too, but the skill should never report success otherwise.)

`--base <ref>` is required in unattended mode (no base auto-detection prompts).

## Step-by-step changes in `skills/review-commits/SKILL.md`

| Section | Today | With `--unattended` |
|---|---|---|
| Arguments | `--tag`, `--base` | add `--unattended`, `--style <classic\|conventional>`, `--result <path>` (default `.review-commits/result.json`), `--test-cmd <cmd>` (overrides Test Detection) |
| Precondition | refuses a dirty worktree | unchanged |
| Auto-Detection | branch vs main flow | always **Branch Flow** semantics on the current branch; never the Main Flow's options menu |
| Test Detection | detects `go test`, `npm test`… | use `--test-cmd` when given; else detect as today |
| Codebase Index Resolution | may run `/codebase:index` | never index; use an existing fresh index or skip Layer 3 |
| Present Hygiene Findings | AskUserQuestion: accept all / one by one / dismiss | **Accept all suggestions** (introduce-then-fix pairs are already mandatory) |
| Logical Clustering → plan review | options A/B/keep/modify | take the option marked **Recommended**; with no recommendation, **Keep all as pick** |
| Step 5 Plan Review | Accept / Modify / Reset | **Accept**; write the full plan to the result file |
| Step 6 Execute | may stop on conflict and wait | on conflict: `git rebase --abort`, restore, exit non-zero with reason `conflict` and the files |
| Step 7 Revalidate | warns on drift | same, but drift with no saved message → fail with reason `drift` |
| Step 8 Merge to Main | merges | **skipped** |
| Step 9 Tag | tags with `--tag` | **skipped** |
| Step 10 Validate and Cleanup | validate-commits, then ask to delete | run `validate-commits --unattended --base <base>`; **never** delete branch or worktree |
| Soft-Reset Escape Hatch | interactive regrouping | **not available**; if the plan cannot be executed, fail |

## Changes in `skills/validate-commits/SKILL.md`

- Add `--unattended` (and pass-through `--result`, `--test-cmd`).
- **Determine Commit Range:** with `--unattended`, `--base` is required; the
  "no upstream → AskUserQuestion" path becomes a failure with reason `no-base`.
- Any other `AskUserQuestion` (line ~191 today) → take the default and record it.
- Output each of the six checks as pass/fail with detail in the result file.

## Outputs

`--result <path>` (JSON), written in every outcome:

```json
{
  "outcome": "done | failed",
  "reason": "conflict | drift | tests | no-base | tree-mismatch | validation | null",
  "base": "<sha>", "originalHead": "<sha>", "newHead": "<sha>",
  "decisions": [{"gate": "plan-review", "chose": "accept", "why": "unattended default"}],
  "plan": [{"action": "pick|fixup|reword|drop|edit", "commit": "<sha>", "subject": "..."}],
  "validation": {"cleanWorktree": true, "tests": true, "noAICoauthor": true,
                  "noConflictMarkers": true, "noSquashResidue": true, "style": true},
  "detail": "..."
}
```

Exit code 0 only when `outcome` is `done`. The file must not be inside the
repository's tracked tree (default under `.review-commits/`, which the skill
should add to `.git/info/exclude`).

## Tests (in `skills/review-commits/tests/`, same harness as today)

- `test-unattended-accepts-defaults.sh` — a branch with an introduce-then-fix
  pair and a 4-commit cluster: result applies the fixup and the recommended
  cluster action; `decisions` lists each gate.
- `test-unattended-never-merges.sh` — after a run, `main` is untouched, the
  branch still exists, no tag was created, nothing was pushed.
- `test-unattended-conflict-restores.sh` — a plan that conflicts: exit non-zero,
  `reason: conflict`, HEAD equals `originalHead`, worktree clean.
- `test-unattended-tree-invariant.sh` — final tree equals the original tree.
- `test-unattended-requires-base.sh` — no `--base` → `no-base`, nothing changed.
- validate-commits: `test-validate-unattended.sh` — six checks in the result,
  `no-base` failure without `--base`.

## Acceptance

- Interactive behaviour without `--unattended` is unchanged (existing tests pass).
- With `--unattended`, the skill never calls `AskUserQuestion`, never merges,
  deletes, tags or pushes, and always writes the result file.
- The flag and the result schema are documented in both SKILL.md files and in
  `docs/command-skill-map.md` (for Pi: `/skill:review-commits --unattended ...`).
- A **git tag** is cut for the release (ulai pins the package by tag or commit:
  `pi install git:github.com/jskswamy/skills@<tag>`).

## How ulai will use it (for context)

`finish` checks out a new delivery branch at the forge branch's head and invokes
`review-commits --unattended --base <forge base> --style <repo style>
--test-cmd <resolved test command> --result <path outside the tree>`. ulai's own
gate then re-checks that the delivery tree is byte-identical to the forge head,
runs validate-commits' checks, and records the result file in the EvidencePack.
ulai never pushes from inside the skill; `deliver` pushes the delivery branch.
