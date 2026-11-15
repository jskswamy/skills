---
name: session
description: "Manage remote agent sessions and cloud images. [start|status|ssh|sync|image|down] [request] Use when the user asks to manage disposable remote coding-agent sessions, VMs, configuration, or custom cloud images with the bivouac CLI, including start, status, issues, attach, pull, merge, delete, up, down, and image generate/build/list/tag/prune."
disable-model-invocation: true
argument-hint: "[start|status|issues|pull|merge|delete|ssh|connect|serve|unserve|sync|download|provision|down|image] [request...]"
metadata:
  short-description: "Manage remote agent sessions and cloud images. [start|status|ssh|sync|image|down] [request]"
---

# Bivouac Skill

## Purpose

Use this skill when the user wants to start, inspect, attach to, retrieve, merge, or shut down a disposable remote coding-agent workspace managed by `bivouac`.

Bivouac sessions are repo-scoped; image operations can run outside a repository. It creates a remote VM from declarative config, starts named git-backed sessions on that instance, tracks session issue progress live, and brings work home through `session pull` or `session merge`. The skill's job is to choose safe next steps from deterministic state checks and the CLI's own metadata, not to reimplement the CLI.

## Preflight Checks

Read `references/preflight.md` and follow it.

## Dispatcher

Route by combining the user's request with detected state:

| User intent / detected state | Behavior |
| --- | --- |
| Image requested | Use the image workflow below; repository/session preflight does not apply. |
| No git repo for a session request | Stop and explain that bivouac sessions are repo-scoped. |
| `bivouac` missing | Stop and ask the user to install it or enter the right environment. |
| No explicit intent | Run status/list checks, summarize state, and offer safe next actions. |
| No `bivouac.pkl` | Offer `bivouac init`; do not invent config. |
| Config exists, no instance | Offer `bivouac up`. |
| Instance exists, no sessions | Offer `bivouac session start <name>`. |
| Start requested | Check local git state, choose or confirm a session name, run `bivouac up` if needed, then run `bivouac session start <name>` with `--task` or `--issue` when context is available. |
| Pull requested | Resolve the session from an explicit argument, current worktree, or the only active session. If ambiguous, ask. Run `bivouac session pull [name]`. Reviews new commits and issue sync receipt. |
| Merge requested | Require an unambiguous session and clean main/session worktrees. Explain local signed replay, issue verification, and resumable retirement. Run `bivouac session merge [name]`. If paused on unsynced issues that cannot land, use `--accept-unsynced` with operator approval. |
| Delete requested | Resolve the session and confirm the target. Plain delete protects unmerged commits and unlanded issue changes; `--force` needs explicit authority to discard them. |
| Status requested | For the instance, run `bivouac status`; for session progress (epic issues and attention items), run `bivouac session status [name]`; for session inventory across instances, run `bivouac session list`. Use `--json` when parsing. |
| Issues requested | Run `bivouac session issues [name]` to inspect live issue changes and sync state (`✓`, `✗`, `?`) before pulling. |
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

If the user invokes `/bivouac:session` without a clear action:

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

Read `references/init-up.md` and follow it.

### Start a Session

Read `references/start.md` and follow it.

### Observe or Attach

Read `references/observe-attach.md` and follow it.

### Pull Session Work

Read `references/pull.md` and follow it.

### Merge Session Work

Read `references/merge.md` and follow it.

### Custom Cloud Images

Read `references/images.md` and follow it.

### Ports and File Transfer

Read `references/ports-files.md` and follow it.

### Presets, Secrets, Tailscale, and Shell

Read `references/presets-secrets.md` and follow it.

### Provision, Delete, and Down

Read `references/provision-delete-down.md` and follow it.

### Resumable Retirement

Read `references/retirement.md` and follow it.

### Destroy the Instance

Read `references/destroy.md` and follow it.

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

Read `references/paths.md` and follow it.

## Safety Invariants

Preserve these invariants:

- Do not push to shared git remotes.
- Do not place GitHub credentials or signing keys on the instance.
- Treat `beads = "dolthub"` as credential-bearing mode. Warn that the DoltHub credential is account-wide for the life of the instance.
- Treat `session merge` as local replay/sign/verify, not a remote push.
- After merge, remind the operator to push any separate issue database remote (`bd dolt push` or `bd sync`) when their repository syncs issues elsewhere.
- Plain delete and merge protect against unlanded issue changes in addition to unmerged commits.
- Never pass `--accept-unsynced` or `--force` without explicit operator authority.
- Do not run `provision`, `down`, `delete`, `serve`, `unserve`, image builds, tagging, or pruning without clear user intent; explain billing, config writes, and retention before an image build.
- Prefer status output over action when session resolution is ambiguous.

## What This Skill Does NOT Do

Read `references/out-of-scope.md` and follow it.
