# Unattended Result File

## Result file schema

```json
{
  "outcome": "done | failed",
  "reason": "conflict | drift | tests | no-base | tree-mismatch | validation | confirmation-required | null",
  "base": "<sha>",
  "originalHead": "<sha>",
  "newHead": "<sha>",
  "decisions": [{"gate": "plan-review", "chose": "accept", "why": "unattended default"}],
  "plan": [{"action": "pick|fixup|reword|drop|edit", "commit": "<sha>", "subject": "..."}],
  "validation": {"cleanWorktree": true, "tests": true, "noAICoauthor": true,
                  "noConflictMarkers": true, "noSquashResidue": true,
                  "style": true, "noTrackerLeaks": true},
  "detail": "..."
}
```
