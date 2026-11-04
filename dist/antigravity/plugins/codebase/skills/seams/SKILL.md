---
name: seams
description: "Inspect architectural seams and coupling across packages or repos. [<source> [<target>]] [--project <name>...] Use when the user wants to identify, inspect, or audit architectural seams and boundaries within a codebase or across indexed repositories: 'what are the seams', 'find leaky seams', 'show the boundary between X and Y', 'where can we split or decouple X', 'how does repo A integrate with repo B'. Not for tracing a single symbol's call tree (use codebase:graph) or diff blast radius (use codebase:impact)."
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

1. For the current workspace's project, read `.claude/codebase.local.md` if it exists (`auto_index: always | ask | never`, default `ask`; `index_mode: full | moderate | fast`, default `moderate`).
2. If the current workspace project is in scope and is not indexed or `last_indexed` is missing:
   - `auto_index: always` → run `index_repository` with the configured `index_mode` and update `.claude/codebase.local.md`.
   - `auto_index: never` → print a hint to run `/codebase:index` and fall back or exit.
   - `auto_index: ask` → prompt the user (`Yes, always` / `Yes, once` / `No`) using the harness question mechanism (AskUserQuestion in Claude Code; direct chat prompt in Pi).
3. If `last_indexed` is $>24$ hours old (stale): refresh if `always`, warn and proceed if `never`, or prompt (`Yes, always` / `Yes, once` / `No, use stale index`) if `ask`.
4. For external projects specified via `--project`, verify each via `index_status`; warn and skip any unindexed external project while proceeding with indexed ones.

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

1. Call `get_architecture` with `aspects: ["boundaries", "layers", "cycles", "packages", "hotspots"]` for each project. *(Never request `system_structure`.)*
2. From `layers` (`fan-in` $C_a$, `fan-out` $C_e$), compute package **Instability** $I = \frac{C_e}{C_a + C_e}$ (report `N/A (isolated)` when $C_a + C_e = 0$).
3. Use `boundaries` from `get_architecture` to get the ranked package-to-package crossing counts ($E_{A \to B}$ and reverse $E_{B \to A}$).
4. For the top candidate boundary pairs (`pkg_a -> pkg_b`, up to 5 pairs), run a targeted, sanitized `query_graph` Cypher query to inspect the concrete symbol witnesses and distinct target count ($T_{A \to B}$):
   ```cypher
   MATCH (a)-[r:CALLS|IMPORTS|IMPLEMENTS|CONFIGURES]->(b)
   WHERE a.file_path CONTAINS '<pkg_a>' AND b.file_path CONTAINS '<pkg_b>' AND a.file_path <> b.file_path
   RETURN a.qualified_name, a.file_path, type(r), b.qualified_name, b.file_path
   LIMIT 100
   ```
   *(If `<pkg_a>` is a path prefix of `<pkg_b>`, append `AND NOT a.file_path CONTAINS '<pkg_b>'`; symmetrically if `<pkg_b>` is a prefix of `<pkg_a>`.)*
5. Call `get_code_snippet` on up to **4 representative boundary targets/callers** (or **2–3 per project** in multi-index mode) to verify enabling points.
6. Classify each boundary:
   - **Seam Type:** `Object/Interface` (`IMPLEMENTS`/`INHERITS`/injected fn), `Link/Module` (`IMPORTS`/`CALLS` across packages), `Service/IPC` (`CROSS_*_CALLS`), or `Configuration` (`CONFIGURES`).
   - **Health Classification:**
     - `Clean`: Unidirectional ($I_A \ge I_B$), zero cycles, narrow surface (crossings funnel into 1–3 public entrypoints/interfaces in `B`).
     - `Chatty`: Unidirectional, zero cycles, wide surface ($T_{A \to B}$ spans many symbols across `B`).
     - `Leaky`: Bidirectional coupling / cycle ($A \leftrightarrow B$), layer inversion ($I_A < I_B$, e.g., `core` calling `entry`/`internal`), or callers bypassing `B`'s public entrypoints to invoke internal helpers.

### Step 3b: Mode B — Targeted Seam Inspection (`<source>` and optional `<target>` within a project)

1. If `<source>` or `<target>` matches multiple distinct packages or symbols ambiguously, present a numbered disambiguation list (`1..N`) with `file_path` context and ask the user to choose.
2. Run forward (`<source> -> <target>`) and reverse (`<target> -> <source>`) Cypher queries via `query_graph`:
   ```cypher
   MATCH (a)-[r:CALLS|IMPORTS|IMPLEMENTS|CONFIGURES]->(b)
   WHERE a.file_path CONTAINS '<source>' AND b.file_path CONTAINS '<target>' AND a.file_path <> b.file_path
   RETURN a.qualified_name, a.file_path, type(r), b.qualified_name, b.file_path
   LIMIT 200
   ```
   - If `<source>` is a path prefix of `<target>`, append `AND NOT a.file_path CONTAINS '<target>'` (and symmetrically if `<target>` is a prefix of `<source>`).
   - Repeat with `<source>` and `<target>` swapped for reverse crossings.
   - If `<target>` is omitted, query outbound seams with `WHERE a.file_path CONTAINS '<source>' AND NOT b.file_path CONTAINS '<source>'` and inbound seams with `WHERE NOT a.file_path CONTAINS '<source>' AND b.file_path CONTAINS '<source>'`.
3. Compute $I = \frac{C_e}{C_a + C_e}$ from `get_architecture(aspects: ["layers", "cycles"])` (or from inbound/outbound cross-boundary edge counts of that path prefix if `<source>`/`<target>` is a sub-package slice not listed in `layers`; report `N/A (isolated)` when $C_a + C_e = 0$).
4. Call `get_code_snippet` on the top 2–4 crossing targets and caller sites to identify the **Contract Surface**, **Leaky Crossings**, and the exact **Enabling Point** (`file:line` where behavior across the seam can be substituted without editing callers).

