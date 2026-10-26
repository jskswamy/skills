#!/bin/bash
# detect-branch-cluster.sh: when on a non-main feature branch with
# ≥2 commits in $base..HEAD, emit the whole range as a single
# medium-confidence cluster candidate (space-separated short hashes,
# oldest-first). On main/master, detached HEAD, or branches with
# fewer than 2 commits, emit nothing.
#
# Usage: detect-branch-cluster.sh <base-sha>
set -euo pipefail
base="$1"
MIN_BRANCH_CLUSTER_SIZE=2

branch=$(git branch --show-current)
case "$branch" in
  ""|main|master)
    exit 0
    ;;
esac

mapfile -t hashes < <(git rev-list --reverse "$base..HEAD")
if [[ ${#hashes[@]} -lt $MIN_BRANCH_CLUSTER_SIZE ]]; then
  exit 0
fi

short_run=()
for h in "${hashes[@]}"; do
  short_run+=("$(git rev-parse --short "$h")")
done
echo "${short_run[*]}"
