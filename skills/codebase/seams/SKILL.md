---
name: seams
description: "Use when the user wants to identify, inspect, or audit architectural seams and boundaries within a codebase or across indexed repositories: 'what are the seams', 'find leaky seams', 'show the boundary between X and Y', 'where can we split or decouple X', 'how does repo A integrate with repo B'. Not for tracing a single symbol's call tree (use codebase:graph) or diff blast radius (use codebase:impact)."
argument-hint: "[<source> [<target>]] [--project <name>[,<name>...]]"
metadata:
  short-description: "Inspect architectural seams and coupling across packages or repos. [<source> [<target>]] [--project <name>...]"
---

# Codebase Seams Skill

Identify, inspect, and audit architectural seams and module boundaries across packages or across multiple indexed repositories. Combines `get_architecture`, `query_graph`, `search_graph`, `trace_path`, and `get_code_snippet` to classify seam types (Object/Interface, Link/Module, Service/IPC, Configuration), measure Martin's Instability ($I = \frac{C_e}{C_a + C_e}$), detect leaky crossings or cycles, and pinpoint concrete Enabling Points (`file:line`).

## Argument Parsing

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `<source>` | string | optional | Package, directory prefix, layer, or symbol prefix on one side of the seam (or source project name if `--project` is omitted). Omit to discover top seams across the repo(s). |
| `<target>` | string | optional | Package, directory prefix, or symbol prefix on the other side of the seam (or target project name if `--project` is omitted). If omitted when `<source>` is given, shows all inbound and outbound seams for `<source>`. |
| `--project` | string | current repo | One or more indexed project names or paths (comma-separated or repeated). |

Examples:
```
/codebase:seams
/codebase:seams internal/auth
/codebase:seams internal/api internal/db
/codebase:seams api-gateway billing-service
/codebase:seams handlers store --project backend-api
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

Resolve the transport above. Only if neither MCP nor CLI works, explain that seam analysis requires either a configured MCP server or the installed `codebase-memory-mcp` CLI, then exit.

### Step 0b: Check Index Freshness

Read `references/freshness.md` and follow it for every project in scope. For external projects given via `--project`, verify each via `index_status`; warn and skip any unindexed external project while proceeding with indexed ones.

### Step 1: Resolve Project(s) and Endpoint Arguments

Call `list_projects`.

- **When `--project` is omitted:**
  - Convenience rule: if both `<source>` and `<target>` positional arguments are supplied, do not match local directory paths in the current repository, and each matches an indexed project in `list_projects` (using the 3-step matching rules below), treat `<source>` and `<target>` as `--project <source>,<target>` (entering Mode C).
  - Otherwise, run `git rev-parse --show-toplevel` to get the current repository root. Match against `list_projects` strictly where `root_path` equals the repository root (or `name` equals the full derived path slug with leading `/` stripped and `/` replaced by `-`). Never match the default current repo by directory basename alone, because worktrees and renamed clones share basenames.
- **When `--project <token>[,<token>...]` is supplied:**
  - Resolve each token against `list_projects` in order: (1) exact `name` match, (2) exact `root_path` match, (3) case-insensitive suffix or basename match on `name` or `root_path`.
  - If a token matches zero projects, report the unmatched token, list close matches from `list_projects`, and advise running `/codebase:index` in that repository.
  - If a token matches multiple projects, present a numbered disambiguation list (`1..N`) showing `name (root_path)` and prompt the user to choose using the harness question mechanism.

### Step 2: Select Mode

Sanitize `<source>` and `<target>` before constructing any Cypher string (strip or reject single quotes `'`, double quotes `"`, backslashes `\`, and control characters).

- **Multiple projects resolved (`>= 2` projects via `--project` or 2-project positional shorthand) and `<source>`/`<target>` are either omitted or cross-project filters:** Run **Step 3c (Mode C — Multi-Index Seam Analysis)** (also run Step 3a if no `<source>`/`<target>` filters were given and user wants full discovery).
- **Single project (or each project independently) with no `<source>`/`<target>`:** Run **Step 3a (Mode A — Seam Discovery)**.
- **Single project with `<source>` (and optional `<target>`):** Run **Step 3b (Mode B — Targeted Seam Inspection)**.

### Step 3a: Mode A — Seam Discovery (No `<source>`/`<target>`)

Read `references/mode-a-discovery.md` and follow it.

### Step 3b: Mode B — Targeted Seam Inspection (`<source>` and optional `<target>` within a project)

Read `references/mode-b-targeted.md` and follow it.

### Step 3c: Mode C — Multi-Index Seam Analysis (`>= 2` projects)

Read `references/mode-c-multi-index.md` and follow it.

### Step 4: Present Results & Query Fallback

Read `references/present-results.md` and follow it.
