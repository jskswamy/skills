---
name: bivouac
description: Use when the user asks to manage disposable remote coding-agent sessions, VMs, configuration, or custom cloud images with the bivouac CLI, including start, status, attach, pull, merge, delete, up, down, and image generate/build/list/tag/prune.
---

# Bivouac Skill

## Purpose

Use this skill when the user wants to start, inspect, attach to, retrieve, merge, or shut down a disposable remote coding-agent workspace managed by `bivouac`.

Bivouac sessions are repo-scoped; image operations can run outside a repository. It creates a remote VM from declarative config, starts named git-backed sessions on that instance, and brings work home through `session pull` or `session merge`. The skill's job is to choose safe next steps from deterministic state checks and the CLI's own metadata, not to reimplement the CLI.

## Preflight Checks

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
| Image requested | Use the image workflow below; repository/session preflight does not apply. |
| No git repo for a session request | Stop and explain that bivouac sessions are repo-scoped. |
| `bivouac` missing | Stop and ask the user to install it or enter the right environment. |
| No explicit intent | Run status/list checks, summarize state, and offer safe next actions. |
| No `bivouac.pkl` | Offer `bivouac init`; do not invent config. |
| Config exists, no instance | Offer `bivouac up`. |
| Instance exists, no sessions | Offer `bivouac session start <name>`. |
| Start requested | Check local git state, choose or confirm a session name, run `bivouac up` if needed, then run `bivouac session start <name>` with `--task` or `--issue` when context is available. |
| Pull requested | Resolve the session from an explicit argument, current worktree, or the only active session. If ambiguous, ask. Run `bivouac session pull [name]`. |
| Merge requested | Require an unambiguous session and clean main/session worktrees. Explain local signed replay and resumable retirement. Run `bivouac session merge [name]`. |
| Delete requested | Resolve the session and confirm the target. Plain delete protects unmerged work; `--force` needs explicit authority to discard it. |
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

When configuring or migrating:

- Shared defaults live in `~/.config/bivouac/base.pkl`; project config layers on top.
- `sshKeys` contains public-key file paths, not account IDs or fingerprints. Relative paths resolve against the declaring config. Use `init` to migrate old entries; keep private keys local. Encrypted keys must already be unlocked in ssh-agent. `up` requires approval before registering missing public keys; registrations remain if VM creation fails or on `down`.
- Select coding harnesses with `agents`, not guessed entries in `packages`. Selected unfree agents are permitted narrowly. For unfree packages supplied by imported modules, use `allowUnfreePackages` with package names rather than enabling all unfree software.

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

- require an unambiguous session and clean main/session worktrees,
- warn that merge replays/signs/verifies commits locally, then retires the session and its recorded Herdr resources,
- remind the user that merge does not push to a shared git remote,
- remind the user to push any issue database remote separately when their workflow requires it.

Replay uses the session's recorded starting commit, so rebasing, folding, or re-signing the destination branch does not by itself prevent merge. If that starting commit has been garbage-collected, pull the session, apply the work manually, and verify it before requesting a forced delete.

