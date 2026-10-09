#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
skill="SKILL.md"

for field in outcome reason base originalHead newHead decisions plan validation detail; do
  if ! grep -Eq '"'"$field"'"' "$skill"; then
    echo "FAIL: result schema missing field $field"
    exit 1
  fi
done

for reason in conflict drift tests no-base tree-mismatch validation; do
  if ! grep -Eq "$reason" "$skill"; then
    echo "FAIL: result schema missing reason $reason"
    exit 1
  fi
done

for check in cleanWorktree tests noAICoauthor noConflictMarkers noSquashResidue style noTrackerLeaks; do
  if ! grep -Eq '"'"$check"'"' "$skill"; then
    echo "FAIL: result schema missing validation check $check"
    exit 1
  fi
done
