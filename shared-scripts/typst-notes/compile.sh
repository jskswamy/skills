#!/usr/bin/env bash
# Typst compilation script with global → nix-shell → nix fallback
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

compile_with_nix_shell() {
  local fmt="$1"
  local out_file="${OUTPUT}.${fmt}"

  nix-shell -p typst --run "typst compile --root / \"$INPUT\" \"$out_file\" $FONT_ARG"
  echo "$out_file"
}

compile_with_nix() {
  local fmt="$1"
  local out_file="${OUTPUT}.${fmt}"

  nix shell nixpkgs#typst -c typst compile --root / "$INPUT" "$out_file" $FONT_ARG
  echo "$out_file"
}

run_nix_compilation() {
  local runner="$1"

  case "$FORMAT" in
    pdf|html)
      "$runner" "$FORMAT"
      ;;
    both)
      "$runner" "pdf"
      "$runner" "html"
      ;;
    *)
      echo "Error: Unknown format '$FORMAT'. Use pdf, html, or both." >&2
      exit 1
      ;;
  esac
}

# Resolution order: global typst → nix-shell fallback → nix fallback → error
if command -v typst &>/dev/null; then
  run_compilation "typst"
elif command -v nix-shell &>/dev/null; then
  echo "typst not found globally, using nix-shell fallback..." >&2
  run_nix_compilation compile_with_nix_shell
elif command -v nix &>/dev/null; then
  echo "typst not found globally, using nix fallback..." >&2
  run_nix_compilation compile_with_nix
else
  echo "Error: typst is not installed and neither nix-shell nor nix is available." >&2
  echo "" >&2
  echo "Install typst using one of:" >&2
  echo "  brew install typst               # macOS (Homebrew)" >&2
  echo "  nix-env -iA nixpkgs.typst        # Nix profile" >&2
  echo "  cargo install --locked typst-cli # Rust/Cargo" >&2
  echo "" >&2
  echo "Or ensure nix-shell or nix is available for automatic fallback." >&2
  exit 1
fi
