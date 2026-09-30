#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/helpers.sh"
SCRIPT="$SCRIPT_DIR/../lib/detect-clusters.sh"

tmp=$(mktemp -d); trap "rm -rf $tmp" EXIT
mk_repo "$tmp/repo"
cd "$tmp/repo"
base=$(git rev-parse HEAD)

# 4 commits all under plugins/foo/skills/bar/ → one cluster
mkdir -p plugins/foo/skills/bar
echo a > plugins/foo/skills/bar/a; git add . && git -c user.email=t@t -c user.name=t commit -q -m "Add a"
ha=$(git rev-parse --short HEAD)
echo b > plugins/foo/skills/bar/b; git add . && git -c user.email=t@t -c user.name=t commit -q -m "Add b"
hb=$(git rev-parse --short HEAD)
echo c > plugins/foo/skills/bar/c; git add . && git -c user.email=t@t -c user.name=t commit -q -m "Add c"
hc=$(git rev-parse --short HEAD)
echo d > plugins/foo/skills/bar/d; git add . && git -c user.email=t@t -c user.name=t commit -q -m "Add d"
hd=$(git rev-parse --short HEAD)

out=$(bash "$SCRIPT" "$base")
assert_eq "$out" "$ha $hb $hc $hd" "single 4-commit cluster"

# Add a 5th commit that breaks the cluster (different prefix)
mkdir -p plugins/other
echo z > plugins/other/z; git add . && git -c user.email=t@t -c user.name=t commit -q -m "Add z"
out=$(bash "$SCRIPT" "$base")
# original cluster of 4 should still be detected, new 5th commit excluded
assert_eq "$out" "$ha $hb $hc $hd" "cluster preserved despite trailing outlier"

# Add 4 more under a different prefix → 2 clusters now
mkdir -p plugins/other/skills/baz
echo p > plugins/other/skills/baz/p; git add . && git -c user.email=t@t -c user.name=t commit -q -m "Add p"
hp=$(git rev-parse --short HEAD)
echo q > plugins/other/skills/baz/q; git add . && git -c user.email=t@t -c user.name=t commit -q -m "Add q"
hq=$(git rev-parse --short HEAD)
echo r > plugins/other/skills/baz/r; git add . && git -c user.email=t@t -c user.name=t commit -q -m "Add r"
hr=$(git rev-parse --short HEAD)
echo s > plugins/other/skills/baz/s; git add . && git -c user.email=t@t -c user.name=t commit -q -m "Add s"
hs=$(git rev-parse --short HEAD)

out=$(bash "$SCRIPT" "$base")
expected="$ha $hb $hc $hd
$hp $hq $hr $hs"
assert_eq "$out" "$expected" "two distinct clusters"

# Test the minimum-size threshold: 3 contiguous commits should NOT cluster
mk_repo "$tmp/repo2"
cd "$tmp/repo2"
base2=$(git rev-parse HEAD)
mkdir -p plugins/foo/skills/bar
for i in 1 2 3; do
  echo $i > plugins/foo/skills/bar/$i
  git add . && git -c user.email=t@t -c user.name=t commit -q -m "Add $i"
done
out=$(bash "$SCRIPT" "$base2")
assert_eq "$out" "" "3 commits do not form a cluster (minimum 4)"

# Depth-3 fixture: 4 files in one directory at exactly depth 3
# (e.g. dev/netbox/env, dev/netbox/setup) must cluster as one run.
mk_repo "$tmp/repo3"
cd "$tmp/repo3"
base3=$(git rev-parse HEAD)
mkdir -p dev/netbox
ne=()
for n in env setup start start-postgres; do
  echo "$n" > "dev/netbox/$n"
  git add . && git -c user.email=t@t -c user.name=t commit -q -m "Add $n"
  ne+=("$(git rev-parse --short HEAD)")
done
out=$(bash "$SCRIPT" "$base3")
assert_eq "$out" "${ne[0]} ${ne[1]} ${ne[2]} ${ne[3]}" \
  "depth-3 files in one directory cluster correctly"

# Cross-dir fixture (bug report case): 4 commits, each touching a
# different dev/<service>/ subdirectory, must NOT produce a path
# cluster — that's the branch heuristic's job, not the path heuristic.
mk_repo "$tmp/repo4"
cd "$tmp/repo4"
base4=$(git rev-parse HEAD)
for svc in netbox telegraf grafana; do
  mkdir -p "dev/$svc"
  echo x > "dev/$svc/file"
  git add . && git -c user.email=t@t -c user.name=t commit -q -m "Add $svc"
done
echo y > root.yaml
git add . && git -c user.email=t@t -c user.name=t commit -q -m "Add root config"
out=$(bash "$SCRIPT" "$base4")
assert_eq "$out" "" \
  "cross-dir commits do not form a path cluster"

echo "PASS"
