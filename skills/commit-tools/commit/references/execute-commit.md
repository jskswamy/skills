# Step 9: Execute Commit

Based on user selection:

Write the exact confirmed message with the file-write tool to `MESSAGE_FILE`, a new file with a unique name in `/tmp/commit-tools-msg/` (outside the repository: harnesses may refuse writes under `.git/`). The file-write tool creates the folder; do not run `mkdir`, `mktemp` or shell variables for it. Then run this skill's executor as its own command on one line, with literal paths:

```bash
__GIT_COMMIT_PLUGIN__=1 bash <COMMIT_SKILL_DIR>/lib/commit.sh --message-file <MESSAGE_FILE> --style <selected_style>
```

For an explicit or detected amendment, append `--amend`. Append `--allow-style-override` only after the user explicitly chose "Commit anyway" for a style violation. The executor rechecks style, line wrapping, AI attribution and amend safety before calling Git. Keep the normal content-leak and atomicity checks above; the executor does not replace them.

The environment token is a workflow convention, not proof of approval or a security boundary. Set it only after Step 8 confirmation. On a failed commit, preserve the message and report the error; do not change the index, bypass hooks, retry with different Git options, or push. One exception: if a sandbox refused the write to `.git/` (for example Codex's default sandbox: `Unable to create '.git/index.lock': Operation not permitted`), run the same command once more with the harness's request for elevated permissions, so the user approves it.

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
