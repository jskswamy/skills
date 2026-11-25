---
name: ask
description: "Ask a question about the codebase. <question>"
when_to_use: "Use when the user asks a direct natural-language question about the codebase: 'where does X happen', 'how does X work', 'anything similar to X', 'what should I know before adding X'. Not for ambient context during brainstorming/planning (use codebase:explore), call graphs of a named symbol (use codebase:graph), what a diff affects (use codebase:impact), capability mapping (use codebase:capabilities), boundary/seam inspection (use codebase:seams), the whole-system architecture or its rules (use codebase:architecture), or a reading order (use codebase:tour)."
argument-hint: "<question>"
metadata:
  short-description: "Ask a question about the codebase. <question>"
---

# Codebase Ask Skill

Ask a natural language question about the codebase. This skill classifies your intent and orchestrates the right `codebase-memory-mcp` queries to answer it.

## Argument Parsing

| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `<question>` | string | yes | Natural language question about the codebase |

If no question is provided:
```
Usage: /codebase:ask <question>

Examples:
  /codebase:ask where does webhook validation happen?
  /codebase:ask how does the auth pipeline work end to end?
  /codebase:ask I want to add a new API endpoint — what should I know?
  /codebase:ask anything similar to the writeJSON helper?
```

## Execution Flow

## Codebase Transport

Prefer MCP first. If its tools are absent or the server is unreachable, automatically try the CLI without asking:

```bash
command -v codebase-memory-mcp
codebase-memory-mcp cli --json list_projects
```

Set `codebase_transport` to `mcp` or `cli`. All tool calls below use that transport. For CLI calls, pipe the same JSON arguments to `codebase-memory-mcp cli --json <tool>` via stdin; inspect `isError` and read the result from `content[]` text. Use each tool's `--help` for supported flags and output formats. Query and indexing errors are not transport failures: report them accurately, not as missing MCP. On a later MCP connection failure, retry through CLI. Preserve project selection, index settings, and consent rules; do not install anything automatically.

### Step 0: Derive Project Name and Check Availability

Run `git rev-parse --show-toplevel` to get the repo root. Derive the project name by stripping the leading `/` and replacing all remaining `/` with `-` (e.g. `/Users/alice/src/myrepo` → `Users-alice-src-myrepo`).

Resolve the transport above, then call `index_status` with that derived project name. Two failure cases:
- Neither MCP nor CLI works → explain that codebase queries require either a configured MCP server or the installed `codebase-memory-mcp` CLI, then exit.
- Project not found → print and exit:
  ```
  Project not indexed. Run the `codebase:index` skill first.
  ```

### Step 0b: Check Index Freshness

Read `references/freshness.md` and follow it for every project in scope.

### Step 1: Determine the Project Name

Use the project name derived in Step 0.

### Step 2: Classify Intent

Read the user's question and classify it into one of these intents. This is a judgment call — use the signals as guidance, not rigid rules:

| Intent | Signal words | Action |
|--------|-------------|--------|
| **Location** | "where does", "find", "which file", "locate" | Go to Step 3a |
| **Understanding** | "how does", "explain", "walk me through", "what does X do" | Go to Step 3b |
| **Impact** | "what's affected", "blast radius", "what breaks", "what depends on" | Follow the `codebase:impact` skill workflow. In Claude Code, `/codebase:impact` remains the convenience command for more options. |
| **Capabilities** | "what capabilities", "capability map", "execution corridor of" | Follow the `codebase:capabilities` skill workflow. In Claude Code, `/codebase:capabilities` remains the convenience command for more options. |
| **Seams** | "what are the seams", "leaky seams", "boundary between", "coupling between" | Follow the `codebase:seams` skill workflow. In Claude Code, `/codebase:seams` remains the convenience command for more options. |
| **Similarity** | "anything similar to", "what else does", "duplicates of", "related to" | Go to Step 3c |
| **Onboarding** | "I want to add", "what should I know about", "getting started with", "new to" | Go to Step 3d |

If the intent is ambiguous, make your best judgment. Do not ask the user to clarify — pick the most likely intent and answer.

### Step 3a: Location Query

Read `references/location-query.md` and follow it.

### Step 3b: Understanding Query

Read `references/understanding-query.md` and follow it.

### Step 3c: Similarity Query

Read `references/similarity-query.md` and follow it.

### Step 3d: Onboarding Query

Read `references/onboarding-query.md` and follow it.

### Step 4: Present Answer

Format the answer with:
- **File:line references** for every function or type mentioned
- **Contextual explanation** — what the code does, why it exists, how it fits in the system
- **Connections** — callers, consumers, related patterns, relevant tests

Do NOT dump raw MCP JSON. Synthesize the results into a clear narrative.

If `codebase-memory-mcp` returns no results or empty results for any query, fall back to available search/read tools for that specific sub-query: `ast-grep -p '<pattern>' -l <lang>` (if `command -v ast-grep >/dev/null 2>&1` succeeds; otherwise `rg`/`Grep` + `Read`) for structural syntax queries, `duckdb -c "SELECT ..."` (if `command -v duckdb >/dev/null 2>&1` succeeds; otherwise `jq`/`sqlite3`/`python3`) for structured data files (`.jsonl`, `.csv`, `.parquet`, `.sqlite`), and `Grep`/`Glob`/`Read` in Claude Code or `rg`/`grep`/`find`/`read`/`bash` in Pi for literal text and files. Do not fail silently — try the fallback and include those results in the answer.

### Step 5: Offer a Shareable Copy

Read `references/share.md` and follow it.
