# Step 8: Present and Confirm

**When `AMEND_MODE=true` (explicit or detected), show the amend dialog instead:**

Show the amend dialog from `references/message-dialogs.md` (section "Amend dialog"): the regenerated message with options Amend / Edit message / New commit instead / Cancel.

- **"Amend"** → proceed to Step 9 with `AMEND_MODE=true`
- **"Edit message"** → same edit flow as the standard dialog below; re-show this amend dialog after edit (not the standard dialog)
- **"New commit instead"** → if the index is empty, return to Step 1's staging choices; otherwise set `AMEND_MODE=false`, unset `LAST_DIFF`, and regenerate from Step 7 using only the staged diff
- **"Cancel"** → exit without committing

**When `AMEND_MODE=false`, show the standard dialog:**

Show the generated commit message:

Show the standard dialog from `references/message-dialogs.md` (section "Standard dialog"): the generated message with options Commit / Edit message / Regenerate / Cancel.

**If "Edit message" selected:**
- Use AskUserQuestion with text input:
  ```
  Edit the commit message below:
  (Use \n for new lines, body starts after first blank line)

  Current: Add user session timeout handling\n\nImplement automatic...
  ```
- Parse the edited message, preserving the user's formatting
- **Re-run Step 7b on the edited subject.** If the deterministic style
  check (7b.1) fails, show the violation reason and offer:
  - "Re-edit" — return to the text input
  - "Auto-fix" — silently rewrite the subject to conform, keep the body
  - "Commit anyway" — only if user explicitly overrides
  The content leak check (7b.2) MUST also pass; on failure, strip leaked
  content silently before continuing.

**If "Regenerate" selected:**
- Ask: "Any additional context to help generate a better message?"
- If provided, add to context and regenerate from Step 7
