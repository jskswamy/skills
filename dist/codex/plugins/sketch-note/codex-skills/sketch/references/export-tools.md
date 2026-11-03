# PNG Export Tool Detection and Selection

## 6a. Detect Available Tools and Runners (command details)

**First, detect available tool runners:**
```bash
# Check for nix (isolated environments)
command -v nix-shell >/dev/null 2>&1 && echo "has_nix"
```

Store:
- `has_nix`: true/false

**Then, check for globally installed tools:**
```bash
# Direct PNG generation (no Excalidraw intermediate)
command -v mmdc >/dev/null 2>&1 && echo "mermaid-cli"

# Excalidraw to PNG converters
command -v excalidraw-brute-export-cli >/dev/null 2>&1 && echo "brute-export"
command -v excalidraw-cli >/dev/null 2>&1 && echo "excalidraw-cli"
```

Store results:
- `has_mermaid`: true/false (for direct PNG)
- `has_brute_export`: true/false
- `has_excalidraw_cli`: true/false

**Tool availability logic:**
A tool is "available" if ANY of these are true:
1. Globally installed (`command -v {tool}` succeeds)
2. Nix is available and the tool is in nixpkgs (can run via `nix-shell -p`)

If `has_nix` is true, mermaid-cli is considered available (will run on-demand). The Excalidraw converters are not in nixpkgs, so they are available only when globally installed.

## 6c-direct and 6c-convert: PNG generation method selection

##### 6c-direct: Direct PNG Generation (no Excalidraw)

This workflow generates PNG directly without creating an intermediate Excalidraw file.

**Determine how to run mermaid-cli:**

1. **If globally installed:** Use `mmdc` directly
2. **If nix available:** Use `nix-shell -p mermaid-cli --run "mmdc ..."`
3. **None available:** Prompt user

**If mermaid-cli is available (globally or via nix):**
```
Using Mermaid CLI for direct PNG generation with hand-drawn style.
{via nix-shell | globally installed}
```
- Set `generation_method: mermaid`
- Set `mermaid_runner`: `global` | `nix`
- Skip Excalidraw generation entirely (go to Step 7-direct)

**If NO runner is available (no nix, not installed):**
Use AskUserQuestion:
```
Direct PNG requires Mermaid CLI and no runner is available. How would you like to proceed?
○ Install mermaid-cli - Install Nix (runs it via nix-shell) or install mmdc by other means
○ Use Excalidraw conversion - Create Excalidraw first, then convert to PNG
○ Excalidraw only - Create editable file, export PNG manually later
○ Cancel - Stop and install tools first
```

**If user chooses to install mermaid-cli:**
Ask the user to install Nix (https://nixos.org/download) or put `mmdc` on their PATH by other means, then wait for them to confirm.

After installation, verify:
```bash
command -v nix-shell >/dev/null 2>&1 && echo "has_nix"
command -v mmdc >/dev/null 2>&1 && echo "installed"
```

##### 6c-convert: Excalidraw to PNG Conversion

**Determine how to run each tool:**

| Tool | Nix Package |
|------|-------------|
| excalidraw-brute-export-cli | N/A (not in nixpkgs) |
| excalidraw-cli | N/A (not in nixpkgs) |

**Runner:** Global install only. Set `excalidraw_runner: global`.

**Case 1: Multiple tools globally installed**
Use AskUserQuestion:
```
Which export tool would you like to use?
○ excalidraw-brute-export-cli (Recommended) - Highest fidelity, uses headless Firefox
○ excalidraw-cli - Faster export, uses node-canvas (may differ slightly)
```

**Case 2: Only one tool globally installed**
Auto-select the available tool:
```
Using {tool-name} for PNG export.
```

**Case 3: No tools globally installed**
Use AskUserQuestion:
```
PNG conversion requires a CLI tool. None detected. How would you like to proceed?
○ Install excalidraw-brute-export-cli (Recommended) - Highest fidelity
○ Install excalidraw-cli - Faster, no browser dependency
○ Try direct PNG - Use Mermaid for direct generation instead
○ Skip PNG - Create Excalidraw file only, export manually later
○ Cancel - Stop and install tools first
```

**If user chooses to install:**
Ask the user to put the chosen CLI (`excalidraw-brute-export-cli`, which also needs Firefox for its headless export, or `excalidraw-cli`) on their PATH by other means, then wait for them to confirm.

After installation, verify:
```bash
command -v {tool} >/dev/null 2>&1 && echo "installed"
```

If installation succeeds, continue with export.
If installation fails, show error and offer to continue with Excalidraw only.

**If user chooses "Skip PNG":**
- Set format to `excalidraw`
- Continue to Step 7
- Show note: "You can manually export to PNG at excalidraw.com"

**If user chooses "Cancel":**
- Exit with message: "Run the command again after installing an export tool."
