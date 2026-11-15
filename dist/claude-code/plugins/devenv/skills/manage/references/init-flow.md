# If flake.nix does NOT exist (Initialize Flow)

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
