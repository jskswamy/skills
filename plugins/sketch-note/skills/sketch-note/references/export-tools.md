# PNG Export Tool Detection and Selection

## 6a. Detect Available Tools and Runners (command details)

**First, detect available tool runners:**
```bash
# Check for nix (preferred - isolated environments)
command -v nix-shell >/dev/null 2>&1 && echo "has_nix"

# Check for npx (fallback - runs without global install)
command -v npx >/dev/null 2>&1 && echo "has_npx"
```

Store:
- `has_nix`: true/false
- `has_npx`: true/false

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
2. Nix is available (can run via `nix-shell -p`)
3. npx is available (can run via `npx`)

If `has_nix` or `has_npx` is true, all tools are considered available (will run on-demand).

## 6c-direct and 6c-convert: PNG generation method selection

##### 6c-direct: Direct PNG Generation (no Excalidraw)

This workflow generates PNG directly without creating an intermediate Excalidraw file.

**Determine how to run mermaid-cli:**

1. **If globally installed:** Use `mmdc` directly
2. **If nix available:** Use `nix-shell -p mermaid-cli --run "mmdc ..."`
3. **If npx available:** Use `npx -y @mermaid-js/mermaid-cli@12.0.0 ...`
4. **None available:** Prompt user

**If mermaid-cli is available (globally, via nix, or via npx):**
```
Using Mermaid CLI for direct PNG generation with hand-drawn style.
{via nix-shell | via npx | globally installed}
```
- Set `generation_method: mermaid`
- Set `mermaid_runner`: `global` | `nix` | `npx`
- Skip Excalidraw generation entirely (go to Step 7-direct)

**If NO runner is available (no nix, no npx, not installed):**
Use AskUserQuestion:
```
Direct PNG requires Mermaid CLI and no runner is available. How would you like to proceed?
○ Install mermaid-cli globally - npm install -g @mermaid-js/mermaid-cli
○ Use Excalidraw conversion - Create Excalidraw first, then convert to PNG
○ Excalidraw only - Create editable file, export PNG manually later
○ Cancel - Stop and install tools first
```

**If user chooses to install mermaid-cli:**
```bash
npm install -g @mermaid-js/mermaid-cli
```

After installation, verify:
```bash
command -v mmdc >/dev/null 2>&1 && echo "installed"
```

##### 6c-convert: Excalidraw to PNG Conversion

**Determine how to run each tool:**

| Tool | Nix Package | NPM Package |
|------|-------------|-------------|
| excalidraw-brute-export-cli | N/A (use npx) | excalidraw-brute-export-cli |
| excalidraw-cli | N/A (use npx) | @tommywalkie/excalidraw-cli |

**Runner priority:**
1. Global install (if available)
2. nix-shell (if nix available) - Note: These packages may not be in nixpkgs, fall back to npx
3. npx (if available)

**If nix or npx is available:**
All tools are considered available. Determine which runner to use:
- Set `excalidraw_runner`: `global` | `npx`

**Case 1: Multiple tools available (or runners available)**
Use AskUserQuestion:
```
Which export tool would you like to use?
○ excalidraw-brute-export-cli (Recommended) - Highest fidelity, uses headless Firefox
○ excalidraw-cli - Faster export, uses node-canvas (may differ slightly)
```

**Case 2: Only one tool globally installed (and no npx)**
Auto-select the available tool:
```
Using {tool-name} for PNG export.
```

**Case 3: No tools available AND no npx**
Use AskUserQuestion:
```
PNG conversion requires a CLI tool. None detected and npx unavailable. How would you like to proceed?
○ Install excalidraw-brute-export-cli (Recommended) - Highest fidelity
○ Install excalidraw-cli - Faster, no browser dependency
○ Try direct PNG - Use Mermaid for direct generation instead
○ Skip PNG - Create Excalidraw file only, export manually later
○ Cancel - Stop and install tools first
```

**If user chooses to install:**

For `excalidraw-brute-export-cli`:
```bash
npm install -g excalidraw-brute-export-cli && npx playwright install firefox
```

For `excalidraw-cli`:
```bash
npm install -g @tommywalkie/excalidraw-cli
```

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
