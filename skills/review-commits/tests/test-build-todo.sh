#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# Helpers are linted separately; pre-commit may batch this file without them.
# shellcheck source=/dev/null
source "$SCRIPT_DIR/helpers.sh"
SCRIPT="$SCRIPT_DIR/../lib/build-todo.sh"

tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
plan="$tmp/plan.yaml"
msgdir="$tmp/msgs"
mkdir -p "$msgdir"

cat > "$plan" <<'EOF'
base: deadbeef0000000000000000000000000000beef
style_file: /tmp/classic.md
actions:
  - hash: aaaaaaa
    action: pick
  - hash: bbbbbbb
    action: fixup
    fixup_target_message: |
      Retitled parent message
  - hash: ccccccc
    action: drop
  - hash: ddddddd
    action: reword
    new_message: |
      Reworded subject

      Body line.
EOF

todo=$(bash "$SCRIPT" "$plan" "$msgdir")
expected="pick aaaaaaa
fixup bbbbbbb
drop ccccccc
pick ddddddd"
assert_eq "$(grep -v '^exec ' <<<"$todo")" "$expected" "todo actions"
assert_eq "$(grep -c '^exec ' <<<"$todo")" 2 "two message applications"

# message files written
assert_eq "$(cat "$msgdir/aaaaaaa")" "Retitled parent message" "fixup target message file"
assert_eq "$(head -1 "$msgdir/ddddddd")" "Reworded subject" "reword message file subject"
assert_eq "$(cat "$msgdir/ddddddd")" "Reworded subject

Body line." "reword message file full body"

echo "PASS"
