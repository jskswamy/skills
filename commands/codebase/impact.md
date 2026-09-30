---
name: impact
description: Analyze the impact of recent code changes — blast radius, risk levels, affected tests
argument-hint: "[--base <sha>]"
---

# /codebase:impact Command

Show what's affected by recent code changes. Wraps `codebase-memory-mcp`'s `detect_changes` tool with enriched output: risk classification, caller analysis for high-risk changes, and test coverage status.

## Argument Parsing

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `--base` | string | auto-detected | Base SHA to compare against. Auto-detects upstream tracking branch (`@{u}`) or prompts if none. |

## Execution Flow

### Step 0: Check codebase-memory-mcp Availability

Call `list_projects` to verify the MCP server is available. If not:
```
codebase-memory-mcp not found. Install and configure it before using /codebase commands.
```
Exit.

### Step 0b: Check Index Freshness

Follow the same auto-index flow as `/codebase:ask` Step 0b. Read `.claude/codebase.local.md`, respect `auto_index` preference, warn on staleness.

### Step 1: Determine Base SHA

If `--base` is provided, use it directly.

If not provided, auto-detect:
```bash
git rev-parse @{u} 2>/dev/null
```
If that fails (no upstream), check:
```bash
git merge-base HEAD main 2>/dev/null || git merge-base HEAD master 2>/dev/null
```
If all fail, use AskUserQuestion:
```
No upstream branch detected. What SHA should I compare against?

Enter a commit SHA, branch name, or tag:
```

### Step 2: Determine Project Name

Call `list_projects` and match against the current repo (same as `/codebase:ask` Step 1).

### Step 3: Detect Changes

Call `detect_changes` with:
- `project`: the matched project name
- `scope`: `"commits"`
- `base_branch`: the resolved base SHA from Step 1
- `depth`: `2`

This returns a list of changed symbols with risk labels (CRITICAL, HIGH, MEDIUM, LOW) and blast radius information.

### Step 4: Enrich CRITICAL and HIGH Items

For each symbol classified as CRITICAL or HIGH:

1. Call `trace_call_path` with:
   - `function_name`: the symbol's qualified name
   - `direction`: `"inbound"`
   - `depth`: `2`
   - `project`: the matched project name

   This shows what depends on the changed symbol.

2. Call `search_graph` with:
   - `name_pattern`: a regex matching common test file patterns for the symbol (e.g., if the symbol is in `auth/middleware.go`, search for files matching `auth.*test`)
   - `label`: `"Function"` or `"Method"`
   - `project`: the matched project name

   Classify test coverage as:
   - `covered` — test file exists with functions that reference the changed symbol
   - `partial` — test file exists but doesn't reference the changed symbol directly
   - `none` — no test file found

### Step 5: Present Results

Group results by risk level. For each changed symbol:

```
## Impact Analysis (base: [base_sha]..HEAD)

### CRITICAL
- `[file_path]:[function_name]` (line [N])
  [Contextual explanation: what changed and why it matters]
  [N] callers across [M] packages depend on this — [list key callers]
  Tests: [covered|partial|none] — [details]

### HIGH
- `[file_path]:[function_name]` (line [N])
  [Contextual explanation]
  Tests: [status]

### MEDIUM
- `[file_path]:[function_name]` (line [N])
  [Brief explanation]

### LOW
- [list briefly, or "No changes at LOW risk level"]
```

If `detect_changes` returns no results:
```
No changes detected between [base] and HEAD.
```

The contextual explanation for each item should cover:
- What specifically changed (from the risk label context)
- Why it matters (how many things depend on it, what breaks if it's wrong)
- Test coverage gaps if any
