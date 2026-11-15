# Resumable Retirement

Merge and delete record durable progress. Inspect `bivouac session list --json` for `retirementPhase`, `pausedOn`, and `lastFailure`. When cleanup stops, preserve recovery state and rerun the same command; a completed retry succeeds from its completion receipt.

When `pausedOn` is "issues", merge paused because touched issues have not synced locally. Pull the issues and verify they landed, or pass `--accept-unsynced` with operator approval.

A merge or delete refused before accepting work may be replaced with an explicitly approved `session delete <name> --force`; a plain delete paused in cleanup may also gain `--force`. Once removal has begun or merge has accepted work, finish with the original operation. `session merge` has no `--force` flag.

Herdr cleanup closes only resources with matching recorded server and ownership proof. Legacy unknown ownership needs interactive adoption. Forced delete may leave an unprovable workspace open with a warning; unreachable cleanup remains pending, even with force. Do not erase state or manually remove worktrees to bypass a failure.
