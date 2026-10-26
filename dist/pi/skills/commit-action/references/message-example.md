# Step 7: Example Commit Message With Session Context

## Example with session context

**Example with session context:**

If the conversation was about "fixing login crashes due to invalid emails and adding rate limiting for bot attacks", the commit message should be:

```
Add email validation and rate limiting to login

Users reported crashes when entering malformed email addresses. The
previous implementation passed raw input to the auth service without
validation.

Changes:
- Add regex-based email validation before auth call
- Implement rate limiting (5 attempts per minute per IP)
- Add user-friendly error messages for validation failures

Rate limiting addresses the bot attack concern raised during
implementation discussion.
```

NOT just:
```
Add validation to login

Add email validation and rate limiting.
```
