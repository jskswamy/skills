---
name: builtin
display_name: Built-in (Do/Verify)
description: The default task-decomposer methodology with Understanding → Design → Do/Verify tasks
detection: always
---

# Built-in Do/Verify Framework

This is the default decomposition methodology built into the task-decomposer plugin.

## Phases

### Phase 1: Understanding
1. Parse task description for goals, scope, constraints, success criteria
2. Ask 2-3 clarifying questions via AskUserQuestion
3. Explore codebase if code changes involved
4. Check existing beads issues for related work
5. Present Understanding Summary for user confirmation

### Phase 1b: Design Exploration (Brainstorm Gate)
1. Explore project context (source files, docs, recent commits)
2. Propose 2-3 approaches with trade-offs
3. Wait for explicit design approval

### Phase 2: Designing
Break into 3-7 tasks per epic (2-5 minutes each, independently executable).

**Task Structure (Do/Verify Pattern):**
```
### Task N: {Descriptive Name}

**Context:**
{Everything a fresh agent needs to know — goal, relevant architecture,
files involved, constraints. Assume ZERO prior knowledge.}

**Do:**
- {Specific action with exact file path: `src/lib/store.ts`}
- {Another action with code example if needed}

**Verify:**
- `{exact command}` → {expected result description}
- `{exact command}` → {expected result description}
```

**Rules:**
- Context: Self-contained, a fresh agent can work from this alone
- Do: Include exact file paths, code examples where non-obvious
- Verify: Every task MUST have at least one runnable verification command
- Iron Law: No task is complete without fresh verification evidence

### Phase 3: Creating
Use issue-writer agent to create beads issues.

## Field Mapping to Beads

| Plan Section | Beads Field | Purpose |
|-------------|-------------|---------|
| **Context** | `--description` | Self-contained background for a fresh agent |
| **Do** steps | `--design` | Step-by-step actions with exact file paths |
| **Verify** steps | `--acceptance` | Exact commands with expected outputs |
| File paths, constraints | `--notes` | Additional reference material |
