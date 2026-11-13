# SKILL.md at most 8,000 bytes

Part 2 of the token diet (`docs/specs/2026-11-13-token-diet-design.md`). **Status: parked candidate, not yet shaped.**

## Why

- Codex cuts a `$skill` body off at 8,000 bytes (codex `ext/skills/src/extension.rs:433-447`), so these skills silently lose their later steps there.
- omp never prunes a loaded skill (`compaction.md:251`).
- On every harness, a loaded body stays in history.

## Scope (from the token-diet spec v3, §1.3)

These twelve skills are over 8,000 bytes at `f262c96`. Each moves detail into `references/` without changing behavior:

| Skill | Bytes |
|---|---|
| `bivouac:session` | 24,503 |
| `commit-tools:commit` | 17,704 |
| `devenv:manage` | 15,321 |
| `codebase:seams` | 14,907 |
| `commit-tools:review-commits` | 14,883 |
| `sketch-note:sketch` | 14,014 |
| `refactor:scan` | 13,889 |
| `codebase:capabilities` | 11,883 |
| `commit-tools:validate-commits` | 9,324 |
| `codebase:ask` | 9,272 |
| `sketch-note:excalidraw-format` | 8,623 |
| `craft:shape` | 8,333 |

`scripts/validate.mjs` then fails a SKILL.md over 8,000 bytes.

## Open findings to resolve when shaping

- R3-M4: the plugins are unrelated, so slice one story per plugin, and land the validate rule last.
- Check that Codex's 8,000-byte cut applies to the generated `codex-skills/` body after `rewriteTree`, which may grow it.
