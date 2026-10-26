#!/bin/bash
# Shared scaffolding for nix-tool PostToolUse hooks.
# Usage: run-nix-tool.sh <nix-package> <command-template> <success-message>
#   <command-template> may contain {{file}}, replaced with the quoted target path.
set -euo pipefail

pkg="$1"
cmd_tmpl="$2"
success_msg="$3"

input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // .tool_input.filePath // ""')

if [[ "$file_path" != *"flake.nix" ]]; then
  echo '{"continue": true}'
  exit 0
fi

if ! command -v nix-shell &> /dev/null; then
  printf '{"continue": true, "systemMessage": "nix-shell not available, skipping %s"}\n' "$pkg"
  exit 0
fi

cmd="${cmd_tmpl//\{\{file\}\}/\"$file_path\"}"
nix-shell -p "$pkg" --run "$cmd" 2>&1 || true
printf '{"continue": true, "systemMessage": "%s"}\n' "$success_msg"
