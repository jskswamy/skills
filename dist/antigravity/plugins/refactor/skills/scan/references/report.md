# Step 6: Report (Stage 5)

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
