# Settings File Template

## Settings file template

When creating `.claude/sketch-note.local.md`:

```markdown
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

# Sketch Note Plugin Settings

Your preferences for generating sketch notes.

## Available Options

| Setting | Options | Description |
|---------|---------|-------------|
| background_color | white, cream, light-gray, light-blue, light-yellow | Canvas background |
| roughness | hand-drawn, sketchy, clean | Line roughness style |
| stroke_width | thin, medium, bold | Line thickness |
| background_pattern | none, dots, grid, lines | Background pattern |
| visual_effects | shadow, glow, cursive | Effects (array, multi-select) |
| resolution | standard, high, 4k | Output resolution |
| output_format | excalidraw, png, both, direct-png | Default output format |
| png_scale | 1, 2, 4 | PNG export scale (1x, 2x, 4x) |

## Examples

Change to clean professional style:
```yaml
roughness: clean
stroke_width: thin
background_color: white
```

Warm creative style:
```yaml
roughness: hand-drawn
background_color: cream
visual_effects: [cursive, shadow]
```

Always export PNG alongside Excalidraw:
```yaml
output_format: both
png_scale: 2
```

High-resolution PNG only:
```yaml
output_format: png
png_scale: 4
```
```
