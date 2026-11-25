# Recover the Architecture

Derive everything from the fresh index (or source inspection, labelled), never from earlier output.

1. Call `get_architecture` with `aspects: ["packages", "entry_points", "layers", "boundaries", "cycles", "clusters"]`. *(Never request `system_structure`.)*
2. **Components.** When the rules block declares `components`, use exactly those (and list files matching none of them as `unassigned`). Otherwise infer them: top-level packages or directories, merged or split using `clusters` so each component is a cohesive unit; name each after its dominant directory or concept.
3. **Responsibility.** For each component, one line built from its entry points and most-called public symbols (`search_graph` by file path; `get_code_snippet` on at most 2 ambiguous symbols per component).
4. **Dependencies.** For each ordered component pair, count edges with a sanitized `query_graph`:
   ```cypher
   MATCH (a)-[r:CALLS|IMPORTS]->(b)
   WHERE a.file_path STARTS WITH '<pathA>' AND b.file_path STARTS WITH '<pathB>' AND a.file_path <> b.file_path
   RETURN count(r) AS edges
   ```
   Report the edge count for every non-zero pair. If the graph has no line numbers for an edge you need to cite, find the import or call with `rg` and cite that `file:line`.
5. **Layers.** Order components by dependency direction (use `layers` fan-in/fan-out): components nothing depends on at the top (entry), components everything depends on at the bottom (core). Flag any edge pointing upward as a layer inversion.
6. **Cycles.** From `cycles`, plus any component pair with edges in both directions. Name the edges that close each cycle.
7. **Diagram.** One Mermaid `flowchart TD` with one node per component and one arrow per dependency, labelled with its edge count. Mark cycles and inversions with a dashed red arrow (`-.->` and `linkStyle`).
