# History-review plan approval

This branch is for `review-commits`, which has already authored messages and a
replay plan. Load this skill before accepting or executing that plan.

1. Read the full plan and each affected original commit diff. Review the
   proposed atomic groups, splits and combined changes. Resolve the selected
   style using the normal optional preferences and read its bundled rules.
2. Validate **every resulting message**, including retained pick messages,
   `new_message`, `fixup_target_message` and each `split_into` message. Use
   `lib/style-check.sh` and the content-leak rules in
   `references/content-leak-check.md`. Wrap body lines at 72 characters.
   Correct the plan before execution; no new messages may be invented during
   replay. Refuse known-published history or history authored by others.
3. Present the full resulting messages and the operations (including drops
   and splits) and ask **Approve replay / Edit plan / Cancel**. A truncated
   subject/body preview is not message confirmation. Changes to an approved
   message or operation require fresh approval. `--unattended` never grants
   this approval: if no explicit approval of this exact plan is available,
   return a `confirmation-required` blocker without rewriting history.
4. After approval, hand control back to `review-commits`. Its helpers use
   this skill's `lib/commit.mjs` for each explicit commit/amend. Set
   `__GIT_COMMIT_PLUGIN__=1` and `COMMIT_ACTION_STYLE` to the validated style
   only for the approved replay and revalidation. The token is a convention,
   not a security boundary. A conflict or an unplanned change stops replay;
   do not auto-approve a revised plan.
5. Verify the planned result and unchanged final file tree, then report local
   commits. No push, fetch or issue sync belongs to this branch.
