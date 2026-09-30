---
name: scan
description: Scan committed code or the entire codebase for refactoring opportunities
argument-hint: "[--scope diff|package|all] [<package-path>] [--base <sha>] [--limit N] [--fresh] [--clean]"
---

# /refactor:scan Command

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

If `--scope` is `package` or `all`, check for an in-flight working dir:

```bash
ls -1d .refactor-scan/*/ 2>/dev/null | sort -r | head -1
```

If a directory exists, inspect its state:

| State on disk | Detected stage | Resume action |
|---|---|---|
| no `candidates/` or empty | `scanning` | restart scan in this dir |
| `candidates/*.yaml` exist, no `findings.md` | `synthesis` | skip to Stage 2 |
| `findings.md` exists, no `.proceeded` | `review-gate` | skip to Stage 3 (re-prompt) |
| `.proceeded` exists, no `.completed` | `validating` | skip to Stage 4; cross-check `bd search` to skip already-created issues |
| `.completed` exists | `done` | print `report.md` and suggest `--clean` |

Use AskUserQuestion to prompt:

```
Found in-flight scan from <ts> (scope: <scope>)
Stage: <detected stage>

Resume this scan, or start fresh?
○ Resume — pick up at <stage>
○ Fresh — archive existing dir as .refactor-scan/<ts>.archived/ and start new
```

If `--fresh` is set, skip the prompt and archive immediately. Set `WORKING_DIR` to the resume target (or new dir) and proceed.

If no in-flight dir exists (or scope is `diff`), `WORKING_DIR` is unset (diff scope skips the working dir entirely).

### Step 0c: Ensure Codebase is Indexed

Required for all scopes (the diff scope already needed this).

1. Call `codebase-memory-mcp` `list_projects` to check availability. If the MCP server is not available:
   ```
   codebase-memory-mcp not found. Cannot run semantic scan.
   Ensure it is configured in your MCP settings.
   ```
   Exit.

2. Determine the project name from the repo:
   ```bash
   basename $(git rev-parse --show-toplevel)
   ```
   If the project is not in `list_projects`, automatically run `/codebase:index`.

3. For `--scope=package` or `--scope=all`, if `last_indexed` (from `.claude/codebase.local.md`) is missing or >24 hours old, run `/codebase:index` automatically. For `--scope=diff`, only re-index if the project is missing entirely (preserve current freshness behavior).

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

Branch on scope:

**scope=diff:**
1. Resolve the base SHA per Step 1.
2. Run `git diff BASE..HEAD` and scan for new function definitions (existing language patterns: Go `^+.*func `, Python `^+.*def `, TypeScript `^+.*(function |const .* = |=> )`).
3. If no new function definitions found, print `No new function definitions in diff — skipping scan.` and exit cleanly.
4. Set `SHARDS = [{scope: "diff", diff: <full diff>, output: "<WORKING_DIR_OR_TMP>/candidates/diff.yaml"}]` (where `WORKING_DIR_OR_TMP` is `WORKING_DIR` if set, otherwise a temp dir).

**scope=package <path>:**
1. Validate `<path>` is a real directory under the repo. If not, exit with an error.
2. Set `SHARDS = [{scope: "package", package: "<path>", output: "<WORKING_DIR>/candidates/<path-with-slashes-as-dashes>.yaml"}]`.

