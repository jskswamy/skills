# Presets, Secrets, Tailscale, and Shell

For saved project shapes created by `init`:

```bash
bivouac preset list
bivouac preset show <name>
bivouac preset edit <name>
bivouac preset delete <name>
```

Presets are copied into a project's `bivouac.pkl` as a starting point. They are not live links to existing repos.

For the personal sops-encrypted secrets file:

```bash
bivouac secrets init
bivouac secrets edit
bivouac secrets keys
```

Use `secrets keys` to inspect key names only; do not try to print secret values.

For tailnet setup:

```bash
bivouac tailscale [name]
```

`bivouac shell [name]` is present in the CLI surface. Check current help or `bivouac manifest` before relying on it, because recent versions may expose it before the workflow is fully implemented.
