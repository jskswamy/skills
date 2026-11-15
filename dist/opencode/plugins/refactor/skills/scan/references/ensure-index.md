# Step 0c: Ensure Codebase is Indexed

Required for all scopes (the diff scope already needed this).

1. Resolve the transport above and call `list_projects`. Only if neither MCP nor CLI works, explain that semantic scanning requires either a configured MCP server or the installed `codebase-memory-mcp` CLI, then exit. Do not substitute a grep-only scan for semantic scanning.

2. Determine the project name from the repo:
   ```bash
   basename $(git rev-parse --show-toplevel)
   ```
   If the project is not in `list_projects`, automatically run `/codebase-index`.

3. For `--scope=package` or `--scope=all`, if `last_indexed` (from `.claude/codebase.local.md`) is missing or >24 hours old, run `/codebase-index` automatically. For `--scope=diff`, only re-index if the project is missing entirely (preserve current freshness behavior).
