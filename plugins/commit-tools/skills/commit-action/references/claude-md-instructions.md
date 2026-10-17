# Step 1b: CLAUDE.md Commit Instructions

## Check and offer to add the commit instruction

1. **Check for CLAUDE.md:**
   - Look for `CLAUDE.md` in the project root (current working directory)
   - If it doesn't exist, skip this step (don't create CLAUDE.md just for this)

2. **If CLAUDE.md exists, check for commit instruction:**
   - Search for patterns like `/commit`, `use /commit`, or "git-commit plugin"
   - If found, continue to next step

3. **If CLAUDE.md exists but lacks commit instruction:**
   - Use AskUserQuestion:
     ```
     Your CLAUDE.md doesn't include instructions to use the /commit plugin.

     Adding this instruction helps ensure AI agents (including Claude) use
     the commit plugin instead of raw `git commit`, providing:
     - Atomic commit validation
     - Intelligent message generation
     - Style enforcement

     Would you like to add this instruction to CLAUDE.md?
     ○ Yes (Recommended) - Add the instruction
     ○ No - Skip for now
     ```

4. **If user selects "Yes":**
   - Append the following section to CLAUDE.md:
     ```markdown

     ## Git Commits

     Always use the `/commit` command instead of `git commit` directly. The
     `/commit` plugin provides atomic commit validation, intelligent message
     generation from conversation context, and style enforcement.
     ```
   - Show confirmation: "Added commit instructions to CLAUDE.md"
