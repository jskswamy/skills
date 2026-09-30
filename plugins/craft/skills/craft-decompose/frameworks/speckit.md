---
name: speckit
display_name: Spec Kit
description: "GitHub's spec-driven development — constitution → specify → plan → tasks → implement"
detection:
  plugins: ["spec-kit", "speckit", "claude-code-spec-kit"]
  cli: ["speckit"]
  directories: [".speckit", "specs"]
  files: ["constitution.md", "specification.md"]
---

# Spec Kit Framework

GitHub's Spec Kit methodology for spec-driven development. You define the project's principles (constitution), what you want to build (specification), and technology plan, then generate structured tasks.

## Phases

### Phase 1: Constitution (Project Principles)
Define the project's guiding principles:
1. Core values and non-negotiables
2. Technology constraints and preferences
3. Quality standards and conventions
4. What this project is and isn't

If a constitution already exists (check for `constitution.md` or similar), read and respect it.

### Phase 2: Specification (Requirements)
Outline what needs to be built:
1. User stories with acceptance criteria
2. Functional requirements
3. Non-functional requirements (performance, security, accessibility)
4. Scope boundaries

**Specification Structure:**
```
## User Story: {As a... I want... So that...}

### Acceptance Criteria
- [ ] {Criterion 1 — testable and specific}
- [ ] {Criterion 2}

### Technical Notes
{Implementation hints, constraints, relevant existing code}
```

### Phase 3: Planning (Technical Implementation)
Create the technical implementation plan:
1. Architecture decisions with rationale
2. Component breakdown
3. API contracts and interfaces
4. Data model changes
5. Integration points

### Phase 4: Tasks (Actionable Work Items)
Generate ordered task list from the plan:

**Task Structure:**
```
### Task N: {Descriptive Name}

**User Story:** {Reference to the user story this implements}

**Specification:**
{What this task delivers, traced back to requirements}

**Implementation:**
- {Action with exact file path}
- {Code changes needed}
- {Test to write}

**Acceptance Criteria:**
- [ ] `{verification command}` → {expected result}
- [ ] {Manual check if needed — but prefer automated}

**Dependencies:** {Task IDs this depends on}
```

**Key Rules:**
- Every task traces back to a user story or requirement
- Tasks respect dependency order from the plan
- Parallel execution markers indicate what can run concurrently
- Component dependencies are explicit

### Phase 5: Implementation
Tasks are executed in dependency order, respecting the constitution's principles.

## Field Mapping to Beads

| Plan Section | Beads Field | Purpose |
|-------------|-------------|---------|
| **User Story** + **Specification** | `--description` | What and why, traced to requirements |
| **Implementation** steps | `--design` | Ordered actions with file paths |
| **Acceptance Criteria** | `--acceptance` | Verification commands and checks |
| Constitution ref, dependencies | `--notes` | Traceability and context |

## Distinguishing Features
- Requirements traceability: every task links to a user story
- Constitution acts as guardrails for all decisions
- Specification-first: define what before how
- Structured from principles down to implementation
