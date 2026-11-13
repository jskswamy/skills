# Merge Session Work

Use merge when the user wants to replay the session's commits onto the current branch with the local user's signature:

```bash
bivouac session list
git status --short
bivouac session merge [name]
```

Before merging:

- require an unambiguous session and clean main/session worktrees,
- warn that merge replays/signs/verifies commits locally, pulls and verifies issue changes, and then retires the session and its recorded Herdr resources,
- remind the user that merge does not push to a shared git remote,
- remind the user to push any issue database remote separately when their workflow requires it (`bd dolt push` or `bd sync`).

Replay uses the session's recorded starting commit, so rebasing, folding, or re-signing the destination branch does not by itself prevent merge. If that starting commit has been garbage-collected, pull the session, apply the work manually, and verify it before requesting a forced delete.

Merge verifies session issues before retiring the session:
- For a session that records where its issues started, merge pulls the session's issues and verifies that *every* issue the session touched has landed locally before deleting the instance's copy.
- If any issue is not synced (or the instance issue history was rewritten, or local `bd` is unavailable), merge pauses with `pausedOn: "issues"` ("issues not synced") and lists the unsynced issues. Rerunning `bivouac session merge [name]` pulls and checks again.
- `--accept-unsynced`: for gaps that can never close (such as an issue intentionally deleted locally), run `bivouac session merge [name] --accept-unsynced`. This merges anyway and lists the accepted unverified issues. It *never* steps over a failed pull (network/SSH failure) or commit checks. Always seek operator approval before passing `--accept-unsynced`.
- If the repository syncs issues elsewhere (`ModeGit` or `ModeExternal`), bivouac reminds: `"issues are only local until you \`bd dolt push\`"`.

If merge reports conflicts, stop and let the user resolve them with the normal git flow. After `git cherry-pick --continue`, rerun `bivouac session merge [name]`; merge resumes where it stopped rather than replaying commits that already landed. For other failures, follow [Resumable Retirement](#resumable-retirement).
