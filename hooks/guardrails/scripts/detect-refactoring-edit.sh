#!/bin/bash
# Detect refactoring patterns in Edit tool calls
# Safety net for catching repeated structural edit patterns
#
# Exit codes:
#   0 - Allow the edit (not a refactoring pattern)
#   2 - Block with advisory (refactoring pattern detected)

set -euo pipefail

# Configuration
TRACKING_FILE="/tmp/claude-guardrails-edits-$$"
PATTERN_THRESHOLD=3  # Number of similar edits before triggering
MAX_TRACKED_EDITS=10

# Read input from stdin (Edit tool input)
input=$(cat)

# Extract old_string and new_string from tool_input
old_string=$(echo "$input" | jq -r '.tool_input.old_string // empty')
new_string=$(echo "$input" | jq -r '.tool_input.new_string // empty')
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')

# If no old_string/new_string, this might be a Write or other operation - allow
if [ -z "$old_string" ] || [ -z "$new_string" ]; then
  exit 0
fi

# Function to normalize strings for comparison (extract the "pattern")
# We look for common substitution patterns
normalize_pattern() {
  local str="$1"
  # Remove file-specific parts, keep structural pattern
  # Normalize whitespace and extract key identifiers
  echo "$str" | tr -s '[:space:]' ' ' | head -c 200
}

# Function to detect if this is a simple substitution pattern
is_simple_substitution() {
  local old="$1"
  local new="$2"

  # Check for import path changes (Go)
  if echo "$old" | grep -qE '"[^"]+/[^"]+"' && echo "$new" | grep -qE '"[^"]+/[^"]+"'; then
    # Both contain quoted paths - likely import change
    local old_path=$(echo "$old" | grep -oE '"[^"]+/[^"]+"' | head -1)
    local new_path=$(echo "$new" | grep -oE '"[^"]+/[^"]+"' | head -1)
    if [ -n "$old_path" ] && [ -n "$new_path" ]; then
      echo "import:${old_path}→${new_path}"
      return 0
    fi
  fi

  # Check for identifier renames (CamelCase or snake_case)
  # Extract potential identifier patterns
  local old_ids=$(echo "$old" | grep -oE '\b[A-Z][a-zA-Z0-9]*\b|\b[a-z][a-z0-9]*(_[a-z0-9]+)+\b' | sort -u | head -5)
  local new_ids=$(echo "$new" | grep -oE '\b[A-Z][a-zA-Z0-9]*\b|\b[a-z][a-z0-9]*(_[a-z0-9]+)+\b' | sort -u | head -5)

  # If same structure with different identifiers, might be rename
  local old_count=$(echo "$old_ids" | wc -l)
  local new_count=$(echo "$new_ids" | wc -l)

  if [ "$old_count" -eq "$new_count" ] && [ "$old_count" -gt 0 ]; then
    # Check if there's a consistent substitution
    local old_main=$(echo "$old_ids" | head -1)
    local new_main=$(echo "$new_ids" | head -1)
    if [ "$old_main" != "$new_main" ] && [ -n "$old_main" ] && [ -n "$new_main" ]; then
      # Check if old_main appears in old and new_main appears in new at same positions
      local old_positions=$(echo "$old" | grep -bo "$old_main" 2>/dev/null | cut -d: -f1 | head -3 | tr '\n' ',')
      local new_positions=$(echo "$new" | grep -bo "$new_main" 2>/dev/null | cut -d: -f1 | head -3 | tr '\n' ',')
      if [ "$old_positions" = "$new_positions" ] && [ -n "$old_positions" ]; then
        echo "rename:${old_main}→${new_main}"
        return 0
      fi
    fi
  fi

  echo ""
  return 1
}

# Detect pattern type
pattern=$(is_simple_substitution "$old_string" "$new_string" || echo "")

# If no clear pattern, allow the edit
if [ -z "$pattern" ]; then
  exit 0
fi

# Track this pattern
# Use a session-based tracking file
session_file="${TRACKING_FILE%%-*}-session"

# Initialize or read tracking data
if [ -f "$session_file" ]; then
  # Count how many times this pattern has appeared
  count=$(grep -cF "$pattern" "$session_file" 2>/dev/null || echo "0")
else
  count=0
  touch "$session_file"
fi

# Record this pattern
echo "$pattern" >> "$session_file"

# Keep file from growing too large
if [ "$(wc -l < "$session_file")" -gt "$MAX_TRACKED_EDITS" ]; then
  tail -n "$MAX_TRACKED_EDITS" "$session_file" > "${session_file}.tmp"
  mv "${session_file}.tmp" "$session_file"
fi

# Check if pattern threshold exceeded
count=$((count + 1))
if [ "$count" -ge "$PATTERN_THRESHOLD" ]; then
  # Clean up tracking file on trigger
  rm -f "$session_file"

  # Extract pattern details for the message
  pattern_type=$(echo "$pattern" | cut -d: -f1)
  pattern_detail=$(echo "$pattern" | cut -d: -f2-)

  cat >&2 <<EOF
{
  "decision": "block",
  "reason": "Repeated refactoring pattern detected",
  "pattern_type": "$pattern_type",
  "pattern": "$pattern_detail",
  "count": $count,
  "suggestion": "This appears to be a structural refactoring operation (${pattern_type}). IDE semantic refactoring would handle this more efficiently. Consider using the /handoff command to generate IDE instructions."
}
EOF
  exit 2
fi

# Pattern tracked but threshold not reached, allow
exit 0
