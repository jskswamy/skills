---
name: codebase-explore
description: |
  Explore codebase using indexed knowledge from codebase-memory-mcp. Use when:
  exploring project context during brainstorming or planning,
  user asks about codebase architecture or structure,
  user asks how something works or where something happens,
  user asks what would be affected by a change,
  user wants to understand code before modifying it
---

# Codebase Explore Skill

Enrich codebase exploration with indexed knowledge from `codebase-memory-mcp`. This skill provides grounded, accurate codebase context by querying a semantic and structural graph rather than doing expensive grep/glob/read exploration.

## When This Skill Activates

- During brainstorming "Explore project context" step
- During planning codebase analysis step
- When the user asks about codebase architecture, structure, or how things work
- When the user asks "where does X happen?" or "how does Y work?"
- When the user wants to understand the impact of a change

## Activation Flow

### Step 1: Check codebase-memory-mcp Availability

Attempt to call the `codebase-memory-mcp` `list_projects` tool.

**If the MCP server is NOT available:**
Fall back to standard grep/glob/read exploration silently. Do NOT print an error — this skill should not block any workflow. Proceed with normal file exploration tools.

**If the MCP server IS available:** Continue to Step 2.

### Step 2: Check Index Freshness and Auto-Index

Call `list_projects` and match against the current repo (from `git rev-parse --show-toplevel` basename) to determine whether an index exists.

Read `.claude/codebase.local.md` if it exists. Resolve the `auto_index` preference (`always`, `never`, `ask`; default `ask`) and `index_mode` (default `moderate`).

Decide what to do:

- **No matching indexed project (index missing):** treat as needing an index.
  - `auto_index: always` → call `index_repository` with the resolved mode, then continue.
  - `auto_index: ask` (or file missing) → use `AskUserQuestion` to prompt:
    ```
    The codebase isn't indexed yet. Index now?

    ○ Yes, always (save preference)
    ○ Yes, just this once
    ○ No (fall back to grep/glob)
    ```
    If a "save" option is selected, write the preference to `.claude/codebase.local.md`. If "Yes", call `index_repository`, then continue. If "No", fall back to grep/glob/read.
  - `auto_index: never` → print `Codebase is not yet indexed. Run /codebase:index to build the index.` and fall back to grep/glob/read.

- **Index exists but `last_indexed` is missing or >24h old (stale):**
  - `auto_index: always` → call `index_repository` with the resolved mode to refresh, then continue.
  - `auto_index: ask` → use `AskUserQuestion` to prompt:
    ```
    Codebase index is stale (last indexed: [time ago]). Refresh now?

    ○ Yes, always (save preference)
    ○ Yes, just this once
    ○ No, use stale index
    ```
    If "Yes", refresh then continue. If "No", continue with stale data after printing `⚠ Using stale index (last indexed: [time ago]). Results may be incomplete.`
  - `auto_index: never` → print `⚠ Index may be stale (last indexed: [time ago]). Run /codebase:index to refresh.` and continue with stale data.

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

Route the question through the same logic as `/codebase:ask`:

1. Classify intent (Location, Understanding, Impact, Similarity, Onboarding)
2. Call the appropriate `codebase-memory-mcp` tools
3. Present the answer with file:line references and contextual explanation

See the `/codebase:ask` command (in `${CLAUDE_PLUGIN_ROOT}/commands/ask.md`) for the full intent classification and tool sequence for each intent type.

### Step 4: Fallback

If any `codebase-memory-mcp` tool call fails during exploration:
- Do NOT fail the overall workflow
- Fall back to `Grep`, `Glob`, and `Read` for the specific information needed
- Continue with whatever results are available
