---
name: bivouac
description: Use when the user asks to start, monitor, attach to, pull, merge, or tear down a disposable remote coding-agent session or VM with the bivouac CLI, e.g. "start a bivouac session", "run this on a remote box", "bivouac status", "pull the session work", "merge the bivouac session", "bivouac up" or "bivouac down".
---

# Bivouac Skill

## Purpose

Use this skill when the user wants to start, inspect, attach to, retrieve, merge, or shut down a disposable remote coding-agent workspace managed by `bivouac`.

`bivouac` is repo-scoped. It creates a remote VM from declarative config, starts named git-backed sessions on that instance, and brings work home through `session pull` or `session merge`. The skill's job is to choose safe next steps from deterministic state checks and the CLI's own metadata, not to reimplement the CLI.

## Preflight Checks

Before workflow actions, establish state with the checks that are relevant to the user's request:

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

## Dispatcher

Route by combining the user's request with detected state:

| User intent / detected state | Behavior |
| --- | --- |
| No git repo | Stop and explain that bivouac is repo-scoped. |
| `bivouac` missing | Stop and ask the user to install it or enter the right environment. |
| No explicit intent | Run status/list checks, summarize state, and offer safe next actions. |
| No `bivouac.pkl` | Offer `bivouac init`; do not invent config. |
| Config exists, no instance | Offer `bivouac up`. |
| Instance exists, no sessions | Offer `bivouac session start <name>`. |
| Start requested | Check local git state, choose or confirm a session name, run `bivouac up` if needed, then run `bivouac session start <name>` with `--task` or `--issue` when context is available. |
| Pull requested | Resolve the session from an explicit argument, current worktree, or the only active session. If ambiguous, ask. Run `bivouac session pull [name]`. |
| Merge requested | Require an unambiguous session. Warn that commits are replayed, signed, and verified locally. Run `bivouac session merge [name]`. |
| Status requested | Run `bivouac status` and usually `bivouac session list`; use `--json` when the result will be parsed. |
| Cost requested | Run `bivouac list --cost`; use `--json` when parsing fleet-wide state. |
| SSH/attach requested | Run `bivouac ssh`, `bivouac tmux`, `bivouac herdr`, or `bivouac pair` after summarizing the target. Remember `bivouac herdr [name]` takes an instance name, not a session name. |
| Port requested | Prefer `bivouac connect --port <port>` for temporary access. Use `serve`/`unserve` only when publishing on the tailnet is clearly requested. |
| Sync/download requested | Confirm the path is intentionally outside git before running `sync` or `download`. |
| Preset requested | Use `bivouac preset list/show/edit/delete`; presets are copied starting shapes for future `init`, not live links. |
| Secrets requested | Use `bivouac secrets init/edit/keys`; `keys` lists names only, never values. |
| Tailscale requested | Use `bivouac tailscale [name]` to join the instance to the user's personal tailnet. |
| Shell requested | `bivouac shell [name]` exists in the CLI surface, but confirm implementation status with help/manifest before relying on it. |
| Provision requested | Warn that provisioning can restart services such as Docker and disrupt running containers. Ask before running. |
| Down requested | Inspect sessions first. Explain that `down` rescues session work and then destroys the VM. Ask before running. |

Ambiguity means ask or report status. Never guess which session to pull, merge, delete, serve, unserve, or destroy.

## Workflows

### No Explicit Intent

If the user invokes `/bivouac` or `/skill:bivouac` without a clear action:

```bash
command -v bivouac
git rev-parse --show-toplevel
test -f bivouac.pkl
bivouac status
bivouac session list
```

Use JSON for structured summaries:

```bash
bivouac status --json
bivouac session list --json
```

Summarize:

- whether this is a git repo,
- whether `bivouac.pkl` exists,
- whether an instance appears to exist,
- which sessions exist,
- safe next actions such as init, up, start, status, pull, merge, ssh, or down.

If the user asked about cost, include:

```bash
bivouac list --cost
```

