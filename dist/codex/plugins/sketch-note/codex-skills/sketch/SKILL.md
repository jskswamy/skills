---
name: sketch
description: "Use when the user wants a visual diagram or sketch note: 'sketch this', 'draw the architecture', 'visualize this conversation', 'make an Excalidraw diagram', 'sketch note of the code', 'export a diagram as PNG'. Generates Excalidraw files (optionally PNG) from conversation, code, or custom content."
argument-hint: "[--mode conversation|code|custom] [--format excalidraw|png|both] [--output <name>] [description...]"
metadata:
  short-description: "Draw an Excalidraw sketch note. [--mode conversation|code|custom] [description]"
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
$sketch-note:sketch                              # Interactive mode selection
$sketch-note:sketch --mode conversation          # Sketch current conversation
$sketch-note:sketch -m code                      # Visualize code architecture
$sketch-note:sketch --mode custom API flow       # Custom sketch with description
$sketch-note:sketch -o my-diagram -m code        # Named output file
$sketch-note:sketch --format png                 # PNG via Excalidraw conversion
$sketch-note:sketch -f both                      # Export both Excalidraw and PNG
$sketch-note:sketch --format direct-png          # Direct PNG generation (no Excalidraw)
$sketch-note:sketch --format png --scale 4       # High-resolution PNG (4x)
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

Read `references/gather-content.md` and follow it.

### Step 4: Load Style Configuration

Read `references/style-config.md` and follow it.

### Step 5: Generate Excalidraw JSON

Read `references/generate-json.md` and follow it.

### Step 6: Determine Output Format and Export Method

Read `references/output-format.md` and follow it.

### Step 7: Determine Output Path

Read `references/output-path.md` and follow it.

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

Read `references/png-export.md` and follow it.

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
- $sketch-note:sketch --mode custom "your description"
- $sketch-note:sketch --mode code
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
