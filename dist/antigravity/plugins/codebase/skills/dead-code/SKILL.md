---
name: dead-code
description: "Find code nothing uses, with each candidate verified. [<path>] Use when the user wants unused code found: 'find dead code', 'what can I delete', 'unused functions or exports', 'is X still used anywhere'. Not for what a diff affects (use codebase:impact) or risky frequently changed code (use codebase:hotspots)."
argument-hint: "[<path>]"
metadata:
  short-description: "Find code nothing uses, with each candidate verified. [<path>]"
---

# Codebase Dead Code Skill

Find symbols nothing in the codebase uses, and verify each candidate before reporting it. Derived from the current code on every run; nothing is saved and nothing is deleted.

## Argument Parsing

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `<path>` | string | whole repo | Restrict to symbols defined under this path. |

Examples:
```
/codebase:dead-code
/codebase:dead-code scripts/lib
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

### Step 2: Find and Verify Candidates

Read `references/candidates.md` and follow it.

### Step 3: Present Results

Two lists: `likely dead` (symbol, `file:line`, kind, why it looks unused) and `unsure: <reason>` (with where the string reference was found). Then a one-line total and the offer from the reference. Give `file:line` for every symbol or file named. Label any part that came from source inspection. Do not dump raw MCP JSON.

### Step 4: Offer a Shareable Copy

Read `references/share.md` and follow it.
