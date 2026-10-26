# Step 4: Atomicity Analysis

## 4a-4e Atomicity analysis

**4a. File Grouping Analysis:**

Group changed files by directory/module:
```
src/auth/login.ts       -> auth module
src/auth/session.ts     -> auth module
src/ui/dashboard.tsx    -> ui module
tests/auth.test.ts      -> auth tests
```

**Red flag:** Files from unrelated modules changed together (e.g., auth + unrelated ui changes)

**4b. Change Type Detection:**

Analyze the diff content to identify the nature of changes:

| Pattern | Change Type |
|---------|-------------|
| New functions/classes added | Feature |
| Bug fix patterns (null checks, error handling) | Fix |
| Variable/function renames, restructuring | Refactor |
| Only whitespace/formatting | Style |
| Test file changes only | Test |
| README, docs/, comments only | Docs |
| package.json, config files | Build/Chore |

**Red flag:** Multiple change types in the same commit (e.g., new feature + bug fix)

**4c. Scope Coherence Check:**

Ask: "Can these changes be described in ONE sentence without conjunctions joining unrelated ideas?"

**Red flags:**
- Would need "and also" to describe changes
- Changes serve multiple distinct purposes
- Mix of unrelated concerns

**4d. Size Heuristics:**

- Very large diffs (>500 lines) across many unrelated files = suspicious
- Note: Large refactors can still be atomic if coherent

**4e. Related Unstaged Changes Detection:**

Check if there are unstaged changes that logically belong with the staged changes:

1. Get unstaged files: `git diff --name-only` and `git status --porcelain` (for untracked)

2. Detect relationships using these heuristics:

| Pattern | Check For |
|---------|-----------|
| **Test files** | Staged `src/foo.ts` → Check `foo.test.ts`, `foo.spec.ts` |
| **Same directory** | Staged `src/auth/login.ts` → Check other `src/auth/*` changes |
| **Manifest files** | Staged `src/lib/*` → Check `package.json`, `tsconfig.json` |
| **Config companions** | Staged `src/feature.ts` → Check `src/feature.config.ts` |
| **Documentation** | Staged `src/module/*` → Check `docs/module.md`, module README |

3. If related unstaged files found, show warning:

```
Related unstaged changes detected:

These unstaged files appear related to your staged changes:

- src/auth/session.test.ts (test file for staged module)
- package.json (manifest with potential dependency changes)

Including these would make your commit more complete.

What would you like to do?
○ Stage related files (Recommended) - Include them in this commit
○ Review changes - See the unstaged diff
○ Proceed without - Commit only staged files
```

4. If "Stage related files" selected:
   - Run `git add <related-files>`
   - Continue with the updated staged changes

5. If "Review changes" selected:
   - Show the diff for the related unstaged files
   - Re-prompt with the same options

6. If "Proceed without" selected:
   - Continue to Step 5 with only the originally staged files
