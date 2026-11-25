---
name: tour
description: "Get a guided reading order for a codebase or area. [<area>] Use when the user asks where to start reading a codebase or wants a guided reading order: 'give me a tour', 'where do I start', 'onboard me to this repo', 'walk me through the X area'. Not for background context inside another workflow (use codebase:explore), a specific question (use codebase:ask), or the component map (use codebase:architecture)."
argument-hint: "[<area>]"
metadata:
  short-description: "Get a guided reading order for a codebase or area. [<area>]"
---

# Codebase Tour Skill

Produce an ordered reading list for a person or agent new to a codebase: where to start, what to read next, and why. Derived from the current code on every run; nothing is saved.

## Argument Parsing

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `<area>` | string | whole repo | Directory, package or concept to scope the tour to. |

Examples:
```
/codebase:tour
/codebase:tour scripts/lib
/codebase:tour hook runner
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

### Step 2: Build the Tour

Read `references/tour-steps.md` and follow it.

### Step 3: Present Results

Print the tour as a numbered list: each step is a file or symbol, a one-line reason to read it next, and what to look for there. End with 2–3 suggested follow-ups (`codebase:architecture`, `codebase:graph <symbol>`, `codebase:ask`). Give `file:line` for every symbol or file named. Label any part that came from source inspection. Do not dump raw MCP JSON.

### Step 4: Offer a Shareable Copy

Read `references/share.md` and follow it.
