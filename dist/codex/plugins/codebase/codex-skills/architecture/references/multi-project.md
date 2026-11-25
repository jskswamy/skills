# Several Projects

For two or more projects:

1. Recover each project's architecture separately (`recover.md`), each from its own fresh index.
2. Check each repo against its own rules (its own `ARCHITECTURE.md`) only (`check.md`). Cross-repo rules — rules naming another repo's paths — are out of scope for this version; if a block names a path outside its own repo, report it as unverifiable.
3. Cross-repo dependencies: query each project for `CROSS_HTTP_CALLS|CROSS_GRPC_CALLS|CROSS_GRAPHQL_CALLS|CROSS_TRPC_CALLS|CROSS_ASYNC_CALLS|CROSS_CHANNEL` edges, and match one project's outbound `IMPORTS`/`CALLS` against the other's exported packages. Attribute each edge to the source and target component.
4. If two projects have no cross edges and were never linked, say they are not linked and that `$codebase:index --link <other-project>` creates the edges; do not guess at their integration.
5. Draw one Mermaid diagram with a `subgraph` per project and cross-repo arrows labelled with the edge type and count.
