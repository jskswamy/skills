# Step 4: Atomic Commit Validation

**Skip this step if `--no-atomic-check` is set, or if this is a message-only amend with no staged changes.**

Analyze the staged changes to determine if they represent a single, atomic unit of work.

#### Atomicity Analysis

Read `references/atomicity-analysis.md` and run checks 4a (file grouping), 4b (change type detection), 4c (scope coherence), 4d (size heuristics), and 4e (related unstaged changes detection, with its stage/review/proceed prompt). If "Proceed without" is chosen in 4e, continue to Step 5 with only the originally staged files.

#### Non-Atomic Warning Flow

If atomicity violations are detected, read `references/atomicity-warning-flow.md` and follow it: show the ATOMICITY WARNING and ask Split commits (Recommended) / Proceed anyway / Review changes / Cancel. Split unstages files outside the chosen concern, continues to Step 5, then prompts for the next concern after the commit. Proceed anyway logs the bypass and continues to Step 5.
