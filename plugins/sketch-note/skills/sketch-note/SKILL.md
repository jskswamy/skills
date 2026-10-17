---
name: sketch-note
description: "Use when the user wants a visual diagram or sketch note: 'sketch this', 'draw the architecture', 'visualize this conversation', 'make an Excalidraw diagram', 'sketch note of the code', 'export a diagram as PNG'. Generates Excalidraw files (optionally PNG) from conversation, code, or custom content."
---

# Sketch Note Skill

Generate visual sketch notes as Excalidraw files with customizable styling.

## Argument Parsing

Parse the command arguments to extract:

| Argument | Short | Type | Default | Description |
|----------|-------|------|---------|-------------|
| `--mode` | `-m` | string | (prompt) | Content mode: `conversation`, `code`, or `custom` |
| `--format` | `-f` | string | (from settings) | Output: `excalidraw`, `png`, `both`, or `direct-png` |
| `--output` | `-o` | string | auto | Output filename (without extension) |
| `--scale` | | number | 2 | PNG scale factor (1, 2, or 4) |
| `[description...]` | | string | | Free-form description for custom mode |

**Format options:**
- `excalidraw` - Editable .excalidraw file only
- `png` - PNG via Excalidraw conversion (keeps .excalidraw as intermediate)
- `both` - Both Excalidraw and PNG files
- `direct-png` - Generate PNG directly using Mermaid (no Excalidraw file)

**Examples:**
```
/sketch                              # Interactive mode selection
/sketch --mode conversation          # Sketch current conversation
/sketch -m code                      # Visualize code architecture
/sketch --mode custom API flow       # Custom sketch with description
/sketch -o my-diagram -m code        # Named output file
/sketch --format png                 # PNG via Excalidraw conversion
/sketch -f both                      # Export both Excalidraw and PNG
/sketch --format direct-png          # Direct PNG generation (no Excalidraw)
/sketch --format png --scale 4       # High-resolution PNG (4x)
```

---

## Execution Flow

### Step 1: Load User Preferences

**Read workbench path from `.claude/jot.local.md`:**

```yaml
---
workbench_path: ~/workbench
---
```

Default: `~/workbench` if not configured or file doesn't exist.

**Read sketch settings from `.claude/sketch-note.local.md`** if it exists:

```yaml
---
background_color: white
roughness: hand-drawn
stroke_width: medium
background_pattern: none
visual_effects: []
resolution: standard
output_format: excalidraw
png_scale: 2
---
```

**If settings file doesn't exist (first-time setup):**

Read `references/first-time-preferences.md` and follow it exactly: it holds the six AskUserQuestion prompts (background color, roughness, stroke width, background pattern, visual effects, resolution) and the save-and-confirm instructions that create `.claude/sketch-note.local.md`.

### Step 2: Determine Content Mode

**If `--mode` argument provided:** Use specified mode

**If no mode specified:** Use AskUserQuestion:
```
What would you like to sketch?
○ Conversation - Summarize our current conversation as visual notes
○ Code Architecture - Visualize code structure from this project
○ Custom - Create a sketch from your own description
```

### Step 3: Gather Content Based on Mode

#### Mode: Conversation

1. **Analyze the conversation history** to extract:
   - Main topics discussed
   - Key decisions made
   - Important concepts explained
   - Action items or next steps
   - Relationships between ideas

2. **Create a visual hierarchy:**
   - Central theme/topic
   - Major branches for subtopics
   - Connections between related concepts
   - Callouts for important points

3. **Structure for Excalidraw:**
   - Title box at top
   - Main concept boxes arranged spatially
   - Arrows showing relationships
   - Text annotations for context

#### Mode: Code Architecture

1. **Discover project structure:**
   - Use Glob to find source files: `**/*.{ts,tsx,js,jsx,py,go,rs,java}`
   - Read key files to understand architecture
   - Identify main modules/packages

2. **Extract architecture elements:**
   - Entry points (main files, index files)
   - Core modules and their responsibilities
   - Dependencies between modules
   - External integrations (APIs, databases)

3. **Create architecture diagram:**
   - Boxes for modules/services
   - Arrows for dependencies/data flow
   - Groups for related components
   - Labels for key interfaces

4. **Ask for scope if large codebase:**
   ```
   This is a large codebase. Which area should I focus on?
   ○ Full overview - High-level architecture only
   ○ Specific directory - Choose a directory to visualize
   ○ Entry point flow - Trace from main entry point
   ```

#### Mode: Custom

1. **Use the description from arguments** or prompt:
   ```
   Describe what you'd like to sketch:
   > [user input]
   ```

