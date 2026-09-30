---
name: excalidraw-format
description: This skill should be used when generating Excalidraw JSON files, creating visual diagrams in Excalidraw format, or needing to understand Excalidraw element structure. Provides comprehensive knowledge of Excalidraw JSON schema, element types, styling properties, and valid configurations.
version: 1.0.0
---

# Excalidraw Format Reference

Generate valid Excalidraw JSON files that can be opened in excalidraw.com or VS Code Excalidraw extension.

## File Structure

Every Excalidraw file follows this structure:

```json
{
  "type": "excalidraw",
  "version": 2,
  "source": "sketch-note-plugin",
  "elements": [],
  "appState": {
    "viewBackgroundColor": "#ffffff",
    "gridSize": null,
    "theme": "light"
  },
  "files": {}
}
```

## Element Types

### Rectangle

```json
{
  "type": "rectangle",
  "id": "rect-1705312222-a7f3",
  "x": 100,
  "y": 100,
  "width": 200,
  "height": 100,
  "angle": 0,
  "strokeColor": "#1e1e1e",
  "backgroundColor": "#a5d8ff",
  "fillStyle": "hachure",
  "strokeWidth": 2,
  "strokeStyle": "solid",
  "roughness": 2,
  "opacity": 100,
  "groupIds": [],
  "frameId": null,
  "roundness": { "type": 3 },
  "seed": 12345,
  "version": 1,
  "versionNonce": 67890,
  "isDeleted": false,
  "boundElements": null,
  "updated": 1705312222000,
  "link": null,
  "locked": false
}
```

### Ellipse

```json
{
  "type": "ellipse",
  "id": "ellipse-1705312222-b8c4",
  "x": 100,
  "y": 100,
  "width": 150,
  "height": 100,
  "strokeColor": "#1e1e1e",
  "backgroundColor": "#b2f2bb",
  "fillStyle": "hachure",
  "strokeWidth": 2,
  "roughness": 2
}
```

### Diamond

```json
{
  "type": "diamond",
  "id": "diamond-1705312222-c9d5",
  "x": 100,
  "y": 100,
  "width": 120,
  "height": 120,
  "strokeColor": "#1e1e1e",
  "backgroundColor": "#ffec99",
  "fillStyle": "hachure",
  "strokeWidth": 2,
  "roughness": 2
}
```

### Text

```json
{
  "type": "text",
  "id": "text-1705312222-d0e6",
  "x": 100,
  "y": 100,
  "width": 150,
  "height": 25,
  "angle": 0,
  "strokeColor": "#1e1e1e",
  "backgroundColor": "transparent",
  "fillStyle": "hachure",
  "strokeWidth": 1,
  "strokeStyle": "solid",
  "roughness": 1,
  "opacity": 100,
  "text": "Label text here",
  "fontSize": 20,
  "fontFamily": 1,
  "textAlign": "center",
  "verticalAlign": "middle",
  "containerId": null,
  "originalText": "Label text here",
  "lineHeight": 1.25
}
```

**Font families:**
- `1` = Normal (sans-serif)
- `2` = Code (monospace)
- `3` = Virgil (handwriting)

### Arrow

```json
{
  "type": "arrow",
  "id": "arrow-1705312222-e1f7",
  "x": 300,
  "y": 150,
  "width": 100,
  "height": 50,
  "angle": 0,
  "strokeColor": "#1e1e1e",
  "backgroundColor": "transparent",
  "fillStyle": "hachure",
  "strokeWidth": 2,
  "strokeStyle": "solid",
  "roughness": 2,
  "opacity": 100,
  "points": [
    [0, 0],
    [100, 50]
  ],
  "lastCommittedPoint": null,
  "startBinding": {
    "elementId": "rect-source",
    "focus": 0,
    "gap": 5
  },
  "endBinding": {
    "elementId": "rect-target",
    "focus": 0,
    "gap": 5
  },
  "startArrowhead": null,
  "endArrowhead": "arrow"
}
```

**Arrowhead types:**
- `null` = No arrowhead
- `"arrow"` = Standard arrow
- `"bar"` = Bar/line
- `"dot"` = Circle
- `"triangle"` = Filled triangle

### Line

```json
{
  "type": "line",
  "id": "line-1705312222-f2g8",
  "x": 100,
  "y": 100,
  "width": 200,
  "height": 0,
  "points": [
    [0, 0],
    [200, 0]
  ],
  "strokeColor": "#1e1e1e",
  "strokeWidth": 2,
  "roughness": 2
}
```

## Styling Properties

### Fill Styles

| Value | Description |
|-------|-------------|
| `"hachure"` | Hand-drawn diagonal lines (default, sketch-like) |
| `"cross-hatch"` | Crossed diagonal lines |
| `"solid"` | Solid fill |
| `"zigzag"` | Zigzag pattern |
| `"zigzag-line"` | Zigzag line pattern |

### Stroke Styles

| Value | Description |
|-------|-------------|
| `"solid"` | Continuous line |
| `"dashed"` | Dashed line |
| `"dotted"` | Dotted line |

### Roughness

| Value | Appearance |
|-------|------------|
| `0` | Clean, precise lines |
| `1` | Slightly rough, sketchy |
| `2` | Very rough, hand-drawn look |

