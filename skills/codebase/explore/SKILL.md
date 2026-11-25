---
name: explore
description: "Use when gathering background codebase context as part of a larger workflow, such as the brainstorming or planning explore step, or before modifying unfamiliar code to understand architecture and structure. Not for a direct one-off question (use codebase:ask), a named symbol's callers/callees (use codebase:graph), the effect of a diff (use codebase:impact), capability mapping (use codebase:capabilities), or boundary/seam inspection (use codebase:seams)."
user-invocable: false
---

# Codebase Explore Skill

Enrich codebase exploration with indexed knowledge from `codebase-memory-mcp`. This skill provides grounded, accurate codebase context by querying a semantic and structural graph for questions about structure and relationships.

## Route by the Question

Choose the tool that fits the question. For callers, callees, dependencies, impact, or an unknown execution flow, use the graph (`search_graph`, `trace_path`). For functional capability discovery or execution corridors, use `codebase:capabilities`; for package, layer, or cross-repo boundary coupling and enabling points, use `codebase:seams`. For structural syntax patterns (function calls, AST shapes, multi-line expressions) or deterministic multi-file syntax rewrites, use `ast-grep` (`ast-grep -p '<pattern>' -l <lang>`, or `ast-grep -p '<pattern>' -r '<rewrite>' -l <lang> -U`) when `command -v ast-grep >/dev/null 2>&1` succeeds; if `ast-grep` is unavailable, fall back to `rg`/`Grep` + `Read` and standard file-edit tools. For exact text, flags or literals, use literal search (`rg`, `search_code`). For querying or aggregating structured data files (`.jsonl`, `.csv`, `.parquet`, `.sqlite`, `.beads/issues.jsonl`, or session transcripts), use `duckdb -c "SELECT ..."` when `command -v duckdb >/dev/null 2>&1` succeeds; if `duckdb` is unavailable, fall back to `jq` (for JSON/JSONL), `sqlite3` (for SQLite), or `awk`/`python3` (for CSV). For a known file's full contents, read it directly. For evaluated behaviour or measurements, use the runtime or toolchain. Verify the relevant source before concluding or editing. If a graph query is irrelevant, refine it once with known names or path filters, then use targeted structural (`ast-grep`, if installed) or text (`rg`) search for the gap, and report the actual condition (no coverage, poor relevance, transport unavailable) instead of calling it a broken connection.

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

Call `list_projects` and match the project whose `root_path` equals `git rev-parse --show-toplevel` (the name is the root path with the leading `/` removed and `/` replaced by `-`). Do not match on the directory basename: worktrees and renamed repos share basenames. Use `index_status` on that name to confirm it is indexed.

Read `references/freshness.md` and follow it. This skill never blocks a workflow: when the index stays not fresh, continue with labelled source inspection as that reference says.

### Step 3: Context-Dependent Exploration

**If activated during brainstorming or planning (exploring project context):**

1. Call `get_architecture` with `project` set to the matched project name. Request only the aspects the topic needs; default to `["packages", "entry_points"]` and add `"services"`, `"dependencies"`, `"languages"`, `"hotspots"` or `"clusters"` when the question is about them.

2. Summarize the architecture overview as grounded context:
   - Primary languages and their distribution
   - Key packages and their responsibilities
   - Service boundaries and entry points
   - Dependency patterns and hotspots

3. If the brainstorming/planning topic is known, run targeted queries:
   - Call `search_graph` with `semantic_query` (array of strings) matching the topic to find relevant existing code, bounded by `semantic_limit`
   - For the top 3-5 results, note the file:line references and what each does

4. Present the results as context for the brainstorming/planning session. Frame it as "here's what exists that's relevant to what we're discussing."

**If activated on a direct user question:**

Invoke or follow the `codebase:ask` skill with the user's question. In Claude
Code, `/codebase:ask` remains a convenience command for the same workflow.

### Step 4: Fallback

If a tool call fails during exploration, first retry MCP connection failures through CLI as described above. If the selected transport still fails:
- Do NOT fail the overall workflow
- Fall back to available search/read tools for the specific information needed: `ast-grep` (if installed; otherwise `rg`/`Grep` + `Read`) for structural syntax patterns, `duckdb` (if installed; otherwise `jq`/`sqlite3`/`python3`) for structured data (`.jsonl`, `.csv`, `.parquet`, `.sqlite`), and `Grep`/`Glob`/`Read` in Claude Code or `rg`/`grep`/`find`/`read`/`bash` in Pi for text and files
- Continue with whatever results are available
