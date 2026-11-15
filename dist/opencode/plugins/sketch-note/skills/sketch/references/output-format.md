# Step 6: Determine Output Format and Export Method

This step handles the interactive workflow for choosing output format and PNG generation method.

#### 6a. Detect Available Tools and Runners

Read `references/export-tools.md` (section 6a) for the detection commands. Detect `has_nix`, `has_mermaid`, `has_brute_export`, `has_excalidraw_cli`; a tool is "available" if globally installed, or (mermaid-cli only) nix is available.

#### 6b. Determine Output Format

**If `--format` argument provided:** Use specified format, skip to 6c

**If no format specified:** Use AskUserQuestion:
```
What output format would you like?
○ Excalidraw only (Recommended) - Editable .excalidraw file
○ PNG + Excalidraw - Both formats for sharing and editing
○ Direct PNG - Generate PNG directly (no Excalidraw file)
```

#### 6c. Handle PNG Generation Method (if PNG requested)

**If format is `excalidraw` only:** Skip to Step 7

**If format is `direct-png`:** Go to 6c-direct

**If format is `png` or `both`:** Go to 6c-convert

Read `references/export-tools.md` (sections 6c-direct and 6c-convert) for runner selection (global, nix), the AskUserQuestion prompts when no runner or tool is available, install commands, and the Skip/Cancel handling. It sets `generation_method` (`mermaid` | `excalidraw-convert`), `mermaid_runner` (`global` | `nix`), `excalidraw_runner` (`global`), and `selected_tool`.

#### 6d. Determine PNG Scale (if PNG requested)

**If `--scale` argument provided:** Use specified scale
**Otherwise:** Use `png_scale` from settings (default: 2)

Store: `generation_method` (mermaid | excalidraw-convert), `selected_tool`, `png_scale`, `final_format`
