---
name: codebase-index
description: "Use when the codebase index must be built, refreshed, or linked across repositories: 'index this repo', 'reindex', 'index is stale', 'link repos', or when other codebase skills report no index. This only builds or links the index; to answer questions use codebase-ask, codebase-graph, codebase-impact, codebase-capabilities, or codebase-seams."
argument-hint: "[--mode full|moderate|fast|cross-repo-intelligence] [--link <project|*>]"
metadata:
  short-description: "Build, refresh, or link the codebase index. [--mode full|moderate|fast|cross-repo-intelligence] [--link <project|*>]"
---

# Codebase Index Skill

Index the current codebase or link cross-repository service boundaries using `codebase-memory-mcp`. This builds, refreshes, or links the semantic and structural graph that all other `/codebase:*` commands query.

## Argument Parsing

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `--mode` | string | `moderate` | Indexing mode: `full` (all semantic signals, slowest), `moderate` (structural + semantic similarity), `fast` (structural only, fastest), `cross-repo-intelligence` (link cross-service edges across indexed projects) |
| `--link` | string | optional | Target project name(s) (comma-separated) or `*` to link against using `cross-repo-intelligence` mode |

## Execution Flow

## Codebase Transport

Prefer MCP first. If its tools are absent or the server is unreachable, automatically try the CLI without asking:

```bash
command -v codebase-memory-mcp
codebase-memory-mcp cli --json list_projects
```

Set `codebase_transport` to `mcp` or `cli`. All tool calls below use that transport. For CLI calls, pipe the same JSON arguments to `codebase-memory-mcp cli --json <tool>` via stdin; inspect `isError` and read the result from `content[]` text. Use each tool's `--help` for supported flags and output formats. Query and indexing errors are not transport failures: report them accurately, not as missing MCP. On a later MCP connection failure, retry through CLI. Preserve project selection, index settings, and consent rules; do not install anything automatically.

### Step 1: Check Availability

Resolve the transport above. Only if neither MCP nor CLI works, explain that indexing requires either a configured MCP server or the installed `codebase-memory-mcp` CLI, then exit.

### Step 2: Read User Settings

Read `.claude/codebase.local.md` if it exists. Parse the YAML frontmatter for `index_mode`. If the file does not exist, use the default mode (`moderate`).

The `--mode` argument takes priority over the saved `index_mode` setting.

### Step 3: Run Indexing or Cross-Repo Linking

Determine the repository root path:
```bash
git rev-parse --show-toplevel
```

**Standard Indexing (`--link` is omitted and `--mode` is `full`, `moderate`, or `fast`):**

Call the `codebase-memory-mcp` `index_repository` tool with:
- `repo_path`: the repository root path
- `mode`: the resolved mode from Step 2

Print progress:
```
Indexing codebase (moderate)...
```

**Cross-Repo Linking (`--link <project|*>` is passed, or `--mode cross-repo-intelligence` is used without `--link`, which defaults to `--link *`):**

1. Call `list_projects` and check `index_status` for the current repository (`git rev-parse --show-toplevel`).
2. **Pre-condition (Current Repo):** If the current repository is not yet indexed, first run a standard `index_repository` call on `repo_path` using the saved `index_mode` from `.claude/codebase.local.md` (or `moderate` by default) and update `.claude/codebase.local.md`.
3. **Pre-condition (Target Projects):** If `--link` is `*`, set `target_projects: ["*"]`. Otherwise, resolve each comma-separated project token in `--link` against `list_projects` in order: (1) exact `name` match, (2) exact `root_path` match, (3) case-insensitive suffix or basename match on `name` or `root_path`. If any named target project is not found in `list_projects`, stop and print:
   ```
   Target project "[project]" is not indexed yet. Run `/codebase:index` in that repository first.
   ```
4. Call `index_repository` with:
   - `repo_path`: the repository root path
   - `mode`: `"cross-repo-intelligence"`
   - `target_projects`: `["<resolved-target-project>", ...]` (or `["*"]`)

### Step 4: Report Results and Update Settings

**On standard indexing success**, print the results from the `index_repository` response (file count, timing):

```
✓ Indexed [N] files in [T]s

Run the `codebase-ask` skill to explore your codebase.
```

Write or update `.claude/codebase.local.md` with the current timestamp and mode:

```yaml
---
auto_index: ask
index_mode: moderate
last_indexed: [current ISO 8601 timestamp]
---
```

Preserve any existing `auto_index` value if the file already existed. Only update `last_indexed` and `index_mode`.

**On cross-repo linking success**, do **not** overwrite `index_mode` or `last_indexed` in `.claude/codebase.local.md` on a link-only run (only update `.claude/codebase.local.md` if Step 3 also ran a standard `full|moderate|fast` index). Print:

```
✓ Linked [current_project] with [target_projects] ([N] cross-repo edges)

Run `codebase-capabilities` or `codebase-seams` with `--project` to explore cross-repo flows.
```

On failure, print the error from the MCP tool and do NOT update `last_indexed`:
```
Index failed: [error message]

Try running with --mode full if you're seeing stale results.
```
