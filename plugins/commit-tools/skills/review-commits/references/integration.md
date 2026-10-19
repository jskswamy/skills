# Integration

## Integration with other skills

### With /commit

Load the installed `commit-action` skill before accepting a replay plan.
It owns style rules, atomicity and content-leak validation, full-message
confirmation, and the shared commit executor. Pass it the authored plan;
follow its `references/review-plan.md` branch. If unavailable, stop rather
than falling back to raw commits.

After explicit approval, replay stays mechanical: no message generation
or per-commit editor. Helpers call commit-action's installed executor and
inherit its approval convention; they never mint a bypass token. The same
approval covers reapplying an unchanged saved message during revalidation.
Changed messages or operations require fresh approval. Unattended mode
returns `confirmation-required` when the exact plan has not been approved.

### With /codebase:index

This skill invokes `/codebase:index` to build or refresh the
codebase-memory-mcp index when needed. The index enables Layer 3 semantic
analysis for commit hygiene checks.

### With Superpowers

- `finishing-a-development-branch` detects this skill when "Merge locally"
  is selected
- `subagent-driven-development` naturally leads here after tasks complete

### Standalone
