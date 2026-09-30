#!/bin/bash
exec bash "$(dirname "$0")/lib/run-nix-tool.sh" \
  "statix" \
  "statix fix {{file}}" \
  "Fixed anti-patterns with statix"
