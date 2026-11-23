# Step 9: Execute Commit

For a normal commit, explicit/detected amendment, or message-adjusted fixup (Mode B): write the exact validated message with the file-write tool to `MESSAGE_FILE`, a new file with a unique name in `/tmp/commit-tools-msg/` (outside the repository: harnesses may refuse writes under `.git/`). The file-write tool creates the folder; do not run `mkdir`, `mktemp` or shell variables for it. Then run this skill's executor as its own command on one line, with literal paths:

```bash
__GIT_COMMIT_PLUGIN__=1 bash <COMMIT_SKILL_DIR>/lib/commit.sh --message-file <MESSAGE_FILE> --style <selected_style>
```

- For an explicit or detected amendment, append `--amend`.
- For a message-adjusted fixup (`amend!`, Mode B), append `--fixup <sha>`.
- For a plain fixup (`fixup!`, Mode A — no `MESSAGE_FILE` or `--style` needed), run:
  ```bash
  __GIT_COMMIT_PLUGIN__=1 bash <COMMIT_SKILL_DIR>/lib/commit.sh --fixup <sha>
  ```
- Append `--allow-style-override` only after the user explicitly chose "Commit anyway" for a style violation.

The executor rechecks style, line wrapping, AI attribution, and amend/fixup target safety before calling Git. Keep the normal content-leak and atomicity checks above; the executor does not replace them.

The environment token is a workflow convention, not proof of approval or a security boundary. Set it only after Step 7b validation (and Step 8 confirmation when `confirm: true`). On a failed commit, preserve the message and report the error; do not change the index, bypass hooks, retry with different Git options, or push. One exception: if a sandbox refused the write to `.git/` (for example Codex's default sandbox: `Unable to create '.git/index.lock': Operation not permitted`), run the same command once more with the harness's request for elevated permissions, so the user approves it.

**After commit:**

1. Verify commit was created and read its full message: `git log -1 --format='%h %B'`
2. Show success message with the full commit message and committed files:
   ```
   Commit created successfully!

   abc1234 Add user session timeout handling

   Implement automatic session expiration after 30 minutes of inactivity.

   Files committed:
   - src/auth/session.ts
   - src/middleware/auth.ts
   ```

3. If there were remaining changes from split commits flow, prompt to continue
