# Relay: drafting in the commit-drafter sub-agent

Use the relay only when **all** of these hold; otherwise continue inline from Step 3 and ignore this file:

- the `commit-tools:commit-drafter` agent is in your agent list, and you have the Agent and SendMessage tools (SendMessage may need loading first);
- your recorded drafter for this task is not `none`;
- this commit was not already handed to the inline flow;
- no explicit `--amend`, and something is staged after Step 1.

The drafter follows `references/draft.md`, from the copy in each snapshot. One drafter serves every commit of the current task (the user's current request, or the current `craft:build` story). A new commit request in the same conversation is the same task: resume the recorded drafter unless the user has moved on to unrelated work. It reads only the snapshot, never asks the user, and never changes the repository. You own every question, staging change and commit.

## 1. Before dispatching

1. Steps 1, 2 and 6 run as usual (style name from Step 2, co-author from Step 6). Skip Steps 3–5 and 7–7b: the drafter does them.
2. Take a snapshot, passing your previous snapshot folder in this task if any:

   ```bash
   bash <COMMIT_SKILL_DIR>/lib/snapshot.sh --style <style> [--prev <last dir>]
   ```

   Run every script call in this file as its own one-line command, with literal unquoted paths and nothing chained before or after it, so permission rules can match it.

   It prints `snapshot <id> <nonce> <files> <dir>` (the dir is the rest of the line). On `snapshot-failed <reason>`, continue inline.

## 2. Dispatch

Send one fenced `relay` block, always complete (every field, every time):

```relay
snapshot: <id>
snapshot-dir: <dir>
nonce: <nonce>
style: classic
co_author: none
no_atomic_check: false
declined: []
args: "<the user's explicit [context...] text, or empty>"
context: "<why this change was made, at most 1,000 chars>"
```

Add at most one of `regenerate: "<hint>"` or `edit: "<the full message>"`.

- **First commit of the task:** start the agent with `subagent_type: commit-tools:commit-drafter` and the block as its prompt. Then write `commit-drafter: <agent id> | task: <one line>` in your reply.
- **Every later commit, regenerate or edit:** `SendMessage(to: <recorded id>, message: <block>)`. Wait for its reply.
- If a resume errors, start one new drafter with the same block and record its id. If that also fails, record `commit-drafter: none` and continue inline.

## 3. Check every reply

- The status must fit the action: `draft` or `inline` for a plain dispatch or `regenerate`; `checked`, or `inline` with `atomicity` or `related`, for `edit`. Anything else, a missing block, or a `draft` message over 2,000 chars is malformed: resend once asking for a valid `relay` block, then continue inline.
- For `draft` and `checked`, run `bash <COMMIT_SKILL_DIR>/lib/snapshot.sh --token <dir>`. The reply's `token` must equal it, and its `files` must equal the `<files>` the snapshot printed. If not, dispatch once more; on a second mismatch continue inline.
- **`inline`:** mark this commit as handed off and run the inline flow from Step 1, keeping the resolved style, co-author and `args`. If the user had edited the message, use that text once, at the confirmation step, through the Edit branch of `confirm-flow.md`. Keep the drafter for later commits. If the user picks "Proceed without" in a 4e dialog, add those paths to `declined` for the rest of the task.

## 4. Confirm

- **Draft:** check the subject with `bash <COMMIT_SKILL_DIR>/lib/style-check.sh "<subject>" <COMMIT_SKILL_DIR>/styles/<style>.md` (its own command, one line, literal paths; the tool result shows its exit status). If it fails, resend once with `regenerate: "subject failed the style check: <reason>"`; if it still fails, add Re-edit and "Commit anyway" to the dialog. Show the standard dialog from `message-dialogs.md`: Commit / Edit message / Regenerate / Cancel. Regenerate dispatches with `regenerate:`.
- **Edit:** parse the user's text as the Edit prompt in `confirm-flow.md` describes, then dispatch `edit:` with it. On `checked`, the **text to commit** is the user's text with every exact occurrence of each `removed` item deleted (an item not found verbatim makes the reply malformed). Show both versions when `removed` is not empty; a removed item cannot be edited back in. Then run the style check on the text to commit. If it fails, offer Re-edit, Auto-fix (you rewrite only line 1 to satisfy the reported rule, then check again) and "Commit anyway". Every choice acts on the text to commit; commit it byte for byte.

## 5. Commit

1. Run `bash <COMMIT_SKILL_DIR>/lib/snapshot.sh --id`. If it differs from the snapshot's id, the staged files changed: take a new snapshot and dispatch again (`edit:` with the current text to commit if the user edited, otherwise a plain dispatch), tell the user the staged files changed, and confirm again. If nothing is staged now, go back to Step 1, keeping any edit.
2. Commit as `references/execute-commit.md` says.

Never delete anything under `.git/` yourself: `snapshot.sh` removes your previous folder (`--prev`) and folders older than a day.
