# Present Hygiene Findings Dialog

## Findings dialog

```
Commit hygiene analysis complete.

⚠ Issues detected:

  Introduce-then-fix pairs (will be auto-squashed):
    c844c6a + 7de838b — "sync-beads": add then fix shell escaping
    c8fa279 + e526d22 — "hook": expand then fix false-positive

  Non-atomic commits (suggest splitting):
    a1b2c3d — touches auth handler (AuthService) + logging (Observability)
      These are unrelated concerns in different subsystems.

  Unrelated changes (suggest dropping):
    f4e5d6c — README typo fix, unrelated to auth migration branch

  Tracking-system references (suggest removing before push):
    a1b2c3d — subject-prefix PROJ-123: "PROJ-123: add login checks"
    d4e5f6a — trailer beads-abc.2: "Refs: beads-abc.2"
    9abcdef — parenthetical PROJ-789: "A future shim (PROJ-789)..."
    1234567 — narrative claude-plugins-xyz: "After claude-plugins-xyz..."

Introduce-then-fix pairs are mandatory fixups. Tracker subject-prefix and
narrative findings require rewording. Trailer and parenthetical findings can
usually be stripped while preserving the surrounding prose. For other findings:

○ Accept all suggestions
○ Review one by one — decide per finding
○ Dismiss all — keep commits as-is (only hygiene pairs will be fixed)
```
