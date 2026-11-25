---
name: codebase-architecture
description: "Use when the user wants the whole-system architecture of a codebase or several linked repos, or wants a planned change checked against architecture rules: 'show the architecture', 'what are the components and layers', 'does this break our architecture rules', 'check ARCHITECTURE.md'. Not for one boundary's coupling in depth (use codebase-seams), behaviour corridors (use codebase-capabilities), or a symbol's callers (use codebase-graph)."
argument-hint: "[--check] [--project <name>[,<name>...]]"
metadata:
  short-description: "Recover the architecture and check it against your rules. [--check] [--project <name>...]"
---

# Codebase Architecture Skill

Recover a codebase's logical architecture (components, their responsibilities, dependencies between them, layers, cycles) from the code as it is now, and check it against the decisions written in the repo's `ARCHITECTURE.md` `codebase-rules` block. Nothing derived is ever saved: every run recomputes from a fresh index or from source.

## Argument Parsing

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `--check` | boolean | off | Report rule results only (skip the full recovery report). |
| `--project` | string | current repo | One or more indexed project names or paths (comma-separated or repeated). |

Examples:
```
/codebase:architecture
/codebase:architecture --check
/codebase:architecture --project api-gateway,billing-service
```

## Execution Flow

## Codebase Transport

Prefer MCP first. If its tools are absent or the server is unreachable, automatically try the CLI without asking:

```bash
command -v codebase-memory-mcp
codebase-memory-mcp cli --json list_projects
```

Set `codebase_transport` to `mcp` or `cli`. All tool calls below use that transport. For CLI calls, pipe the same JSON arguments to `codebase-memory-mcp cli --json <tool>` via stdin; inspect `isError` and read the result from `content[]` text. Use each tool's `--help` for supported flags and output formats. Query and indexing errors are not transport failures: report them accurately, not as missing MCP. On a later MCP connection failure, retry through CLI. Preserve project selection, index settings, and consent rules; do not install anything automatically.

### Step 0: Check Availability

Resolve the transport above. If neither MCP nor CLI works, continue with source inspection only (directory layout, imports via `rg`/`ast-grep`) and label the whole answer as such.

### Step 0b: Check Index Freshness

Read `references/freshness.md` and follow it for every project in scope.

### Step 1: Resolve Project(s)

Call `list_projects`.

- **No `--project`:** run `git rev-parse --show-toplevel` and match the project whose `root_path` equals it (or whose `name` equals that path with the leading `/` stripped and `/` replaced by `-`). Never match by directory basename: worktrees and renamed clones share basenames.
- **`--project <token>[,<token>...]`:** resolve each token in order: (1) exact `name`, (2) exact `root_path`, (3) case-insensitive suffix or basename match on `name` or `root_path`. Zero matches → report the token, list close matches, advise `/codebase:index` in that repo. Several matches → numbered list (`name (root_path)`) and ask with the harness question mechanism.

Strip or reject `'`, `"`, `\\`, and control characters from any value before putting it in a Cypher string.

### Step 2: Load Rules

For each repo in scope, read `ARCHITECTURE.md` at its root, if present. Read `references/rules-format.md` and parse only the `codebase-rules` block as it describes.

### Step 3: Recover

Unless `--check` was given, read `references/recover.md` and follow it. With two or more projects, read `references/multi-project.md` and follow it as well.

### Step 4: Check

The check runs automatically whenever a repo has a rules block, and always with `--check`. Read `references/check.md` and follow it. With `--check` and no rules block, report `no rules block` and stop (there is no recovery to draft rules from; suggest running without `--check`). Without `--check` and with no rules block, skip the check, say that no rules exist, and offer to draft a rules block from the recovered components for the user to edit (show it; write it only if they ask).

### Step 5: Present Results

Lead with rule violations and dead components (they block a safe change), then the recovered architecture: Mermaid diagram, component table (name, paths, one-line responsibility), dependency table with edge counts, layers, cycles. Give `file:line` for every claim. Label any part that came from source inspection. Do not dump raw MCP JSON.

### Step 6: Offer a Shareable Copy

Read `references/share.md` and follow it.
