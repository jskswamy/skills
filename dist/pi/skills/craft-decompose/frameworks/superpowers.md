---
name: superpowers
display_name: Superpowers
description: "obra/superpowers methodology — brainstorm, plan with 2-5 min tasks, verification-before-completion, TDD enforcement"
detection:
  plugins: ["superpowers"]
  directories: [".claude/plugins/superpowers"]
  files: ["CLAUDE.md"]
  file_patterns: ["superpowers"]
---

# Superpowers Framework

The Superpowers methodology by obra emphasizes brainstorming, bite-sized tasks with mandatory verification, and TDD enforcement.

## Phases

### Phase 1: Brainstorming
1. Deeply understand the problem space
2. Explore the codebase to understand current state
3. Consider multiple approaches with trade-offs
4. Auto-detect if the project is "too big" and interactively break it down
5. Get user alignment on the approach before planning

### Phase 2: Planning (Writing Plans)
Break work into bite-sized tasks (2-5 minutes each). Every task must have:
- Exact file paths
- Complete code where approach isn't obvious
- Verification steps with exact commands and expected outputs

**Task Structure:**
```
### Task N: {Descriptive Name}

**Context:**
{Self-contained briefing. A fresh agent with zero prior context must be
able to execute this task from this section alone. Include: goal, relevant
architecture, files to read/modify, constraints, patterns to follow.}

**Steps:**
1. {Concrete action with exact file path}
2. {Write test first if applicable — TDD is enforced}
3. {Implement the change}
4. {Run verification}

**Verification:**
- `{exact command}` → {expected output}
- `{exact command}` → {expected output}

**Done when:** {Single sentence describing the observable outcome}
```

**Key Rules:**
- **TDD enforcement**: Write failing test FIRST, verify it fails, then implement, verify it passes
- **Verification-before-completion**: MANDATORY final check — run actual verification commands and capture output as proof
- **No skipping verification**: A task is NOT done until verification commands produce expected output
- **2-5 minute sizing**: If a task takes longer, it should have been decomposed further
- **Self-contained context**: Fresh agent with zero knowledge must succeed from the Context section alone

### Phase 3: Review
After implementation, code-reviewer agent evaluates against:
- The plan's verification criteria
- Coding standards and architectural principles
- Edge cases and error handling

## Field Mapping to Beads

| Plan Section | Beads Field | Purpose |
|-------------|-------------|---------|
| **Context** | `--description` | Self-contained briefing for fresh agent |
| **Steps** | `--design` | Ordered implementation steps with file paths |
| **Verification** + **Done when** | `--acceptance` | Verification commands + done criteria |
| File paths, patterns | `--notes` | Reference material |

## Distinguishing Features
- TDD is not optional — tests come before implementation
- Verification evidence must be captured (not just "tests pass")
- Automatic architectural review after 3 failed fix attempts
- Plans are living documents updated during execution
