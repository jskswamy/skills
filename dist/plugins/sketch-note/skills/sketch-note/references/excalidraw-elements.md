# Excalidraw Element Examples

## Element generation rules (Step 5)

1. **Text elements:**
   ```json
   {
     "type": "text",
     "id": "unique-id",
     "x": 100,
     "y": 100,
     "width": 200,
     "height": 30,
     "text": "Label text",
     "fontSize": 20,
     "fontFamily": 1,
     "roughness": 2,
     "strokeColor": "#1e1e1e",
     "backgroundColor": "transparent"
   }
   ```

2. **Rectangle elements (boxes):**
   ```json
   {
     "type": "rectangle",
     "id": "unique-id",
     "x": 50,
     "y": 50,
     "width": 200,
     "height": 100,
     "strokeColor": "#1e1e1e",
     "backgroundColor": "#a5d8ff",
     "fillStyle": "hachure",
     "roughness": 2,
     "strokeWidth": 2
   }
   ```

3. **Arrow elements (connections):**
   ```json
   {
     "type": "arrow",
     "id": "unique-id",
     "x": 250,
     "y": 100,
     "width": 100,
     "height": 0,
     "points": [[0, 0], [100, 0]],
     "strokeColor": "#1e1e1e",
     "roughness": 2,
     "strokeWidth": 2,
     "startBinding": { "elementId": "box-1", "focus": 0, "gap": 5 },
     "endBinding": { "elementId": "box-2", "focus": 0, "gap": 5 }
   }
   ```
