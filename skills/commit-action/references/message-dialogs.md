# Step 8: Confirmation Dialogs

## Amend dialog (AMEND_MODE=true)

```
These changes look related to your last commit — amending it.

────────────────────────────────────────────────────────────────────────
<regenerated subject>

<regenerated body>
────────────────────────────────────────────────────────────────────────

What would you like to do?
○ Amend          — update the last commit with this message
○ Edit message   — modify the message before amending
○ New commit instead — create a separate commit (discard amend intent)
○ Cancel
```

## Standard dialog (AMEND_MODE=false)

```
Generated commit message:

────────────────────────────────────────────────────────────────────────
Add user session timeout handling

Implement automatic session expiration after 30 minutes of inactivity.
The timeout duration is configurable via SESSION_TIMEOUT environment
variable.

This prevents unauthorized access when users forget to log out on
shared machines. Sessions are validated on each authenticated request.
────────────────────────────────────────────────────────────────────────

What would you like to do?
○ Commit - Create the commit with this message
○ Edit message - Modify the message before committing
○ Regenerate - Generate a new message (optionally provide more context)
○ Cancel - Exit without committing
```
