#!/usr/bin/env bash
# SubagentStart: subagents do not see the session reminder, so repeat it.
command -v codebase-memory-mcp >/dev/null 2>&1 || exit 0
cat <<'REMINDER'
{"hookSpecificOutput":{"hookEventName":"SubagentStart","additionalContext":"Code discovery: prefer codebase-memory-mcp tools (search_graph, trace_path, get_code_snippet, query_graph, get_architecture, search_code) over grep/file-read for navigating code. Use Grep/Glob/Read for text, configs, and non-code files."}}
REMINDER
