# Command Wrappers over Canonical Skills Design

## Summary

Make skills the canonical source of truth for reusable workflows, and convert Claude Code commands into thin wrappers that invoke or follow those skills. This aligns the repository with cross-harness patterns used by Superpowers and Matt Pocock's skills: skills contain reusable behavior, while command-like entrypoints are convenience wrappers for harnesses that support slash commands.

The refactor preserves Claude Code as the primary workflow today. Claude users keep the same commands such as `/codebase:ask`, `/commit`, and `/decompose`, but those command files stop carrying duplicated full workflow logic. Pi users invoke the same behavior directly through `/skill:<name>`. Later, Pi extensions can register Pi slash commands that delegate to these canonical skills.

## Goals

- Make `skills/<name>/SKILL.md` the canonical source for command workflows.
- Convert Claude command files in `commands/` into thin wrappers over skills.
- Preserve current Claude Code user-facing commands and plugin packaging.
- Improve Pi usability by exposing command workflows as direct `/skill:<name>` invocations.
- Avoid duplicating long workflow instructions across commands and skills.
- Keep the build model from the prior refactor: canonical roots generate committed Claude wrappers.

## Non-Goals

- Do not implement Pi extension commands in this refactor.
- Do not remove Claude commands.
- Do not require users to change Claude command habits.
- Do not rewrite every skill for perfect harness neutrality in this pass; only adjust what is necessary to make extracted command workflows usable as skills.
- Do not introduce a separate `workflows/` layer. Popular references keep workflows in skills and place supporting files under the skill directory.

## Reference Patterns

### Superpowers

Superpowers has no separate command directory. Workflows are skills:

```text
skills/brainstorming/SKILL.md
skills/test-driven-development/SKILL.md
skills/using-superpowers/SKILL.md
```

Harness-specific differences are handled through bootstrap/tool mappings, not duplicated command files.

### Matt Pocock Skills

Matt Pocock's repo also uses skills as the unit of reuse. Command-like user entrypoints are modeled as user-invoked skills. For example, `grill-me` is a thin wrapper over the real `grilling` primitive:

```markdown
---
name: grill-me
description: A relentless interview to sharpen a plan or design.
disable-model-invocation: true
---

Call the Skill tool with "grilling".
```

This pattern maps directly to this repo: Claude commands become thin wrappers over canonical skills.

## Current State

The repository currently has canonical-looking resource directories, but many full workflows still live in `commands/`:

```text
commands/codebase/ask.md
commands/codebase/index.md
commands/commit-tools/commit.md
commands/craft/decompose.md
commands/jot/capture.md
...
```

Some related skills already exist, but they are not always the command workflow source of truth:

```text
skills/codebase-explore/SKILL.md
skills/commit-action/SKILL.md
skills/craft-decompose/SKILL.md
...
```

This creates two issues:

1. Pi can install the skills, but workflows that only exist as Claude commands are not directly available.
2. Long workflow logic can drift between command files and skills.

## Target Model

For each user-facing workflow, one canonical skill owns the behavior:

```text
skills/codebase-ask/SKILL.md
skills/codebase-index/SKILL.md
skills/codebase-impact/SKILL.md
skills/codebase-graph/SKILL.md
skills/commit-action/SKILL.md
skills/craft-decompose/SKILL.md
```

Claude commands become thin wrappers:

```text
commands/codebase/ask.md
commands/codebase/index.md
commands/commit-tools/commit.md
commands/craft/decompose.md
```

A wrapper command should contain only:

- the Claude command frontmatter (`name`, `description`, `argument-hint`),
- a short title,
- the canonical skill to invoke/follow,
- argument forwarding instructions,
- any Claude-only command UX note that cannot live in the skill.

Example wrapper:

```markdown
---
name: ask
description: Ask a natural language question about the codebase
argument-hint: "<question>"
---

# /codebase:ask Command

Invoke the `codebase-ask` skill with the user's question.
Forward all arguments exactly as provided.
```

## Naming Conventions

Use globally unique skill names because Pi exposes skills as `/skill:<name>`.

Recommended mapping:

| Claude command | Canonical skill |
|---|---|
| `/codebase:ask` | `codebase-ask` |
| `/codebase:index` | `codebase-index` |
| `/codebase:impact` | `codebase-impact` |
| `/codebase:graph` | `codebase-graph` |
| `/commit` | `commit-action` |
| `/decompose` | `craft-decompose` |
| `/execute` | `execute-tasks` |
| `/park` | `park-idea` |
| `/parked` | `review-parked` |
| `/task` | `task-commit` only if the command's behavior is commit-specific; otherwise create `craft-task` |
| `/handoff` | `ide-handoff` for current guardrails command |
| `/refactor:scan` | `refactor-scan` |
| `/sketch` | `sketch-note` or a more specific `sketch-generate` |
| `/publish` | `typst-publish` |
| `/coach` | `study-coach` |
| `/recall` | `study-recall` |

