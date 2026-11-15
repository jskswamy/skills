# Step 3: Review Options

Use AskUserQuestion:
```
What would you like to do?
○ Validate only — check for issues without changing commits
○ Rebase — run hygiene analysis and interactive rebase to clean up
○ Reword — amend commit messages using saved style
```

**Validate only:**
Invoke the `validate-commits` skill. Done.

**Rebase:**
Run the same analysis and rebase workflow as Branch Flow Steps 4-7:
1. Ensure Codebase Index (set `$SEMANTIC_AVAILABLE`)
2. Run Commit Hygiene Analysis against `$base..HEAD`
3. Plan and review (Steps 4-5 of Branch Flow)
4. Execute (Step 6 of Branch Flow)
5. Revalidate (Step 7 of Branch Flow)

All steps work identically to the Branch Flow — the only difference is that
there is no merge step afterward (commits are already on main).

**Reword:**
Walk through commits oldest-to-newest. Let the user select which commits
to reword via AskUserQuestion. Build a plan where all selected commits have
`action: reword` and all others have `action: pick`. Execute via the same
Steps 4-7 of Branch Flow (the synthesizer authors the new messages, the
executor replays them, the revalidator confirms style).
