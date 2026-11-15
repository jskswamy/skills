# Step 5: Validator (Stage 4)

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
