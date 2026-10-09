#!/usr/bin/env bash
# Usage: detect-tracker-leaks.sh <base-ref>
# Prints TSV rows: <short-hash> <kind> <match> <line>
set -euo pipefail

base="${1:-}"
if [[ -z "$base" ]]; then
  echo "usage: detect-tracker-leaks.sh <base-ref>" >&2
  exit 2
fi

# Defaults intentionally warn on common opaque tracker IDs. Teams that keep
# public issue references can configure review/validate guidance to allow them.
uppercase_ticket='[A-Z][A-Z0-9]+-[0-9]+'
internal_ticket='(beads|claude-plugins)-[a-z0-9]+(\.[0-9]+)?'
# Require at least 3 characters after the dash so ordinary words like
# "follow-up" do not look like lowercase tracker IDs.
lowercase_ticket='[a-z][a-z0-9]+-[a-z0-9]{3,}(\.[0-9]+)?'
tracker_pattern="(${uppercase_ticket}|${internal_ticket}|${lowercase_ticket})"
trailer_keys="Refs|Closes|Fixes|Resolves"

config=".claude/commit-tools.local.md"
if [[ -f "$config" ]]; then
  in_tracker_patterns=false
  in_trailer_keys=false
  while IFS= read -r config_line; do
    case "$config_line" in
      tracker_patterns:*) in_tracker_patterns=true; in_trailer_keys=false; continue ;;
      trailer_keys:*) in_tracker_patterns=false; in_trailer_keys=true; continue ;;
      [A-Za-z_]*:*) in_tracker_patterns=false; in_trailer_keys=false; continue ;;
    esac

    if [[ "$config_line" =~ ^[[:space:]]*-[[:space:]]+(.+)$ ]]; then
      value="${BASH_REMATCH[1]}"
      value="${value%\"}"
      value="${value#\"}"
      value="${value%\'}"
      value="${value#\'}"
      if [[ "$in_tracker_patterns" == true ]]; then
        tracker_pattern="(${tracker_pattern}|${value})"
      elif [[ "$in_trailer_keys" == true ]]; then
        trailer_keys="${trailer_keys}|${value}"
      fi
    fi
  done < "$config"
fi

trailer_pattern="^(${trailer_keys}):?[[:space:]]+"
parenthetical_pattern="\\([^)]*${tracker_pattern}[^)]*\\)"

emit_match() {
  local hash="$1"
  local kind="$2"
  local match="$3"
  local line="$4"
  printf '%s\t%s\t%s\t%s\n' "$hash" "$kind" "$match" "$line"
}

extract_first_tracker() {
  grep -Eo "$tracker_pattern" | head -n 1 || true
}

for hash in $(git rev-list --reverse "$base..HEAD"); do
  short=$(git rev-parse --short "$hash")
  subject=$(git log -1 --format=%s "$hash")
  body=$(git log -1 --format=%b "$hash")

  if [[ "$subject" =~ ^${tracker_pattern}: ]]; then
    match=$(printf '%s\n' "$subject" | extract_first_tracker)
    emit_match "$short" "subject-prefix" "$match" "$subject"
  fi

  while IFS= read -r line; do
    [[ -n "$line" ]] || continue
    match=$(printf '%s\n' "$line" | extract_first_tracker)
    [[ -n "$match" ]] || continue

    if [[ "$line" =~ $trailer_pattern ]]; then
      emit_match "$short" "trailer" "$match" "$line"
    elif [[ "$line" =~ $parenthetical_pattern ]]; then
      emit_match "$short" "parenthetical" "$match" "$line"
    else
      emit_match "$short" "narrative" "$match" "$line"
    fi
  done <<< "$body"
done
