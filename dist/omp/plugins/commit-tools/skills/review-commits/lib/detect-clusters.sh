#!/bin/bash
# detect-clusters.sh: flag contiguous-commit feature clusters in $base..HEAD.
# Usage: detect-clusters.sh <base-sha>
# Output: one line per cluster, space-separated short-hashes oldest-first.
set -euo pipefail
base="$1"
MIN_CLUSTER_SIZE=4

mapfile -t hashes < <(git rev-list --reverse "$base..HEAD")

# For each commit, compute the parent directory shared by all changed
# files. Returns empty if files don't all share the same dirname or if
# any file is at the repo root (dirname == ".").
prefix_of() {
  local h="$1"
  local files
  mapfile -t files < <(git diff-tree --no-commit-id --name-only -r "$h")
  if [[ ${#files[@]} -eq 0 ]]; then
    echo ""
    return
  fi
  local first_dir
  first_dir=$(dirname "${files[0]}")
  if [[ "$first_dir" == "." ]]; then
    echo ""
    return
  fi
  for f in "${files[@]}"; do
    if [[ "$(dirname "$f")" != "$first_dir" ]]; then
      echo ""
      return
    fi
  done
  echo "$first_dir"
}

# Walk hashes, group contiguous runs sharing the same non-empty prefix.
clusters=()
current_prefix=""
current_run=()

flush() {
  if [[ ${#current_run[@]} -ge $MIN_CLUSTER_SIZE ]]; then
    local short_run=()
    for h in "${current_run[@]}"; do
      short_run+=("$(git rev-parse --short "$h")")
    done
    clusters+=("${short_run[*]}")
  fi
  current_run=()
  current_prefix=""
}

for h in "${hashes[@]}"; do
  p=$(prefix_of "$h")
  if [[ -z "$p" ]]; then
    flush
    continue
  fi
  if [[ "$p" != "$current_prefix" ]]; then
    flush
    current_prefix="$p"
  fi
  current_run+=("$h")
done
flush

for c in "${clusters[@]}"; do
  echo "$c"
done
