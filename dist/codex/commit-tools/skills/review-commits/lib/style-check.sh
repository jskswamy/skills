#!/bin/bash
# Compatibility entry point; commit-action owns the shared style rules.
set -euo pipefail
exec bash "$(dirname "$0")/../../commit-action/lib/style-check.sh" "$@"
