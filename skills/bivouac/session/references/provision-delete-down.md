# Provision, Delete, and Down

`provision`, session deletion, and `down` are disruptive. Do not run them from inference alone.

Before provisioning, warn that services can restart and containers can be disrupted:

```bash
bivouac provision
```

Before deleting a session, inspect sessions and confirm the target explicitly:

```bash
bivouac session list
bivouac session delete <name>
```

Plain delete refuses commits not on the current branch or issue changes not landed locally. Manually cherry-picked, rebased, or re-signed work can have different hashes: verify it landed before seeking explicit discard approval for `bivouac session delete <name> --force`.

If plain delete pauses on a Herdr workspace that can no longer be proven to belong to the session (its original pane was closed or replaced), it instructs the operator to close the workspace in Herdr manually and retry, or use `--force` to leave it open with a warning.
