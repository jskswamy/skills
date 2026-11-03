#!/bin/bash
# Compatibility entry point; commit-tools-commit owns the shared style rules.
set -euo pipefail
exec bash "$(dirname "$0")/../../commit/lib/style-check.sh" "$@"
