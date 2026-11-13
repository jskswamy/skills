# OpenCode runtime: hook notes without re-sending

Part 4 of the token diet (`docs/specs/2026-11-13-token-diet-design.md`). **Status: parked candidate, not yet shaped.**

## Why

`harnesses/opencode/runtime.mjs:128-132` pushes the SessionStart context and every accumulated tool note into `ev.system`, on every model request:

- `state.notes` is a `Set` that is never cleared (lines 65, 92, 110).
- Each new note changes a system part, which invalidates the prompt cache from that point on.
- Each note is then re-sent for the rest of the session.

## Open findings to resolve when shaping

- R3-B3: the v3 idea ("deliver once, then clear") doubles cache misses, loses notes on retry, and its test cannot pass.
  - The candidate direction is to put tool notes into the tool result (`tool.execute.after`), which keeps them in history the way Claude Code does.
  - Keep the start context as a stable system part.
- Find out which OpenCode plugin hook can change a tool result in the current version, and whether it differs on the `dev` branch.
- Ponytail 13: whatever the design, notes must not move back into the per-request system prompt.
