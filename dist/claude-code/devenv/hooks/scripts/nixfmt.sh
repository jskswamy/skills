#!/bin/bash
exec bash "$(dirname "$0")/lib/run-nix-tool.sh" \
  "nixfmt-rfc-style" \
  "nixfmt {{file}}" \
  "Formatted flake.nix with nixfmt"
