# If flake.nix EXISTS (Manage Flow)

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
