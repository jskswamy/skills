# Step 9: Execute Commit

Based on user selection:

Write the exact confirmed message to a temporary file (`MESSAGE_FILE`) using the file-write tool. Then use this skill's executor:

```bash
__GIT_COMMIT_PLUGIN__=1 bash "$COMMIT_SKILL_DIR/lib/commit.sh" \
  --message-file "$MESSAGE_FILE" --style "$selected_style"
```

For an explicit or detected amendment, append `--amend`. Append `--allow-style-override` only after the user explicitly chose "Commit anyway" for a style violation. The executor rechecks style, line wrapping, AI attribution and amend safety before calling Git. Keep the normal content-leak and atomicity checks above; the executor does not replace them.

The environment token is a workflow convention, not proof of approval or a security boundary. Set it only after Step 8 confirmation. On a failed commit, preserve the message and report the error; do not change the index, bypass hooks, retry with different Git options, or push.

**After commit:**

1. Verify commit was created: `git log -1 --oneline`
2. Show success message:
   ```
   Commit created successfully!

   abc1234 Add user session timeout handling

   Files committed:
   - src/auth/session.ts
   - src/middleware/auth.ts
   ```

3. If there were remaining changes from split commits flow, prompt to continue
