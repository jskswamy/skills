#!/bin/bash
# Export Excalidraw file to PNG using available CLI tools
#
# Usage: export-png.sh <input.excalidraw> [scale]
#
# Arguments:
#   input.excalidraw  Path to the Excalidraw JSON file
#   scale             PNG scale factor (1, 2, or 4). Default: 2
#
# Tool priority:
#   1. Globally installed tools
#   2. nix-shell (if nix available)
#   3. npx (runs without global install)
#
# Supported tools:
#   - excalidraw-brute-export-cli (highest fidelity, uses Playwright + Firefox)
#   - @tommywalkie/excalidraw-cli (faster, uses node-canvas)

set -e

INPUT="$1"
SCALE="${2:-2}"

if [ -z "$INPUT" ]; then
    echo "Usage: export-png.sh <input.excalidraw> [scale]"
    echo "  scale: 1, 2, or 4 (default: 2)"
    exit 1
fi

if [ ! -f "$INPUT" ]; then
    echo "Error: File not found: $INPUT"
    exit 1
fi

# Generate output filename
OUTPUT="${INPUT%.excalidraw}.png"
OUTPUT_DIR="$(dirname "$OUTPUT")"

# Check for available runners
HAS_NIX=false
HAS_NPX=false
command -v nix-shell &> /dev/null && HAS_NIX=true
command -v npx &> /dev/null && HAS_NPX=true

# Function to run excalidraw-brute-export-cli
run_brute_export() {
    local runner="$1"
    echo "Exporting with excalidraw-brute-export-cli (scale: ${SCALE}x, via ${runner})..."

    case "$runner" in
        global)
            excalidraw-brute-export-cli \
                -i "$INPUT" \
                --format png \
                --scale "$SCALE" \
                --background 1 \
                -o "$OUTPUT"
            ;;
        nix)
            # Note: excalidraw-brute-export-cli may not be in nixpkgs, fall back to npx
            echo "Note: excalidraw-brute-export-cli not in nixpkgs, using npx..."
            npx -y excalidraw-brute-export-cli \
                -i "$INPUT" \
                --format png \
                --scale "$SCALE" \
                --background 1 \
                -o "$OUTPUT"
            ;;
        npx)
            npx -y excalidraw-brute-export-cli \
                -i "$INPUT" \
                --format png \
                --scale "$SCALE" \
                --background 1 \
                -o "$OUTPUT"
            ;;
    esac
}

# Function to run excalidraw-cli
run_excalidraw_cli() {
    local runner="$1"
    echo "Exporting with excalidraw-cli (via ${runner})..."

    case "$runner" in
        global)
            excalidraw-cli "$INPUT" "$OUTPUT_DIR"
            ;;
        nix)
            # Note: excalidraw-cli may not be in nixpkgs, fall back to npx
            echo "Note: excalidraw-cli not in nixpkgs, using npx..."
            npx -y @tommywalkie/excalidraw-cli "$INPUT" "$OUTPUT_DIR"
            ;;
        npx)
            npx -y @tommywalkie/excalidraw-cli "$INPUT" "$OUTPUT_DIR"
            ;;
    esac
}

# Try excalidraw-brute-export-cli first (highest fidelity)
if command -v excalidraw-brute-export-cli &> /dev/null; then
    run_brute_export "global"
    echo "Created: $OUTPUT"
    exit 0
fi

# Try excalidraw-cli globally
if command -v excalidraw-cli &> /dev/null; then
    run_excalidraw_cli "global"
    echo "Created: $OUTPUT"
    exit 0
fi

# No global tools - try npx (preferred over nix for npm packages)
if [ "$HAS_NPX" = true ]; then
    echo "No global tools found. Using npx..."
    run_brute_export "npx"
    echo "Created: $OUTPUT"
    exit 0
fi

# Last resort - try nix-shell (will likely fall back to npx anyway)
if [ "$HAS_NIX" = true ]; then
    echo "No global tools found. Trying via nix..."
    run_brute_export "nix"
    echo "Created: $OUTPUT"
    exit 0
fi

# No tools or runners available
echo "Error: No Excalidraw CLI tool found and no package runner (npx/nix) available."
echo ""
echo "Options:"
echo ""
echo "  1. Install npx (comes with Node.js):"
echo "     brew install node  # macOS"
echo "     # Then run this script again - it will use npx automatically"
echo ""
echo "  2. Install a tool globally:"
echo "     npm install -g excalidraw-brute-export-cli"
echo "     npx playwright install firefox"
echo ""
echo "  3. Use nix-shell if you have Nix:"
echo "     # This script will auto-detect nix"
echo ""
exit 1
