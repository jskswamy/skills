---
name: devenv
description: Initialize and manage Nix flake development environments with auto-detection and security tooling
argument-hint: "[add|upgrade|remove|security]"
---

# Devenv Command

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

**2a. Auto-detect project stack:**

Scan for language indicator files and suggest packages:

| File | Stack | Suggested Packages |
|------|-------|-------------------|
| `package.json` | Node.js | `nodejs`, check lockfile for `pnpm`/`yarn`/`npm` |
| `pnpm-lock.yaml` | Node.js + pnpm | `nodejs`, `pnpm` |
| `yarn.lock` | Node.js + yarn | `nodejs`, `yarn` |
| `package-lock.json` | Node.js + npm | `nodejs` |
| `Cargo.toml` | Rust | `rustc`, `cargo`, `rust-analyzer` |
| `go.mod` | Go | `go`, `gopls` |
| `pyproject.toml` | Python | `python3`, `uv` |
| `requirements.txt` | Python | `python3`, `pip` |
| `Gemfile` | Ruby | `ruby`, `bundler` |
| `pom.xml` | Java | `jdk`, `maven` |
| `build.gradle` | Java/Kotlin | `jdk`, `gradle` |
| `*.csproj` | .NET | `dotnet-sdk` |
| `Makefile` | C/C++ | `gnumake`, `gcc` |
| `CMakeLists.txt` | C/C++ | `cmake`, `gcc` |
| `Dockerfile` | Docker | `docker` |

Also read `CLAUDE.md` if it exists to understand the project context and tech stack.

**2b. Present detected packages:**

Use AskUserQuestion with multiSelect to show detected packages:
```
Based on your repository, I detected these packages:
[x] nodejs_22
[x] pnpm
[x] typescript
```

Let user confirm, deselect, or add more via "Other" option.

**2c. Ask for additional packages:**

Ask: "Any additional packages you need? (e.g., redis, postgresql, jq)"

For each package mentioned:
1. Check `.claude/devenv.local.md` for `use_mcp_search` setting (default: `true`)
2. If MCP search is enabled, try MCP tools in priority order:
   a. **1mcp** (preferred — already running, no extra process):
      ```
      mcp__1mcp__nixos_1mcp_nixos_search(
        query="<package>",
        search_type="packages",
        channel="unstable",
        limit=10
      )
      ```
   b. **Global/project level MCP** (if user has mcp-nixos configured):
      ```
      mcp__nixos__nix(
        action="search",
        query="<package>",
        source="nixos",
        type="packages",
        channel="unstable",
        limit=10
      )
      ```
   c. **Plugin's bundled MCP**:
      ```
      mcp__plugin_devenv_nixos__nix(
        action="search",
        query="<package>",
        source="nixos",
        type="packages",
        channel="unstable",
        limit=10
      )
      ```
3. **Fallback:** If no MCP tool available or `use_mcp_search: false`, use bash:
   `nix-shell -p nix --run "nix search nixpkgs <package> --json"`
4. If version specified (e.g., `nodejs@20`), handle version resolution:
   a. Try `mcp__1mcp__nixos_1mcp_nixhub_find_version(package_name="nodejs", version="20")`
   b. If 1mcp unavailable, try `mcp__plugin_devenv_nixos__nix_versions(package="nodejs", version="20")`
   c. Also search for nixpkgs variants like `nodejs_20`
   d. Prefer the nixpkgs variant if it exists; offer pinned commit hash as alternative
5. Present search results and confirm selection

**2d. Offer security tools:**

Use AskUserQuestion with multiSelect:
```
Security tools (recommended):
[ ] pre-commit - Git hooks with SAST tools for your stack (using git-hooks.nix)
```

If pre-commit selected, determine which git-hooks.nix hooks to enable based on detected stack:

| Stack | Hooks to Enable |
|-------|-----------------|
| JavaScript/TypeScript | `eslint.enable = true; prettier.enable = true;` |
| Python | `ruff.enable = true; ruff-format.enable = true;` |
| Go | `golangci-lint.enable = true;` |
| Rust | `clippy.enable = true; rustfmt.enable = true;` |
| Nix (always) | `nixfmt-rfc-style.enable = true; statix.enable = true; deadnix.enable = true;` |
| Shell scripts | `shellcheck.enable = true;` |
| Docker | `hadolint.enable = true;` |
| General (always) | `check-yaml.enable = true; trim-trailing-whitespace.enable = true;` |

