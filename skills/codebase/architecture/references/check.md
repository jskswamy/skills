# Check the Rules

Run against the live code for every repo that has a `codebase-rules` block. Every rule is checked on every run; earlier results are never reused.

1. **Components.** Expand each component's globs against the repo's files, including new files not yet added to git (`git ls-files -co --exclude-standard -- <globs>`). A component whose globs match no files is reported as `dead component: <name> — matches no files`, together with every rule that names it. Such rules are reported as unverifiable, never as passing. A component whose files exist but which has no graph nodes (no node `file_path` ends with any of its files) means the index does not cover it: its rules are unverifiable from the graph; check them from source (below) or report them as unverifiable, never as passing.
2. **forbid: A -> B.** Query edges from A's files to B's files (file matching as in `recover.md` step 4, but `RETURN a.qualified_name, a.file_path, type(r), b.qualified_name, b.file_path LIMIT 100`). Each edge is a violation.
3. **allow-only: A -> [B, …].** Query edges from A's files to any repo file that is not in A or an allowed component, including files outside every component. Each edge is a violation. Dependencies on code outside the repo (packages, the standard library) are not checked.
4. **Report each violation** with the rule, its `why`, and the offending edge as `file:line` → `file:line` (graph location, or the `rg` hit for the import/call when the graph has no line). Group by rule.
5. **Summary line:** `<n> rules: <p> pass, <v> violated, <u> unverifiable`.

**Without the graph** (index not fresh and not refreshed): find A's dependencies by reading its import/require statements with `rg` (or `ast-grep`), resolve them to repo files, and apply the same rules. Label every result `from source inspection`; calls that need the graph to see are not covered, so say so.

The skill never edits `ARCHITECTURE.md` on its own. For each violation, offer the user three ways forward: change the code, change the rule (show the proposed block edit; write it only if they ask), or record it as a known exception (a beads issue via `bd create` when `bd` is available).
