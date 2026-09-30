#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/helpers.sh"
SCRIPT="$SCRIPT_DIR/../lib/revalidate.sh"
LIB_DIR="$SCRIPT_DIR/../lib"

tmp=$(mktemp -d); trap "rm -rf $tmp" EXIT
mk_repo "$tmp/repo"
cd "$tmp/repo"
base=$(git rev-parse HEAD)

# 1 valid commit, 1 wrong-style commit
echo x > x.txt; git add x.txt
git -c user.email=t@t -c user.name=t commit -q -m "Add x"
echo y > y.txt; git add y.txt
git -c user.email=t@t -c user.name=t commit -q -m "lower case bad"
bad_hash=$(git rev-parse --short HEAD)

# style file: classic
classic="$tmp/classic.md"
cat > "$classic" <<'EOF'
---
name: classic
---
EOF

# msgdir with the corrected message for the bad commit
msgdir="$tmp/msgs"; mkdir -p "$msgdir"
echo -n "Add y properly" > "$msgdir/$bad_hash"

plan="$tmp/plan.yaml"
cat > "$plan" <<EOF
base: $base
style_file: $classic
actions:
  - hash: $(git log --format=%h $base..HEAD | tail -1)
    action: pick
  - hash: $bad_hash
    action: reword
    new_message: |
      Add y properly
EOF

PATH_TO_LIB="$LIB_DIR" bash "$SCRIPT" "$plan" "$msgdir" "$base" "$classic"

# revalidator should have amended the bad commit
new_subj=$(git log -1 --format=%s)
assert_eq "$new_subj" "Add y properly" "revalidator amended drifted subject"

echo "PASS"
