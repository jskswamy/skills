# Rules Format

Rules are the user's decisions about what may depend on what. Code shows what *is*; only these rules say what is *allowed*.

## Where

`ARCHITECTURE.md` at the repo root. Read only the fenced block tagged `codebase-rules`. Prose anywhere else in the file is the user's and is never treated as rules or as fact about the code. If there are several `codebase-rules` blocks, report that and use the first.

No rules file, or a file with no `codebase-rules` block: recover only, and offer to draft a block from the recovered components.

## Format

````markdown
```codebase-rules
components:
  transforms: ["scripts/lib/transforms/**"]
  adapters:   ["harnesses/*/adapter.mjs"]
  registry:   ["scripts/lib/registry.mjs"]
rules:
  - forbid: transforms -> adapters
    why: transforms stay harness-agnostic
  - allow-only: adapters -> [transforms]
    why: adapters get the plugin model, never the raw registry
```
````

- `components`: name → list of path globs, relative to the repo root. A file belongs to every component whose glob matches it.
- `rules`: each entry has exactly one of
  - `forbid: A -> B` — no file in A may depend on a file in B;
  - `allow-only: A -> [B, C]` — files in A may depend only on files in A, B or C. A dependency on a repo file outside every component also counts as a violation; dependencies on external packages are not checked.
- `why` is required on every rule. It is what an agent is shown when its change would break the rule.
- A dependency is an `IMPORTS` or `CALLS` edge from a symbol or file in A to one in B.

## Malformed blocks

Invalid YAML, a rule naming an undeclared component, a rule with no `why`, or a rule with both or neither of `forbid`/`allow-only`: report each problem with its line in `ARCHITECTURE.md`, skip that rule, and check the rest.
