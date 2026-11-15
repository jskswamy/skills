# Unattended Mode Contract

When `--unattended` is set, this skill is safe for agents running with no
human attached:

1. It never calls AskUserQuestion. Analysis gates choose the option marked
   recommended/default and record the decision. Commit approval is separate:
   invoke `commit-tools-commit` for the exact full plan. Without explicit approval
   already supplied for that plan, write reason: `confirmation-required`
   and stop before any history rewrite.
2. It stays within the current branch scope: never check out another branch,
   never merge, never delete a branch, never remove a worktree, never tag
   (ignore `--tag`), and never push.
3. It never blocks on setup. `--base <ref>` is required; missing base fails
   with reason: `no-base`. First-time style setup is skipped. Style is read
   from `--style`, then `.claude/git-commit.local.md`, then `classic`.
4. It never invokes `/codebase:index`. Layer 3 semantic checks run only when
   an existing fresh index is available; otherwise Layer 3 is skipped and the
   skip is recorded in `decisions`.
5. It fails loudly, not interactively. Rebase conflicts run
   `git rebase --abort`, restore the original HEAD, write reason: `conflict`
   with conflicting files, and exit non-zero. Test failures write reason:
   `tests`. Revalidation drift without a saved message writes reason: `drift`.
6. It enforces the tree invariant after rewriting: `git diff <original HEAD> HEAD`
   must be empty. If not, restore the original HEAD, write reason:
   `tree-mismatch`, and exit non-zero.

Before starting, record `originalHead=$(git rev-parse HEAD)` and resolve
`base=$(git rev-parse --verify "$BASE_REF")`. If base resolution fails in
unattended mode, write the result with reason: `no-base` and exit non-zero.

add `.review-commits/` to `.git/info/exclude` before writing the default result
path so the result file is not accidentally tracked.

### Result File

Write `--result <path>` in every outcome:

The result file is JSON with keys `outcome` (`done | failed`), `reason`, `base`, `originalHead`, `newHead`, `decisions`, `plan`, `validation`, `detail`; the full schema is in `references/result-file.md` (read it before writing the file).

Exit code 0 only when `outcome` is `done`.
