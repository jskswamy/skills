---
name: codebase-explore
description: "Use when gathering background codebase context as part of a larger workflow, such as the brainstorming or planning explore step, or before modifying unfamiliar code to understand architecture and structure. Not for a direct one-off question (use codebase-ask), a named symbol's callers/callees (use codebase-graph), or the effect of a diff (use codebase-impact)."
---

# Codebase Explore Skill

Enrich codebase exploration with indexed knowledge from `codebase-memory-mcp`. This skill provides grounded, accurate codebase context by querying a semantic and structural graph rather than doing expensive grep/glob/read exploration.

## Codebase Transport

Prefer MCP first. If its tools are absent or the server is unreachable, automatically try the CLI without asking:

```bash
command -v codebase-memory-mcp
codebase-memory-mcp cli --json list_projects
```

Set `codebase_transport` to `mcp` or `cli`. All tool calls below use that transport. For CLI calls, pipe the same JSON arguments to `codebase-memory-mcp cli --json <tool>` via stdin; inspect `isError` and read the result from `content[]` text. Use each tool's `--help` for supported flags and output formats. Query and indexing errors are not transport failures: report them accurately, not as missing MCP. On a later MCP connection failure, retry through CLI. Preserve project selection, index settings, and consent rules; do not install anything automatically.

### Step 1: Check Availability

Resolve the transport above. If either MCP or CLI works, continue to Step 2. Only if neither works, fall back silently to grep/glob/read; this skill never blocks a workflow.

### Step 2: Check Index Freshness and Auto-Index

Call `list_projects` and match against the current repo (from `git rev-parse --show-toplevel` basename) to determine whether an index exists.

Read `.claude/codebase.local.md` if it exists. Resolve the `auto_index` preference (`always`, `never`, `ask`; default `ask`) and `index_mode` (default `moderate`).

Decide what to do:

- **No matching indexed project (index missing):** treat as needing an index.
  - `auto_index: always` → call `index_repository` with the resolved mode, then continue.
  - `auto_index: ask` (or file missing) → ask the user using the harness question mechanism:
    ```
    The codebase isn't indexed yet. Index now?

    ○ Yes, always (save preference)
    ○ Yes, just this once
    ○ No (fall back to grep/glob)
    ```
    If a "save" option is selected, write the preference to `.claude/codebase.local.md`. If "Yes", call `index_repository`, then continue. If "No", fall back to grep/glob/read.
  - `auto_index: never` → print `Codebase is not yet indexed. Run /skill:codebase-index (or /codebase:index in Claude Code) to build the index.` and fall back to grep/glob/read.

- **Index exists but `last_indexed` is missing or >24h old (stale):**
  - `auto_index: always` → call `index_repository` with the resolved mode to refresh, then continue.
  - `auto_index: ask` → ask the user using the harness question mechanism:
    ```
    Codebase index is stale (last indexed: [time ago]). Refresh now?

    ○ Yes, always (save preference)
    ○ Yes, just this once
    ○ No, use stale index
    ```
    If "Yes", refresh then continue. If "No", continue with stale data after printing `⚠ Using stale index (last indexed: [time ago]). Results may be incomplete.`
  - `auto_index: never` → print `⚠ Index may be stale (last indexed: [time ago]). Run /skill:codebase-index (or /codebase:index in Claude Code) to refresh.` and continue with stale data.

- **Index exists and is fresh:** continue.

After a successful auto-index, update `last_indexed` in `.claude/codebase.local.md` (preserving other fields).

### Step 3: Context-Dependent Exploration

**If activated during brainstorming or planning (exploring project context):**

1. Call `get_architecture` with `project` set to the matched project name. Request all aspects: `["languages", "packages", "services", "dependencies", "entry_points", "hotspots", "clusters"]`.

2. Summarize the architecture overview as grounded context:
   - Primary languages and their distribution
   - Key packages and their responsibilities
   - Service boundaries and entry points
   - Dependency patterns and hotspots

3. If the brainstorming/planning topic is known, run targeted queries:
   - Call `search_graph` with `semantic_query` matching the topic to find relevant existing code
   - For the top 3-5 results, note the file:line references and what each does

4. Present the results as context for the brainstorming/planning session. Frame it as "here's what exists that's relevant to what we're discussing."

**If activated on a direct user question:**

Invoke or follow the `codebase-ask` skill with the user's question. In Claude
Code, `/codebase:ask` remains a convenience command for the same workflow.

### Step 4: Fallback

If a tool call fails during exploration, first retry MCP connection failures through CLI as described above. If the selected transport still fails:
- Do NOT fail the overall workflow
- Fall back to available search/read tools for the specific information needed, such as `Grep`/`Glob`/`Read` in Claude Code or `grep`/`find`/`read`/`bash` in Pi
- Continue with whatever results are available
