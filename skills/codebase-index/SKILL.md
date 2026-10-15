---
name: codebase-index
description: Build or refresh a codebase-memory-mcp index for the current repository. Use before semantic codebase questions when no index exists or the index is stale.
---

# Codebase Index Skill

Index the current codebase using `codebase-memory-mcp`. This builds or refreshes the semantic and structural graph that all other `/codebase:*` commands query.

## Argument Parsing

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `--mode` | string | `moderate` | Indexing mode: `full` (all semantic signals, slowest), `moderate` (structural + semantic similarity), `fast` (structural only, fastest) |

## Execution Flow

## Codebase Transport

Prefer MCP first. If its tools are absent or the server is unreachable, automatically try the CLI without asking:

```bash
command -v codebase-memory-mcp
codebase-memory-mcp cli --json list_projects
```

Set `codebase_transport` to `mcp` or `cli`. All tool calls below use that transport. For CLI calls, pipe the same JSON arguments to `codebase-memory-mcp cli --json <tool>` via stdin; inspect `isError` and read the result from `content[]` text. Use each tool's `--help` for supported flags and output formats. Query and indexing errors are not transport failures: report them accurately, not as missing MCP. On a later MCP connection failure, retry through CLI. Preserve project selection, index settings, and consent rules; do not install anything automatically.

### Step 1: Check Availability

Resolve the transport above. Only if neither MCP nor CLI works, explain that indexing requires either a configured MCP server or the installed `codebase-memory-mcp` CLI, then exit.

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

Run the `codebase-ask` skill (or `/codebase:ask` in Claude Code) to explore your codebase.
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
