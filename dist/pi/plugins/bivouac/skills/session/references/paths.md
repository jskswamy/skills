# Paths and Resolution

Global flags are useful when cwd-based resolution is not enough:

```bash
bivouac --repo <path> status
bivouac --name <instance> status
```

`--repo` resolves identity from a repository path instead of the current directory. `--name` overrides the instance name.

New sessions are checked out on the instance under a nested repository identity such as:

```text
~/sessions/<session>/<owner>/<repo>
```

Local session worktrees remain under:

```text
<repo>/.worktrees/<session>
```

Existing sessions may still use older flattened remote paths recorded in state. Do not reinterpret or migrate those paths manually; let bivouac use the session's recorded path identity.
