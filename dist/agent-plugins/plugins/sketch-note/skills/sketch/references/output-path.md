# Step 7: Determine Output Path

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
