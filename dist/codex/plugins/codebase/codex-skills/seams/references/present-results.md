# Step 4: Present Results & Query Fallback

**Zero Matches & Query Fallback:** If `get_architecture` or `query_graph` returns empty results for a target, attempt a single fallback pass using `ast-grep -p '<pattern>' -l <lang>` (if installed) or `rg`/`Grep` + `Read`. If still no match is found, output:

```markdown
No matching seam found for "[target]" in [project_name(s)].

Try:
  - `$codebase:seams` (with no arguments) to discover available clusters and boundaries
  - `$codebase:index` to refresh the index
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
