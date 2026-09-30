# tests/helpers.sh
set -euo pipefail

assert_eq() {
  local got="$1" want="$2" msg="${3:-assertion failed}"
  if [[ "$got" != "$want" ]]; then
    echo "FAIL: $msg"
    echo "  want: $want"
    echo "  got:  $got"
    exit 1
  fi
}

assert_exit() {
  local cmd="$1" want_code="$2" msg="${3:-exit code mismatch}"
  set +e; eval "$cmd" >/dev/null 2>&1; local got=$?; set -e
  assert_eq "$got" "$want_code" "$msg"
}

mk_repo() {
  local dir="$1"
  rm -rf "$dir" && mkdir -p "$dir" && cd "$dir"
  git init -q -b main
  git -c user.email=t@t -c user.name=t commit -q --allow-empty -m "init"
}
