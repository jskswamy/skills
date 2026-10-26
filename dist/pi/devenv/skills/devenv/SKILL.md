---
name: devenv
description: "Use when setting up or changing a Nix flake development environment: 'set up devenv', 'init a nix flake', 'create a dev shell', 'add package X to the flake', 'upgrade flake inputs', 'remove package from devenv', 'add pre-commit/security hooks'. Auto-detects project stack and manages flake.nix."
argument-hint: "[add|upgrade|remove|security]"
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

**2a. Auto-detect project stack:**

Scan for language indicator files and suggest packages:

Use the indicator-file table in `references/stack-detection.md` (package.json, lockfiles, Cargo.toml, go.mod, pyproject.toml, requirements.txt, Gemfile, pom.xml, build.gradle, *.csproj, Makefile, CMakeLists.txt, Dockerfile) to map files to stacks and suggested packages.

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
For each package mentioned, search per `references/mcp-package-search.md` (section 2c): check `.claude/devenv.local.md` for `use_mcp_search` (default `true`); if enabled, try 1mcp first, then global/project mcp-nixos, then the plugin's bundled MCP; otherwise (or if none is available) fall back to `nix-shell -p nix --run "nix search nixpkgs <package> --json"`. For a versioned request such as `nodejs@20`, resolve the version as described there (prefer the nixpkgs variant, e.g. `nodejs_20`; offer a pinned commit hash as the alternative).
5. Present search results and confirm selection

**2d. Offer security tools:**

Use AskUserQuestion with multiSelect:
```
Security tools (recommended):
[ ] pre-commit - Git hooks with SAST tools for your stack (using git-hooks.nix)
```

If pre-commit selected, determine which git-hooks.nix hooks to enable based on the detected stack using the table in `references/git-hooks.md` (JavaScript/TypeScript, Python, Go, Rust, Nix always, Shell, Docker, General always).

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

Use the basic template from `references/flake-templates.md` (section "Basic Template") when pre-commit is not selected. It also lists how to add direnv-instant (replace the three `DIRENV_INSTANT_*` placeholders) or standard direnv (add `direnv` to packages).

Use the git-hooks.nix template from `references/flake-templates.md` (section "Template with git-hooks.nix") when pre-commit is selected; fill `LANGUAGE_HOOKS_HERE` and `SECRET_SCANNER_HERE` from the choices in 2d. direnv-instant integration is the same as for the basic template.

Replace `# SHELL_WELCOME_HERE` according to the user's `shell_welcome` preference using `references/shell-welcome.md` (styles box, minimal, project, tech, custom, none; custom messages are split on `\n`, wrapped in `echo "..."`, escaped, and fall back to `box` if empty).

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

Print the completion message from `references/output-instructions.md` matching the chosen direnv mode (direnv-instant with its one-time shell setup, standard direnv, or none), and append the pre-commit block if pre-commit was selected.

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
   - Search nixpkgs for each package using the same procedure as 2c in `references/mcp-package-search.md` (check `use_mcp_search`; MCP priority 1mcp, global/project, plugin bundled; bash fallback; version resolution for `pkg@version`).
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
