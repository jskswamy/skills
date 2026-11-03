#!/bin/bash
# PostToolUse on Write|Edit: format and lint flake.nix with nixfmt, statix and
# deadnix. One hook runs them in order because all three rewrite the file in
# place, and Claude Code runs separate hooks in parallel.
# Fail-open: always exits 0. Tool output goes to stderr so stdout stays JSON.
set -uo pipefail

input=$(cat)
file_path=$(jq -r '.tool_input.file_path // .tool_input.filePath // ""' <<<"$input" 2>/dev/null) || exit 0

if [[ "$file_path" != *"flake.nix" ]]; then
  echo '{"continue": true}'
  exit 0
fi

if ! command -v nix-shell &>/dev/null; then
  echo '{"continue": true, "systemMessage": "nix-shell not available, skipping nixfmt, statix and deadnix"}'
  exit 0
fi

# The path travels in the environment, never inside the command string.
# --no-lambda-pattern-names keeps 'self' in flake outputs (the flake system requires it).
export FLAKE_FILE="$file_path"
done_tools=()
failed_tools=()
for spec in "nixfmt-rfc-style|nixfmt" "statix|statix fix" "deadnix|deadnix --no-lambda-pattern-names -e"; do
  pkg=${spec%%|*}
  cmd=${spec#*|}
  # shellcheck disable=SC2016
  if nix-shell -p "$pkg" --run "$cmd \"\$FLAKE_FILE\"" >&2; then done_tools+=("${cmd%% *}"); else failed_tools+=("${cmd%% *}"); fi
done

message="Ran ${done_tools[*]:-no tools} on flake.nix"
[ ${#failed_tools[@]} -eq 0 ] || message="$message; failed: ${failed_tools[*]}"
jq -nc --arg m "$message" '{continue: true, systemMessage: $m}'
