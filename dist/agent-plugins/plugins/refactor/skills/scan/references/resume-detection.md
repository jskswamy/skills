# Step 0b: Resume Detection

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
