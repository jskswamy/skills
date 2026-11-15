# Failure Handling

After any unattended rebase/rewrite that appears successful, verify the tree
invariant with `git diff <original HEAD> HEAD`. If the diff is non-empty,
restore the original HEAD, write `outcome: failed`, reason: `tree-mismatch`,
and exit non-zero.

| Failure | Response |
|---------|----------|
| A reader subagent fails on one commit | Synthesizer treats that commit as `pick` and adds a note. The user sees the note in plan review and can override the action. |
| Both MCP and CLI unavailable | Skip Layer 3 entirely. Layers 1+2 still run. Set `$SEMANTIC_AVAILABLE=false`. |
| Synthesizer cannot author a message for an action | Surface the gap before plan review. The user chooses: accept the original message (downgrades the action to `pick`) or abort the run. |
| Rebase conflict during execute | Interactive: stop, list conflicting files, await `git rebase --continue`. Unattended: run `git rebase --abort`, restore original HEAD, write reason: `conflict`, exit non-zero. |
| Revalidator finds a drifted subject AND has a saved message | Auto-amend with the saved message. No user intervention. |
| Revalidator finds a drifted subject AND has NO saved message | Interactive: print a warning to stderr listing the drifted hash and subject. Unattended: restore original HEAD, write reason: `drift`, exit non-zero. |
| Revalidator finds a planned action that did not materialize (missing hash, wrong split count) | Warn loudly to the user. Do not auto-fix; the user must decide whether to redo the run. |
