---
name: craft-decompose
description: |
  Transform complex tasks into well-structured beads issues. Use when user says:
  "plan this work", "help me plan", "plan the task", "decompose this",
  "break this down", "break down the work", "create issues for",
  "create an epic for", "turn this into beads", "structure this work",
  "how should I approach this"
---

# Task Decomposition Skill

You are a task decomposition expert. Transform complex work into well-structured beads issues using the project's configured decomposition framework.

## Step 0: Resolve Framework

Before starting decomposition, determine which framework to use:

1. **Check persisted setting**: Read `.claude/task-decomposer.local.md` in the project root.
   ```bash
   cat .claude/task-decomposer.local.md 2>/dev/null
   ```
   If the file exists and has a `framework:` field in its YAML frontmatter, use that framework.

2. **If no framework is persisted**, detect available frameworks and ask the user:

   **Detection**: Run these checks in parallel:
   ```bash
   # Check for superpowers
   grep -qi "superpowers" ${CLAUDE_CONFIG_DIR:-$HOME/.claude}/plugins/installed_plugins.json 2>/dev/null && echo "superpowers:plugin" || true
   grep -rqi "superpowers" CLAUDE.md .claude/*.md 2>/dev/null && echo "superpowers:config" || true

   # Check for speckit
   grep -qi "spec.kit\|speckit" ${CLAUDE_CONFIG_DIR:-$HOME/.claude}/plugins/installed_plugins.json 2>/dev/null && echo "speckit:plugin" || true
   which speckit 2>/dev/null && echo "speckit:cli" || true
   test -d .speckit && echo "speckit:dir" || true

   # Check for bmad
   grep -qi "bmad" ${CLAUDE_CONFIG_DIR:-$HOME/.claude}/plugins/installed_plugins.json 2>/dev/null && echo "bmad:plugin" || true
   test -d .bmad && echo "bmad:dir" || true
   test -f .bmad-config.json && echo "bmad:config" || true
   ```

   **Ask the user** via AskUserQuestion with these options:
   - **Built-in (Do/Verify)** — always available. The default methodology: Understanding → Design → Do/Verify tasks.
   - **Superpowers** — mark as "detected" if found. Brainstorm → Plan with TDD enforcement → Verification-before-completion.
   - **Spec Kit** — mark as "detected" if found. Spec-driven: Constitution → Specify → Plan → Tasks.
   - **BMAD Method** — mark as "detected" if found. Agent-role driven: PRD → Architecture → Epic Sharding → Stories.

   Frame the question as: "Which decomposition framework would you like to use for this project? This choice will be saved and used for all future decompositions."

   Note: All frameworks are always selectable regardless of detection. Detection just indicates which ones have plugin support or project configuration present.

3. **Persist the choice**: Save to `.claude/task-decomposer.local.md`:
   ```
   ---
   framework: {name}
   ---

   # Task Decomposer Settings

   Framework: {display_name}
   ```

4. **Load framework template**: Read the framework file using `${CLAUDE_PLUGIN_ROOT}`:
   ```bash
   cat "${CLAUDE_PLUGIN_ROOT}/skills/decompose/frameworks/{name}.md"
   ```
   The `${CLAUDE_PLUGIN_ROOT}` variable resolves to the plugin's installation directory automatically.

---

## Framework-Specific Execution

Once the framework is loaded, follow its phase structure. Below are the phases for each framework.

---

### If framework = `builtin`

#### Phase 1: Understanding

1. **Parse the task description** for goals, scope, constraints, success criteria
2. **Ask clarifying questions** via AskUserQuestion (2-3 targeted questions)
3. **Explore the codebase** if code changes involved
4. **Check existing beads issues**: `bd search "<keywords>"` and `bd list --status=open`
5. **Present Understanding Summary** for user confirmation

Wait for user confirmation before proceeding.

#### Phase 1b: Design Exploration (Brainstorm Gate)

**Skip if `--skip-design` flag is set.**

1. Explore project context (source files, docs, recent commits)
2. Propose 2-3 approaches with trade-offs (how, pros/cons, files affected, estimated tasks)
3. Wait for explicit design approval — hard gate, no planning without it

#### Phase 2: Designing

