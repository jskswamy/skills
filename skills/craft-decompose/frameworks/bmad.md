---
name: bmad
display_name: BMAD Method
description: "Breakthrough Method for Agile AI Driven Development — PRD → Architecture → Epic Sharding → Stories"
detection:
  plugins: ["bmad", "BMAD", "bmad-method", "claude-code-bmad"]
  directories: [".bmad", "bmad-agent"]
  files: [".bmad-config.json", "bmad-config.yaml"]
---

# BMAD Method Framework

Breakthrough Method for Agile AI Driven Development. Uses agent roles (Analyst, PM, Architect, Scrum Master, Dev) to systematically transform ideas into detailed development stories through document sharding.

## Phases

### Phase 1: Analysis (Analyst Agent)
Deeply understand the problem:
1. Identify stakeholders and their needs
2. Analyze existing system state
3. Document constraints and risks
4. Define success metrics

### Phase 2: Product Requirements (PM Agent)
Create a focused PRD:
1. Problem statement and goals
2. User personas and use cases
3. Feature requirements with priority
4. Out-of-scope items
5. Success criteria and KPIs

### Phase 3: Architecture (Architect Agent)
Design the technical solution:
1. System architecture and component design
2. Technology choices with rationale
3. Data model and API contracts
4. Integration points and dependencies
5. Risk assessment and mitigation

### Phase 4: Epic Sharding (Scrum Master Agent)
Break the PRD into focused, self-contained development units using "document sharding" — atomic, AI-digestible pieces:

**Story Structure:**
```
### Story N: {Descriptive Name}

**Epic:** {Parent epic name}

**Goal:**
{What this story delivers and why it matters}

**Context:**
{Full context embedded — architecture decisions, relevant patterns,
data models, API contracts. Everything the Dev agent needs is HERE,
not in a separate document.}

**Implementation Details:**
1. {Specific step with file path and approach}
2. {Data model changes if any}
3. {API changes if any}
4. {Test requirements — unit, integration, e2e}

**Definition of Done:**
- [ ] `{verification command}` → {expected result}
- [ ] {Quality gate: tests pass, lint clean, no regressions}
- [ ] {Integration verified with dependent components}

**Dependencies:** {Story IDs this is blocked by}
**Estimated Complexity:** {S/M/L}
```

**Key Rules:**
- **Document sharding**: Each story is self-contained — don't reference external docs
- **Full context embedding**: Architecture, patterns, and constraints are embedded IN the story
- **Hyper-detailed**: Stories contain everything the Dev agent needs — no guessing
- **Agent independence**: A Dev agent should never need to ask "what did the Architect mean?"
- **Scale-adaptive**: Adjusts detail level from bug fixes to enterprise systems

### Phase 5: Development (Dev Agent)
Stories are executed by Dev agents with full context embedded.

## Field Mapping to Beads

| Plan Section | Beads Field | Purpose |
|-------------|-------------|---------|
| **Goal** + **Context** | `--description` | Full context with embedded architecture |
| **Implementation Details** | `--design` | Hyper-detailed implementation steps |
| **Definition of Done** | `--acceptance` | Verification commands and quality gates |
| Epic ref, complexity, deps | `--notes` | Metadata and traceability |

## Distinguishing Features
- Agent roles provide structured thinking (Analyst → PM → Architect → Scrum Master)
- Document sharding: break complex docs into atomic pieces
- Full context embedding: no external references in stories
- Scale-adaptive: adjusts from small fixes to enterprise systems
- Hyper-detailed stories: Dev agent needs zero additional context
