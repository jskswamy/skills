#!/usr/bin/env bash
#
# Update README.md plugins section using gomplate
# Replaces content between <!-- PLUGINS:START --> and <!-- PLUGINS:END --> markers
#
# Usage: ./scripts/update-readme.sh [--dry-run]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
README="$REPO_ROOT/README.md"
MARKETPLACE_JSON="$REPO_ROOT/registry.json"
TEMPLATE="$REPO_ROOT/templates/readme-plugins.md.tmpl"
PLUGINS_DIR="$REPO_ROOT/plugins"
DRY_RUN=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --dry-run|-n)
            DRY_RUN=true
            shift
            ;;
        *)
            echo "Unknown argument: $1" >&2
            exit 1
            ;;
    esac
done

# Check dependencies
for cmd in gomplate; do
    if ! command -v "$cmd" &> /dev/null; then
        echo "Error: $cmd not found. Run 'nix develop' first." >&2
        exit 1
    fi
done

# Check required files
for file in "$README" "$MARKETPLACE_JSON" "$TEMPLATE"; do
    if [[ ! -f "$file" ]]; then
        echo "Error: Required file not found: $file" >&2
        exit 1
    fi
done

# Check for markers
if ! grep -q "<!-- PLUGINS:START -->" "$README"; then
    echo "Error: Missing <!-- PLUGINS:START --> marker in README.md" >&2
    exit 1
fi

if ! grep -q "<!-- PLUGINS:END -->" "$README"; then
    echo "Error: Missing <!-- PLUGINS:END --> marker in README.md" >&2
    exit 1
fi

# Generate plugins content using gomplate
PLUGINS_CONTENT=$(PLUGINS_DIR="$PLUGINS_DIR" gomplate \
    -d "marketplace=$MARKETPLACE_JSON" \
    -f "$TEMPLATE")

if [[ -z "$PLUGINS_CONTENT" ]]; then
    echo "Error: Failed to generate plugins content" >&2
    exit 1
fi

# Replace content between markers
awk -v content="$PLUGINS_CONTENT" '
    /<!-- PLUGINS:START -->/ {
        print
        print ""
        print content
        skip = 1
        next
    }
    /<!-- PLUGINS:END -->/ {
        skip = 0
    }
    !skip { print }
' "$README" > "$README.tmp"

if [[ "$DRY_RUN" == "true" ]]; then
    echo "=== DRY RUN - Changes that would be made ==="
    diff -u "$README" "$README.tmp" || true
    rm "$README.tmp"
else
    mv "$README.tmp" "$README"
    echo "README.md updated"
fi