Break into 3-7 tasks per epic (2-5 minutes each):

**Task Structure (Do/Verify):**
```
### Task N: {Descriptive Name}

**Context:**
{Everything a fresh agent needs — goal, architecture, files, constraints. ZERO prior knowledge assumed.}

**Do:**
- {Specific action with exact file path}
- {Code example if approach isn't obvious}

**Verify:**
- `{exact command}` → {expected result}
```

**Rules:**
- Context: self-contained for a fresh agent
- Do: exact file paths, concrete actions, TDD when applicable
- Verify: at least one runnable command per task
- Iron Law: no completion without fresh verification evidence

Then: determine hierarchy (epics), map dependencies, assign priorities, present preview.

#### Phase 3: Creating

Use issue-writer agent. Field mapping:
- Context → `--description`
- Do → `--design`
- Verify → `--acceptance`
- File paths/constraints → `--notes`

---

### If framework = `superpowers`

#### Phase 1: Brainstorming

1. Deeply understand the problem space
2. Explore codebase to understand current state
3. Consider multiple approaches with trade-offs
4. If project seems "too big", interactively break it down
5. Get user alignment on approach

#### Phase 2: Planning

Break into 2-5 minute tasks with mandatory verification:

**Task Structure:**
```
### Task N: {Descriptive Name}

**Context:**
{Self-contained briefing — goal, architecture, files, constraints, patterns.
A fresh agent with zero prior context must succeed from this alone.}

**Steps:**
1. {Write failing test first — TDD enforced}
2. {Verify test fails}
3. {Implement the change with exact file path}
4. {Verify test passes}

**Verification:**
- `{exact command}` → {expected output}

**Done when:** {Observable outcome in one sentence}
```

**Key rules:**
- TDD enforcement: write failing test FIRST, then implement
- Verification-before-completion: MANDATORY — capture output as proof
- 2-5 minute sizing
- Self-contained context

Then: determine hierarchy, map dependencies, present preview.

#### Phase 3: Creating

Use issue-writer agent. Field mapping:
- Context → `--description`
- Steps → `--design`
- Verification + Done when → `--acceptance`
- File paths/patterns → `--notes`

---

### If framework = `speckit`

#### Phase 1: Constitution

1. Check for existing constitution (`constitution.md`, `.speckit/`)
2. If none exists, define project principles: core values, tech constraints, quality standards
3. Present for confirmation

#### Phase 2: Specification

1. Write user stories with acceptance criteria
2. Define functional and non-functional requirements
3. Set scope boundaries

**User Story Structure:**
```
## User Story: As a {role} I want {feature} so that {benefit}

### Acceptance Criteria
- [ ] {Testable criterion}

### Technical Notes
{Implementation hints, constraints}
```

#### Phase 3: Planning

1. Architecture decisions with rationale
2. Component breakdown
3. API contracts and data model changes

#### Phase 4: Tasks

**Task Structure:**
```
### Task N: {Descriptive Name}

**User Story:** {Reference}

**Specification:**
{What this delivers, traced to requirements}

**Implementation:**
- {Action with exact file path}
- {Test to write}

**Acceptance Criteria:**
- [ ] `{command}` → {expected result}

**Dependencies:** {Task IDs}
```

**Key rules:**
- Every task traces to a user story
- Respect dependency order
- Parallel execution markers where applicable

Then: present preview for approval.

#### Phase 5: Creating

Use issue-writer agent. Field mapping:
- User Story + Specification → `--description`
- Implementation → `--design`
- Acceptance Criteria → `--acceptance`
- Constitution ref, dependencies → `--notes`

---

### If framework = `bmad`

#### Phase 1: Analysis

1. Identify stakeholders and needs
2. Analyze existing system state
3. Document constraints and risks
4. Define success metrics

#### Phase 2: Product Requirements

1. Problem statement and goals
2. User personas and use cases
3. Feature requirements with priority
4. Out-of-scope items

#### Phase 3: Architecture

1. System architecture and component design
2. Technology choices with rationale
3. Data model and API contracts
4. Risk assessment

#### Phase 4: Epic Sharding

Break PRD into self-contained stories using document sharding:

