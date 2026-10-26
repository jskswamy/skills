#!/usr/bin/env bash
# Intercepts grep/rg Bash calls, injects codebase-memory graph results as context.
# Fail-open: any error produces no output and exits 0. Never blocks Claude's grep.

INPUT=$(cat)

# Only act on grep/rg commands
CMD=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)
if [ -z "$CMD" ]; then exit 0; fi
if ! echo "$CMD" | grep -qE '\b(grep|rg|ripgrep)\b'; then exit 0; fi

# Extract search pattern — first quoted string wins, fall back to first token after grep/rg
PATTERN=$(echo "$CMD" | grep -oP '(?<=")((?:[^"\\]|\\.)*?)(?=")' | head -1)
if [ -z "$PATTERN" ]; then
  PATTERN=$(echo "$CMD" | grep -oP "(?<=')((?:[^'\\\\]|\\\\.)*?)(?=')" | head -1)
fi
if [ -z "$PATTERN" ]; then
  PATTERN=$(echo "$CMD" | sed -E 's/.*\b(grep|rg|ripgrep)\b\s+(-[a-zA-Z0-9]+\s+)*//' | awk '{print $1}' | tr -d '"'"'")
fi
if [ -z "$PATTERN" ] || [ ${#PATTERN} -lt 2 ]; then exit 0; fi

# Derive project name from git root
GIT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
PROJECT=$(echo "$GIT_ROOT" | sed 's|^/||; s|/|-|g')

# Query the graph
RESULTS=$(codebase-memory-mcp cli search_graph \
  "{\"name_pattern\": \"$PATTERN\", \"limit\": 8, \"project\": \"$PROJECT\"}" \
  2>/dev/null) || exit 0

TOTAL=$(echo "$RESULTS" | jq -r '.total // 0' 2>/dev/null)
if [ -z "$TOTAL" ] || [ "$TOTAL" -eq 0 ] 2>/dev/null; then exit 0; fi

# Format and inject — skip multiline names (indexed template noise), truncate long ones
echo "[codebase-memory: $TOTAL symbol(s) matching \"$PATTERN\"]"
echo "$RESULTS" | jq -r '
  .results[]
  | select((.name | test("\n")) | not)
  | select((.name | length) < 100)
  | "  \(.label): \(.name)  (\(.file_path))"
' 2>/dev/null
echo "[grep proceeding — use graph results above if sufficient]"
