# Start a Session

Before starting, check local state:

```bash
git status --short
bivouac status
bivouac session list
```

Choose a short, human-readable name for the work. If the user provides a tracker or issue id, pass it as `--issue <id>`; if they provide free-form intent, pass it as `--task "<text>"`. These are mutually exclusive. Do not encode issue ids in the session name.

If no instance exists or the user asks to ensure one exists, run:

```bash
bivouac up
```

Start the session:

```bash
bivouac session start <name>
bivouac session start <name> --task "<what this session is for>"
bivouac session start <name> --issue <beads-id>
```

When the repository uses beads, `--issue` gives the remote agent issue context and may claim the issue in the session's own database.

After start, report the session name and suggest how to attach or inspect:

```bash
bivouac session list
bivouac ssh
```