Existing skill names should be reused when they already represent the full command workflow. Create new skills when the existing skill is only an auto-trigger helper or a different workflow.

## Command Wrapper Requirements

Every command wrapper must:

1. Preserve the current command name and `argument-hint`.
2. Name the canonical skill.
3. Tell the agent to forward all user arguments unchanged.
4. Avoid duplicating the full workflow.
5. Mention Claude-specific command aliases only when useful for Claude users.

Wrappers should not contain:

- MCP orchestration details,
- long argument parsing tables,
- multi-step execution logic,
- fallback logic,
- tool mappings.

Those belong in the skill.

## Skill Requirements

Extracted command skills must:

1. Use Agent Skills frontmatter with globally unique `name` and specific `description`.
2. Include the full workflow previously held in the command.
3. Accept invocation arguments naturally, e.g. `/skill:codebase-ask <question>`.
4. Prefer harness-neutral action language where possible.
5. Preserve Claude Code behavior by documenting Claude commands/tools as available paths, not removing them.
6. Use relative references to local supporting files where possible instead of `${CLAUDE_PLUGIN_ROOT}`.

Example portability wording:

```markdown
Ask the user using the harness's question mechanism. In Claude Code this may
be `AskUserQuestion`; in Pi, ask directly in chat and wait for the answer.
```

```markdown
Use available file search and read tools. In Claude Code this may be
`Grep`, `Glob`, and `Read`; in Pi this may be `grep`, `find`, `read`, or
`bash`.
```

## Migration Strategy

Migrate in slices by plugin, not all commands at once.

### Slice 1: Codebase

Codebase is the best first slice because Pi already exposed `codebase-explore`, and its commands are currently the most obvious Claude-specific workflows.

Create canonical skills:

```text
skills/codebase-ask/SKILL.md
skills/codebase-index/SKILL.md
skills/codebase-impact/SKILL.md
skills/codebase-graph/SKILL.md
```

Convert commands:

```text
commands/codebase/ask.md
commands/codebase/index.md
commands/codebase/impact.md
commands/codebase/graph.md
```

to wrappers.

Keep `codebase-explore` as the auto-trigger planning/brainstorming skill. It can delegate direct questions to `codebase-ask`.

### Slice 2: Commit Tools

`commit-action`, `review-commits`, and `validate-commits` already exist as full skills. Convert `/commit` into a wrapper over `commit-action` if parity is confirmed.

### Slice 3: Craft

Some craft commands map to existing skills, but `/task`, `/backlog`, `/deps`, and `/epic` may need new canonical skills or intentional command-only status. Decompose carefully.

### Later Slices

Migrate Jot, Sketch Note, Study, Typst Notes, Guardrails, and Refactor after the first slices establish the pattern.

## Registry Changes

`registry.json` must include any new skills in the owning plugin's `resources.skills` array so they are copied into Claude wrappers and exposed to Pi.

When a command becomes a wrapper, it remains in `resources.commands`. The generated Claude wrapper therefore contains both:

```text
plugins/<plugin>/commands/<command>.md
plugins/<plugin>/skills/<canonical-skill>/SKILL.md
```

## Build and Validation

Existing build behavior remains:

```bash
npm run build
npm run validate
npm test
```

Add validation later if needed to enforce wrapper thinness, but do not block the first migration on a wrapper linter.

Manual review should verify:

- wrapper command files are short,
- canonical skill contains the full workflow,
- generated `plugins/` copies match canonical roots,
- Pi lists the new skills,
- Claude command names are unchanged.

## Risks and Mitigations

### Risk: Claude command behavior regresses

Mitigation: preserve command names/frontmatter, copy full workflow into canonical skills before thinning the command, and spot-check generated Claude wrappers.

### Risk: Skills become too granular

Mitigation: only create separate skills for user-facing workflows that map to commands or reusable primitives. Keep support docs inside skill directories instead of creating unnecessary top-level categories.

### Risk: Skill descriptions cause unwanted auto-invocation

Mitigation: add `disable-model-invocation: true` to skills intended only as explicit command-like entrypoints, especially if they should not auto-trigger.

### Risk: Claude-specific tool names break Pi

Mitigation: when extracting command workflows, replace hardcoded tool names with harness-neutral action wording plus Claude/Pi examples.

## Acceptance Criteria

- At least the Codebase command suite is migrated to canonical skills with thin Claude wrappers.
- Claude command names and install layout remain unchanged.
- Pi can invoke migrated workflows with `/skill:<name>`.
- `registry.json` includes migrated skills.
- `npm run build`, `npm run validate`, and `npm test` pass.
- No full workflow is duplicated between a migrated command and its canonical skill.
