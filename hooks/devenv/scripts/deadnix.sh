#!/bin/bash
# --no-lambda-pattern-names preserves 'self' in flake outputs (required by flake system)
exec bash "$(dirname "$0")/lib/run-nix-tool.sh" \
  "deadnix" \
  "deadnix --no-lambda-pattern-names -e {{file}}" \
  "Removed unused code with deadnix"
