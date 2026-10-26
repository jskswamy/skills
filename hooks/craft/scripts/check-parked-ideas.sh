#!/usr/bin/env bash
set -euo pipefail

# Check if bd is available
command -v bd >/dev/null 2>&1 || exit 0

# Check if we're in a bd workspace
if ! bd list --status=open --json >/dev/null 2>&1; then
  exit 0
fi

# Get the most recent commit message
COMMIT_MSG=$(git log -1 --pretty=format:"%B" 2>/dev/null) || exit 0

# Look for beads task ID patterns in the commit message
TASK_ID=$(echo "$COMMIT_MSG" | grep -oE '[a-z]+-[a-z0-9]+(\.[0-9]+)?' | head -1) || true

if [ -z "$TASK_ID" ]; then
  exit 0
fi

# Check for parked ideas
PARKED=$(bd list --status=deferred -l parked-idea --json 2>/dev/null) || exit 0

if [ -z "$PARKED" ] || [ "$PARKED" = "[]" ] || [ "$PARKED" = "null" ]; then
  exit 0
fi

# Stop output reaches the user only as JSON; plain stdout is never shown.
echo "$PARKED" | python3 -c '
import sys, json
items = json.load(sys.stdin)
if items:
    lines = [f"You have {len(items)} parked idea(s). Review with: /parked list"]
    lines += ["  - " + str(i.get("id", "?")) + ": " + str(i.get("title", "untitled")) for i in items]
    print(json.dumps({"systemMessage": "\n".join(lines)}))
' 2>/dev/null || exit 0
