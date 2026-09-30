#!/bin/bash
# Usage: revalidate.sh <plan.yaml> <msg-dir> <base-sha> <style-file>
# Walk $base..HEAD, style-check each subject, auto-amend from msg-dir on drift.
set -euo pipefail
plan="$1"; msgdir="$2"; base="$3"; style_file="$4"
LIB_DIR="${PATH_TO_LIB:-$(dirname "$0")}"

# First pass: detect drift.
drift=0
mapfile -t hashes < <(git rev-list --reverse "$base..HEAD")
for h in "${hashes[@]}"; do
  short=$(git rev-parse --short "$h")
  subj=$(git log -1 --format=%s "$h")
  if ! bash "$LIB_DIR/style-check.sh" "$subj" "$style_file" >/dev/null 2>&1; then
    if [[ -f "$msgdir/$short" ]]; then
      drift=1
    else
      echo "drift: $short '$subj' (no saved message)" >&2
    fi
  fi
done

# Second pass: rebuild the rebase todo with exec lines on drifted commits.
if [[ $drift -eq 1 ]]; then
  tmp_todo=$(mktemp)
  mapfile -t hashes < <(git rev-list --reverse "$base..HEAD")
  for h in "${hashes[@]}"; do
    short=$(git rev-parse --short "$h")
    subj=$(git log -1 --format=%s "$h")
    if [[ -f "$msgdir/$short" ]] \
       && ! bash "$LIB_DIR/style-check.sh" "$subj" "$style_file" >/dev/null 2>&1; then
      printf 'pick %s\nexec __GIT_COMMIT_PLUGIN__=1 git commit --amend -F %s\n' \
             "$short" "$msgdir/$short" >> "$tmp_todo"
    else
      printf 'pick %s\n' "$short" >> "$tmp_todo"
    fi
  done
  GIT_EDITOR=true GIT_SEQUENCE_EDITOR="cat '$tmp_todo' >" git rebase -i "$base"
fi

# Third pass: any drift remaining?
final_drift=0
for h in $(git rev-list "$base..HEAD"); do
  subj=$(git log -1 --format=%s "$h")
  bash "$LIB_DIR/style-check.sh" "$subj" "$style_file" >/dev/null 2>&1 || final_drift=1
done
exit $final_drift
