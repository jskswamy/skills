# Find and Verify Candidates

1. **Candidates.** Functions, methods, classes and module-level constants with no inbound `CALLS`, `IMPORTS`, `USES`, `IMPLEMENTS` or `INHERITS` edges:
   ```cypher
   MATCH (n) WHERE (n:Function OR n:Method OR n:Class) AND n.file_path STARTS WITH '<path>'
   AND NOT ()-[:CALLS|IMPORTS|USES|IMPLEMENTS|INHERITS]->(n)
   RETURN n.qualified_name, n.file_path, labels(n) LIMIT 200
   ```
2. **Exclude** what is reached from outside the graph:
   - entry points (`get_architecture` `entry_points`, `main`, CLI commands, `package.json` `bin`/`scripts` targets, routes);
   - the exported public API of a library (package `exports`/`main`, `__all__`, public Go identifiers in a non-`main` package) — report these separately only if the user asks;
   - tests and test helpers, and anything only tests use is listed as `unsure: used only by tests`;
   - framework-registered handlers (decorators, annotations, registry tables, hook names in config).
3. **Verify each remaining candidate** with `rg` for its bare name across the repo, including non-code files (config, YAML, JSON, Markdown, templates, shell). A hit outside its own definition means dynamic dispatch, reflection, config wiring or documentation: label it `unsure: <file:line of the hit>`. No hit: `likely dead`.
4. **Never delete** or edit anything. Offer: open the `likely dead` items for review, or, when `bd` is available, file one beads issue listing them. Act only on a yes.
