#!/bin/bash
# Snapshot the staged state for the commit drafter, so the diff never enters
# the parent's context. See docs/specs/2026-11-13-commit-relay-design.md §3.
# Usage: snapshot.sh [--prev <dir>]   write a snapshot; prints
#                                      `snapshot <id> <nonce> <files> <dir>`
#        snapshot.sh --id              print the current id only
#        snapshot.sh --token <dir>     print that snapshot's token
# On failure prints `snapshot-failed <reason>` and exits 1.
# Needs bash 3.2+, git and POSIX tools only.

MAX_DIFF_CHARS=400000

fail() {
  printf 'snapshot-failed %s\n' "$1"
  exit 1
}

random_hex() { od -An -N8 -tx1 /dev/urandom | tr -d ' \n'; }

current_id() {
  local head tree
  head=$(git rev-parse -q --verify HEAD 2>/dev/null) && head=$(printf '%.12s' "$head") || head=root
  tree=$(git write-tree 2>/dev/null) || return 1
  printf '%s-%.12s\n' "$head" "$tree"
}

git_dir=$(git rev-parse --absolute-git-dir 2>/dev/null) || fail not-a-repository
relay="$git_dir/commit-relay"

prev=""
case "${1:-}" in
  --id)
    current_id || fail index-unreadable
    exit 0
    ;;
  --token)
    [ -f "${2:-}/staged.diff" ] || fail no-such-snapshot
    tail -n 1 "$2/staged.diff" | sed -n 's/^relay-token: //p'
    exit 0
    ;;
  --prev)
    prev=${2:-}
    ;;
  "") ;;
  *) fail "unknown-option $1" ;;
esac

write_snapshot() {
  local id=$1 nonce=$2 token=$3 dir=$4 head email
  mkdir -p "$dir" || return 1
  printf '%s\n' "$id" >"$dir/id.txt"
  { git diff --staged --no-color --no-ext-diff; printf 'relay-token: %s\n' "$token"; } >"$dir/staged.diff" || return 1
  git diff --staged --name-only >"$dir/staged.files"
  git diff --staged --stat --no-color >"$dir/staged.stat"
  git diff --name-only >"$dir/unstaged.files"
  git ls-files --others --exclude-standard >"$dir/untracked.txt"
  head=$(git rev-parse -q --verify HEAD 2>/dev/null)
  if [ -n "$head" ]; then
    {
      git log -5 --format=%s
      printf 'last commit author: %s\n' "$(git log -1 --format='%an <%ae>')"
      git show --stat --format= --no-color HEAD
    } >"$dir/head.txt"
    git show --no-color --no-ext-diff HEAD >"$dir/last-commit.diff"
    email=$(git config user.email)
    # Amend only an own, unpushed commit: no remote-tracking branch may contain HEAD.
    if [ -n "$email" ] && [ "$(git log -1 --format=%ae)" = "$email" ] && [ -z "$(git branch -r --contains HEAD 2>/dev/null)" ]; then
      echo yes >"$dir/amend-eligible.txt"
    else
      echo no >"$dir/amend-eligible.txt"
    fi
  else
    echo "no commits" >"$dir/head.txt"
    echo no >"$dir/amend-eligible.txt"
  fi
}

# The id is taken before and after writing; if the index or HEAD moved in
# between, start over once.
attempt=0
while :; do
  id=$(current_id) || fail index-unreadable
  nonce=$(random_hex)
  token=$(random_hex)
  dir="$relay/$nonce"
  write_snapshot "$id" "$nonce" "$token" "$dir" || { rm -rf "$dir"; fail write-error; }
  after=$(current_id) || { rm -rf "$dir"; fail index-unreadable; }
  [ "$after" = "$id" ] && break
  rm -rf "$dir"
  attempt=$((attempt + 1))
  [ "$attempt" -lt 2 ] || fail index-changed
done

if [ "$(wc -c <"$dir/staged.diff")" -gt "$MAX_DIFF_CHARS" ]; then
  rm -rf "$dir"
  fail too-large
fi

# Remove only the caller's own previous folder (a direct child of commit-relay/)
# and folders untouched for over 24 hours; another session's fresh folder stays.
if [ -n "$prev" ] && [ "$(dirname -- "$prev")" = "$relay" ] && [ "$prev" != "$dir" ] && [ -d "$prev" ]; then
  rm -rf -- "$prev"
fi
find "$relay" -mindepth 1 -maxdepth 1 -type d -mmin +1440 -exec rm -rf {} + 2>/dev/null

files=$(grep -c '' "$dir/staged.files")
printf 'snapshot %s %s %s %s\n' "$id" "$nonce" "$files" "$dir"
