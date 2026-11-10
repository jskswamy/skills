---
name: codebase-capabilities
description: "Use when the user wants to discover or inspect functional capabilities in one or more codebases: 'what capabilities exist', 'map capabilities', 'how is capability X structured', 'trace capability X across repos', 'compare capabilities between project A and B'. Not for a single symbol's immediate callers/callees (use codebase-graph) or boundary coupling inspection (use codebase-seams)."
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

1. For the current workspace's project, read `.claude/codebase.local.md` if it exists (`auto_index: always | ask | never`, default `ask`; `index_mode: full | moderate | fast`, default `moderate`).
2. If the current workspace project is in scope and is not indexed or `last_indexed` is missing:
   - `auto_index: always` → run `index_repository` with the configured `index_mode` and update `.claude/codebase.local.md`.
   - `auto_index: never` → print a hint to run `/codebase:index` and fall back or exit.
   - `auto_index: ask` → prompt the user (`Yes, always` / `Yes, once` / `No`) using the harness question mechanism (AskUserQuestion in Claude Code; direct chat prompt in Pi).
3. If `last_indexed` is $>24$ hours old (stale): refresh if `always`, warn and proceed if `never`, or prompt (`Yes, always` / `Yes, once` / `No, use stale index`) if `ask`.
4. For external projects specified via `--project`, verify each via `index_status`; warn and skip any unindexed external project while proceeding with indexed ones.

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

1. For each resolved project, call `get_architecture` with:
   - `project`: the resolved project name
   - `aspects`: `["packages", "entry_points", "clusters", "layers", "routes"]`
   *(Never request `system_structure`, which is an asynchronous web-UI aspect.)*
2. Correlate `clusters` (`id`, `members`, `cohesion` $CF_i = \frac{2\mu_i}{2\mu_i + \varepsilon_i}$, `top_nodes`, `packages`) with `entry_points`, `routes`, and `packages`:
   - Group high-cohesion clusters and their associated entry points into named **Capabilities**, inferring a domain/functional capability name from dominant symbols, routes, and package names. If $2\mu_i + \varepsilon_i = 0$, report cohesion as `0.00`.
   - If `clusters` is empty (e.g., on a small or flat repository), group by `packages` + `entry_points` or query top-level symbols via `query_graph` (`MATCH (n) WHERE (n:Function OR n:Method OR n:Class OR n:Route) RETURN labels(n) AS type, n.name AS name, n.file_path AS file, n.qualified_name AS qn ORDER BY n.file_path LIMIT 100`).
   - Identify shared utility/state clusters (overlapping nodes called by $\ge 2$ capability clusters).
   - For up to **4 representative entry points** in single-index mode (or **2–3 per project** in multi-index mode) where symbol names alone are ambiguous, call `get_code_snippet`.
3. **When $\ge 2$ projects are analyzed:**
   - Check native cross-service links via `query_graph` on each project:
     ```cypher
     MATCH (a)-[r:CROSS_HTTP_CALLS|CROSS_GRPC_CALLS|CROSS_GRAPHQL_CALLS|CROSS_TRPC_CALLS|CROSS_ASYNC_CALLS|CROSS_CHANNEL]->(b)
     RETURN a.qualified_name, a.file_path, type(r), b.qualified_name, b.file_path
     LIMIT 100
     ```
   - Check cross-repo library/SDK links by matching `p1` outbound `IMPORTS`/`CALLS` against `p2`'s exported `packages` list from `get_architecture` (and vice versa).
   - If both projects expose `routes` in `get_architecture` and 0 `CROSS_*` edges exist, note that running `/codebase:index --link <other-project>` materializes cross-service edges.

### Step 3b: Mode B — Targeted Capability Inspection (Concern Graph & Feature Location)

For each resolved project:

1. **Seed Location:** Call `search_graph` with `semantic_query: ["<capability>"]` (`semantic_limit: 10`) and, if `<capability>` is an identifier token, `name_pattern: ".*<capability>.*"`.
   - If multiple distinct clusters or entry points match `<capability>` ambiguously, present a numbered disambiguation list (`1..N`) with `file_path` and package context and ask the user to choose.
