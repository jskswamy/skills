# Pull Session Work

Use pull when the user wants to inspect remote work without merging it into the current branch:

```bash
bivouac session list
bivouac session pull [name]
```

Resolve `[name]` in this order:

1. explicit session name from the user,
2. current local session worktree,
3. the only active session on the instance.

If multiple sessions are possible, ask which one to pull.

`session pull` ends with an issue receipt summarizing `created`, `closed`, `updated`, and `removed` issues:
- When all issues have landed locally, reports `all X synced ✓`.
- If any issue has not landed locally, reports `X NOT synced` and lists each straggler with instance vs local timestamps (`hh:mm`, `missing`, or `unknown`).
- Issues move independently of git commits: an agent that only triaged or updated issues still produces an issue receipt even when no new commits are pulled.
