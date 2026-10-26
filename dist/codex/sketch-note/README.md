# Sketch Note Plugin

Generate visual sketch notes in Excalidraw format from conversations, code architecture, or custom content.

## Features

- **Multiple content modes**: Capture conversation summaries, visualize code architecture, or sketch custom content
- **Excalidraw output**: Creates `.excalidraw` files that open directly in Excalidraw
- **PNG export**: Interactive workflow detects available tools and guides you through export options
- **Customizable styling**: Configure background, pen type, roughness, and visual effects
- **Persistent preferences**: Settings saved per-project for consistent output

## Installation

```bash
claude --plugin-dir ./dist/claude-code/sketch-note
```

## Usage

### Command

```bash
/sketch                           # Interactive mode selection
/sketch --mode conversation       # Sketch current conversation
/sketch --mode code               # Visualize code architecture
/sketch --mode custom             # Custom content input
/sketch --output my-diagram       # Specify output filename
/sketch --format png              # PNG via Excalidraw conversion
/sketch --format both             # Export both Excalidraw and PNG
/sketch --format direct-png       # Direct PNG (no Excalidraw file)
/sketch --format png --scale 4    # High-resolution PNG (4x)
```

### Agent

The sketch agent triggers proactively when you ask to:
- "visualize this architecture"
- "create a diagram of..."
- "sketch the flow"
- "draw how this works"

## Configuration

Settings are stored in `.claude/sketch-note.local.md`:

```yaml
---
background_color: white      # white, cream, light-gray, light-blue, light-yellow
roughness: hand-drawn        # hand-drawn, sketchy, clean
stroke_width: medium         # thin, medium, bold
background_pattern: none     # none, dots, grid, lines
visual_effects: []           # shadow, glow, cursive
resolution: standard         # standard, high, 4k
output_format: excalidraw    # excalidraw, png, both, direct-png
png_scale: 2                 # 1, 2, 4
---
```

## Output

Sketch notes are saved to `${workbench_path}/sketches/` directory as `.excalidraw` files.

The `workbench_path` is read from `.claude/jot.local.md` (shared with the jot plugin). Default: `~/workbench`.

## Styles

| Roughness | Description |
|-----------|-------------|
| hand-drawn | High roughness, casual sketch look |
| sketchy | Medium roughness, balanced appearance |
| clean | Low roughness, professional diagrams |

| Stroke Width | Description |
|--------------|-------------|
| thin | 1px stroke, delicate lines |
| medium | 2px stroke, balanced visibility |
| bold | 4px stroke, emphasis and impact |

## Visual Effects

- **shadow**: Adds drop shadow to elements
- **glow**: Adds subtle glow effect
- **cursive**: Uses handwriting-style font for text

## PNG Export

The plugin supports two approaches for PNG generation:

### Approach 1: Direct PNG (Recommended for quick exports)

Use `--format direct-png` to generate PNG directly without an intermediate Excalidraw file. This uses **Mermaid CLI** with hand-drawn styling.

```bash
npm install -g @mermaid-js/mermaid-cli
```

**Pros:** Fast, single tool, good for flowcharts and diagrams
**Cons:** Less customizable than Excalidraw, no editable source file

### Approach 2: Excalidraw Conversion

Use `--format png` or `--format both` to generate Excalidraw first, then convert to PNG.

### Interactive Workflow

When you request PNG output, the plugin:
1. **Detects available runners** (nix-shell, npx) and globally installed tools
2. **Smart execution**:
   - If tool is globally installed → uses it directly
   - If nix available → can run via `nix-shell -p`
   - If npx available → runs via `npx -y` (no install needed)
3. **Fallback options**:
   - If multiple tools available → asks which you prefer
   - If no tools or runners → offers to install or skip

### Available Conversion Tools

#### Option 1: excalidraw-brute-export-cli (Recommended)

Uses Playwright with headless Firefox for exact Excalidraw rendering fidelity.

```bash
npm install -g excalidraw-brute-export-cli
npx playwright install firefox
```

#### Option 2: @tommywalkie/excalidraw-cli

Uses node-canvas with Rough.js. Faster, but rendering may differ slightly.

```bash
npm install -g @tommywalkie/excalidraw-cli
```

### Direct PNG Tool

#### Mermaid CLI (for direct-png format)

Generates diagrams directly as PNG with hand-drawn styling.

```bash
npm install -g @mermaid-js/mermaid-cli
```

### Zero-Install Mode (nix/npx)

If you have **nix** or **npx** available, you don't need to install any tools globally. The plugin will run them on-demand:

```bash
# Via npx (no install needed, comes with Node.js)
npx -y @mermaid-js/mermaid-cli -i input.mmd -o output.png

# Via nix-shell (isolated environment)
nix-shell -p mermaid-cli --run "mmdc -i input.mmd -o output.png"
```

**Priority order:**
1. Globally installed tool (fastest)
2. npx (most compatible for npm packages)
3. nix-shell (for nix users)

### No Tools or Runners?

If no tools are installed AND no runners (npx/nix) are available:
- **Install a tool** - The plugin will run the installation command for you
- **Try direct PNG** - Use Mermaid for direct generation instead
- **Skip PNG** - Create only the Excalidraw file, export manually later
- **Cancel** - Stop and install tools yourself first

### Manual Export

You can always export manually by:
1. Opening the `.excalidraw` file at [excalidraw.com](https://excalidraw.com)
2. Using the Export menu to save as PNG

### Scale Options

| Scale | Description |
|-------|-------------|
| 1 | Standard resolution (1x) |
| 2 | High resolution (2x, recommended) |
| 4 | Maximum quality (4x, for large displays)