2. **Cluster & Entry-Point Anchoring:** Call `get_architecture` with `aspects: ["entry_points", "clusters", "packages", "routes"]` to identify which cluster(s) and entry points anchor the matched symbols.
3. **Concern Graph Expansion:** Select 1–3 primary seed entry points (route/handler/command nodes or lowest-inbound/highest-outbound degree symbols) and call `trace_path` with `direction: "outbound"`, `depth: <depth>`, `mode: "calls"`, plus `mode: "cross_service"` when cross-service edges or multiple projects are in scope.
4. **Owned vs. Shared Scope:** Separate symbols and types belonging exclusively to this capability's cluster/package from shared utilities or state types referenced by other clusters.
5. **Source Context:** Call `get_code_snippet` on the anchor entry point and 2–3 spine functions (capped at **4 snippets** in single-index mode and **2–3 snippets per project** in multi-index mode).
6. **When $\ge 2$ projects are analyzed:**
   - If `CROSS_*` edges or cross-project package imports connect Project A to Project B, stitch the trace into an end-to-end cross-index execution spine. If both projects expose `routes` but no `CROSS_*` edges exist, note that running `/codebase:index --link <other-project>` materializes cross-service edges.
   - If the projects are independent or parallel implementations, present each project's Concern Graph and synthesize a side-by-side comparison of execution spines, types, and gaps.

### Step 4: Present Results & Query Fallback

**Zero Matches & Query Fallback:** If `search_graph`, `get_architecture`, or `query_graph` returns empty results for a target, attempt a single fallback pass using `ast-grep -p '<pattern>' -l <lang>` (if installed) or `rg`/`Grep` + `Read`. If still no match is found, output:

```markdown
No matching capability found for "[capability]" in [project_name(s)].

Try:
  - `/codebase:capabilities` (with no arguments) to discover available clusters and boundaries
  - `/codebase:index` to refresh the index
```

**Mode A (Discovery) Output Format:**

```markdown
## Capability Map — [project_name(s)]

### Summary
- **Projects analyzed:** [project_1] ([N] nodes, [M] clusters)[, [project_2] ...]
- **Capabilities identified:** [K]

### Capabilities

#### 1. [Capability Name] (cohesion: [0.XX], [N] symbols)
- **Purpose:** [1-2 sentence synthesis of what this capability does]
- **Entry Points:**
  - `[file_path]:[symbol_name]` (line [L])
- **Owned Scope (Packages & Core Symbols):** `[pkg_1]`, `[pkg_2]` — `[top_node_1]`, `[top_node_2]`, `[top_node_3]`
- **Shared Utilities & Outbound Touchpoints:** [shared modules, state, or external services this capability depends on]

...

### Cross-Index Capability Links (when >= 2 projects)
- **[Capability A] (`[project_1]`) <-> [Capability B] (`[project_2]`):** [Connected via CROSS_HTTP_CALLS | Shared SDK import | Parallel implementation — details]
```

**Mode B (Targeted) Output Format:**

```markdown
## Capability: [Capability Name] ([project_name(s)])

[2-3 sentence synthesis of what this capability does, how it is triggered, and how data/control flows through its Concern Graph.]

### Entry Points
- `[file_path]:[symbol_name]` (line [L]) — [role]

### Execution Spine
1. `[file_path]:[symbol_1]` (line [L]) — [what step 1 does]
   - `[file_path]:[symbol_2]` (line [L]) — [what step 2 does]
     - `[file_path]:[symbol_3]` (line [L]) — [what step 3 does]

### Cohesion & Scope Ownership
- **Cluster Cohesion:** `[0.XX]` ([N] member symbols)
- **Exclusively Owned Packages & Symbols:** `[pkg_1]` (`[SymbolA]`, `[SymbolB]`)
- **Shared / Overlapping Types & State:** `[SharedType]`, `[SharedStore]` (shared with `[other_capability_or_pkg]`)

### Outbound Seams (External Dependencies)
- `[target_package_or_project]:[symbol]` — [why this capability calls out to it]

### Cross-Index Analysis (when >= 2 projects)
- **Relationship:** `[End-to-End Service Flow | Consumer/Provider SDK | Parallel Implementation]`
- [Detailed trace across projects or side-by-side comparison of spine, types, and gaps]
```
