# Integration

## Integration with other skills

### With /commit

This skill READS `plugins/commit-tools/styles/<style>.md` directly during the
synthesis phase to author messages in the saved style. It does NOT invoke
`/commit` at execute time — the executor is purely mechanical replay. `/commit`
is a peer of this skill, not a caller.

### With /codebase:index

This skill invokes `/codebase:index` to build or refresh the
codebase-memory-mcp index when needed. The index enables Layer 3 semantic
analysis for commit hygiene checks.

### With Superpowers

- `finishing-a-development-branch` detects this skill when "Merge locally"
  is selected
- `subagent-driven-development` naturally leads here after tasks complete

### Standalone
