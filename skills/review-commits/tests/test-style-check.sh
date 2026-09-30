#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/helpers.sh"
SCRIPT="$SCRIPT_DIR/../lib/style-check.sh"

tmp=$(mktemp -d); trap "rm -rf $tmp" EXIT
classic="$tmp/classic.md"
conv="$tmp/conventional.md"
cat > "$classic" <<'STYLE'
---
name: classic
---
STYLE
cat > "$conv" <<'STYLE'
---
name: conventional
---
STYLE

# classic: capitalized, no period, ≤50, imperative, no type prefix
assert_exit "bash $SCRIPT 'Add foo to bar' '$classic'" 0 "valid classic"
assert_exit "bash $SCRIPT 'add foo to bar' '$classic'" 1 "classic must capitalize"
assert_exit "bash $SCRIPT 'Add foo to bar.' '$classic'" 1 "classic no trailing period"
long=$(printf 'A%.0s' {1..51})
assert_exit "bash $SCRIPT '$long' '$classic'" 1 "classic ≤50 chars"
edge=$(printf 'A%.0s' {1..50})
assert_exit "bash $SCRIPT '$edge' '$classic'" 0 "classic 50 chars boundary ok"

# Type-prefix rejection (this is what distinguishes classic from conventional)
assert_exit "bash $SCRIPT 'feat: add x' '$classic'" 1 "classic rejects feat: prefix"
assert_exit "bash $SCRIPT 'Spec: declarative agents' '$classic'" 1 "classic rejects Spec: prefix"
assert_exit "bash $SCRIPT 'fix: handle null' '$classic'" 1 "classic rejects fix: prefix"
assert_exit "bash $SCRIPT 'Fix null in session' '$classic'" 0 "classic allows Fix without colon"

# Imperative mood (best-effort denylist of common past/gerund/3rd-person forms)
assert_exit "bash $SCRIPT 'Added user auth' '$classic'" 1 "classic rejects past tense Added"
assert_exit "bash $SCRIPT 'Adds user auth' '$classic'" 1 "classic rejects 3rd person Adds"
assert_exit "bash $SCRIPT 'Adding user auth' '$classic'" 1 "classic rejects gerund Adding"
assert_exit "bash $SCRIPT 'Fixed null pointer' '$classic'" 1 "classic rejects Fixed"
assert_exit "bash $SCRIPT 'Updates session logic' '$classic'" 1 "classic rejects Updates"
# These imperatives must continue to pass (no false positives from -s / -ing roots)
assert_exit "bash $SCRIPT 'Bring back legacy mode' '$classic'" 0 "Bring is imperative"
assert_exit "bash $SCRIPT 'Pass token through proxy' '$classic'" 0 "Pass is imperative"
assert_exit "bash $SCRIPT 'Process inbound queue items' '$classic'" 0 "Process is imperative"

# conventional: type(scope)?: description, lowercase
assert_exit "bash $SCRIPT 'feat: add x' '$conv'" 0 "valid conventional no scope"
assert_exit "bash $SCRIPT 'feat(api): add x' '$conv'" 0 "valid conventional with scope"
assert_exit "bash $SCRIPT 'add x' '$conv'" 1 "conventional needs type"
assert_exit "bash $SCRIPT 'Feat: add x' '$conv'" 1 "conventional lowercase"
assert_exit "bash $SCRIPT 'banana: add x' '$conv'" 1 "conventional unknown type"

echo "PASS"