### Initialize or Bring Up a Repo

If the repo is not configured, guide the user to the built-in wizard:

```bash
bivouac init
```

Do not generate a custom `bivouac.pkl` unless the user explicitly asks for config authoring help.

If config exists and the user wants an instance:

```bash
bivouac up
```

Explain that `up` reconciles the configured remote environment and does not send repository contents by itself. Code reaches the instance when a session starts.

### Start a Session

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

### Observe or Attach

For a read-only summary:

```bash
bivouac status
bivouac session list
bivouac status --json
bivouac session list --json
```

For an interactive shell or agent-facing view, choose the command the user requested:

```bash
bivouac ssh
bivouac tmux
bivouac herdr
bivouac pair
```

`bivouac herdr [name]` takes an optional instance name. Bivouac resolves the session from the current worktree, the only live session, or an interactive picker when a terminal is available. Outside Herdr it launches Herdr against the instance SSH endpoint. Inside Herdr it registers or focuses one saved machine for the instance and creates or focuses a workspace named for the bivouac session. If no session resolves inside Herdr, start one first or run Herdr outside Herdr to attach to its default remote session.

Do not attach to a destructive workflow. Observation commands should not merge, delete, down, provision, serve, or unserve.

### Pull Session Work

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

### Merge Session Work

Use merge when the user wants to replay the session's commits onto the current branch with the local user's signature:

```bash
bivouac session list
git status --short
bivouac session merge [name]
```

Before merging:

- require an unambiguous session,
- warn that merge replays/signs/verifies commits locally,
- remind the user that merge does not push to a shared git remote,
- remind the user to push any issue database remote separately when their workflow requires it.

If merge reports conflicts, stop and let the user resolve them with the normal git flow. After `git cherry-pick --continue`, rerun `bivouac session merge [name]`; merge resumes where it stopped rather than replaying commits that already landed.

### Ports and File Transfer

For temporary local access to a remote service:

```bash
bivouac connect --port <port>
```

For tailnet publishing, only when the user clearly asks to publish or unpublish:

```bash
bivouac serve <port>
bivouac unserve <port>
```

For deliberate non-git data movement:

```bash
bivouac sync --dir <path>
bivouac download <path>
```

Before `sync` or `download`, confirm the path is intentionally outside git, such as datasets, weights, logs, or results.

### Presets, Secrets, Tailscale, and Shell

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

### Provision, Delete, and Down

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

Before destroying the instance, inspect sessions and explain the consequence:

```bash
bivouac session list
bivouac down
```

`down` is designed to rescue session work before destroying the VM, but it is still destructive to the instance. Ask before running it.

## Session Naming

Name sessions after the work, not the tracker:

Good:

```text
pi-harness-spike
commit-tools-cleanup
docs-rewrite
```

Avoid:

```text
beads-123
issue-42
ulai-ai-abc
```

If an issue id matters, keep it as metadata with `--issue <id>` rather than embedding it in the name. For non-issue context, use `--task "<text>"`.

## Paths and Resolution

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

## Safety Invariants

Preserve these invariants:

- Do not push to shared git remotes.
- Do not place GitHub credentials or signing keys on the instance.
- Treat `beads = "dolthub"` as credential-bearing mode. Warn that the DoltHub credential is account-wide for the life of the instance.
- Treat `session merge` as local replay/sign/verify, not a remote push.
- After merge, remind the operator to push any separate issue database remote when their workflow requires it.
- Do not run `provision`, `down`, `delete`, `serve`, or `unserve` without clear user intent.
- Prefer status output over action when session resolution is ambiguous.

## What This Skill Does NOT Do

- It does not reimplement bivouac's CLI logic or replace `bivouac manifest` as the source of current command metadata.
- It does not write `bivouac.pkl` unless the user explicitly asks for config authoring help.
- It does not push git commits or issue databases to shared remotes.
- It does not resolve merge conflicts automatically.
- It does not run disruptive commands from guessed state.
- It does not install or configure cloud credentials for the user.