2. **Parse the description** to identify:
   - Main entities/concepts
   - Relationships between them
   - Flow direction (if applicable)
   - Groupings or categories

3. **Generate appropriate diagram type:**
   - Flowchart for processes
   - Mind map for concepts
   - Architecture diagram for systems
   - Sequence for interactions

### Step 4: Load Style Configuration

Read style definitions from `<package-root>/templates/sketch-note/styles/` based on preferences. Resolve the package root as the nearest ancestor containing `registry.json` or `package.json`:

**Map preferences to Excalidraw properties:**

| Preference | Excalidraw Property |
|------------|---------------------|
| `background_color: white` | `appState.viewBackgroundColor: "#ffffff"` |
| `background_color: cream` | `appState.viewBackgroundColor: "#faf8f5"` |
| `background_color: light-gray` | `appState.viewBackgroundColor: "#f5f5f5"` |
| `background_color: light-blue` | `appState.viewBackgroundColor: "#f0f8ff"` |
| `background_color: light-yellow` | `appState.viewBackgroundColor: "#fffef0"` |
| `roughness: hand-drawn` | `roughness: 2` |
| `roughness: sketchy` | `roughness: 1` |
| `roughness: clean` | `roughness: 0` |
| `stroke_width: thin` | `strokeWidth: 1` |
| `stroke_width: medium` | `strokeWidth: 2` |
| `stroke_width: bold` | `strokeWidth: 4` |

**Visual effects mapping:**
- `shadow`: Add `shadow` element property
- `glow`: Lighter stroke color with blur effect simulation
- `cursive`: Use `fontFamily: 3` (Virgil handwriting font)

**Resolution mapping:**
- `standard`: Default canvas size
- `high`: 2x element scaling
- `4k`: 4x element scaling

### Step 5: Generate Excalidraw JSON

Create valid Excalidraw JSON structure:

```json
{
  "type": "excalidraw",
  "version": 2,
  "source": "sketch-note-plugin",
  "elements": [
    // Generated elements based on content
  ],
  "appState": {
    "viewBackgroundColor": "#ffffff",
    "gridSize": null
  },
  "files": {}
}
```

**Element generation rules:**

Read `references/excalidraw-elements.md` for the JSON templates of text, rectangle, and arrow elements (including arrow `startBinding`/`endBinding`) before generating elements.

**Layout algorithm:**

1. **Calculate positions** to avoid overlaps
2. **Group related elements** spatially
3. **Use consistent spacing** (40px between elements)
4. **Center the diagram** in canvas
5. **Flow direction:** Top-to-bottom for hierarchies, left-to-right for flows

**Color palette for elements:**
- Primary boxes: `#a5d8ff` (light blue)
- Secondary boxes: `#b2f2bb` (light green)
- Accent boxes: `#ffec99` (light yellow)
- Warning boxes: `#ffc9c9` (light red)
- Neutral boxes: `#e9ecef` (light gray)

### Step 6: Determine Output Format and Export Method

This step handles the interactive workflow for choosing output format and PNG generation method.

#### 6a. Detect Available Tools and Runners

Read `references/export-tools.md` (section 6a) for the detection commands. Detect `has_nix`, `has_npx`, `has_mermaid`, `has_brute_export`, `has_excalidraw_cli`; a tool is "available" if globally installed, or nix or npx is available.

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

Read `references/export-tools.md` (sections 6c-direct and 6c-convert) for runner selection (global, nix, npx), the AskUserQuestion prompts when no runner or tool is available, install commands, and the Skip/Cancel handling. It sets `generation_method` (`mermaid` | `excalidraw-convert`), `mermaid_runner` (`global` | `nix` | `npx`), `excalidraw_runner` (`global` | `npx`), and `selected_tool`.

#### 6d. Determine PNG Scale (if PNG requested)

**If `--scale` argument provided:** Use specified scale
**Otherwise:** Use `png_scale` from settings (default: 2)

Store: `generation_method` (mermaid | excalidraw-convert), `selected_tool`, `png_scale`, `final_format`

### Step 7: Determine Output Path

**Output location:** `${workbench_path}/sketches/` (from Step 1)

**If `--output` provided:** Use specified name
**Otherwise:** Generate name based on mode and timestamp

**For Excalidraw-based output:**
```
${workbench_path}/sketches/{mode}-{timestamp}.excalidraw
```

**For Direct PNG output:**
```
${workbench_path}/sketches/{mode}-{timestamp}.png
```

