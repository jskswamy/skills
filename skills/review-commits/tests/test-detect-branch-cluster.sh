#!/bin/bash
# test-detect-branch-cluster.sh — branch-as-cluster heuristic.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/helpers.sh"
SCRIPT="$SCRIPT_DIR/../lib/detect-branch-cluster.sh"

tmp=$(mktemp -d); trap "rm -rf $tmp" EXIT

# Case 1: non-main branch with 4 commits → emit one line
mk_repo "$tmp/repo1"
cd "$tmp/repo1"
git -c user.email=t@t -c user.name=t checkout -q -b feature/x
base=$(git rev-parse HEAD)
hashes=()
for i in 1 2 3 4; do
  echo $i > "f$i"
  git add . && git -c user.email=t@t -c user.name=t commit -q -m "c$i"
  hashes+=("$(git rev-parse --short HEAD)")
done
out=$(bash "$SCRIPT" "$base")
assert_eq "$out" "${hashes[0]} ${hashes[1]} ${hashes[2]} ${hashes[3]}" \
  "non-main branch with 4 commits emits whole range"

# Case 2: non-main branch with 2 commits → emit one line
mk_repo "$tmp/repo2"
cd "$tmp/repo2"
git -c user.email=t@t -c user.name=t checkout -q -b feature/y
base=$(git rev-parse HEAD)
echo a > a; git add . && git -c user.email=t@t -c user.name=t commit -q -m "a"
ha=$(git rev-parse --short HEAD)
echo b > b; git add . && git -c user.email=t@t -c user.name=t commit -q -m "b"
hb=$(git rev-parse --short HEAD)
out=$(bash "$SCRIPT" "$base")
assert_eq "$out" "$ha $hb" "non-main branch with 2 commits emits both"

# Case 3: non-main branch with 1 commit → emit nothing
mk_repo "$tmp/repo3"
cd "$tmp/repo3"
git -c user.email=t@t -c user.name=t checkout -q -b feature/z
base=$(git rev-parse HEAD)
echo a > a; git add . && git -c user.email=t@t -c user.name=t commit -q -m "a"
out=$(bash "$SCRIPT" "$base")
assert_eq "$out" "" "branch with 1 commit emits nothing"

# Case 4: on main → emit nothing
mk_repo "$tmp/repo4"
cd "$tmp/repo4"
base=$(git rev-parse HEAD)
echo a > a; git add . && git -c user.email=t@t -c user.name=t commit -q -m "a"
echo b > b; git add . && git -c user.email=t@t -c user.name=t commit -q -m "b"
out=$(bash "$SCRIPT" "$base")
assert_eq "$out" "" "on main emits nothing"

# Case 5: on master → emit nothing
mk_repo "$tmp/repo5"
cd "$tmp/repo5"
git -c user.email=t@t -c user.name=t branch -m main master
base=$(git rev-parse HEAD)
echo a > a; git add . && git -c user.email=t@t -c user.name=t commit -q -m "a"
echo b > b; git add . && git -c user.email=t@t -c user.name=t commit -q -m "b"
out=$(bash "$SCRIPT" "$base")
assert_eq "$out" "" "on master emits nothing"

# Case 6: detached HEAD → emit nothing
mk_repo "$tmp/repo6"
cd "$tmp/repo6"
git -c user.email=t@t -c user.name=t checkout -q -b feature/q
base=$(git rev-parse HEAD)
for i in 1 2 3; do
  echo $i > "f$i"
  git add . && git -c user.email=t@t -c user.name=t commit -q -m "c$i"
done
git checkout -q --detach HEAD
out=$(bash "$SCRIPT" "$base")
assert_eq "$out" "" "detached HEAD emits nothing"

echo "PASS"
