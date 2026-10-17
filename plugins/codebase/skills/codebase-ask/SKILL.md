---
name: codebase-ask
description: "Use when the user asks a direct natural-language question about the codebase: 'where does X happen', 'how does X work', 'anything similar to X', 'what should I know before adding X'. Not for ambient context during brainstorming/planning (use codebase-explore), call graphs of a named symbol (use codebase-graph), or what a diff affects (use codebase-impact)."
---

# Codebase Ask Skill

Ask a natural language question about the codebase. This skill classifies your intent and orchestrates the right `codebase-memory-mcp` queries to answer it.

## Argument Parsing

| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `<question>` | string | yes | Natural language question about the codebase |

If no question is provided:
```
Usage: /skill:codebase-ask <question>  (Claude Code: /codebase:ask <question>)

Examples:
  /skill:codebase-ask where does webhook validation happen?
  /skill:codebase-ask how does the auth pipeline work end to end?
  /skill:codebase-ask I want to add a new API endpoint — what should I know?
  /skill:codebase-ask anything similar to the writeJSON helper?
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
  Project not indexed. Run the `codebase-index` skill (or `/codebase:index` in Claude Code) first.
  ```

### Step 0b: Check Index Freshness

Read `.claude/codebase.local.md`. Determine two things: `auto_index` setting and whether the index is **stale** (`last_indexed` missing or >24 hours ago).

| Condition | Action |
|-----------|--------|
| Not indexed, or `last_indexed` missing | `auto_index: always` → call `index_repository` with the saved `index_mode` (default `moderate`). `auto_index: never` → print the `codebase-index` hint and fall back to grep/glob/read. Otherwise (`ask` or file missing) ask the user using the harness's question mechanism (AskUserQuestion in Claude Code; in Pi, ask in chat and wait): Yes always / Yes once / No (manual). Save the preference if chosen. |
| Stale (`last_indexed` >24 hours ago) | `auto_index: always` → reindex, print `⟳ Index is stale — reindexing…`, update `last_indexed`. `auto_index: ask` → ask: Yes always / Yes once / No, use stale index; on No print `⚠ Using stale index (last indexed: [time ago]). Results may be incomplete.` and proceed. `auto_index: never` → print `⚠ Index may be stale (last indexed: [time ago]). Run /skill:codebase-index (or /codebase:index in Claude Code) to refresh.` and proceed. |
| Fresh | Proceed. |

Never index or refresh without the permission above. The server's `index_status` is the source of truth for whether a project is indexed; `last_indexed` in the preference file only drives the staleness check.

### Step 1: Determine the Project Name

Use the project name derived in Step 0.

### Step 2: Classify Intent

Read the user's question and classify it into one of these intents. This is a judgment call — use the signals as guidance, not rigid rules:

| Intent | Signal words | Action |
|--------|-------------|--------|
| **Location** | "where does", "find", "which file", "locate" | Go to Step 3a |
| **Understanding** | "how does", "explain", "walk me through", "what does X do" | Go to Step 3b |
| **Impact** | "what's affected", "blast radius", "what breaks", "what depends on" | Follow the `codebase-impact` skill workflow. In Claude Code, `/codebase:impact` remains the convenience command for more options. |
| **Similarity** | "anything similar to", "what else does", "duplicates of", "related to" | Go to Step 3c |
| **Onboarding** | "I want to add", "what should I know about", "getting started with", "new to" | Go to Step 3d |

If the intent is ambiguous, make your best judgment. Do not ask the user to clarify — pick the most likely intent and answer.

### Step 3a: Location Query

1. Call `search_graph` with `semantic_query` (an array of strings, e.g. `["webhook validation"]`) set to a rephrased version of the user's question (extract the core concept from "where does webhook validation happen?"). Set `semantic_limit` to 5.
2. For the top 1-3 results, call `get_code_snippet` with the `qualified_name` to read the actual source.
3. Synthesize the answer: state which file:line the code lives in, what the function does, who calls it (from `search_graph` connected nodes if available), and any relevant context about why it exists.

### Step 3b: Understanding Query

1. Call `get_architecture` with `project` set to the current project. Request aspects: `["packages", "services", "entry_points"]`.
2. Call `search_graph` with `semantic_query` (array of strings) to find the entry point or main function related to the user's question. Set `semantic_limit` to 5.
3. For the most relevant result, call `trace_path` with `direction: "outbound"`, `depth: 3` to trace the flow from that entry point.
4. For key nodes in the trace (up to 3), call `get_code_snippet` to read the source.
5. Synthesize a narrative explanation: start with the entry point, walk through the call chain, explain what each step does and why, and how data flows through the system. Reference file:line for each function mentioned.

### Step 3c: Similarity Query

1. Call `search_graph` with `semantic_query` (array of strings) describing the function or concept the user is asking about. Set `semantic_limit` to 10.
2. Filter results: skip results from the same file. Group by package.
3. For the top 3-5 matches, call `get_code_snippet` to read the actual source and confirm similarity.
4. Synthesize: describe each match, explain how it's similar and how it differs, and note which ones could potentially be unified.

### Step 3d: Onboarding Query

1. Call `get_architecture` with `project` set to the current project. Request aspects: `["packages", "services", "dependencies", "entry_points"]`.
2. Call `search_graph` with `semantic_query` (array of strings) to find existing implementations similar to what the user wants to add. Set `semantic_limit` to 5.
3. For the top 1-2 matches, call `trace_path` with `direction: "both"`, `depth: 2` to understand the interfaces and patterns.
4. Call `get_code_snippet` for key files the user will need to understand.
5. Synthesize: "To add [X], you'll want to look at how [similar thing] is implemented. Here's the pattern..." Include: files to model after, interfaces to implement, configuration to update, test patterns to follow.

### Step 4: Present Answer

Format the answer with:
- **File:line references** for every function or type mentioned
- **Contextual explanation** — what the code does, why it exists, how it fits in the system
- **Connections** — callers, consumers, related patterns, relevant tests

Do NOT dump raw MCP JSON. Synthesize the results into a clear narrative.

If `codebase-memory-mcp` returns no results or empty results for any query, fall back to available search/read tools for that specific sub-query, such as `Grep`/`Glob`/`Read` in Claude Code or `grep`/`find`/`read`/`bash` in Pi. Do not fail silently — try the fallback and include those results in the answer.
