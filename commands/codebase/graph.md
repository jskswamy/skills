---
name: graph
description: Explore a symbol's callers, callees, and relationships in the codebase graph
argument-hint: "<symbol> [--depth 1-5] [--direction inbound|outbound|both]"
---

# /codebase:graph Command

Explore a symbol's relationships in the codebase graph — who calls it, what it calls, what types it uses. Combines `search_graph` for symbol resolution with `trace_call_path` for relationship traversal.

## Argument Parsing

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `<symbol>` | string | required | Function name, type name, or fully qualified name to explore |
| `--depth` | integer | `2` | How many hops to traverse (1-5) |
| `--direction` | string | `both` | Traversal direction: `inbound` (callers only), `outbound` (callees only), `both` |

If no symbol is provided:
```
Usage: /codebase:graph <symbol> [--depth 1-5] [--direction inbound|outbound|both]

Examples:
  /codebase:graph writeJSON
  /codebase:graph ValidateToken --depth 3
  /codebase:graph HandleGet --direction inbound
  /codebase:graph internal.auth.middleware.ValidateToken
```

## Execution Flow

### Step 0: Check codebase-memory-mcp Availability

Call `list_projects` to verify the MCP server is available. If not:
```
codebase-memory-mcp not found. Install and configure it before using /codebase commands.
```
Exit.

### Step 0b: Check Index Freshness

Follow the same auto-index flow as `/codebase:ask` Step 0b.

### Step 1: Determine Project Name

Call `list_projects` and match against the current repo.

### Step 2: Resolve Symbol

Call `search_graph` with:
- `name_pattern`: a regex matching the provided symbol name (e.g., `writeJSON` becomes `writeJSON`)
- `project`: the matched project name
- `limit`: `10`

If no results, also try `semantic_query` with the symbol name as a natural language description.

**If zero matches:**
```
Symbol "[symbol]" not found in the index.

Try:
  - /codebase:index to refresh the index
  - A different name or spelling
  - /codebase:ask where does [symbol] live?
```

**If exactly one match:** Proceed with that qualified name.

**If multiple matches:** Present disambiguation:
```
Multiple symbols match "[symbol]":

  1. internal.auth.middleware.ValidateToken (internal/auth/middleware.go:45)
  2. internal.api.auth.ValidateToken (internal/api/auth/handler.go:23)
  3. pkg.auth.ValidateToken (pkg/auth/validator.go:12)

Which one? (enter number)
```
Use AskUserQuestion to get the user's choice.

### Step 3: Trace Relationships

Call `trace_call_path` with:
- `function_name`: the resolved qualified name
- `project`: the matched project name
- `direction`: the `--direction` argument (default: `"both"`)
- `depth`: the `--depth` argument (default: `2`)

### Step 4: Read Source Context

Call `get_code_snippet` with the resolved `qualified_name` to get the symbol's source code.

### Step 5: Present Results

```
## [function_name] ([file_path]:[line])

[Contextual explanation: what this symbol does, its role in the architecture,
why it exists. This is the LLM's synthesis — not a copy of the source code.]

### Callers ([count])
  [file_path]:[function_name] (line [N])
  [file_path]:[function_name] (line [N])
  [file_path]:[function_name] (line [N])
  ... and [M] more

### Calls ([count])
  [qualified_name_1]
  [qualified_name_2]
  [qualified_name_3]
```

If `--direction` is `inbound`, show only the "Callers" section.
If `--direction` is `outbound`, show only the "Calls" section.
If `--direction` is `both` (default), show both sections.

The contextual explanation should cover:
- What the symbol does (synthesized from the source code)
- Its role in the broader system (inferred from callers/callees)
- Any patterns worth noting (e.g., "used as the standard response writer across all handlers")
```

## Context

Codebase plugin at `plugins/codebase/`. Commands directory already has `index.md`, `ask.md`, `impact.md`.
