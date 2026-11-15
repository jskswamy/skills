# Step 3b: Mode B — Targeted Capability Inspection (Concern Graph & Feature Location)

For each resolved project:

1. **Seed Location:** Call `search_graph` with `semantic_query: ["<capability>"]` (`semantic_limit: 10`) and, if `<capability>` is an identifier token, `name_pattern: ".*<capability>.*"`.
   - If multiple distinct clusters or entry points match `<capability>` ambiguously, present a numbered disambiguation list (`1..N`) with `file_path` and package context and ask the user to choose.
2. **Cluster & Entry-Point Anchoring:** Call `get_architecture` with `aspects: ["entry_points", "clusters", "packages", "routes"]` to identify which cluster(s) and entry points anchor the matched symbols.
3. **Concern Graph Expansion:** Select 1–3 primary seed entry points (route/handler/command nodes or lowest-inbound/highest-outbound degree symbols) and call `trace_path` with `direction: "outbound"`, `depth: <depth>`, `mode: "calls"`, plus `mode: "cross_service"` when cross-service edges or multiple projects are in scope.
4. **Owned vs. Shared Scope:** Separate symbols and types belonging exclusively to this capability's cluster/package from shared utilities or state types referenced by other clusters.
5. **Source Context:** Call `get_code_snippet` on the anchor entry point and 2–3 spine functions (capped at **4 snippets** in single-index mode and **2–3 snippets per project** in multi-index mode).
6. **When $\ge 2$ projects are analyzed:**
   - If `CROSS_*` edges or cross-project package imports connect Project A to Project B, stitch the trace into an end-to-end cross-index execution spine. If both projects expose `routes` but no `CROSS_*` edges exist, note that running `/codebase-index --link <other-project>` materializes cross-service edges.
   - If the projects are independent or parallel implementations, present each project's Concern Graph and synthesize a side-by-side comparison of execution spines, types, and gaps.
