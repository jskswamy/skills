---
name: capture
description: Capture anything — from your current conversation or by starting a guided session. Classifies, extracts, studies, drafts, reviews, and saves.
argument-hint: "[type?] <content, URL, or leave empty to capture from conversation>"
---

# Jot Capture

## Step 1: Parse Arguments

Extract from raw arguments:
- Any explicit type hint (e.g., "book", "meeting", "idea")
- URL if present (matches `https?://[^\s]+`)
- Freeform content, or nothing for conversation capture

Store as `raw_args`.

## Step 2: Read Config

Read `${CLAUDE_CONFIG_DIR:-$HOME/.claude}/jot.md`. If absent, treat as empty with all defaults.

Extract:
- `capture_backend`: `workbench` | `capacities` (default: `workbench`)
- `review`: `both` | `workbench` | `capacities` | `off` (default: `both`)
- `agents_dir`: path to generated type agents (default: `${CLAUDE_CONFIG_DIR:-$HOME/.claude}/jot/agents/`)
- `routing[]`: array of routing entries (may be empty on first run)

Read `${CLAUDE_CONFIG_DIR:-$HOME/.claude}/jot.local.md` if present. Extract `workbench_path` (default: `~/workbench`).

Expand all `~` to absolute paths. Store as `WORKBENCH_PATH`.

Check cap availability:
```bash
which cap 2>/dev/null || echo "$HOME/.local/bin/cap"
```
Store result as `CAP`. If neither path exists, set `capture_backend = workbench`.

Store `capture_backend` as `BACKEND`.
Expand `agents_dir` `~` to absolute path. Store as `AGENTS_DIR`.

Get current date:
```bash
date +%Y-%m-%d
```
Store as `CURRENT_DATE`.

Store `review` value as `REVIEW` (default: `both`).

## Step 3: Extract Content (URL or file path only)

If `raw_args` contains a URL (`https?://`) or a local file path:

Delegate to the `jot:content-extractor` subagent:
- Provide: input type (`url` or `file`), the URL or resolved file path
- Receive: `CONTENT { title, description, body, raw_source }` (map: Content Summary → description, Source URL → raw_source)

If extraction fails, report the error and stop — do not proceed to Step 4.

If no URL or file path in `raw_args`: leave `CONTENT` empty (Mode B or conversation capture).

## Step 4: Run Capture Session

Read `${CLAUDE_PLUGIN_ROOT}/agents/capture.md` for the full session logic.
Run it **directly in this conversation — do not spawn an agent**.

All variables are already resolved — carry them in:
- `raw_args`, `CONTENT`, `BACKEND`, `WORKBENCH_PATH`
- `CAP`, `AGENTS_DIR`, `routing[]`, `CURRENT_DATE`, `REVIEW`

Phase 1 of the spec treats these as pre-loaded. Skip re-fetching config.

Complete all phases in order:
classify → extract → study → draft → review → save

## Examples

```
/jot:capture                              # captures from current conversation
/jot:capture https://github.com/astral-sh/uv
/jot:capture meeting with Alice about roadmap
/jot:capture book Atomic Habits by James Clear
/jot:capture idea what if we used event sourcing
```