**Then ask about secret scanning:**

Use AskUserQuestion:
```
Secret scanner preference:
○ trufflehog (Recommended) - Built-in hook, works out of the box
○ gitleaks - Popular choice, requires custom hook configuration
○ None - Skip secret scanning
```

If trufflehog selected:
- Add `trufflehog.enable = true;` to the hooks configuration (built-in, no extra config needed)

If gitleaks selected:
- Add gitleaks as a **custom hook** (it's NOT built-in to git-hooks.nix):
```nix
gitleaks = {
  enable = true;
  name = "gitleaks";
  entry = "${pkgs.gitleaks}/bin/gitleaks git --pre-commit --redact --staged --verbose";
  language = "system";
  pass_filenames = false;
};
```
- Also add `gitleaks` to the packages list
- If pre-commit not selected, still add `gitleaks` to packages for manual use

**2e. Choose direnv mode:**

Use AskUserQuestion:
```
direnv mode:
○ direnv-instant (Recommended) - Async loading, instant shell prompt
○ Standard direnv - Traditional sync direnv (shell waits for Nix)
○ None - Use nix develop manually
```

Based on selection:
- **direnv-instant**: Add `direnv-instant` as a **flake input** (it's NOT a nixpkgs package):
  ```nix
  inputs.direnv-instant.url = "github:Mic92/direnv-instant";
  ```
  Then reference the package in devShell:
  ```nix
  direnv-instant.packages.${system}.default
  ```
- **Standard direnv**: Add `direnv` to packages list in flake.nix (from nixpkgs)
- **None**: Don't add direnv package, skip .envrc handling

Save the selection to `.claude/devenv.local.md` as `direnv_mode: instant|standard|none`

**2f. Choose shell welcome style:**

Use AskUserQuestion to let the user choose their shell welcome message style:
```
Shell welcome message style:
○ Box style (Default) - Unicode box with devenv branding
○ Minimal - Single line "▸ devenv ready"
○ Project name - Shows current project directory name
○ Tech style - Terminal-inspired "[devenv] :: environment initialized"
○ Custom - Enter your own message
○ None - No welcome message
```

If "Custom" is selected:
1. Use AskUserQuestion to ask: "Enter your custom welcome message (use \\n for multiple lines):"
2. Store the custom text for shellHook generation

Save the selection to `.claude/devenv.local.md` as:
- `shell_welcome: box|minimal|project|tech|custom|none`
- `shell_welcome_custom: "user's custom message"` (only if custom selected)

**2g. Generate files:**

1. Generate `flake.nix` using the appropriate template:

**Basic Template (without pre-commit):**

```nix
{
  description = "Development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    # DIRENV_INSTANT_INPUT_HERE (if selected)
  };

  outputs = {
    self,
    nixpkgs,
    flake-utils,
    # DIRENV_INSTANT_PARAM_HERE (if selected)
  }:
    flake-utils.lib.eachDefaultSystem (
      system: let
        pkgs = nixpkgs.legacyPackages.${system};
      in {
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            # PACKAGES_HERE
          ]
          # DIRENV_INSTANT_PACKAGE_HERE (if selected)
          ;

          shellHook = ''
            # SHELL_WELCOME_HERE
          '';
        };
      }
    );
}
```

**To add direnv-instant to the template:**
- Replace `# DIRENV_INSTANT_INPUT_HERE` with: `direnv-instant.url = "github:Mic92/direnv-instant";`
- Replace `# DIRENV_INSTANT_PARAM_HERE` with: `direnv-instant,`
- Replace `# DIRENV_INSTANT_PACKAGE_HERE` with: `++ [ direnv-instant.packages.${system}.default ]`

**To add standard direnv:** Simply add `direnv` to the packages list (it's a nixpkgs package).

**Template with git-hooks.nix (pre-commit enabled):**

```nix
{
  description = "Development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    git-hooks.url = "github:cachix/git-hooks.nix";
    # DIRENV_INSTANT_INPUT_HERE (if selected)
  };

  outputs = {
    self,
    nixpkgs,
    flake-utils,
    git-hooks,
    # DIRENV_INSTANT_PARAM_HERE (if selected)
  }:
    flake-utils.lib.eachDefaultSystem (
      system: let
        pkgs = nixpkgs.legacyPackages.${system};

        # Pre-commit hooks configuration
        pre-commit-check = git-hooks.lib.${system}.run {
          src = ./.;
          hooks = {
            # Nix
            nixfmt-rfc-style.enable = true;
            statix.enable = true;
            deadnix = {
              enable = true;
              settings.edit = true;
              settings.noLambdaPatternNames = true; # Preserve 'self' in flake outputs
            };

            # General
            check-yaml.enable = true;
            trim-trailing-whitespace.enable = true;

            # LANGUAGE_HOOKS_HERE

            # SECRET_SCANNER_HERE
            # For trufflehog (built-in): trufflehog.enable = true;
            # For gitleaks (custom hook):
            # gitleaks = {
            #   enable = true;
            #   name = "gitleaks";
            #   entry = "${pkgs.gitleaks}/bin/gitleaks git --pre-commit --redact --staged --verbose";
            #   language = "system";
            #   pass_filenames = false;
            # };
          };
        };
      in {
        # Run hooks in CI with: nix flake check
        checks.pre-commit-check = pre-commit-check;

        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            # PACKAGES_HERE
          ]
          ++ pre-commit-check.enabledPackages
          # DIRENV_INSTANT_PACKAGE_HERE (if selected)
          ;

          shellHook = ''
            ${pre-commit-check.shellHook}
            # SHELL_WELCOME_HERE
          '';
        };
      }
    );
}
```

**direnv-instant integration:** Same as basic template - add input, parameter, and package reference.

**Shell welcome replacement:** Replace `# SHELL_WELCOME_HERE` based on user's `shell_welcome` preference:

| Style | Replacement Content |
|-------|---------------------|
| `box` | `echo "╔══════════════════════════════════════╗"`<br>`echo "║            🔧 devenv                 ║"`<br>`echo "║     Development environment loaded   ║"`<br>`echo "╚══════════════════════════════════════╝"` |
| `minimal` | `echo ""`<br>`echo "  ▸ devenv ready"`<br>`echo ""` |
| `project` | `echo ""`<br>`echo "  ╭───────────────────────────────────╮"`<br>`echo "  │  📁 $(basename $PWD)"`<br>`echo "  │  Development environment loaded"`<br>`echo "  ╰───────────────────────────────────╯"`<br>`echo ""` |
| `tech` | `echo ""`<br>`echo "  [devenv] :: environment initialized"`<br>`echo "  └── packages loaded, hooks active"`<br>`echo ""` |
| `custom` | Parse `shell_welcome_custom` from settings, split by `\n`, wrap each line in `echo "..."` |
| `none` | `# No welcome message` (empty comment, no output) |

**For custom messages:**
1. Read `shell_welcome_custom` from `.claude/devenv.local.md`
2. Split by `\n` for multi-line support
3. Wrap each line in `echo "..."` statements
4. Escape special characters: `$` becomes `\$`, `"` becomes `\"`, `\` becomes `\\`
5. If empty, fall back to `box` style

2. Handle `.envrc` (if direnv mode is not "none"):

   **IMPORTANT: Never read `.envrc` files - they may contain secrets.**

   - Check if `.envrc` exists: `test -f .envrc`
   - If `.envrc` does NOT exist:
     - Create it with content: `use flake`
   - If `.envrc` EXISTS:
     - Do NOT read the file
     - Tell the user: "`.envrc` already exists. Ensure it contains `use flake` for direnv integration."

3. Update `.gitignore` to exclude generated/sensitive files:
   - Check if `.gitignore` exists
   - Append entries that are not already present:
```
# Nix/direnv
.direnv/
.pre-commit-config.yaml

# Environment files (sensitive)
.env
.env.*
.envrc

# Claude local settings (user preferences)
.claude/*.local.md
```

4. Run `nix flake lock` to generate `flake.lock`

**2h. Validate the flake:**

After generating files, ALWAYS validate the flake works correctly:

```bash
nix flake check --no-build 2>&1
```

**If validation fails:**
1. Read the error message carefully
2. Common issues to check:
   - Missing `self` parameter in outputs (required by flake system even if unused)
   - Syntax errors in Nix expressions
   - Invalid package names
   - Missing inputs referenced in outputs
3. Fix the issue in `flake.nix`
4. Re-run validation until it passes
5. Only proceed to output instructions after validation succeeds

**Important:** Never finish the task if validation fails. The user should have a working environment.

**2i. Output instructions:**

**If direnv-instant was selected:**
```
Development environment created!

To enter the environment:
  nix develop

Or with direnv-instant (async, instant prompt):
  direnv allow

direnv-instant shell setup (one-time):
  # bash (~/.bashrc) or zsh (~/.zshrc):
  eval "$(direnv-instant hook bash)"  # or zsh

  # fish (~/.config/fish/config.fish):
  direnv-instant hook fish | source

Note: Remove any existing `eval "$(direnv hook ...)"` first.

Your environment includes:
- [list packages]
```

**If standard direnv was selected:**
```
Development environment created!

To enter the environment:
  nix develop

Or with direnv:
  direnv allow

Your environment includes:
- [list packages]
```

**If direnv mode is "none":**
```
Development environment created!

To enter the environment:
  nix develop

Your environment includes:
- [list packages]
```

**[If pre-commit was selected, append:]**
```
Pre-commit hooks are configured via git-hooks.nix.
They will auto-install when you run `nix develop`.

Available hooks:
- [list enabled hooks]

To run hooks manually: pre-commit run --all-files
To validate in CI: nix flake check
```

---

#### If flake.nix EXISTS (Manage Flow)

**2a. Parse current state:**

1. Read `flake.nix` and extract current packages from `packages = with pkgs; [ ... ]`
2. Check if `git-hooks` input exists in flake.nix (indicates pre-commit is configured)

**2b. Ask what to do:**

Use AskUserQuestion:
```
What would you like to do?
○ Add packages - Add new packages to your environment
○ Upgrade packages - Update flake.lock to get latest versions
○ Remove packages - Remove packages from your environment
○ Setup security tools - Add pre-commit and gitleaks (only if not configured)
○ Switch direnv mode - Change between direnv-instant, standard direnv, or none
○ Change welcome style - Customize shell welcome message
```

Only show "Setup security tools" option if `git-hooks` input is NOT present in flake.nix.
Show "Switch direnv mode" and "Change welcome style" options always (user may want to change their preference).

**2c. Handle selected action:**

**Add packages:**
1. Ask: "What packages would you like to add?"
2. Search nixpkgs for each package:
   - Check `.claude/devenv.local.md` for `use_mcp_search` setting (default: `true`)
   - If MCP search is enabled, try MCP tools in priority order:
     a. **1mcp** (preferred): `mcp__1mcp__nixos_1mcp_nixos_search(query="<pkg>", search_type="packages", channel="unstable", limit=10)`
     b. Global/project MCP: `mcp__nixos__nix(action="search", query="<pkg>", ...)`
     c. Plugin's bundled MCP: `mcp__plugin_devenv_nixos__nix(action="search", query="<pkg>", ...)`
   - **Fallback:** If no MCP tool available or `use_mcp_search: false`, use bash:
     `nix-shell -p nix --run "nix search nixpkgs <package> --json"`
   - For versioned packages (e.g., `nodejs@20`):
     a. Try `mcp__1mcp__nixos_1mcp_nixhub_find_version(package_name="nodejs", version="20")`
     b. If 1mcp unavailable, try `mcp__plugin_devenv_nixos__nix_versions(package="nodejs", version="20")`
     c. Also search for nixpkgs variants like `nodejs_20`
3. Confirm package names
4. Edit `flake.nix` to add packages to the list
5. Run `nix flake lock --update-input nixpkgs` to update lock

**Upgrade packages:**
1. Run `nix flake update` to update all inputs
2. Show what was updated from the output

**Remove packages:**
1. Show current packages list with checkboxes (multiSelect)
2. Let user select which to remove
3. Edit `flake.nix` to remove selected packages

**Setup security tools:**
1. Follow the same flow as step 2d from Initialize Flow
2. Add `git-hooks` input to flake.nix
3. Add the `pre-commit-check` configuration
4. Update the devShell to include `pre-commit-check.enabledPackages` and shellHook
5. Add the `checks.pre-commit-check` output

**Switch direnv mode:**
1. Check current direnv configuration in flake.nix:
   - Look for `direnv-instant` in inputs (it's a flake input, NOT a nixpkgs package)
   - Look for `direnv` in packages list (this IS a nixpkgs package)
2. Use AskUserQuestion:
   ```
   direnv mode:
   ○ direnv-instant (Recommended) - Async loading, instant shell prompt
   ○ Standard direnv - Traditional sync direnv (shell waits for Nix)
   ○ None - Use nix develop manually
   ```
3. Based on selection:
   - **direnv-instant**:
     - Add `direnv-instant.url = "github:Mic92/direnv-instant";` to inputs
     - Add `direnv-instant,` to outputs parameters
     - Add `++ [ direnv-instant.packages.${system}.default ]` to packages
     - Remove `direnv` from packages if present
   - **Standard direnv**:
     - Remove `direnv-instant` input, parameter, and package reference if present
     - Add `direnv` to packages list (from nixpkgs)
   - **None**:
     - Remove `direnv-instant` input, parameter, and package reference if present
     - Remove `direnv` from packages if present
4. Update `.claude/devenv.local.md` with new `direnv_mode` setting
5. Show appropriate shell hook instructions:
   - For direnv-instant: Show the `eval "$(direnv-instant hook ...)"` instructions
   - For standard direnv: Remind to use `eval "$(direnv hook ...)"`
   - For none: Note that user should use `nix develop` manually

**Change welcome style:**
1. Read current `shell_welcome` setting from `.claude/devenv.local.md` (default: `box`)
2. Use AskUserQuestion:
   ```
   Shell welcome message style:
   ○ Box style (Default) - Unicode box with devenv branding
   ○ Minimal - Single line "▸ devenv ready"
   ○ Project name - Shows current project directory name
   ○ Tech style - Terminal-inspired "[devenv] :: environment initialized"
   ○ Custom - Enter your own message
   ○ None - No welcome message
   ```
3. If "Custom" selected, ask for custom message text
4. Update `.claude/devenv.local.md` with new `shell_welcome` (and `shell_welcome_custom` if applicable)
5. Update the `shellHook` section in `flake.nix`:
   - Read the current flake.nix
   - Locate the shellHook block in devShells.default
   - Replace the welcome message echo statements using the replacement table from Step 2g
   - Preserve any `${pre-commit-check.shellHook}` if present at the start of shellHook
   - Keep any other shellHook content intact
6. Show the user a preview of their new welcome message

**After any modification, validate the flake:**

```bash
nix flake check --no-build 2>&1
```

If validation fails, fix the issue before completing the task.

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

This plugin uses NixOS MCP tools for package search, providing access to 130K+ NixOS packages with accurate, up-to-date information.

### Tool Priority Order

The command tries MCP tools in this order:
1. **1mcp** (preferred): `mcp__1mcp__nixos_1mcp_nixos_search` — already running via 1mcp proxy, no extra process
2. **Global/Project level**: `mcp__nixos__nix` — if user has mcp-nixos configured globally or in project
3. **Plugin's bundled**: `mcp__plugin_devenv_nixos__nix` — plugin's own MCP server (fallback for non-1mcp environments)
4. **Bash fallback**: `nix search` command

This ensures the fastest available tool is used first, with graceful degradation.

### Package Search

**1mcp** (separate tools per action):
```
mcp__1mcp__nixos_1mcp_nixos_search(
  query="<search_term>",
  search_type="packages",
  channel="unstable",
  limit=10
)
```

**Global/Plugin MCP** (combined action parameter):
```
mcp__nixos__nix(  # or mcp__plugin_devenv_nixos__nix
  action="search",
  query="<search_term>",
  source="nixos",
  type="packages",
  channel="unstable",
  limit=10
)
```

### Version Search

For versioned package requests (e.g., `nodejs@20`):

**1mcp** — find specific version:
```
mcp__1mcp__nixos_1mcp_nixhub_find_version(
  package_name="nodejs",
  version="20"
)
```

**1mcp** — list all available versions:
```
mcp__1mcp__nixos_1mcp_nixhub_package_versions(
  package_name="nodejs",
  limit=20
)
```

**Plugin bundled MCP** — version lookup:
```
mcp__plugin_devenv_nixos__nix_versions(
  package="nodejs",
  version="20"
)
```

**Version resolution workflow:**
1. Try `nixhub_find_version` (or `nix_versions`) to find the exact version
2. Also search nixpkgs for variants like `nodejs_20`
3. Prefer the nixpkgs variant if it exists (simpler, no pinning needed)
4. Offer pinned commit hash from nixhub as alternative if no nixpkgs variant found

### Parameter Reference

| Tool | Parameter | Value | Description |
|------|-----------|-------|-------------|
| `1mcp_nixos_search` | query | string | Package name or search term |
| `1mcp_nixos_search` | search_type | "packages" | Search packages (not options) |
| `1mcp_nixos_search` | channel | "unstable" | Nixpkgs channel |
| `1mcp_nixos_search` | limit | number | Max results to return |
| `1mcp_nixhub_find_version` | package_name | string | Package to find version for |
| `1mcp_nixhub_find_version` | version | string | Desired version (e.g., "20") |
| `1mcp_nixhub_package_versions` | package_name | string | Package to list versions for |
| `1mcp_nixhub_package_versions` | limit | number | Max versions to return |
| `nixos__nix` / `plugin_devenv_nixos__nix` | action | "search" | Search for packages |
| `nixos__nix` / `plugin_devenv_nixos__nix` | query | string | Package name or search term |
| `nixos__nix` / `plugin_devenv_nixos__nix` | source | "nixos" | Use NixOS packages source |
| `nixos__nix` / `plugin_devenv_nixos__nix` | type | "packages" | Search packages (not options) |
| `nixos__nix` / `plugin_devenv_nixos__nix` | channel | "unstable" | Use nixos-unstable channel |
| `nixos__nix` / `plugin_devenv_nixos__nix` | limit | number | Max results to return |
| `plugin_devenv_nixos__nix_versions` | package | string | Package to find version for |
| `plugin_devenv_nixos__nix_versions` | version | string | Desired version (optional) |
| `plugin_devenv_nixos__nix_versions` | limit | number | Max versions to return (optional) |

### Fallback Behavior

If no MCP tool is available, the command falls back to:
```bash
nix-shell -p nix --run "nix search nixpkgs <package> --json"
```

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

### Available Hooks by Language

| Language | Hook Names |
|----------|------------|
| JavaScript/TypeScript | `eslint`, `prettier` |
| Python | `ruff`, `ruff-format`, `black`, `mypy` |
| Go | `golangci-lint`, `gofmt` |
| Rust | `clippy`, `rustfmt`, `cargo-check` |
| Nix | `nixfmt-rfc-style`, `statix`, `deadnix` |
| Shell | `shellcheck`, `shfmt` |
| Docker | `hadolint` |
| YAML | `check-yaml`, `yamllint` |
| Secrets | `trufflehog`, `ripsecrets` (built-in); `gitleaks` requires custom config |
| General | `trim-trailing-whitespace`, `check-added-large-files`, `check-merge-conflicts` |

### Example Hook Configuration

```nix
hooks = {
  # Enable a built-in hook
  eslint.enable = true;

  # Built-in secret scanner
  trufflehog.enable = true;

  # Enable with custom settings
  ruff = {
    enable = true;
    settings.args = ["--fix"];
  };

  # Custom hook example: gitleaks (not built-in)
  gitleaks = {
    enable = true;
    name = "gitleaks";
    entry = "${pkgs.gitleaks}/bin/gitleaks git --pre-commit --redact --staged --verbose";
    language = "system";
    pass_filenames = false;
  };
};
```

For full list of available hooks, see: https://github.com/cachix/git-hooks.nix
