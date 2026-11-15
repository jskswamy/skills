# Observe or Attach

For an instance overview or cost:

```bash
bivouac status
bivouac list --cost
bivouac status --json
bivouac list --json
```

`bivouac status` describes the remote VM instance (IP, uptime, cost, live reachable state). It does not report session progress.

For session inventory across all instances:

```bash
bivouac session list
bivouac session list --json
```

For live session progress and issue status, query the instance directly (never cached or last-known):

```bash
bivouac session status [name]
bivouac session status [name] --json
```

`bivouac session status [name]` reads live state from the instance:
- Displays retirement state, unmerged commit count, and worktree condition (`clean`, `dirty`, or `no worktree`).
- For sessions started with `--issue <epic-id>`, shows progress against the epic: planned issues closed (`✓` closed, `◐` in progress, `○` open, `✗` removed), "X of Y planned closed", followed by issues discovered during the session (and how many are closed) and updated issue counts.
- For sessions without an epic target, reports honest counts of created, closed, and updated issues.
- Highlights items needing operator attention: rewritten base branch or issue history, or the target epic closed while planned work remains open.
- For sessions with no start record, accurately explains whether issue reporting predates the session or is absent.

For live issue changes and sync state without pulling:

```bash
bivouac session issues [name]
bivouac session issues [name] --json
```

`bivouac session issues [name]` lists every issue the session created, closed, updated, or removed so far, with its local sync status:
- `✓` synced: issue change has reached the local database.
- `✗` not synced: issue change exists on the instance but has not landed locally.
- `?` unknown: local `bd` is unavailable or could not be verified.

It also reports the target epic status and any discovered issues filed outside that epic. Run before `session pull` to preview what a pull will bring.

For an interactive shell or agent-facing view, choose the command requested:

```bash
bivouac ssh
bivouac tmux
bivouac herdr
bivouac pair
```

`bivouac herdr [name]` takes an optional instance name. Bivouac resolves the session from the current worktree, the only live session, or an interactive picker when a terminal is available. Outside Herdr it launches Herdr against the instance SSH endpoint. Inside Herdr it registers or focuses one saved machine for the instance and creates or focuses a workspace named for the bivouac session. If no session resolves inside Herdr, start one first or run Herdr outside Herdr to attach to its default remote session.

In interactive progress panes (`up`, `provision`), Ctrl-C stops the terminal display and detaches without killing the remote operation (e.g. background Home Manager switch continues; re-attach with `bivouac provision`).

Do not attach to a destructive workflow. Observation commands should not merge, delete, down, provision, serve, or unserve.