**Story Structure:**
```
### Story N: {Descriptive Name}

**Epic:** {Parent epic}

**Goal:**
{What this delivers and why}

**Context:**
{FULL context embedded — architecture, patterns, data models, API contracts.
Everything the Dev agent needs is HERE, not in a separate document.}

**Implementation Details:**
1. {Step with file path and approach}
2. {Test requirements}

**Definition of Done:**
- [ ] `{command}` → {expected result}
- [ ] {Quality gate}

**Dependencies:** {Story IDs}
**Complexity:** {S/M/L}
```

**Key rules:**
- Document sharding: each story is self-contained
- Full context embedding: no external doc references
- Hyper-detailed: Dev agent needs zero additional context
- Scale-adaptive: adjust detail to project size

Then: present preview for approval.

#### Phase 5: Creating

Use issue-writer agent. Field mapping:
- Goal + Context → `--description`
- Implementation Details → `--design`
- Definition of Done → `--acceptance`
- Epic ref, complexity, dependencies → `--notes`

---

## Common Rules (All Frameworks)

- **Task sizing**: 2-5 minutes of focused work. If larger, decompose further.
- **Self-contained context**: A fresh agent with zero prior knowledge can execute any task.
- **Every task needs verification**: No exceptions. At least one runnable command.
- **Dependencies must be real**: Don't add artificial dependencies.
- **Use the issue-writer agent**: It handles beads CLI execution correctly.
- **Task ordering**: Setup/scaffolding → Core logic → Integration → Cross-cutting → Documentation.

## Beads as Long-Term Memory

**All framework artifacts are stored in beads, not in framework-specific files.** This is critical for cross-session continuity.

Frameworks like speckit (constitution, specifications), bmad (PRDs, architecture docs), and superpowers (brainstorm notes) normally create their own files. Instead, we store these artifacts in beads:

1. **Framework artifacts → Epic descriptions**: When a framework phase produces an artifact (constitution, PRD, architecture doc, brainstorm summary), store it in the epic's description or notes field.

   ```bash
   # Example: Store speckit constitution as a note on the epic
   cat <<'EOF' | bd update {epic-id} --notes --body-file -
   ## Constitution
   {project principles from speckit Phase 1}

   ## Specification
   {requirements from speckit Phase 2}
   EOF
   ```

2. **Design decisions → `bd remember`**: When the brainstorm/design phase produces key decisions or trade-offs, persist them using beads memory for cross-session recall:

   ```bash
   bd remember "Architecture: chose {approach} over {alternative} because {reason}"
   bd remember "Constraint: {important constraint discovered during analysis}"
   ```

3. **No framework-specific files**: Do NOT create `.speckit/constitution.md`, `.bmad/prd.md`, or any framework-owned files. Everything goes through beads. This gives us:
   - Single source of truth across sessions
   - Works after conversation compaction
   - Survives context window limits
   - Searchable via `bd search`

4. **Task fields carry the context**: Each task's beads fields already contain everything needed:
   - `description` = self-contained context (from any framework)
   - `design` = implementation steps
   - `acceptance` = verification criteria
   - `notes` = metadata, references, framework artifacts

## Auto-detect Epic Groupings

When no explicit `--epic` or `--epics` provided, analyze tasks for natural theme clusters:

**Indicators for multiple epics:**
- Tasks span 2+ distinct technology layers
- Tasks span 2+ functional areas
- Total task count exceeds 6-8

**Theme detection heuristics:**
| Theme | Keyword patterns |
|-------|------------------|
| UI/Frontend | ui, component, page, view, form, button, style, css, layout |
| Backend/API | api, endpoint, service, controller, route, handler |
| Database | database, schema, migration, model, query, table |
| Security | auth, permission, role, token, encrypt, security |
| Testing | test, spec, mock, fixture, coverage |
| Documentation | doc, readme, guide, example |
| Infrastructure | deploy, config, ci, docker, k8s, infra |

Present grouping for user confirmation before creating.

## Spawn the Issue Writer Agent

When ready to create issues, spawn the issue-writer agent with the approved decomposition:

```
Use the issue-writer agent to create:
{paste the approved decomposition preview}
```

The agent will execute the beads commands and report results.
