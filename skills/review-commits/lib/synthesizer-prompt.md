# Synthesizer self-prompt

The main agent follows this checklist during the planning phase. There is no
separate synthesizer subagent in v2 — the same agent that runs the SKILL.md
flow runs these steps inline.

## Inputs

- `$base` — base SHA for the rebase
- `$WORKING_DIR` — directory to write `plan.yaml` to
- `$STYLE_FILE` — absolute path to `plugins/commit-tools/styles/<style>.md`
- `$SEMANTIC_AVAILABLE` — `true` if codebase-memory-mcp is reachable AND
  the index is fresh; `false` otherwise

## Tools

- `git log`, `git show`, `git diff`, `git diff-tree` (read-only)
- Read: `$STYLE_FILE`, anything under `$WORKING_DIR`
- `bash plugins/commit-tools/skills/review-commits/lib/detect-clusters.sh "$base"`
- If `$SEMANTIC_AVAILABLE=true`: codebase-memory-mcp `search_graph`,
  `trace_path`, `get_architecture`

## Steps

1. **Read each commit in `$base..HEAD` oldest-to-newest.** Use:

   ```bash
   git log --reverse --format='%H%x00%s%x00%b%x00---END---' "$base..HEAD"
   ```

   The `%x00` (NUL) field separators and `---END---` record terminator
   survive any printable subject or body content. For each commit, build
   a record in memory matching this shape:

   ```yaml
   hash: <abbrev>
   subject: <original>
   body: <original body, may be empty>
   files: [...]
   top_level_dirs: [...]
   concern: <one-line>
   change_type: feat|fix|refactor|docs|test|chore|style|build
   suggested_action: pick|fixup|squash|drop|reword|edit
   fixup_candidate_for: <hash or null>
   unrelated: true|false
   ```

   Keep the records in memory; they don't need to be written to disk.

2. **Run hygiene Layers 1 and 2** as described in SKILL.md. Layer 1 detects
   introduce-then-fix subject pairs. Layer 2 flags non-atomic commits and
   test-with-impl pairs (commit B touches only test files for symbols
   introduced by commit A).

3. **Run hygiene Layer 3** if `$SEMANTIC_AVAILABLE=true`. Use
   codebase-memory-mcp to confirm or dismiss Layer 2's `non-atomic` flags
   via cluster membership and `trace_path`.

4. **Detect logical clusters.** Run both detectors:

   ```bash
   bash plugins/commit-tools/skills/review-commits/lib/detect-clusters.sh "$base"
   bash plugins/commit-tools/skills/review-commits/lib/detect-branch-cluster.sh "$base"
   ```

   `detect-clusters.sh` finds **high-confidence sub-clusters** (contiguous
   runs of 4+ commits sharing the same parent directory).
   `detect-branch-cluster.sh` finds the **medium-confidence whole-branch
   candidate** (the entire `$base..HEAD` range when on a non-main branch
   with ≥2 commits). Each helper outputs zero or more lines of
   space-separated short-hashes, oldest-first per line.

   For each high-confidence path candidate:

   - Skip if any commit in the candidate is already flagged as a fixup
     target by Layer 1 (avoid double-counting).
   - If `$SEMANTIC_AVAILABLE=true`: collect the symbols defined or modified
     across all commits via `search_graph` per file, then check whether
     they all belong to the same architectural cluster. If yes, confirm
     with high confidence and use the cluster's module name as a hint when
     authoring the message. If the symbols span 2+ unrelated clusters,
     demote the candidate (do not propose a squash).
   - If `$SEMANTIC_AVAILABLE=false`: keep at high confidence; the path
     heuristic alone is strong enough.

   For the branch candidate:

   - Always present at medium confidence. Do not run semantic confirmation
     against it — branches frequently contain unrelated commits across
     subsystems; the user gate is the safety net.

   **Combination rules:**

   - **Overlap.** When the branch candidate's hash set equals a single
     path candidate's hash set, present only the branch candidate
     (Option A). Don't double-count the same collapse as two options.
   - **Disjoint coverage.** When path candidates exist but together do
     not cover the whole branch range, present both Option A
     (whole-branch, medium) and Option B (the path sub-clusters, high).
   - **Branch only.** When path detection finds no candidates but the
     branch candidate fired, present Option A alone with a note that no
     path-prefix sub-clusters were found.
   - **Path only.** When the branch detector emitted nothing
     (running on main/master or detached HEAD) but path candidates
     exist, present them as today's behavior — single recommended
     proposal at high confidence.
   - **Neither.** When both detectors emit nothing AND `$base..HEAD`
     has ≥2 commits, surface the reasoning to the user (the plan
     review will render a "no cluster proposals" block — see SKILL.md
     Step 5).

5. **Read `$STYLE_FILE` in full.** The "Subject Line Rules" and "Examples"
   sections are the contract. Author **full messages** (subject, blank
   line, body) in this style for:
   - every action that is `reword` or `squash`
   - the first commit of each confirmed cluster
   - any `fixup` whose `fixup_target_message` you are setting

   The body must be informed by the original bodies of every commit being
   folded (for cluster `pick` + `fixup`s and for any standalone `squash` /
   `fixup`) or by the original body of the commit itself (for `reword`).
   Your job is to *understand* what each squashed commit contributed and
   write one coherent body that explains the collapsed change. Do not
   concatenate the originals verbatim. Do not paraphrase line-by-line.
   Read them as raw material, then author fresh prose in the saved style.

   Skip the body only when the originals truly had nothing meaningful to
   say (subject-only TDD scaffolds) — in that case a subject-only message
   is correct.

   The first line must pass
   `bash lib/style-check.sh "<subject>" "$STYLE_FILE"`. There is no
   body-level style check.

6. **Emit `plan.yaml` to `$WORKING_DIR/plan.yaml`** matching
   `lib/plan-schema.md`. Cluster collapse uses `pick` on the first commit
   (with `new_message`) and `fixup` on the rest, per `plan-schema.md`'s
   "Logical clustering" section.

7. **Reply with a one-line summary and action counts** before handing off
   to the plan-review user gate.
