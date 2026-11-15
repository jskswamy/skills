# Step 9: Export to PNG (if format is `png` or `both`)

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

**For excalidraw-cli:**

*If globally installed (`excalidraw_runner: global`):*
```bash
excalidraw-cli "${workbench_path}/sketches/{filename}.excalidraw" "${workbench_path}/sketches/"
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