### Step 3c: Mode C — Multi-Index Seam Analysis (`>= 2` projects)

1. **Service/IPC Seams:** Query native `CROSS_*` edges in each resolved project via `query_graph`:
   ```cypher
   MATCH (a)-[r:CROSS_HTTP_CALLS|CROSS_GRPC_CALLS|CROSS_GRAPHQL_CALLS|CROSS_TRPC_CALLS|CROSS_ASYNC_CALLS|CROSS_CHANNEL]->(b)
   RETURN a.qualified_name, a.file_path, type(r), b.qualified_name, b.file_path
   LIMIT 200
   ```
2. **Library/SDK Import Seams:** Call `get_architecture(aspects: ["packages", "entry_points", "routes"])` on each project. For each exported package prefix `<p2_pkg>` in `p2`, query `p1` with a bounded filter:
   ```cypher
   MATCH (a)-[r:CALLS|IMPORTS|IMPLEMENTS]->(b)
   WHERE b.qualified_name CONTAINS '<p2_pkg>'
   RETURN a.qualified_name, a.file_path, type(r), b.qualified_name, b.file_path
   LIMIT 100
   ```
   (and vice versa from `p2` to `p1`). If `<source>` and/or `<target>` sub-package filters were also passed alongside `--project`, additionally filter `a.file_path CONTAINS '<source>'` and `b.file_path CONTAINS '<target>'`.
3. Call `get_code_snippet` on up to **2–3 boundary symbols per project** to inspect contract surfaces and enabling points.
4. If no `CROSS_*` edges exist and both projects expose `routes` in `get_architecture`, include a note recommending `/codebase:index --link <other-project>` to materialize cross-service edges.

### Step 4: Present Results & Query Fallback

**Zero Matches & Query Fallback:** If `get_architecture` or `query_graph` returns empty results for a target, attempt a single fallback pass using `ast-grep -p '<pattern>' -l <lang>` (if installed) or `rg`/`Grep` + `Read`. If still no match is found, output:

```markdown
No matching seam found for "[target]" in [project_name(s)].

Try:
  - `/codebase:seams` (with no arguments) to discover available clusters and boundaries
  - `/codebase:index` to refresh the index
```

**Mode A (Discovery) Output Format:**

```markdown
## Architectural Seams — [project_name(s)]

### Layer & Stability Summary
- **Layers & Instability (I = Ce / (Ca + Ce)):**
  - `[pkg_or_layer]` ([entry|internal|core]): fan-in Ca=[X], fan-out Ce=[Y], I=[0.XX | N/A (isolated)]
- **Cycles Detected:** [None | list of cyclic package pairs]

### Boundary Ranking

| Boundary (`Source -> Target`) | Forward Crossings | Reverse Crossings | Distinct Targets | Seam Type | Health |
|-------------------------------|-------------------|-------------------|------------------|-----------|--------|
| `[pkg_a] -> [pkg_b]` | [N] | [M] | [T] | `Object` \| `Link` \| `Service` \| `Config` | `Clean` \| `Chatty` \| `Leaky` |

### Notable Seams & Actionable Findings

#### 1. `[pkg_a] <-> [pkg_b]` — [Clean | Chatty | Leaky] ([Seam Type])
- **What crosses here:** [1-2 sentence synthesis of why `pkg_a` depends on `pkg_b`]
- **Contract Surface:** `[file_path]:[symbol]` (line [L]) — called [K] times
- **Enabling Point:** `[file_path]:[symbol_or_config]` (line [L]) — [how behavior is bound or can be substituted here]
- **Leak / Coupling Risk:** [None — narrow facade | Direct calls into internal helpers `[file:symbol]`, bidirectional cycle, or layer inversion (I_source < I_target)]
- **Seam Recommendation:** [How to test, mock, split, or tighten this boundary]
```

**Mode B / Mode C (Targeted / Multi-Index) Output Format:**

```markdown
## Seam Inspection: [Source] <-> [Target] ([project_name(s)])

### Boundary Summary
- **Direction & Volume:** `[Source] -> [Target]` ([N] forward crossings across [T] distinct targets), `[Target] -> [Source]` ([M] reverse crossings)
- **Stability Alignment:** `[Source]` (I=[0.XX]) -> `[Target]` (I=[0.YY]) — `[Aligned (I_src >= I_tgt) | Inverted (I_src < I_tgt) | Cyclic | N/A]`
- **Seam Type:** `[Object/Interface | Link/Module | Service/IPC | Configuration]`
- **Seam Health:** `[Clean | Chatty | Leaky | Bidirectional Cycle]`

### Enabling Points (Where to Intercept / Substitute Behavior)
- `[file_path]:[symbol]` (line [L]) — [How callers bind to `[Target]` and how to swap/mock/reroute without editing call sites, or "No single enabling point — callers invoke concrete internals directly at [N] sites"]

### Contract Surface (Intended Entrypoints)
- `[target_file]:[target_symbol]` (line [L]) — [K] inbound crossings from `[source_file]:[caller_symbol]` (line [L])
  [Brief explanation of the contract]

### Leaky Crossings
- `[caller_file]:[caller_symbol]` (line [L]) -> `[target_file]:[internal_symbol]` (line [L])
  [Why this crossing bypasses the contract or inverts layers, or "None detected — all crossings go through the contract surface."]

### Seam Guidance (Testing, Splitting, or Refactoring)
- **To test/isolate at this seam:** [Concrete advice naming the enabling point or interface]
- **To widen/tighten this seam:** [Concrete narrow interface, facade, or DIP extraction if leaky]
```
