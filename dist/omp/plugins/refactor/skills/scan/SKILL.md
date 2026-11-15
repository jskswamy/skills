---
name: refactor-scan
description: Use when the user asks to scan for refactoring opportunities, e.g. "refactor scan", "find duplication or code smells in my recent commits", "scan this package for refactors", "audit the whole codebase for refactoring", or "resume the refactor scan"; scans a diff, package, or full codebase and files reviewable findings as beads issues.
argument-hint: "[--scope diff|package|all] [<package-path>] [--base <sha>] [--limit N] [--fresh] [--clean]"
metadata:
  short-description: "Scan code for refactoring opportunities. [--scope diff|package|all] [--base <sha>] [--fresh]"
---

# Refactor Scan Skill

Scan code for refactoring opportunities. Supports three scopes:

- **diff** (default): scan committed changes against the base SHA. Single scanner + single validator (preserves prior behavior).
- **package**: scan one package directory. Single scanner shard.
- **all**: scan the entire indexed codebase. Sharded scanners (one per package), then a synthesizer that produces a human-reviewable `findings.md`, then per-section validators that create rich beads issues.

For `package` and `all` scopes, the pipeline persists state to `.refactor-scan/<ISO-timestamp>/` so a dropped session can be resumed by re-running the command.

## Argument Parsing

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `--scope` | string | `diff` | Scan scope: `diff`, `package <path>`, or `all`. |
| `--base` | string | auto-detected | Only meaningful with `--scope=diff`. Base SHA. Auto-detects: `@{u}`, or `merge-base HEAD main`, or prompts. |
| `--limit` | integer | `8` | Maximum architectural issues for the synthesizer to produce. Singletons unaffected. Only meaningful with `--scope=package` or `--scope=all`. |
| `--fresh` | boolean | `false` | Force a new scan even if an in-flight working dir exists. |
| `--clean` | boolean | `false` | Remove completed scans (`.completed` marker present) older than 30 days from `.refactor-scan/`, then exit. |

## Execution Flow

### Step 0a: Handle --clean

If `--clean` is set:

```bash
find .refactor-scan -maxdepth 1 -type d -mtime +30 -exec test -f {}/.completed \; -print -exec rm -rf {} \;
```

Print a count of removed scans and exit. Do not run any scan.

### Step 0b: Resume Detection

Read `references/resume-detection.md` and follow it.

## Codebase Transport

Prefer MCP first. If its tools are absent or the server is unreachable, automatically try the CLI without asking:

```bash
command -v codebase-memory-mcp
codebase-memory-mcp cli --json list_projects
```

Set `codebase_transport` to `mcp` or `cli`. All tool calls below use that transport. For CLI calls, pipe the same JSON arguments to `codebase-memory-mcp cli --json <tool>` via stdin; inspect `isError` and read the result from `content[]` text. Use each tool's `--help` for supported flags and output formats. Query and indexing errors are not transport failures: report them accurately, not as missing MCP. On a later MCP connection failure, retry through CLI. Preserve project selection, index settings, and consent rules; do not install anything automatically.

### Step 0c: Ensure Codebase is Indexed

Read `references/ensure-index.md` and follow it.

### Step 1: Determine Base SHA

**Skip this step unless `--scope=diff`.**

If `--base` is provided, use it directly.

If not provided, auto-detect:
```bash
git rev-parse @{u} 2>/dev/null
```
If that fails:
```bash
git merge-base HEAD main 2>/dev/null || git merge-base HEAD master 2>/dev/null
```
If all fail, use AskUserQuestion:
```
No upstream branch detected. What SHA should I compare against?
```

### Step 2: Build Scanner Inputs

Read `references/scanner-inputs.md` and follow it.

### Step 3: Dispatch Scanner Subagents

Dispatch one `refactor-scanner` agent per shard. For `scope=all` with many shards, dispatch in parallel batches of 5 (use the dispatching-parallel-agents skill).

For each shard, the subagent prompt must include:
- `codebase_transport`: the selected `mcp` or `cli` transport; scanners must use it for every graph and snippet call, retrying MCP connection failures via CLI.
- The shard's `scope`, `package` (if any), `diff` (if diff scope), `task_title` (diff only), `task_description` (diff only), `base_sha`, `project`, and `output_path` (set to the shard's `output`).
- Instruction: write your YAML output to `output_path` and return a one-line `SCAN COMPLETE` summary.

Collect each shard's report. Verify each shard's `output_path` file exists. If any shard fails to write its file, capture the error in `<WORKING_DIR>/scanner-errors.log` and continue with remaining shards.

After all shards complete:
- Count total candidates across all yaml files (sum of `candidates` list lengths).
- If total candidates is `0` and scope is `diff`, print `No refactoring opportunities found.` and exit cleanly.
- If total candidates is `0` and scope is `package` or `all`, write a stub `findings.md` saying "No refactoring candidates were produced by the scanner." and skip to Stage 5 (Report).

### Step 4: Synthesizer (Stage 2)

**Skip this step if `--scope=diff`** — diff scope uses the legacy validator path directly (Step 5 below has a diff branch).

Dispatch a single `refactor-synthesizer` agent with:
- `working_dir`: `<WORKING_DIR>`
- `scope`: scope value
- `limit`: `--limit` value (default 8)
- `project`: project name

The agent reads `<WORKING_DIR>/candidates/*.yaml`, writes `<WORKING_DIR>/findings.md`, and returns a `SYNTHESIS COMPLETE` summary with counts.

If `findings.md` was not written, treat as a hard failure: print the agent's error and exit (the working dir is preserved for debugging).

### Step 4b: Human Review Gate (Stage 3)

**Skip this step if `--scope=diff`.**

Print to the user:

```
Findings written to <WORKING_DIR>/findings.md

  Architectural issues: <N>
  Singletons reported:  <M>

Review the file:
  • Delete sections you don't want filed
  • Edit titles, priorities, descriptions, target shape
  • Promote singletons by moving them into a new section above
  • Add context anywhere

Reply "proceed" to file beads issues, or "abort" to stop.
```

Use AskUserQuestion to capture the response (single-select: Proceed / Abort).

- If **Proceed**: write a `<WORKING_DIR>/.proceeded` marker file (`touch`), then continue to Step 5.
- If **Abort**: leave the working dir on disk, print "Scan aborted. Findings preserved at <WORKING_DIR>/findings.md. Re-run /refactor:scan to resume." and exit cleanly.

If this step is reached during a resume from `.proceeded` already present, skip the prompt and continue.

### Step 5: Validator (Stage 4)

Read `references/validator-stage.md` and follow it.

### Step 6: Report (Stage 5)

Read `references/report.md` and follow it.
