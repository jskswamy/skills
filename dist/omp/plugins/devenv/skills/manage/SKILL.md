---
name: devenv-manage
description: "Use when setting up or changing a Nix flake development environment: 'set up devenv', 'devenv setup', 'init a nix flake', 'create a dev shell', 'add package X to the flake', 'upgrade flake inputs', 'remove package from devenv', 'add pre-commit/security hooks'. Auto-detects project stack and manages flake.nix."
disable-model-invocation: true
argument-hint: "[add|upgrade|remove|security]"
metadata:
  short-description: "Nix flake dev environment setup and changes: add, upgrade, remove, security."
---

# Devenv

Initialize and manage Nix flake development environments. Provides a devbox-like experience with auto-detection of project dependencies and security tooling using native Nix solutions.

## Execution Flow

### Step 1: Check Current State

First, determine if this is a new setup or managing an existing environment:

1. Check if `flake.nix` exists in the current directory
2. If flake.nix exists, check if `git-hooks` input is present (indicates pre-commit is configured)
3. Read `.claude/devenv.local.md` if it exists for:
   - channel preference (default: `nixos-unstable`)
   - shell welcome style (default: `box`)
   - custom welcome text (if `shell_welcome: custom`)

### Step 2: Branch Based on State

#### If flake.nix does NOT exist (Initialize Flow)

Read `references/init-flow.md` and follow it.

---

#### If flake.nix EXISTS (Manage Flow)

Read `references/manage-flow.md` and follow it.

---

## Important Notes

- Always use `nix-shell -p <tool> --run "<command>"` for nix tools - do NOT assume they are installed system-wide
- The PostToolUse hooks will automatically format and lint `flake.nix` after any Write/Edit operations
- Use the nixpkgs channel from `.claude/devenv.local.md` if it exists, otherwise default to `nixos-unstable`
- When searching for packages, use 1mcp NixOS tools first, then mcp-nixos MCP, with bash fallback
- `git-hooks.nix` auto-generates `.pre-commit-config.yaml` via shellHook - no manual YAML needed!
- All hook tools are provided by Nix, ensuring reproducibility
- **Critical:** The `self` parameter in flake outputs is REQUIRED by the Nix flake system, even if not explicitly used in the function body. The plugin's deadnix hook is configured with `--no-lambda-pattern-names` to preserve it
- **Always validate** with `nix flake check --no-build` before completing any flake creation/modification task
- **direnv-instant is a flake input, NOT a nixpkgs package:** It must be added via `inputs.direnv-instant.url = "github:Mic92/direnv-instant"` and referenced as `direnv-instant.packages.${system}.default`. Standard `direnv` IS in nixpkgs and can be added directly to the packages list.

## MCP Tools: NixOS Package Search

See `references/mcp-package-search.md` (section "MCP Tools: NixOS Package Search") for the tool priority order (1mcp, global/project mcp-nixos, plugin bundled MCP, bash fallback), exact call signatures for package and version search, the version resolution workflow, and the parameter reference.

## Settings File

Users can customize behavior via `.claude/devenv.local.md`:

```yaml
---
nixpkgs_channel: nixos-unstable
use_mcp_search: true
direnv_mode: instant
shell_welcome: box
shell_welcome_custom: ""
---
```

### Available Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `nixpkgs_channel` | `nixos-unstable` | Nixpkgs channel to use |
| `use_mcp_search` | `true` | Use mcp-nixos for package search. Set to `false` to always use bash fallback |
| `direnv_mode` | `instant` | direnv integration: `instant` (async, recommended), `standard` (sync), or `none` |
| `shell_welcome` | `box` | Welcome message style: `box`, `minimal`, `project`, `tech`, `custom`, or `none` |
| `shell_welcome_custom` | `""` | Custom welcome message text (only used when `shell_welcome: custom`). Use `\n` for multi-line |

## git-hooks.nix Hook Reference

See `references/git-hooks.md` (section "git-hooks.nix Hook Reference") for available hooks by language and an example hook configuration.
