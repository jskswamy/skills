#!/usr/bin/env bash
# SessionStart: remind the agent to use codebase-memory-mcp tools first.
# Silent when the binary is absent, so machines without it see nothing.
command -v codebase-memory-mcp >/dev/null 2>&1 || exit 0
cat <<'REMINDER'
Code Discovery Protocol:
1. Use codebase-memory-mcp tools FIRST for code exploration:
   - search_graph(name_pattern/label/qn_pattern) to find functions/classes/routes
   - trace_path(function_name, mode=calls|data_flow|cross_service) for call chains
   - get_code_snippet(qualified_name) for exact symbol source
   - query_graph(query) for complex Cypher patterns
   - get_architecture(aspects) for project structure
   - search_code(pattern) for text search (graph-augmented grep)
2. Use Grep/Glob/Read freely for text, configs, non-code files, and
   always Read a file before editing it.
3. If a project is not indexed yet, run index_repository FIRST.
REMINDER
