# Step 7: Generate Commit Message

Using all gathered context, generate the commit message:

**Inputs to consider:**
- Staged diff content
- User-provided context/intention (command arguments)
- **Session context** (from Step 6b - conversation history)
- Current commit message (if amending)
- Recent commit messages (for style consistency)
- Selected commit style rules
- Co-author info (if `--pair` flag set)

**When `AMEND_MODE=true` (from Step 3b), also include:**
- `LAST_DIFF` — the diff of the last commit captured in Step 3b

Generate a message that describes the **combined** change as if both
the last commit's changes and the current staged changes were always
one commit. Do NOT concatenate the two individual messages — synthesise
a single fresh message covering both diffs.

**Generation guidelines:**

1. **Analyze the diff** to understand WHAT changed:
   - What files were modified
   - What the code changes do
   - The technical impact of the changes

2. **Use session context** to understand WHY (from Step 6b):
   - Reference the original user request that led to these changes
   - Include key decisions and reasoning from the conversation
   - Mention trade-offs or alternatives that were considered
   - Include issue/ticket references if mentioned in conversation

3. **Prioritize context sources:**
   - Explicit user arguments (command line) > Session context > Diff analysis
   - If user provided context via arguments, prioritize it
   - Session context fills in the "why" that arguments might miss

4. **Apply the loaded style rules strictly** (from Step 5)
   - Follow all formatting rules from the style file
   - Use the examples as reference for good formatting
   - Avoid the anti-patterns listed in the style file

5. **Generate body text that explains:**
   - WHAT: Summary of the changes (from diff analysis)
   - WHY: Reason/motivation (from session context)
   - CONTEXT: Important background (from conversation history)
   - IMPACT: Any caveats, side effects, or breaking changes

6. **CRITICAL:** Wrap ALL lines at 72 characters maximum
   - Count characters carefully
   - Break at natural word boundaries

7. **Co-author handling:**
   - Only append `Co-Authored-By:` if `--pair` flag was used AND a human co-author was selected in Step 6
   - **NEVER add Claude Code, Claude Opus, Claude Sonnet, or any Anthropic-related co-author lines**
   - If co-author selected via `--pair`, append:
   ```

   Co-Authored-By: Name <email>
   ```

See `references/message-example.md` for a worked example of a message that uses session context versus one that does not.
