# Step 2: Build Scanner Inputs

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
