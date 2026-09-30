#!/bin/bash
# End-to-end: plan with multi-line new_message survives an interactive rebase
# and lands as the final commit's full message body.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/helpers.sh"
BUILD_TODO="$SCRIPT_DIR/../lib/build-todo.sh"

tmp=$(mktemp -d); trap "rm -rf $tmp" EXIT

# 1. Build a real repo with 3 commits, each with a body.
mk_repo "$tmp/repo"
cd "$tmp/repo"
GIT="git -c user.email=t@t -c user.name=t"

for i in 1 2 3; do
  echo "line $i" > "f$i.txt"
  $GIT add "f$i.txt"
  $GIT commit -q -m "Granular commit $i

Original body of commit $i explaining a TDD-sized step."
done

base=$($GIT rev-list --max-parents=0 HEAD)
h1=$($GIT log --reverse --format=%h "$base..HEAD" | sed -n 1p)
h2=$($GIT log --reverse --format=%h "$base..HEAD" | sed -n 2p)
h3=$($GIT log --reverse --format=%h "$base..HEAD" | sed -n 3p)

# 2. Hand-write a plan.yaml that collapses h1..h3 with a multi-line body.
plan="$tmp/plan.yaml"
msgdir="$tmp/msgs"
mkdir -p "$msgdir"
cat > "$plan" <<EOF
base: $base
style_file: /tmp/classic.md
actions:
  - hash: $h1
    action: pick
    new_message: |
      Add f1/f2/f3 collapsed feature

      This single commit replaces three TDD-sized commits. The
      synthesizer authored this body from the originals: it adds
      f1.txt, f2.txt, and f3.txt as one logical change.
  - hash: $h2
    action: fixup
    fixup_target_message: |
      Add f1/f2/f3 collapsed feature

      This single commit replaces three TDD-sized commits. The
      synthesizer authored this body from the originals: it adds
      f1.txt, f2.txt, and f3.txt as one logical change.
  - hash: $h3
    action: fixup
    fixup_target_message: |
      Add f1/f2/f3 collapsed feature

      This single commit replaces three TDD-sized commits. The
      synthesizer authored this body from the originals: it adds
      f1.txt, f2.txt, and f3.txt as one logical change.
EOF

# 3. Build the todo and run the rebase exactly as the skill does.
todo="$tmp/todo"
bash "$BUILD_TODO" "$plan" "$msgdir" > "$todo"

GIT_EDITOR=true \
GIT_SEQUENCE_EDITOR="cat $todo >" \
  $GIT rebase -i "$base"

# 4. Assert the surviving commit has the authored body in full.
final_msg=$($GIT log -1 --format=%B)
expected_first_line="Add f1/f2/f3 collapsed feature"
expected_body_fragment="synthesizer authored this body from the originals"

assert_eq "$(echo "$final_msg" | sed -n 1p)" "$expected_first_line" \
  "first line of collapsed commit"

if ! grep -qF "$expected_body_fragment" <<<"$final_msg"; then
  echo "FAIL: body fragment missing"
  echo "  want fragment: $expected_body_fragment"
  echo "  got message:"
  echo "$final_msg" | sed 's/^/    /'
  exit 1
fi

# 5. Assert exactly one commit between base..HEAD (the two fixups folded in).
count=$($GIT rev-list --count "$base..HEAD")
assert_eq "$count" "1" "commits between base and HEAD after fixup"

echo "PASS"
