---
name: ask
description: Ask a natural language question about the codebase
argument-hint: "<question>"
---

# /codebase:ask Command

Ask a natural language question about the codebase. This command classifies your intent and orchestrates the right `codebase-memory-mcp` queries to answer it.

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

### Step 0: Derive Project Name and Check Availability

Run `git rev-parse --show-toplevel` to get the repo root. Derive the project name by stripping the leading `/` and replacing all remaining `/` with `-` (e.g. `/Users/alice/src/myrepo` → `Users-alice-src-myrepo`).

Call `index_status` with that derived project name. Two failure cases:
- MCP server unreachable → print and exit:
  ```
  codebase-memory-mcp not found. Install and configure it before using /codebase commands.
  ```
- Project not found → print and exit:
  ```
  Project not indexed. Run /codebase:index first.
  ```

### Step 0b: Check Index Freshness

Read `.claude/codebase.local.md`. Determine two things: `auto_index` setting and whether the index is **stale** (`last_indexed` missing or >24 hours ago).

| Condition | Action |
|-----------|--------|
| `last_indexed` missing (never indexed) | AskUserQuestion: "Index now?" with options: Yes always / Yes once / No (manual). Save preference if chosen. If Yes, call `index_repository`. |
| Stale AND `auto_index` is not `never` | Auto-reindex: print `⟳ Index is stale — reindexing…`, call `index_repository` with saved `index_mode` (default: `moderate`), update `last_indexed`. |
| Stale AND `auto_index` is `never` | Print `⚠ Index may be stale (last indexed: [time ago]). Run /codebase:index to refresh.` then proceed. |
| `auto_index` is `always` (any freshness) | Call `index_repository` before proceeding. |
| Fresh | Proceed. |

### Step 1: Determine the Project Name

Use the project name derived in Step 0.

### Step 2: Classify Intent

Read the user's question and classify it into one of these intents. This is a judgment call — use the signals as guidance, not rigid rules:

| Intent | Signal words | Action |
|--------|-------------|--------|
| **Location** | "where does", "find", "which file", "locate" | Go to Step 3a |
| **Understanding** | "how does", "explain", "walk me through", "what does X do" | Go to Step 3b |
| **Impact** | "what's affected", "blast radius", "what breaks", "what depends on" | Print: "Routing to /codebase:impact — use that command directly for more options." Then follow the /codebase:impact flow. |
| **Similarity** | "anything similar to", "what else does", "duplicates of", "related to" | Go to Step 3c |
| **Onboarding** | "I want to add", "what should I know about", "getting started with", "new to" | Go to Step 3d |

If the intent is ambiguous, make your best judgment. Do not ask the user to clarify — pick the most likely intent and answer.

### Step 3a: Location Query

1. Call `search_graph` with `semantic_query` set to a rephrased version of the user's question (extract the core concept, e.g. "webhook validation" from "where does webhook validation happen?"). Set `limit` to 5.
2. For the top 1-3 results, call `get_code_snippet` with the `qualified_name` to read the actual source.
3. Synthesize the answer: state which file:line the code lives in, what the function does, who calls it (from `search_graph` connected nodes if available), and any relevant context about why it exists.

### Step 3b: Understanding Query

1. Call `get_architecture` with `project` set to the current project. Request aspects: `["packages", "services", "entry_points"]`.
2. Call `search_graph` with `semantic_query` to find the entry point or main function related to the user's question. Set `limit` to 5.
3. For the most relevant result, call `trace_call_path` with `direction: "outbound"`, `depth: 3` to trace the flow from that entry point.
4. For key nodes in the trace (up to 3), call `get_code_snippet` to read the source.
5. Synthesize a narrative explanation: start with the entry point, walk through the call chain, explain what each step does and why, and how data flows through the system. Reference file:line for each function mentioned.

### Step 3c: Similarity Query

1. Call `search_graph` with `semantic_query` describing the function or concept the user is asking about. Set `limit` to 10.
2. Filter results: skip results from the same file. Group by package.
3. For the top 3-5 matches, call `get_code_snippet` to read the actual source and confirm similarity.
4. Synthesize: describe each match, explain how it's similar and how it differs, and note which ones could potentially be unified.

### Step 3d: Onboarding Query

1. Call `get_architecture` with `project` set to the current project. Request aspects: `["packages", "services", "dependencies", "entry_points"]`.
2. Call `search_graph` with `semantic_query` to find existing implementations similar to what the user wants to add. Set `limit` to 5.
3. For the top 1-2 matches, call `trace_call_path` with `direction: "both"`, `depth: 2` to understand the interfaces and patterns.
4. Call `get_code_snippet` for key files the user will need to understand.
5. Synthesize: "To add [X], you'll want to look at how [similar thing] is implemented. Here's the pattern..." Include: files to model after, interfaces to implement, configuration to update, test patterns to follow.

### Step 4: Present Answer

Format the answer with:
- **File:line references** for every function or type mentioned
- **Contextual explanation** — what the code does, why it exists, how it fits in the system
- **Connections** — callers, consumers, related patterns, relevant tests

Do NOT dump raw MCP JSON. Synthesize the results into a clear narrative.

If `codebase-memory-mcp` returns no results or empty results for any query, fall back to `Grep` and `Glob` for that specific sub-query. Do not fail silently — try the fallback and include those results in the answer.
