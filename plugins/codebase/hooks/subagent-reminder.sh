#!/usr/bin/env bash
# SubagentStart: subagents do not see the session reminder, so repeat it.
# Present if the binary is on PATH or an MCP config names it (it may be launched by absolute path).
command -v codebase-memory-mcp >/dev/null 2>&1 \
  || grep -qs codebase-memory-mcp "$HOME/.claude.json" .mcp.json || exit 0
cat <<'REMINDER'
{"hookSpecificOutput":{"hookEventName":"SubagentStart","additionalContext":"Code discovery: prefer codebase-memory-mcp tools (search_graph, trace_path, get_code_snippet, query_graph, get_architecture, search_code) over grep/file-read for navigating code. Use Grep/Glob/Read for text, configs, and non-code files."}}
REMINDER
