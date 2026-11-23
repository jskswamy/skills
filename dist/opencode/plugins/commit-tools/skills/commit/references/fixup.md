# Fixup Commit Workflow (`--fixup <sha>`)

Entered from `SKILL.md` after Step 1 (`references/repository-state.md` — git repo and staged changes verified) and Step 2 (`commit_style`, `confirm`, `pairs` resolved). Bypasses `references/relay-dispatch.md`, Step 3b (last-commit comparison), and Step 4 (atomicity split).

## 1. Inspect Target Commit (Bounded)

1. Verify `<sha>` is a valid ancestor commit (`git rev-parse --verify <sha>^{commit}` and `git merge-base --is-ancestor <sha> HEAD`). If invalid, not an ancestor, a merge commit, or already a `fixup!`/`amend!`/`squash!` commit, report the matching error from `references/error-messages.md` and stop (`lib/commit.sh` also enforces these deterministically).
2. Read the target commit's message and summary, plus the staged diff:
   - `git log -1 --format=%B <sha>`
   - `git show --stat <sha>`
   - `git diff --staged`
   - Fetch a scoped target diff (`git show <sha> -- <staged-files>`) only when `--stat` is insufficient to judge whether the message still fits. Do not run an unbounded `git show <sha>` on large commits.
3. Check publication and authorship (local refs only; never fetch or push):
   - `REMOTES=$(git for-each-ref --format='%(refname)' --contains=<sha> refs/remotes/)`
   - `TARGET_AUTHOR=$(git log -1 --format='%an <%ae>' <sha>)` vs `git config user.email`
   - Unlike `--amend`, both pushed commits and commits authored by others are allowed as `--fixup` targets; note them for reporting (and for the confirmation dialog when `confirm: true`).

## 2. Choose Plain `fixup!` (Mode A) vs. Message-Adjusted `amend!` (Mode B)

- **If `--pair` is set:** Run Step 6 (`references/pair-programming.md`) and use **Mode B** so the `Co-Authored-By:` trailer is preserved on autosquash.
- **Otherwise:** Compare the staged changes against `<sha>`'s existing commit message:
  - **Mode A (message unchanged):** `<sha>`'s current message already accurately describes the combined change (e.g., typo fix, minor review tweak within the same scope). No new message is written.
  - **Mode B (message adjusted):** The additional changes alter or expand what `<sha>` does or why. Run Steps 5 (`references/style-loading.md`), 6b (`references/session-context.md`), 7 (`references/message-generation.md`), and 7b (`references/message-validation.md`) to draft and validate the replacement commit message.
    - **Preserve existing trailers** from `<sha>` (`Co-Authored-By:`, `Signed-off-by:`, `Fixes #...`, `Refs:`, etc.) unless explicitly superseded.
    - Write **only** the replacement subject and body to `MESSAGE_FILE` — **never** include an `amend! ` prefix (`lib/commit.sh` prepends `amend! <target_subject>\n\n` automatically).

## 3. Confirm (Only When `confirm: true`)

If `confirm` is `false` (default), skip this step and proceed directly to Section 4.

When `confirm` is `true`, present the target commit (`<short-sha> <subject>`), staged files, a pushed-branch warning if `REMOTES` is non-empty (*"Target commit is on `<REMOTES>`; folding via `git rebase --autosquash` will rewrite published history and require a force push"*), an author note if authored by someone else, and (for Mode B) the proposed replacement message:

- **Mode A choices:**
  - `Create fixup` — run Mode A (`fixup!`)
  - `Update target message instead` — switch to Mode B (draft + validate replacement message, then re-confirm)
  - `Cancel` — exit without committing
- **Mode B choices:**
  - `Create amend!` — run Mode B (`amend!` with the replacement message)
  - `Edit message` — edit and re-run Step 7b (same edit flow as `references/confirm-flow.md`)
  - `Plain fixup! instead` — switch to Mode A (keep `<sha>`'s existing message)
  - `Cancel` — exit without committing

## 4. Execute & Report

Delegate commit execution to `references/execute-commit.md`:
- **Mode A:** `__GIT_COMMIT_PLUGIN__=1 bash <COMMIT_SKILL_DIR>/lib/commit.sh --fixup <sha>`
- **Mode B:** `__GIT_COMMIT_PLUGIN__=1 bash <COMMIT_SKILL_DIR>/lib/commit.sh --fixup <sha> --message-file <MESSAGE_FILE> --style <selected_style>` (append `--allow-style-override` only after explicit user override)

After committing, display the created commit hash, full message, and committed files. If `REMOTES` is non-empty, note that `<sha>` is on `<REMOTES>` and folding it with `git rebase -i --autosquash <sha>^` (or `git rebase -i --autosquash --root` if `<sha>` is the root commit) will rewrite published history and require a force push. Never push; run `git rebase -i --autosquash` only if the user explicitly asks to fold now.
