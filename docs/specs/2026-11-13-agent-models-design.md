# Agent models per harness

Part 3 of the token diet (`docs/specs/2026-11-13-token-diet-design.md`). **Status: parked candidate, not yet shaped.**

## Why

Agents run on the main session's model unless they set one. The omp, Antigravity and OpenCode adapters also drop `model` and `tools` today (`harnesses/omp/adapter.mjs:87`, `harnesses/antigravity/adapter.mjs:107-119`, `harnesses/opencode/adapter.mjs:113-117`), so the existing agents run on the expensive model with every tool.

## Scope (from the token-diet spec v3, §1.5)

- `mapAgent` stays generic, and each adapter applies its own `models` table.
- A missing model, or `inherit`, drops the key silently. An unmapped model emits `degraded`.

| Harness | `model` | `tools` |
|---|---|---|
| Claude Code | native | native |
| Antigravity | `sonnet`/`haiku` → `flash`, `opus` → `pro`, after `scripts/agy-smoke.sh` confirms it | `degraded` |
| OpenCode | `degraded` (`provider/model` is not portable) | `degraded` |
| omp | `degraded` (OMP-native `@smol` agents are a later option) | `degraded` |

Candidate downgrades, each gated on evals:

- extractors → `haiku`
- refactor, typst and sketch agents → `sonnet`
- study coach and recall stay on `inherit`

## Open findings to resolve when shaping

- R3-M5: downgrades need a measured baseline and correct agent ids, and evals must exist for every affected plugin. Today only codebase, commit-tools and craft have evals.
- M6 / R-M8: decide the report wording, and keep `inherit` silent.
