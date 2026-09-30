#!/bin/bash
# Intercept git commit commands and redirect to /commit plugin
# This is a deterministic check - no LLM evaluation needed

set -euo pipefail

# Read input from stdin
input=$(cat)

# Extract the command from tool_input
command=$(echo "$input" | jq -r '.tool_input.command // empty')

if [ -z "$command" ]; then
  # No command found, allow
  exit 0
fi

# Check if command contains git commit (but not in a subshell or as part of log/show)
# Pattern: "git commit" or "git" followed by options then "commit"
# Also catches env-var prefixed commands like "VAR=1 git commit"
if echo "$command" | grep -qE '(^|[;&|]\s*|\s)git\s+((-[a-zA-Z]+\s+)*)?commit(\s|$|")'; then
  # Allow commits from the /commit plugin (identified by bypass token)
  if echo "$command" | grep -qF '__GIT_COMMIT_PLUGIN__=1'; then
    exit 0
  fi

  # Check for exceptions - commands that read commit info, not create commits
  if echo "$command" | grep -qE 'git\s+(log|show|rev-parse|status|diff)'; then
    # This is a read operation, allow
    exit 0
  fi

  # Check if this is inside a subshell (likely reading, not writing)
  if echo "$command" | grep -qE '\$\(.*git\s+commit'; then
    exit 0
  fi

  # This is a git commit operation - block it
  cat >&2 <<'EOF'
{
  "error": "Direct git commit detected",
  "message": "Use the /commit command instead of git commit directly.\n\nThe /commit plugin provides:\n- Atomic commit validation\n- Intelligent message generation from conversation context\n- Style enforcement (classic/conventional)\n- Safety checks for amends and force pushes\n\nRun: /commit\n\nOr with options:\n- /commit --style conventional\n- /commit --amend\n- /commit --pair"
}
EOF
  exit 2
fi

# Not a git commit, allow
exit 0
