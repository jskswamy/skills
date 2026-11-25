# Check the Rules

Run against the live code for every repo that has a `codebase-rules` block. Every rule is checked on every run; earlier results are never reused.

1. **Components.** Expand each component's globs against the repo's tracked files (`git ls-files`). A component whose globs match no files is reported as `dead component: <name> — matches no files`, together with every rule that names it. Such rules are reported as unverifiable, never as passing.
2. **forbid: A -> B.** Query edges from A's files to B's files (as in `recover.md` step 4, but `RETURN a.qualified_name, a.file_path, type(r), b.qualified_name, b.file_path LIMIT 100`). Each edge is a violation.
3. **allow-only: A -> [B, …].** Query edges from A's files to files in any declared component other than A and the allowed ones. Each edge is a violation.
4. **Report each violation** with the rule, its `why`, and the offending edge as `file:line` → `file:line` (graph location, or the `rg` hit for the import/call when the graph has no line). Group by rule.
5. **Summary line:** `<n> rules: <p> pass, <v> violated, <u> unverifiable`.

The skill never edits `ARCHITECTURE.md` on its own. For each violation, offer the user three ways forward: change the code, change the rule (show the proposed block edit; write it only if they ask), or record it as a known exception (a beads issue via `bd create` when `bd` is available).
