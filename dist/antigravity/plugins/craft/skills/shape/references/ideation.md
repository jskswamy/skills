# Step 2: Acquire Specification

   - **Fast-Path**: Read an existing file or already-approved spec; it still passes grounding and the review gate before slicing. Propose material changes for approval rather than silently changing an approved design.
   - **Ideation Selector**: Otherwise (unless `--with` is set), ask the user to pick from available ideation skills:
     - `egm`: Run `/egm-brainstorm` → `/egm-draft` → `docs/designs/<slug>.md`. **Caller Override**: EGM draft Step 5 detailed task/TDD planning is deferred to `craft:build`; retain high-level architecture, contracts, risks and testing strategy.
     - `superpowers`: Run `superpowers:brainstorming` → `docs/superpowers/specs/YYYY-MM-DD-<slug>-design.md`.
     - `grill-me`: Run `/grill-me` → `docs/specs/YYYY-MM-DD-<slug>-design.md`.
     - **Fallback** (if none installed): Ask 3 Socratic questions (goal, scope, edge cases) one at a time and write `docs/specs/YYYY-MM-DD-<slug>-design.md`.
