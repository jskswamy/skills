---
name: publish
description: Generate beautiful PDF/HTML shareable notes using Typst with professional templates
arguments:
  - name: template
    description: "Template to use: exec, cheat, sketch, meeting, study, tech, portfolio"
    required: false
  - name: theme
    description: "Color theme: light, dark, minimal, vibrant"
    required: false
  - name: format
    description: "Output format: pdf, html, or both"
    required: false
  - name: output
    description: "Output filename (without extension)"
    required: false
  - name: source
    description: "Content source: conversation, jot:<note-path>, or file:<path>"
    required: false
---

# Publish Command

You are the orchestrator for generating beautiful shareable documents using Typst.

## Plugin Root
The plugin is located at: `${CLAUDE_PLUGIN_ROOT}`

## Settings

Check if the file `.claude/typst-notes.local.md` exists in the project root. If it does, read its YAML frontmatter for default settings:
- `default_template` - Default template choice
- `default_theme` - Default theme
- `default_format` - Default output format (pdf, html, both)
- `output_path` - Where to write output files (default: `./notes`)
- `font_heading` - Heading font override
- `font_body` - Body font override
- `font_mono` - Monospace font override
- `accent_color` - Primary accent color override

Command arguments override settings file values.

## Workflow

### Step 1: Parse Arguments

Extract from the user's command:
- `--template` or first positional: exec|cheat|sketch|meeting|study|tech|portfolio
- `--theme`: light|dark|minimal|vibrant (default: light)
- `--format`: pdf|html|both (default: pdf)
- `--output`: output filename
- `--source`: conversation|jot:<path>|file:<path> (default: conversation)
- Remaining text: content description/instructions

### Step 2: Resolve Typst Runner

Use Bash to check availability:
```bash
command -v typst && echo "TYPST_AVAILABLE" || (command -v nix-shell && echo "NIX_AVAILABLE" || echo "NONE_AVAILABLE")
```

If `NONE_AVAILABLE`, inform the user:
> Typst is not installed. Install it via:
> - `brew install typst` (macOS)
> - `nix-env -iA nixpkgs.typst` (Nix)
> - `cargo install typst-cli` (Cargo)
>
> Or install `nix-shell` for automatic fallback.

Then stop.

### Step 3: Select Template

If no template specified, use AskUserQuestion to prompt the user:

**Question:** "Which template would you like to use?"
**Options:**
1. Executive Summary - Professional one-pager with metrics and key findings
2. Cheat Sheet - Dense multi-column reference card (landscape)
3. Visual Sketchnote - Creative illustrated notes with diagrams
4. Meeting Minutes - Structured meeting notes with action items
5. Study Guide - Educational material with exercises
6. Technical Brief - Engineering specs with architecture diagrams
7. Creative Portfolio - Visual showcase with project cards

### Step 4: Gather Content

Based on `--source`:

- **conversation** (default): Summarize the current conversation context. Extract key points, decisions, data, and structure.
- **jot:<path>**: Resolve the note path using jot's configured workbench:
  1. Use the Read tool to read `.claude/jot.local.md` directly (do NOT search for it — it's always at this exact path). Extract `workbench_path` from YAML frontmatter. If the file doesn't exist, default `workbench_path` to `~/workbench`.
  2. Expand `~` to user's home directory
  3. Resolve the note at `${workbench_path}/notes/<path>`
  4. If the path doesn't include a file extension, try appending `.md`
  5. Read the resolved file using the Read tool
  Example: `--source jot:inbox/meeting-notes` → reads `~/workbench/notes/inbox/meeting-notes.md`
- **file:<path>**: Read the file at the specified path using the Read tool.

If there's additional content description from the user, incorporate it.

### Step 5: Analyze Content

Delegate to the `content-analyzer` agent with:
- The raw content gathered in Step 4
- The selected template name
- Any user instructions about what to emphasize

The agent returns structured content including:
- Title, subtitle, date
- Organized sections appropriate for the template
- Suggested infographics (charts, diagrams)
- Key metrics or data points

### Step 6: Generate Typst Source

Delegate to the `typst-generator` agent with:
- The structured content from Step 5
- The template name
- The theme name
- Font configuration

The agent generates a complete `.typ` file that uses the template and theme.

### Step 7: Write and Compile

1. Determine output directory (from settings or `./notes`)
2. Create the output directory if needed: `mkdir -p <output_dir>`
3. Write the `.typ` source file to `<output_dir>/<output_name>.typ`
4. Compile using the script:
   ```bash
   bash "${CLAUDE_PLUGIN_ROOT}/scripts/compile.sh" \
     "<output_dir>/<output_name>.typ" \
     "<output_dir>/<output_name>" \
     --format <format> \
     --font-path "${CLAUDE_PLUGIN_ROOT}/fonts"
   ```
5. Report the output file path(s) to the user

### Step 8: Summary

Tell the user:
- What template and theme were used
- Output file path(s)
- Brief description of the generated content
- Mention they can open the `.typ` file to customize further

### Step 9: Save Preferences

After successful compilation, save the user's choices to `.claude/typst-notes.local.md` so they become defaults for future runs:

1. Read existing `.claude/typst-notes.local.md` if it exists (preserve existing settings)
2. Update only the fields the user actively specified or selected in this session:
   - `default_template` - if user chose a template (via argument or AskUserQuestion)
   - `default_theme` - if user chose a theme
   - `default_format` - if user chose a format
   - `output_path` - if user specified --output path
3. Write the updated YAML frontmatter back to `.claude/typst-notes.local.md`

Example resulting file:
```yaml
---
default_template: exec
default_theme: light
default_format: pdf
output_path: ./notes
---
```

Do not save font or accent_color settings automatically — those are manual configuration only.

## Error Handling

- If compilation fails, show the error output and suggest fixes
- If a template is unknown, show available templates
- If source file doesn't exist, report clearly
- If fonts aren't found, compilation still works with system fonts (warn user)

## Template Mapping

| Short Name | Template File |
|-----------|--------------|
| exec | executive-summary.typ |
| cheat | cheat-sheet.typ |
| sketch | visual-sketchnote.typ |
| meeting | meeting-minutes.typ |
| study | study-guide.typ |
| tech | technical-brief.typ |
| portfolio | creative-portfolio.typ |
