---
name: codebase-hotspots
description: "Use when the user wants the risky, frequently changed parts of a codebase: 'where are the hotspots', 'what code changes most', 'what is riskiest to touch', 'where should we refactor first'. Not for what a specific diff affects (use codebase-impact) or unused code (use codebase-dead-code)."
argument-hint: "[--since <date>] [<path>]"
metadata:
  short-description: "Rank files by churn and risk. [--since <date>] [<path>]"
---

# Codebase Hotspots Skill

Rank files that change often and that much of the code depends on: the places where a change is most likely to break something. Churn comes from git history and risk from the live graph, on every run; nothing is saved.

## Argument Parsing

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `--since` | string | `6 months ago` | Any date `git log --since` accepts. |
| `<path>` | string | whole repo | Restrict to files under this path. |

Examples:
```
/codebase:hotspots
/codebase:hotspots --since 2026-01-01
/codebase:hotspots scripts/lib
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

### Step 2: Rank Hotspots

Read `references/ranking.md` and follow it.

### Step 3: Present Results

A table of the top 15: rank, file, churn (commits), fan-in, last touched, owning component, and a one-line note on why it is risky. Then 2–3 sentences on patterns (one component dominating, a file with high churn but no tests). Give `file:line` for every symbol or file named. Label any part that came from source inspection. Do not dump raw MCP JSON.

### Step 4: Offer a Shareable Copy

Read `references/share.md` and follow it.
