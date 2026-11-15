# Step 3b: Mode B — Targeted Seam Inspection (`<source>` and optional `<target>` within a project)

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
