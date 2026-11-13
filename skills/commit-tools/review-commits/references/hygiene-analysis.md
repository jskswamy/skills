# Commit Hygiene Analysis (Shared)

Analyze commits in the range `$base..HEAD` for hygiene issues. This analysis
runs in both Branch Flow and Main Flow (Rebase option) before the rebase plan
is built. It is performed inline by the main agent using the checklist in
`lib/synthesizer-prompt.md`.

Four detection layers run in order. Each layer adds findings to a shared list.

Read `references/hygiene-layers.md` and run the four layers in order: Layer 1 (subject-based introduce-then-fix pairs, mandatory fixup), Layer 2 (file-structural non-atomic, test-with-impl, and unrelated-commit findings), Layer 3 (semantic verification via codebase-memory, only when `$SEMANTIC_AVAILABLE=true`), and Layer 4 (tracker-ID leak detection via `lib/detect-tracker-leaks.sh`). Each layer adds findings to a shared list.

### Present Hygiene Findings

After all layers complete, present findings using AskUserQuestion if any
issues were found:

Use the dialog template in `references/hygiene-findings-dialog.md`: list pairs, non-atomic commits, unrelated changes, and tracking-system references, then offer Accept all suggestions / Review one by one / Dismiss all. Introduce-then-fix pairs are mandatory fixups. Tracker subject-prefix and narrative findings require rewording; trailer and parenthetical findings can usually be stripped while preserving the surrounding prose.

If "Review one by one": walk through each non-mandatory finding with
AskUserQuestion offering accept/dismiss per finding.

With `--unattended`, choose "Accept all suggestions". Mandatory
introduce-then-fix pairs remain mandatory. Record
`{"gate":"hygiene-findings","chose":"accept-all","why":"unattended default"}`.

If no issues detected, display:
```
Commit hygiene analysis: all commits are clean and atomic. ✓
```
And proceed directly to the rebase plan.
