---
name: domain
description: "Map the main domain entities and who owns them. [<concept>]"
when_to_use: "Use when the user wants the main concepts or entities of a codebase and who owns them: 'what are the core domain types', 'explain the data model', 'who creates or changes X', 'which component owns X'. Not for behaviour or execution corridors (use codebase:capabilities), one symbol's call graph (use codebase:graph), or the component map (use codebase:architecture)."
argument-hint: "[<concept>]"
metadata:
  short-description: "Map the main domain entities and who owns them. [<concept>]"
---

# Codebase Domain Skill

Map a codebase's main domain entities (the types, records and schemas its logic is about), the component that owns each, and which components create, modify and read them. Derived from the current code on every run; nothing is saved.

## Argument Parsing

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `<concept>` | string | all | One entity or concept to inspect in depth. Omit for the overview. |

Examples:
```
/codebase:domain
/codebase:domain PluginModel
/codebase:domain hook
```

## Execution Flow

## Codebase Transport

Prefer MCP first. If its tools are absent or the server is unreachable, automatically try the CLI without asking:

```bash
command -v codebase-memory-mcp
codebase-memory-mcp cli --json list_projects
```

Set `codebase_transport` to `mcp` or `cli`. All tool calls below use that transport. For CLI calls, pipe the same JSON arguments to `codebase-memory-mcp cli --json <tool>` via stdin; inspect `isError` and read the result from `content[]` text. Use each tool's `--help` for supported flags and output formats. Query and indexing errors are not transport failures: report them accurately, not as missing MCP. On a later MCP connection failure, retry through CLI. Preserve project selection, index settings, and consent rules; do not install anything automatically.

### Step 0: Check Availability

Resolve the transport above. If neither MCP nor CLI works, continue with source inspection only and label the whole answer as such.

### Step 0b: Check Index Freshness

Read `references/freshness.md` and follow it.

### Step 1: Resolve the Project

Call `list_projects` and match the project whose `root_path` equals `git rev-parse --show-toplevel` (or whose `name` equals that path with the leading `/` stripped and `/` replaced by `-`). Never match by directory basename. Strip or reject `'`, `"`, `\\`, and control characters from any argument before putting it in a Cypher string.

### Step 2: Map the Entities

Read `references/entities.md` and follow it.

### Step 3: Present Results

Overview: a table (entity, owning component, defined at, created by, modified by, read by) plus a Mermaid `classDiagram` of how entities reference each other. With `<concept>`: its definition, fields, lifecycle (who creates, changes, reads it) and related entities. Give `file:line` for every symbol or file named. Label any part that came from source inspection. Do not dump raw MCP JSON.

### Step 4: Offer a Shareable Copy

Read `references/share.md` and follow it.
