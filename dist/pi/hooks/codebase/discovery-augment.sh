#!/usr/bin/env bash
# PreToolUse on Grep|Glob: add graph context to a search. Never blocks;
# any failure is silent.
command -v codebase-memory-mcp >/dev/null 2>&1 || exit 0
codebase-memory-mcp hook-augment 2>/dev/null
exit 0
