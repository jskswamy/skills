#!/usr/bin/env bash
# Check for active parked-idea wisps in .beads-wisp/ when a session ends.

set -euo pipefail

WISP_JSON=$(bd mol wisp list --json 2>/dev/null) || exit 0
if [ -z "$WISP_JSON" ] || [ "$WISP_JSON" = "[]" ] || [ "$WISP_JSON" = "null" ]; then
  exit 0
fi

python3 -c '
import json, sys

try:
    data = json.load(sys.stdin)
except Exception:
    sys.exit(0)

items = (
    data if isinstance(data, list)
    else (data.get("wisps") or data.get("issues") or []) if isinstance(data, dict)
    else []
)

parked = []
for i in items:
    if not isinstance(i, dict):
        continue
    if i.get("status") in ("closed", "tombstone"):
        continue
    labels = i.get("labels") or ([i["label"]] if i.get("label") else [])
    if "parked-idea" in labels and "debug-wisp" not in labels:
        parked.append(i)

if not parked:
    sys.exit(0)

lines = [f"  - {i.get(\"id\", \"?\")}: {i.get(\"title\", \"Untitled\")} (P{i.get(\"priority\", 2)})" for i in parked]
msg = (
    f"You have {len(parked)} parked wisp(s) in .beads-wisp/:\n"
    + "\n".join(lines)
    + "\nRun /craft-park review or /craft-park promote <id> --shape to triage them."
)
print(json.dumps({"systemMessage": msg}))
' <<< "$WISP_JSON" 2>/dev/null || exit 0
