# Step 3a: Mode A — Seam Discovery (No `<source>`/`<target>`)

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