### Roundness

```json
"roundness": { "type": 3 }
```

| Type | Description |
|------|-------------|
| `1` | Sharp corners |
| `2` | Round corners (legacy) |
| `3` | Adaptive round corners |

## Color Palette

### Background Colors

| Name | Hex | Use Case |
|------|-----|----------|
| Light Blue | `#a5d8ff` | Primary elements |
| Light Green | `#b2f2bb` | Success, secondary |
| Light Yellow | `#ffec99` | Warnings, highlights |
| Light Red | `#ffc9c9` | Errors, alerts |
| Light Gray | `#e9ecef` | Neutral, disabled |
| Light Purple | `#d0bfff` | Special, accent |
| Light Orange | `#ffd8a8` | Attention |

### Canvas Backgrounds

| Name | Hex |
|------|-----|
| White | `#ffffff` |
| Cream | `#faf8f5` |
| Light Gray | `#f5f5f5` |
| Light Blue | `#f0f8ff` |
| Light Yellow | `#fffef0` |

### Stroke Colors

| Name | Hex |
|------|-----|
| Default | `#1e1e1e` |
| Blue | `#1971c2` |
| Green | `#2f9e44` |
| Red | `#e03131` |
| Orange | `#f08c00` |

## Bindings

Connect arrows to shapes:

```json
{
  "startBinding": {
    "elementId": "rect-1",
    "focus": 0,
    "gap": 5
  },
  "endBinding": {
    "elementId": "rect-2",
    "focus": 0,
    "gap": 5
  }
}
```

**Focus:** -1 to 1, controls where arrow connects on element edge
**Gap:** Pixels between arrow endpoint and element edge

When using bindings, add `boundElements` to the connected shapes:

```json
{
  "type": "rectangle",
  "id": "rect-1",
  "boundElements": [
    { "id": "arrow-1", "type": "arrow" }
  ]
}
```

## Groups

Group elements together:

```json
{
  "type": "rectangle",
  "id": "rect-1",
  "groupIds": ["group-1"]
}
```

All elements with the same `groupId` move together.

## Frames

Container for organizing elements:

```json
{
  "type": "frame",
  "id": "frame-1",
  "x": 50,
  "y": 50,
  "width": 400,
  "height": 300,
  "name": "Module A"
}
```

Elements inside set `frameId`:
```json
{
  "type": "rectangle",
  "frameId": "frame-1"
}
```

## ID Generation

Generate unique IDs with this pattern:
```
{type}-{timestamp}-{random4hex}
```

Examples:
- `rect-1705312222-a7f3`
- `arrow-1705312222-b8c4`
- `text-1705312222-c9d5`

## Seed Values

For consistent roughness rendering, use deterministic seeds:

```json
{
  "seed": 12345,
  "versionNonce": 67890
}
```

Generate seeds using timestamp or hash of element ID.

## Complete Example

```json
{
  "type": "excalidraw",
  "version": 2,
  "source": "sketch-note-plugin",
  "elements": [
    {
      "type": "rectangle",
      "id": "rect-1",
      "x": 100,
      "y": 100,
      "width": 150,
      "height": 80,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "#a5d8ff",
      "fillStyle": "hachure",
      "strokeWidth": 2,
      "roughness": 2,
      "boundElements": [
        { "id": "arrow-1", "type": "arrow" }
      ]
    },
    {
      "type": "text",
      "id": "text-1",
      "x": 125,
      "y": 130,
      "width": 100,
      "height": 25,
      "text": "Start",
      "fontSize": 20,
      "fontFamily": 1,
      "strokeColor": "#1e1e1e",
      "containerId": "rect-1"
    },
    {
      "type": "rectangle",
      "id": "rect-2",
      "x": 400,
      "y": 100,
      "width": 150,
      "height": 80,
      "strokeColor": "#1e1e1e",
      "backgroundColor": "#b2f2bb",
      "fillStyle": "hachure",
      "strokeWidth": 2,
      "roughness": 2,
      "boundElements": [
        { "id": "arrow-1", "type": "arrow" }
      ]
    },
    {
      "type": "arrow",
      "id": "arrow-1",
      "x": 250,
      "y": 140,
      "width": 150,
      "height": 0,
      "points": [[0, 0], [150, 0]],
      "strokeColor": "#1e1e1e",
      "strokeWidth": 2,
      "roughness": 2,
      "startBinding": {
        "elementId": "rect-1",
        "focus": 0,
        "gap": 5
      },
      "endBinding": {
        "elementId": "rect-2",
        "focus": 0,
        "gap": 5
      },
      "endArrowhead": "arrow"
    }
  ],
  "appState": {
    "viewBackgroundColor": "#ffffff",
    "gridSize": null
  },
  "files": {}
}
```

## Validation Checklist

Before saving Excalidraw JSON:

- [ ] All elements have unique `id` values
- [ ] Arrow bindings reference existing element IDs
- [ ] `boundElements` arrays are synchronized with arrow bindings
- [ ] Text `containerId` references valid container element
- [ ] Points arrays have at least 2 points for arrows/lines
- [ ] Width and height are positive numbers
- [ ] Colors are valid hex codes
- [ ] `type` field is set to `"excalidraw"`
- [ ] `version` is set to `2`
