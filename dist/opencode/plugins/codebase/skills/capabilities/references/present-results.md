# Step 4: Present Results & Query Fallback

**Zero Matches & Query Fallback:** If `search_graph`, `get_architecture`, or `query_graph` returns empty results for a target, attempt a single fallback pass using `ast-grep -p '<pattern>' -l <lang>` (if installed) or `rg`/`Grep` + `Read`. If still no match is found, output:

```markdown
No matching capability found for "[capability]" in [project_name(s)].

Try:
  - `/codebase-capabilities` (with no arguments) to discover available clusters and boundaries
  - `/codebase-index` to refresh the index
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
