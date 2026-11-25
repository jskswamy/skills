# Build the Tour

Aim for 8–12 steps (fewer for a small area). Order matters more than coverage.

1. **Scope.** With `<area>`, restrict every query to files under that path, or for a concept, to the files returned by `search_graph` / `search_code` for it.
2. **Entry points first.** Call `get_architecture` with `aspects: ["entry_points", "packages", "layers", "clusters"]`. Pick the 1–3 entry points a reader meets first (CLI main, server start, exported API, build script). Read the README or top-level docs only if they exist and are short; never quote them as fact about the code.
3. **Core next.** Rank the remaining symbols and files by fan-in (inbound `CALLS`/`IMPORTS` edges; `layers` fan-in for packages). The most depended-on modules and types are the core. Choose 3–5, following the path an entry point actually calls (`trace_path` outbound, depth 2–3) so each step leads to the next.
4. **Edges last.** Adapters, integrations, configuration and tests that show usage: 2–3 items, preferring a test that exercises the core end to end.
5. **For each step** give the `file:line`, a one-line why: why to read it next (what the previous step pointed to, or what it unlocks), and one thing to notice there. Use `get_code_snippet` on at most 4 symbols where the name alone does not say what it does.