**scope=all:**
1. Enumerate packages by querying `codebase-memory-mcp` `search_graph` with `label: "Folder"` and a generous `limit` (e.g. 200). The architecture API does NOT return a packages list; Folder nodes are the source of truth.
2. From the returned Folder list, select package-level folders by filtering:
   - Skip Folder names beginning with `.` (e.g. `.git`, `.beads`, `.claude-plugin`).
   - Skip empty containers like `agents`, `commands`, `skills`, `hooks`, `templates`, `themes`, `styles`, `fixtures` when they appear directly under the project root — they are organizational, not packages.
   - Prefer Folder nodes that contain at least one `File` node with a `Function` or `Method` defined (use `query_graph` or rely on the index's `DEFINES` edges to filter; if the runtime cost is too high, fall back to all non-skipped folders).
   - For Go-style repos, package-level folders are typically direct children of `cmd/`, `internal/`, `pkg/`, or the project root.
3. For each selected package, append `{scope: "all", package: "<file_path>", output: "<WORKING_DIR>/candidates/<path-with-slashes-as-dashes>.yaml"}` to `SHARDS`. Use the Folder node's `file_path` field as the package identifier.
4. If filtering produces zero packages, fall back to "all non-dot top-level Folder nodes" so the scan still runs.

Create `<WORKING_DIR>/candidates/` if it does not exist.

Write `<WORKING_DIR>/meta.yaml`:
```yaml
scope: <scope>
base_sha: <base SHA or "">
project: <project>
started_at: <ISO 8601>
limit: <limit>
```

### Step 3: Dispatch Scanner Subagents

Dispatch one `refactor-scanner` agent per shard. For `scope=all` with many shards, dispatch in parallel batches of 5 (use the dispatching-parallel-agents skill).

For each shard, the subagent prompt must include:
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

Branch on scope:

**scope=diff (legacy path, preserved):**

Dispatch a single `refactor-validator` agent with the legacy contract: pass the inline candidates from the single shard's yaml file (`<WORKING_DIR_OR_TMP>/candidates/diff.yaml`) reformatted as the legacy `CANDIDATES:` text block. The agent will run its old per-candidate flow.

(This branch will be removed in a future cleanup once the validator's legacy path is retired. For now, the diff scope behavior is unchanged from the user's perspective.)

**scope=package or scope=all:**

1. Read `<WORKING_DIR>/findings.md`. Parse it into sections by splitting on `^## ` headings (skip the file's H1, skip the `## Singletons` table — it is not a section to file).

2. For each architectural section, extract:
   - `section_id` — the leading number from the heading (e.g. `## 1. Extract Class: ...` → `1`)
   - `section_title` — the rest of the heading after the number
   - `affected_packages` — comma-split from the `**Affected packages:**` line
   - `confidence` — value of the `**Confidence:**` line
   - `suggested_priority` — integer from the `**Suggested priority:**` line (`P2` → `2`)
   - `evidence_refs` — comma-split from the `<!-- evidence-refs: ... -->` HTML comment
   - `section_body` — the full markdown body from after the metadata lines through to the next `^## ` (or end of file)

   If the user added a wholly new section by hand (no `evidence-refs` comment), set `evidence_refs = []`.

3. Dispatch one `refactor-validator` subagent per section, in parallel batches of 3. Each subagent receives all of the parsed fields plus `working_dir`, `scope`, `project`, and `scan_timestamp` (from `meta.yaml`).

4. During a resume from a `validating` state: before dispatching each section's subagent, run `bd search` with the section title's key terms. If a matching open issue exists, mark the section as `skip` (already-tracked) without dispatching.

5. Collect each subagent's `SECTION VALIDATED` reply. Aggregate by `status`:
   - `created` → `(issue_id, priority, title)`
   - `skip` → `(reason, issue_id?)`
   - `failed` → `(error)`

### Step 6: Report (Stage 5)

Write `<WORKING_DIR>/report.md` (for `package`/`all`) or print directly (for `diff`) using this format:

```
Refactoring scan complete (scope: <scope>, scan: <ts>).

Architectural issues created: <N>
  <issue-id>  P<priority>  <title>
  ...

Singletons (review and file manually if needed): <M>
  <pattern> in <file:func> — <reason no correlation>
  ...

Skipped (already tracked): <count>
  <issue-id>  <title>
  ...

Failed: <count>
  <section-title> — <error>
  ...
```

For `package`/`all` scopes only, append:

```
Working directory: <WORKING_DIR>/
  - findings.md (your reviewed version, preserved)
  - candidates/*.yaml (full evidence)
  - report.md (this report)

Run /refactor:scan --clean to remove scans older than 30 days.
```

Print the report to the user. For `package`/`all` scopes, write a `<WORKING_DIR>/.completed` marker file (`touch`).

For `diff` scope, no working dir to mark — exit cleanly.
