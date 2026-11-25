---
name: codebase-capabilities
description: "Use when the user wants to discover or inspect functional capabilities in one or more codebases: 'what capabilities exist', 'map capabilities', 'how is capability X structured', 'trace capability X across repos', 'compare capabilities between project A and B'. Not for a single symbol's immediate callers/callees (use codebase-graph), domain entities and their owners (use codebase-domain), or boundary coupling inspection (use codebase-seams)."
argument-hint: "[<capability>] [--project <name>[,<name>...]] [--depth 1-5]"
metadata:
  short-description: "Map functional capabilities and execution corridors. [<capability>] [--project <name>...] [--depth 1-5]"
---

# Codebase Capabilities Skill

Discover and inspect functional capabilities (high-cohesion clusters anchored to entry points and execution corridors) across one or more indexed codebases. Combines `get_architecture`, `search_graph`, `trace_path`, `query_graph`, and `get_code_snippet` to recover capability maps or trace a specific capability's Concern Graph.

## Argument Parsing

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `<capability>` | string | optional | Capability name, domain concept, or entry-point symbol. Omit to discover all major capabilities. |
| `--project` | string | current repo | One or more indexed project names or paths (comma-separated or repeated). |
| `--depth` | integer | `3` | Outbound traversal depth when tracing a capability's execution corridor (1-5). |

Examples:
```
/codebase:capabilities
/codebase:capabilities authentication
/codebase:capabilities checkout --depth 4
/codebase:capabilities billing --project api-gateway,billing-service
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

Resolve the transport above. Only if neither MCP nor CLI works, explain that capability analysis requires either a configured MCP server or the installed `codebase-memory-mcp` CLI, then exit.

### Step 0b: Check Index Freshness

Read `references/freshness.md` and follow it for every project in scope. For external projects given via `--project`, verify each via `index_status`; warn and skip any unindexed external project while proceeding with indexed ones.

### Step 1: Resolve Project(s)

Call `list_projects`.

- **When `--project` is omitted:**
  - Run `git rev-parse --show-toplevel` to get the current repository root. Match against `list_projects` strictly where `root_path` equals the repository root (or `name` equals the full derived path slug with leading `/` stripped and `/` replaced by `-`). Never match the default current repo by directory basename alone, because worktrees and renamed clones share basenames.
- **When `--project <token>[,<token>...]` is supplied:**
  - Resolve each token against `list_projects` in order: (1) exact `name` match, (2) exact `root_path` match, (3) case-insensitive suffix or basename match on `name` or `root_path`.
  - If a token matches zero projects, report the unmatched token, list close matches from `list_projects`, and advise running `/codebase:index` in that repository.
  - If a token matches multiple projects, present a numbered disambiguation list (`1..N`) showing `name (root_path)` and prompt the user to choose using the harness question mechanism.

### Step 2: Select Mode

- **No `<capability>` argument provided:** Run **Step 3a (Mode A — Capability Discovery)**.
- **`<capability>` argument provided:** Sanitize `<capability>` (strip or reject single quotes `'`, double quotes `"`, backslashes `\`, and control characters before constructing any Cypher or regex string), then run **Step 3b (Mode B — Targeted Capability Inspection)**.

### Step 3a: Mode A — Capability Discovery (Architecture Recovery)

Read `references/mode-a-discovery.md` and follow it.

### Step 3b: Mode B — Targeted Capability Inspection (Concern Graph & Feature Location)

Read `references/mode-b-targeted.md` and follow it.

### Step 4: Present Results & Query Fallback

Read `references/present-results.md` and follow it.

### Step 5: Offer a Shareable Copy

Read `references/share.md` and follow it.
