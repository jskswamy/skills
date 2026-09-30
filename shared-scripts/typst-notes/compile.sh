#!/usr/bin/env bash
# Typst compilation script with global → nix-shell fallback
# Usage: compile.sh <input.typ> <output> [--format pdf|html|both] [--font-path <path>]

set -euo pipefail

INPUT=""
OUTPUT=""
FORMAT="pdf"
FONT_PATH=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --format)
      FORMAT="$2"
      shift 2
      ;;
    --font-path)
      FONT_PATH="$2"
      shift 2
      ;;
    *)
      if [[ -z "$INPUT" ]]; then
        INPUT="$1"
      elif [[ -z "$OUTPUT" ]]; then
        OUTPUT="$1"
      fi
      shift
      ;;
  esac
done

if [[ -z "$INPUT" ]]; then
  echo "Error: No input file specified" >&2
  echo "Usage: compile.sh <input.typ> <output> [--format pdf|html|both] [--font-path <path>]" >&2
  exit 1
fi

if [[ -z "$OUTPUT" ]]; then
  OUTPUT="${INPUT%.typ}"
fi

FONT_ARG=""
if [[ -n "$FONT_PATH" ]]; then
  FONT_ARG="--font-path $FONT_PATH"
fi

compile_typst() {
  local typst_cmd="$1"
  local fmt="$2"
  local out_ext=""
  local out_file=""

  case "$fmt" in
    pdf)
      out_file="${OUTPUT}.pdf"
      ;;
    html)
      out_file="${OUTPUT}.html"
      ;;
  esac

  eval "$typst_cmd compile --root / \"$INPUT\" \"$out_file\" $FONT_ARG"
  echo "$out_file"
}

run_compilation() {
  local typst_cmd="$1"

  case "$FORMAT" in
    pdf)
      compile_typst "$typst_cmd" "pdf"
      ;;
    html)
      compile_typst "$typst_cmd" "html"
      ;;
    both)
      compile_typst "$typst_cmd" "pdf"
      compile_typst "$typst_cmd" "html"
      ;;
    *)
      echo "Error: Unknown format '$FORMAT'. Use pdf, html, or both." >&2
      exit 1
      ;;
  esac
}

# Resolution order: global typst → nix-shell fallback → error
if command -v typst &>/dev/null; then
  run_compilation "typst"
elif command -v nix-shell &>/dev/null; then
  echo "typst not found globally, using nix-shell fallback..." >&2
  TYPST_CMD="nix-shell -p typst --run"
  case "$FORMAT" in
    pdf)
      out_file="${OUTPUT}.pdf"
      nix-shell -p typst --run "typst compile --root / \"$INPUT\" \"$out_file\" $FONT_ARG"
      echo "$out_file"
      ;;
    html)
      out_file="${OUTPUT}.html"
      nix-shell -p typst --run "typst compile --root / \"$INPUT\" \"$out_file\" $FONT_ARG"
      echo "$out_file"
      ;;
    both)
      out_file_pdf="${OUTPUT}.pdf"
      out_file_html="${OUTPUT}.html"
      nix-shell -p typst --run "typst compile --root / \"$INPUT\" \"$out_file_pdf\" $FONT_ARG && typst compile --root / \"$INPUT\" \"$out_file_html\" $FONT_ARG"
      echo "$out_file_pdf"
      echo "$out_file_html"
      ;;
  esac
else
  echo "Error: typst is not installed and nix-shell is not available." >&2
  echo "" >&2
  echo "Install typst using one of:" >&2
  echo "  brew install typst          # macOS (Homebrew)" >&2
  echo "  nix-env -iA nixpkgs.typst   # Nix" >&2
  echo "  cargo install typst-cli     # Rust/Cargo" >&2
  echo "" >&2
  echo "Or ensure nix-shell is available for automatic fallback." >&2
  exit 1
fi
