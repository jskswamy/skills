# Step 3c: Mode C — Multi-Index Seam Analysis (`>= 2` projects)

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
4. If no `CROSS_*` edges exist and both projects expose `routes` in `get_architecture`, include a note recommending `/codebase-index --link <other-project>` to materialize cross-service edges.
