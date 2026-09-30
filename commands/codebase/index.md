---
name: index
description: Index or re-index the codebase using codebase-memory-mcp
argument-hint: "[--mode full|moderate|fast]"
---

# /codebase:index Command

Index the current codebase using `codebase-memory-mcp`. This builds or refreshes the semantic and structural graph that all other `/codebase:*` commands query.

## Argument Parsing

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `--mode` | string | `moderate` | Indexing mode: `full` (all semantic signals, slowest), `moderate` (structural + semantic similarity), `fast` (structural only, fastest) |

## Execution Flow

### Step 1: Check codebase-memory-mcp Availability

Attempt to call the `codebase-memory-mcp` `list_projects` tool (or any lightweight tool) to verify the MCP server is available.

If the tool call fails or the MCP server is not configured:
```
codebase-memory-mcp not found. Install and configure it before using /codebase commands.

Setup: Add codebase-memory-mcp to your MCP settings in .claude.json or .mcp.json
```
Exit without proceeding.

### Step 2: Read User Settings

Read `.claude/codebase.local.md` if it exists. Parse the YAML frontmatter for `index_mode`. If the file does not exist, use the default mode (`moderate`).

The `--mode` argument takes priority over the saved `index_mode` setting.

### Step 3: Run Indexing

Determine the repository root path:
```bash
git rev-parse --show-toplevel
```

Call the `codebase-memory-mcp` `index_repository` tool with:
- `repo_path`: the repository root path
- `mode`: the resolved mode from Step 2

Print progress:
```
Indexing codebase (moderate)...
```

### Step 4: Report Results and Update Settings

On success, print the results from the `index_repository` response (file count, timing).

```
✓ Indexed [N] files in [T]s

Run /codebase:ask to explore your codebase.
```

Write or update `.claude/codebase.local.md` with the current timestamp and mode:

```yaml
---
auto_index: ask
index_mode: moderate
last_indexed: [current ISO 8601 timestamp]
---
```

Preserve any existing `auto_index` value if the file already existed. Only update `last_indexed` and `index_mode`.

On failure, print the error from the MCP tool and do NOT update `last_indexed`:
```
Index failed: [error message]

Try running with --mode full if you're seeing stale results.
```