If merge reports conflicts, stop and let the user resolve them with the normal git flow. After `git cherry-pick --continue`, rerun `bivouac session merge [name]`; merge resumes where it stopped rather than replaying commits that already landed. For other failures, follow [Resumable Retirement](#resumable-retirement).

### Custom Cloud Images

Discover flags and side effects with `bivouac manifest`. Image commands are DigitalOcean-specific; all support `--json`.

For inspection or a local-only Packer bundle:

```bash
bivouac image list --tag my-dev --json
bivouac image generate --tag my-dev
```

Generation needs `pkl`, makes no cloud calls, and writes `./bivouac-image` by default. Generate/build config selection is explicit `--config <file>`, otherwise the project config, otherwise personal `base.pkl`. Invalid existing configs fail rather than falling back. `--config` and `--repo` are mutually exclusive; `--name` does not apply. Both refuse a nonempty output directory.

Before building, explain and confirm the effects: a billed temporary Droplet and snapshot, config writeback, and automatic pruning of older snapshots. Builds need `pkl`, `packer`, and a local DigitalOcean token; bivouac does not install Packer.

```bash
bivouac image build --tag my-dev --no-prune --json
```

Use `--no-prune` to retain all images unless retention is explicitly agreed. Default retention keeps the newest plus one previous image per tag/region/architecture; `--keep-previous` changes that and cannot be combined with `--no-prune`. A successful build sets `image = "tag:my-dev"` in the selected config. Symlinked, read-only, Nix-store, or expression-valued configs are left untouched with a suggested line to add.

Builds evaluate arbitrary Nix with network access: use trusted configurations. Secrets embedded in Nix store paths remain in snapshots; review bundles before sharing. Provider credentials stay local to Packer and launch-time credentials are not loaded into builds. Builds support `x86_64` only, start from stock Ubuntu, and reject local-path or authenticated private flake inputs.

For promotion or retention:

```bash
bivouac image tag <image-id> stable
bivouac image prune --tag my-dev --dry-run
```

Tagging a ready Bivouac image makes it eligible for that tag's retention. Preview pruning, confirm scope and deletions, then use `--yes` only with explicit approval when running noninteractively. Foreign or non-ready images are excluded; prune rechecks each image and stops on uncertainty. Serialize builds/prunes sharing a tag/region/architecture.

Launch with `image = "tag:<tag>"`, a numeric image ID, or a stock slug. Custom images must be ready Bivouac snapshots matching region, architecture, shell, and disk requirements; `up` fails rather than falling back or building. Provisioning still runs at launch.

On failure inspect `phase`, `image_created`, `image_id`, and `cleanup` in JSON. A nonzero build may already have created a usable snapshot or updated config: inspect before rebuilding. Retry failed pruning separately. Interrupted Packer runs may leave billed resources; inspect the reported cleanup guidance.

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

Plain delete refuses commits not on the current branch or issue changes not landed locally. Manually cherry-picked, rebased, or re-signed work can have different hashes: verify it landed before seeking explicit discard approval for `bivouac session delete <name> --force`.

### Resumable Retirement

Merge and delete record durable progress. Inspect `bivouac session list --json` for `retirementPhase` and `lastFailure`. When cleanup stops, preserve recovery state and rerun the same command; a completed retry succeeds from its completion receipt.

A merge or delete refused before accepting work may be replaced with an explicitly approved `session delete <name> --force`; a plain delete paused in cleanup may also gain `--force`. Once removal has begun or merge has accepted work, finish with the original operation. `session merge` has no `--force` flag.

Herdr cleanup closes only resources with matching recorded server and ownership proof. Legacy unknown ownership needs interactive adoption. Forced delete may leave an unprovable workspace open with a warning; unreachable cleanup remains pending, even with force. Do not erase state or manually remove worktrees to bypass a failure.

### Destroy the Instance

Before destroying the instance, inspect sessions and explain the consequence:

```bash
bivouac session list
bivouac down
```

`down` rescues session work before destroying the VM and refuses unmerged commits or unlanded issue state without explicit force. Ask before running it; forced destruction needs explicit approval to discard that work.

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
- Do not run `provision`, `down`, `delete`, `serve`, `unserve`, image builds, tagging, or pruning without clear user intent; explain billing, config writes, and retention before an image build.
- Prefer status output over action when session resolution is ambiguous.

## What This Skill Does NOT Do

- It does not reimplement bivouac's CLI logic or replace `bivouac manifest` as the source of current command metadata.
- It does not write `bivouac.pkl` unless the user explicitly asks for config authoring help.
- It does not push git commits or issue databases to shared remotes.
- It does not resolve merge conflicts automatically.
- It does not run disruptive commands from guessed state.
- It does not install or configure cloud credentials for the user.
