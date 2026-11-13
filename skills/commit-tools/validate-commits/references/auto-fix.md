# Auto-Fix: AI Co-Author

If Check 3 fails AND all other checks pass (or the user wants to fix
incrementally), offer to auto-fix:

With `--unattended`, do not ask. Take the default safe choice: do not modify
commits, record `{"gate":"ai-coauthor-autofix","chose":"no","why":"unattended default"}`,
write the failed Check 3 detail to the result file, and exit non-zero.

Use AskUserQuestion:
```
Fix automatically? (amends the affected commit to remove the AI co-author line)
○ Yes — remove the co-author line
○ No — I'll handle it
```

If "Yes":
- For each affected commit (most recent first):
  - Get the full commit message: `git log -1 --format=%B <hash>`
  - Remove the offending `Co-Authored-By:` line(s)
  - If the commit is HEAD: `git commit --amend -m "<cleaned message>"`
  - If the commit is NOT HEAD: use interactive rebase is not possible
    in this context, so report: "Commit <hash> is not HEAD. To fix,
    run: `git rebase -i <hash>^` and edit the commit message manually."
- Re-run Check 3 to confirm the fix worked

If "No": Report the failure and let the user handle it.