Examples (assuming default workbench_path: `~/workbench`):
- `~/workbench/sketches/conversation-20240115-143022.excalidraw`
- `~/workbench/sketches/code-architecture-20240115-143022.excalidraw`
- `~/workbench/sketches/my-api-flow.excalidraw` (if --output my-api-flow)
- `~/workbench/sketches/api-flow-20240115-143022.png` (direct PNG)

**Create sketches directory if needed:**
```bash
mkdir -p "${workbench_path}/sketches"
```

---

## Direct PNG Generation (Mermaid Workflow)

**If `generation_method` is `mermaid`:** Follow this workflow instead of Steps 8-9.

Read `references/mermaid-workflow.md` and follow it: Step 8-direct converts the Step 3 content to Mermaid syntax (flowchart, architecture, mind map, sequence templates, hand-drawn config); Step 9-direct writes the temp `.mmd` and config, runs `mmdc` per `mermaid_runner`, cleans up, and offers an Excalidraw fallback on failure. Then skip to Step 10.

---

## Excalidraw-based Workflow

**If `generation_method` is `excalidraw-convert` or format is `excalidraw`:** Follow Steps 8-9 below.

### Step 8: Write Excalidraw File

1. **Write the Excalidraw JSON file:**
   ```
   Write to: ${workbench_path}/sketches/{filename}.excalidraw
   ```

2. **If format is `png` only:** Continue to Step 9 (PNG export), then delete the .excalidraw file after successful PNG creation

3. **If format is `excalidraw` or `both`:** Keep the .excalidraw file

### Step 9: Export to PNG (if format is `png` or `both`)

Use the `selected_tool` and `excalidraw_runner` determined in Step 6c.

**For excalidraw-brute-export-cli:**

*If globally installed (`excalidraw_runner: global`):*
```bash
excalidraw-brute-export-cli -i "${workbench_path}/sketches/{filename}.excalidraw" \
  --format png \
  --scale {png_scale} \
  --background 1 \
  -o "${workbench_path}/sketches/{filename}.png"
```

*If via npx (`excalidraw_runner: npx`):*
```bash
npx -y excalidraw-brute-export-cli@0.4.0 -i "${workbench_path}/sketches/{filename}.excalidraw" \
  --format png \
  --scale {png_scale} \
  --background 1 \
  -o "${workbench_path}/sketches/{filename}.png"
```

**For excalidraw-cli:**

*If globally installed (`excalidraw_runner: global`):*
```bash
excalidraw-cli "${workbench_path}/sketches/{filename}.excalidraw" "${workbench_path}/sketches/"
```

*If via npx (`excalidraw_runner: npx`):*
```bash
npx -y @tommywalkie/excalidraw-cli@0.5.0 "${workbench_path}/sketches/{filename}.excalidraw" "${workbench_path}/sketches/"
```

**If export fails:**
- Show error message
- Keep the .excalidraw file
- Suggest manual export: "Export failed. You can manually export at excalidraw.com"

**If format was `png` only and export succeeded:**
- Delete the temporary .excalidraw file:
  ```bash
  rm "${workbench_path}/sketches/{filename}.excalidraw"
  ```

### Step 10: Show Success Message

Read `references/success-messages.md` and print the template matching what was generated (Excalidraw only, PNG + Excalidraw, PNG via conversion only, Direct PNG via Mermaid, or PNG skipped).

**Offer follow-up options:**
```
What would you like to do next?
○ Open location - Show the file in finder/explorer
○ Create another - Make another sketch
○ Done - Finish
```

---

## Background Pattern Implementation

Read `references/background-patterns.md` for the dots, grid, and lines pattern specs (color, size, spacing) and z-order note.

---

## Settings File Template

Read `references/settings-template.md` for the full file template, the options table, and example configurations.

---

## Error Handling

### No Content to Sketch

**Conversation mode with no conversation:**
```
No conversation history to sketch.
Try using:
- /sketch --mode custom "your description"
- /sketch --mode code
```

### Code Mode in Empty Directory

```
No source files found in this directory.
Make sure you're in a project directory with source code.
```

### Invalid Mode

```
Invalid mode: "{mode}"
Available modes: conversation, code, custom
```

### Write Permission Error

```
Cannot create sketches directory.
Please check write permissions or specify a different location with --output.
```

---

## Important Notes

- **Excalidraw compatibility:** Generated files work with excalidraw.com and VS Code extension
- **Unique IDs:** Generate unique IDs for each element using timestamp + random suffix
- **Bindings:** Arrow bindings require valid element IDs for connected boxes
- **Z-index:** Background patterns first, then boxes, then arrows, then text on top
- **Font family:** Use 1 (normal), 2 (code), or 3 (handwriting/Virgil)
- **File extension:** Always use `.excalidraw` extension
