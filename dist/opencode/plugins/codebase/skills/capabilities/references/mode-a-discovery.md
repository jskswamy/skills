# Step 3a: Mode A — Capability Discovery (Architecture Recovery)

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
   - If both projects expose `routes` in `get_architecture` and 0 `CROSS_*` edges exist, note that running `/codebase-index --link <other-project>` materializes cross-service edges.
