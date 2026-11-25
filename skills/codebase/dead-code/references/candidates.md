# Find and Verify Candidates

1. **Candidates.** Functions, methods and classes with no inbound `CALLS`, `IMPORTS`, `USES`, `IMPLEMENTS` or `INHERITS` edges whose source is not a test file (a path under `test/`, `tests/`, `__tests__/`, `spec/`, or named `*.test.*`, `*_test.*`, `*.spec.*`, `test_*.py`):
   ```cypher
   MATCH (n) WHERE (n:Function OR n:Method OR n:Class) AND n.file_path CONTAINS '<path>'
   OPTIONAL MATCH (m)-[:CALLS|IMPORTS|USES|IMPLEMENTS|INHERITS]->(n)
   WITH n, [x IN collect(m) WHERE NOT x.file_path =~ '.*(/tests?/|/__tests__/|/spec/|[._]test\\.|\\.spec\\.|/test_[^/]*\\.py$).*'] AS prod, count(m) AS all
   WHERE size(prod) = 0
   RETURN n.qualified_name, n.file_path, labels(n), all > 0 AS used_by_tests LIMIT 200
   ```
   Rows with `used_by_tests` true are listed as `unsure: used only by tests`. If 200 rows come back, say the list was cut at 200 and suggest a narrower `<path>`.
2. **Exclude** what is reached from outside the graph:
   - entry points (`get_architecture` `entry_points`, `main`, CLI commands, `package.json` `bin`/`scripts` targets, routes);
   - the exported public API of a library (package `exports`/`main`, `__all__`, public Go identifiers in a non-`main` package) — report these separately only if the user asks;
   - symbols defined in test files themselves;
   - framework-registered handlers (decorators, annotations, registry tables, hook names in config).
3. **Verify each remaining candidate** with `rg --hidden -g '!.git' -wF <name>` across the repo (hidden folders such as `.github/` and `.claude-plugin/` hold config that wires code by name), including non-code files (config, YAML, JSON, Markdown, templates, shell). A hit outside its own definition means dynamic dispatch, reflection, config wiring or documentation: label it `unsure: <file:line of the hit>`. No hit: `likely dead`.
4. **Never delete** or edit anything. Offer: open the `likely dead` items for review, or, when `bd` is available, file one beads issue listing them. Act only on a yes.
