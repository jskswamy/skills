#!/bin/bash
# Usage: style-check.sh <subject> <style-file>
# Exit 0 if subject conforms; print reason + exit 1 otherwise.
set -euo pipefail
subject="$1"
style_file="$2"

style_name=$(awk '/^name:/{print $2; exit}' "$style_file")

# Denylist of common non-imperative first words (past tense, 3rd person, gerund).
# Plain pattern matching against -ed / -ing / -s would false-positive on
# imperative roots like "Bring", "Pass", "Process", "Embed". An explicit list
# of frequently-misused forms keeps the check accurate without grammar parsing.
is_non_imperative() {
  case "$1" in
    Added|Adds|Adding|\
    Fixed|Fixes|Fixing|\
    Updated|Updates|Updating|\
    Removed|Removes|Removing|\
    Refactored|Refactors|Refactoring|\
    Renamed|Renames|Renaming|\
    Moved|Moves|Moving|\
    Implemented|Implements|Implementing|\
    Introduced|Introduces|Introducing|\
    Merged|Merges|Merging|\
    Released|Releases|Releasing|\
    Reverted|Reverts|Reverting|\
    Created|Creates|Creating|\
    Deleted|Deletes|Deleting|\
    Changed|Changes|Changing|\
    Improved|Improves|Improving|\
    Used|Uses|Using|\
    Extracted|Extracts|Extracting|\
    Replaced|Replaces|Replacing|\
    Cleaned|Cleans|Cleaning|\
    Made|Makes|Making|\
    Wrote|Writes|Writing)
      return 0 ;;
  esac
  return 1
}

case "$style_name" in
  classic)
    [[ ${#subject} -le 50 ]] || { echo "subject >50 chars"; exit 1; }
    [[ "$subject" =~ ^[A-Z] ]] || { echo "subject must start uppercase"; exit 1; }
    [[ "$subject" != *. ]] || { echo "subject has trailing period"; exit 1; }
    # No type prefix: classic forbids `feat:`, `fix:`, `Spec:`, etc.
    # Match any leading word followed by ':' as the first non-space token.
    if [[ "$subject" =~ ^[A-Za-z][A-Za-z0-9_-]*:[[:space:]] ]]; then
      echo "subject has type-prefix (classic forbids 'word:' prefixes)"
      exit 1
    fi
    first=${subject%% *}
    if is_non_imperative "$first"; then
      echo "subject must use imperative mood (got '$first')"
      exit 1
    fi
    ;;
  conventional)
    [[ ${#subject} -le 72 ]] || { echo "subject >72 chars"; exit 1; }
    [[ "$subject" =~ ^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([a-z0-9_-]+\))?!?:\ .+ ]] \
      || { echo "subject does not match conventional format"; exit 1; }
    ;;
  *)
    echo "unknown style: $style_name"; exit 2 ;;
esac
exit 0
