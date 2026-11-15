# Step 5: Generate Excalidraw JSON

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
