#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/helpers.sh"
SCRIPT="$SCRIPT_DIR/../lib/build-todo.sh"

tmp=$(mktemp -d); trap "rm -rf $tmp" EXIT
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
exec __GIT_COMMIT_PLUGIN__=1 git commit --amend -F '$msgdir/aaaaaaa'
drop ccccccc
pick ddddddd
exec __GIT_COMMIT_PLUGIN__=1 git commit --amend -F '$msgdir/ddddddd'"
assert_eq "$todo" "$expected" "todo list"

# message files written
assert_eq "$(cat $msgdir/aaaaaaa)" "Retitled parent message" "fixup target message file"
assert_eq "$(head -1 $msgdir/ddddddd)" "Reworded subject" "reword message file subject"
assert_eq "$(cat $msgdir/ddddddd)" "Reworded subject

Body line." "reword message file full body"

echo "PASS"
