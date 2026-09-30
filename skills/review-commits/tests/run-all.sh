#!/bin/bash
# Discovers and runs every tests/test-*.sh under this directory.
set -euo pipefail
cd "$(dirname "$0")"
fail=0
for t in test-*.sh; do
  [[ -e "$t" ]] || continue
  echo "== $t =="
  if ! bash "$t"; then fail=1; fi
done
exit $fail
