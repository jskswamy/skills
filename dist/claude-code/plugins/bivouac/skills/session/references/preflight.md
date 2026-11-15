# Preflight Checks

Route image requests to [Custom Cloud Images](#custom-cloud-images) before repository preflight: `image list`, `image tag`, and `image prune` need no project config or git repo; `image generate` and `image build` can use an explicit config or personal base config.

For session/instance workflows, establish state with the checks relevant to the user's request:

```bash
command -v bivouac
git rev-parse --show-toplevel
git status --short
test -f bivouac.pkl
git branch --show-current
git worktree list
bivouac status
bivouac session list
```

When the user asks about cost or fleet-wide state, run:

```bash
bivouac list --cost
```

When scripting, parsing, or checking recent command capabilities, prefer the CLI's machine-readable surfaces:

```bash
bivouac manifest
bivouac status --json
bivouac list --json
bivouac session list --json
bivouac session status [name] --json
bivouac session issues [name] --json
```

Use `bivouac manifest` to discover current commands, flags, side effects, JSON support, and examples instead of scraping prose help or relying on memory.

Interpret these checks conservatively:

- If `command -v bivouac` fails, stop and ask the user to install bivouac or enter an environment where it is available.
- If `git rev-parse --show-toplevel` fails, stop. Bivouac sessions are repository-scoped.
- Use `git status --short` before start and merge-sensitive steps. A dirty tree should be resolved or explicitly accepted before proceeding.
- Use `test -f bivouac.pkl` to distinguish configured repositories from repositories that need `bivouac init`.
- Use `git branch --show-current` and `git worktree list` to explain whether the user appears to be inside a normal repo checkout or a local session worktree.
- Use `bivouac status` and `bivouac session list` to summarize instance/session state.

Preflight output is evidence, not permission. Do not run disruptive commands just because preflight found a target.
