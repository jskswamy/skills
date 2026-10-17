# Commit Hygiene Detection Layers

Note: `lib/...` paths are relative to the skill root (the directory containing SKILL.md), not to this references/ directory.

## Layers 1-4

### Layer 1: Subject-Based (always runs)

Parse `git log --oneline $base..HEAD` and detect introduce-then-fix pairs:

A pair is flagged when:
- Commit B's subject starts with `Fix`, `Fixup`, `Fix up`, `Correct`,
  or `Update` (case-insensitive)
- The remainder of B's subject shares a significant word (3+ characters,
  excluding stop words: the, for, and, a, an, in, of, to, is, it, on,
  at, by, or, be, as, do, if, so, no, up, we, my, he) with commit A's
  subject
- B is within 3 commits of A in the log (not necessarily adjacent)

Each detected pair is recorded as:
```
finding: pair
commits: [<hash-A>, <hash-B>]
reason: "introduce-then-fix: <shared word>"
action: fixup (mandatory)
```

### Layer 2: File-Structural (always runs)

For each commit in range, run:
```bash
git diff-tree --no-commit-id --name-only -r <hash>
```

Group changed files by top-level directory. Flag a commit as non-atomic
if it touches files in 2+ top-level directories that serve different
concerns. Use these heuristics:
- `plugins/<name-A>/` and `plugins/<name-B>/` are different concerns
  (unless both are in the same plugin)
- `docs/` changes alongside `plugins/` are acceptable (docs for the plugin)
- `tests/` alongside `src/` for the same module is acceptable
- Root config files (`.eslintrc`, `package.json`) alongside source changes
  are acceptable if the config change supports the source change

Each flagged commit is recorded as:
```
finding: non-atomic
commit: <hash>
concerns: ["<dir-A>: <description>", "<dir-B>: <description>"]
action: edit (suggested)
```

**Test-with-impl detection.** If commit B touches only test files
(`*.test.*`, `tests/`, `*_test.*`, `*_spec.*`) for symbols introduced
in an earlier commit A, mark B as a fixup of A:

```
finding: pair
commits: [<hash-A>, <hash-B>]
reason: "test-with-impl: tests for A's symbols arrived in B"
action: fixup (mandatory)
```

The synthesizer is the right phase to run this check — it has the
full file list per commit and can match test files to product files by
base name.

Also check if any commit's changes are unrelated to the branch's overall
purpose. Compare each commit's changed files against the full branch diff
(`git diff --name-only $base..HEAD`). If a commit only touches files that
no other commit in the range touches AND those files are in a different area
from the branch's main work, flag it:

```
finding: unrelated
commit: <hash>
reason: "<description of why it seems unrelated>"
action: drop (suggested)
```

### Layer 3: Semantic (runs when $SEMANTIC_AVAILABLE=true)

For each commit flagged as potentially non-atomic by Layer 2, and for any
commit where Layer 2 was uncertain, use codebase-memory-mcp to verify:

1. **Get changed symbols**: For each changed file in the commit, call
   `search_graph` with the file path to find the symbols it defines.

2. **Check cluster membership**: Call `search_graph` with a semantic query
   describing each changed symbol. If changed symbols belong to different
   clusters (e.g., "AuthService" vs "Observability"), the commit is
   non-atomic.

3. **Trace connections**: Call `trace_path` between changed files. If a
   path exists (they're connected through call chains), the changes may be
   related despite being in different directories. Remove the non-atomic
   flag.

4. **Check module boundaries**: Call `get_architecture` and verify whether
   the commit crosses module boundaries. Cross-boundary changes with no
   call-chain connection are non-atomic.

Layer 3 can **upgrade** a Layer 2 finding (uncertain → confirmed non-atomic)
or **dismiss** it (files are in different directories but semantically
connected).

If a tool call fails during Layer 3, retry MCP connection failures through CLI first. If the selected transport still fails, skip the remaining semantic checks for that commit and keep the Layer 2 finding as-is. Do not fail the workflow.

### Layer 4: Tracker-ID Leak Detection

Run the deterministic tracker leak detector before presenting hygiene
findings. Resolve the package root as the nearest ancestor containing
`registry.json` or `package.json`, then run:

```bash
bash "<package-root>/skills/review-commits/lib/detect-tracker-leaks.sh" "$base"
```

When running from a generated Claude Code plugin, the equivalent generated
path is `<plugin-root>/skills/review-commits/lib/detect-tracker-leaks.sh`.

The helper prints TSV rows:

```text
<short-hash>\t<kind>\t<match>\t<line>
```

Where `kind` is one of:
- `subject-prefix` — commit subject starts with a tracker ID such as
  `PROJ-123:`
- `trailer` — body line starts with a configured trailer key such as
  `Refs: PROJ-123` or `Closes beads-abc.2`
- `parenthetical` — tracker ID appears inside parentheses
- `narrative` — tracker ID appears in prose and needs human rewording

Defaults detect common Jira/Linear-style IDs (`PROJ-123`), internal
beads IDs (`beads-abc.2`, `claude-plugins-xyz`), and lowercase
project-style IDs with a substantial suffix (`project-abc`).

Projects can add patterns in `.claude/commit-tools.local.md`:

```yaml
---
tracker_patterns:
  - 'BUG-[0-9]+'
trailer_keys:
  - Related
---
```

For `trailer` and `parenthetical` findings, suggest stripping the opaque
reference while keeping the surrounding explanation. For `narrative`
findings, require rewording because the tracker ID is part of prose. For
`subject-prefix`, require rewording the subject.
