# Index Freshness

An answer built from an index that does not match the code is stale. Never present one as current. Run this check for every project in scope before any graph query.

## What "fresh" means

For a repository at `<root>` (the current repo: `git rev-parse --show-toplevel`; a `--project` repo: its `root_path` from `list_projects`, using `git -C <root>`):

Run both in `<root>` (or with `git -C <root>`):

- `head` = `git rev-parse HEAD`
- `dirty` = `git diff HEAD | git hash-object --stdin`

The index is **fresh** only when `head` equals the recorded `last_indexed_commit` **and** `dirty` equals the recorded `dirty_hash`. Any change to tracked files since indexing makes it not fresh, even outside the area asked about. Time alone never makes an index fresh or stale; `last_indexed` is informational.

## Where the record lives

Read `.claude/codebase.local.md` in the current repo (YAML frontmatter):

```yaml
---
auto_index: ask            # always | ask | never (default ask)
index_mode: moderate       # full | moderate | fast (default moderate)
last_indexed: <ISO 8601>
last_indexed_commit: <sha>
dirty_hash: <hash>
projects:                  # other repos used with --project
  <project-name>: {last_indexed_commit: <sha>, dirty_hash: <hash>}
---
```

The skill never writes files into another repo. Freshness for other repos is recorded only under `projects:` in the current repo's file. Preserve all other fields when updating.

## Decide

Use `index_status` (via the resolved transport) as the source of truth for whether a project is indexed at all.

| Condition | Action |
|-----------|--------|
| Fresh | Proceed. |
| Indexed, same `head`, only uncommitted edits changed, `auto_index` is `always` or `ask` | Refresh with `index_repository` in `fast` mode without asking (re-reading the user's own edits does not widen consent already given). Print `⟳ Re-indexed <repo> (uncommitted changes)`. |
| Not indexed, or `head` moved, or no record | `auto_index: always` → refresh with the saved `index_mode`. `auto_index: ask` (or no file) → ask with the harness question mechanism (AskUserQuestion in Claude Code; in chat otherwise): `Yes, always` / `Yes, once` / `No`; save `always` if chosen. `auto_index: never` → do not index; print the `codebase:index` hint. |
| `auto_index: never` and not fresh for any reason | Do not refresh. |

For a `--project` repo, the current repo's `auto_index` applies. After re-indexing a repo that has cross-repo links, re-run linking (`index_repository` with `mode: "cross-repo-intelligence"`, as `codebase:index --link` does) for the affected projects so cross-repo edges are current.

After every successful refresh, record `last_indexed`, `last_indexed_commit` = `head` and `dirty_hash` = `dirty` (recomputed after indexing) for that repo.

## When it stays not fresh

Refresh declined, `never`, unavailable, or failed: do not present graph results as current for that repo. Answer the parts you need from direct source inspection (`ast-grep` if installed, `rg`/Grep, reading files) and label them `from source inspection; graph unavailable/stale for <repo>`. If a claim cannot be checked that way, say so instead of guessing.
