#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/helpers.sh"
SCRIPT="$SCRIPT_DIR/../lib/apply-split.sh"

tmp=$(mktemp -d); trap "rm -rf $tmp" EXIT
mk_repo "$tmp/repo"
cd "$tmp/repo"
echo a > a.txt; echo b > b.txt
git -c user.email=t@t -c user.name=t add . && git -c user.email=t@t -c user.name=t commit -q -m "compound"
HASH=$(git rev-parse --short HEAD)

# the split plan: a.txt to one commit, b.txt to another
plan="$tmp/plan.yaml"
cat > "$plan" <<EOF
base: $(git rev-parse HEAD~1)
style_file: ignored
actions:
  - hash: $HASH
    action: edit
    split_into:
      - files: [a.txt]
        message: |
          Add a
      - files: [b.txt]
        message: |
          Add b
EOF

# simulate rebase --exec position: HEAD is the commit just applied.
GIT_AUTHOR_NAME=t GIT_AUTHOR_EMAIL=t@t \
GIT_COMMITTER_NAME=t GIT_COMMITTER_EMAIL=t@t \
  bash "$SCRIPT" "$HASH" "$plan"

# expect two new commits, oldest first
log=$(git log --format=%s HEAD~2..HEAD)
expected="Add b
Add a"
assert_eq "$log" "$expected" "split produces two commits in order"

echo "PASS"
