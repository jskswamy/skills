# Complete Example

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
