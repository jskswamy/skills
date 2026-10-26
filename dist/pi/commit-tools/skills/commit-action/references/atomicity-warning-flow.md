# Non-Atomic Warning Flow

## Warning, split-commit flow, and proceed-anyway

If atomicity violations detected:

```
⚠️  ATOMICITY WARNING

Your staged changes appear to contain multiple concerns:

1. Bug fix in src/auth/login.ts (lines 45-67)
   - Fixed null pointer exception in session validation

2. New feature in src/ui/dashboard.tsx (lines 12-89)
   - Added user metrics widget

3. Style changes in src/styles/theme.css
   - Updated color variables

Atomic commits should contain a single, coherent unit of work.
Benefits: easier code review, clean git history, safe git bisect

What would you like to do?
○ Split commits (Recommended) - I'll help you stage changes separately
○ Proceed anyway - Commit all changes together (not recommended)
○ Review changes - Show the full diff again
○ Cancel - Exit without committing
```

**If "Split commits" selected:**

1. Show grouped changes by concern:
   ```
   I've identified these separate concerns:

   Concern 1: Bug fix in auth module
   Files: src/auth/login.ts

   Concern 2: New dashboard feature
   Files: src/ui/dashboard.tsx

   Concern 3: Style updates
   Files: src/styles/theme.css

   Which concern would you like to commit first?
   ○ Bug fix in auth module
   ○ New dashboard feature
   ○ Style updates
   ```

2. Unstage other files:
   ```bash
   git reset HEAD <files-not-in-selected-concern>
   ```

3. Continue to Step 5 with only the selected files staged

4. After commit completes, prompt:
   ```
   Commit created successfully!

   Remaining unstaged changes:
   - src/ui/dashboard.tsx (new feature)
   - src/styles/theme.css (style updates)

   Would you like to commit the next concern?
   ○ Yes - Continue with next concern
   ○ No - I'll handle the rest manually
   ```

5. If "Yes", stage the next concern's files and repeat from Step 4

**If "Proceed anyway" selected:**
- Log a note that user chose to bypass atomicity check
- Continue to Step 5
