---
name: decompose
description: Decompose complex tasks into structured beads issues with direct argument control
argument-hint: "[task-description] [--epic|-e <title>] [--priority|-p 0-4] [--skip-questions|-q] [--dry-run|-d] [--quick] [--framework <name>]"
---

# /decompose Command

Decompose complex tasks into well-structured beads issues. This command provides direct entry point for task decomposition with explicit control over workflow phases.

## Argument Parsing

Parse the command arguments:

| Argument | Short | Type | Default | Description |
|----------|-------|------|---------|-------------|
| `task-description` | | string | (prompt) | The task to decompose |
| `--epic` | `-e` | string | (none) | Create as single epic with this title |
| `--epics` | | string | (none) | Create multiple epics (comma-separated titles) |
| `--priority` | `-p` | number | 2 | Default priority (0-4) |
| `--skip-questions` | `-q` | boolean | false | Skip clarifying questions |
| `--dry-run` | `-d` | boolean | false | Preview without creating |
| `--quick` | | boolean | false | No confirmations, proceed quickly |
| `--skip-design` | | boolean | false | Skip design exploration phase |
| `--framework` | `-f` | string | (persisted) | Decomposition framework to use |

**Examples:**
```
/decompose "Add user authentication"
/decompose "Add caching" --epic "Performance Improvements"
/decompose -e "Auth System" -p 1 "Implement OAuth2 login"
/decompose --dry-run "Refactor database layer"
/decompose --quick "Add logout button"
/decompose --framework superpowers "Build payment system"
/decompose -f speckit "Add search feature"

# Multi-epic decomposition
/decompose "Build payment system" --epics "Payment UI,Payment Backend,Payment Security"
/decompose "Full-stack feature" --epics "Frontend Components,API Endpoints,Database Schema"
```

**Note:** `--epic` and `--epics` are mutually exclusive. Use `--epic` for a single epic, `--epics` for multiple.

---

## Execution Flow

### Step 0: Resolve Decomposition Framework

Before anything else, determine which decomposition framework to use:

1. **Check `--framework` flag**: If provided, use that framework directly.

2. **Check persisted setting**: Read `.claude/task-decomposer.local.md` for a previously saved framework choice.
   ```bash
   cat .claude/task-decomposer.local.md 2>/dev/null
   ```
   If the file exists and has a `framework:` field in its YAML frontmatter, use that framework.

3. **Detect and ask**: If no framework is set, detect available frameworks and ask the user to choose:

   **Detection logic** — run these checks to determine which frameworks are available:

   a. **Built-in (Do/Verify)** — always available.

   b. **Superpowers** — check for:
      - Plugin installed: grep `installed_plugins.json` for `superpowers`
      - OR directory exists: `.claude/plugins/superpowers` or similar
      - OR CLAUDE.md references superpowers methodology
      ```bash
      grep -qi "superpowers" ${CLAUDE_CONFIG_DIR:-$HOME/.claude}/plugins/installed_plugins.json 2>/dev/null && echo "found" || echo "not found"
      grep -rqi "superpowers" CLAUDE.md .claude/*.md 2>/dev/null && echo "referenced" || echo "not referenced"
      ```

   c. **Spec Kit** — check for:
      - Plugin installed: grep for `spec-kit` or `speckit` in installed_plugins.json
      - OR CLI available: `which speckit`
      - OR project files: `.speckit/`, `specs/constitution.md`, `constitution.md`
      ```bash
      grep -qi "spec.kit\|speckit" ${CLAUDE_CONFIG_DIR:-$HOME/.claude}/plugins/installed_plugins.json 2>/dev/null && echo "found" || echo "not found"
      which speckit 2>/dev/null && echo "cli found" || echo "cli not found"
      ls .speckit/ specs/constitution.md constitution.md 2>/dev/null
      ```

   d. **BMAD Method** — check for:
      - Plugin installed: grep for `bmad` in installed_plugins.json
      - OR project files: `.bmad/`, `.bmad-config.json`, `bmad-agent/`
      ```bash
      grep -qi "bmad" ${CLAUDE_CONFIG_DIR:-$HOME/.claude}/plugins/installed_plugins.json 2>/dev/null && echo "found" || echo "not found"
      ls .bmad/ .bmad-config.json bmad-agent/ 2>/dev/null
      ```

   **Present framework options** via AskUserQuestion:
   - Show ALL known frameworks
   - Mark detected/available ones with indicators
   - Include a brief description of each
   - The question should explain this is a one-time choice per project

4. **Persist the choice**: After user selects a framework, save it to `.claude/task-decomposer.local.md`:
   ```bash
   mkdir -p .claude
   cat > .claude/task-decomposer.local.md << 'EOF'
   ---
   framework: {selected-framework-name}
   ---

   # Task Decomposer Settings

   Framework: {display name} — {one-line description}
   Selected on: {date}
   EOF
   ```

5. **Load the framework template**: Read the framework file using `${CLAUDE_PLUGIN_ROOT}`:
   ```bash
   cat "${CLAUDE_PLUGIN_ROOT}/skills/decompose/frameworks/{framework-name}.md"
   ```
   The `${CLAUDE_PLUGIN_ROOT}` variable resolves to the plugin's installation directory automatically.

### Step 1: Parse Arguments and Gather Task Description

If no task description provided, prompt for it:

```
What task would you like to decompose?
```

Extract all flags and the task description from the input.

### Step 2: Check for Existing Related Work

```bash
bd search "<relevant keywords from task>"
bd list --status=open
```

If related issues found, present them and ask if we should:
- Continue with new decomposition
- Update existing issues instead
- Link new work to existing

### Step 3: Execute Framework Phases

Follow the phases defined by the selected framework template (loaded in Step 0). Each framework defines its own phase structure:

- **Built-in**: Understanding → Design Exploration → Designing (Do/Verify) → Creating
- **Superpowers**: Brainstorming → Planning (Steps/Verification) → Review
- **Spec Kit**: Constitution → Specification → Planning → Tasks → Implementation
- **BMAD**: Analysis → PRD → Architecture → Epic Sharding → Development

Respect the `--skip-questions`, `--skip-design`, and `--quick` flags by skipping the appropriate phases:
- `--skip-questions`: Skip clarifying questions / understanding / analysis phases
- `--skip-design`: Skip design exploration / brainstorming / architecture phases
- `--quick`: Skip all confirmations, proceed directly

### Step 4: Present Decomposition Preview

Present the decomposition using the framework's task structure format. Regardless of framework, the preview MUST include:
- Task titles with priorities
- Dependency graph
- Enough detail for each task to be independently executable

If `--dry-run` is set, show the preview and stop.
If `--quick` is NOT set, ask for approval.

### Step 5: Create Issues (via issue-writer agent)

Spawn the issue-writer agent with the approved decomposition. The agent maps framework-specific fields to beads fields using the framework's field mapping table.

The agent will:
1. Create epic first (if applicable)
2. Create independent tasks
3. Create dependent tasks
4. Add dependency edges
5. Report created issue IDs

### Step 6: Report Results

**Single epic:**
```
## Created Issues

- Epic: {id} - {title}
  - Task: {id} - {title}
  - Task: {id} - {title} (depends on {id})
  ...

Run `bd ready` to see what's available to work on.
```

**Multi-epic:**
```
## Created Issues

- Epic: {id} - {title}
  - Task: {id} - {title}
  - Task: {id} - {title}

- Epic: {id} - {title}
  - Task: {id} - {title} (depends on {other-epic-task-id})

- Standalone:
  - Task: {id} - {title}

Run `bd ready` to see what's available to work on.
```

---

## Flag Combinations

| Flags | Behavior |
|-------|----------|
| (none) | Full workflow with confirmations |
| `--quick` | Skip confirmations and design exploration |
| `--skip-questions` | Skip questions, still confirm |
| `--skip-design` | Skip design exploration, still confirm |
| `--quick --skip-questions` | Fastest: straight to design → create |
| `--dry-run` | Full workflow but no creation |
| `--dry-run --quick` | Fast preview only |
| `--framework X` | Use specific framework (overrides persisted) |

---

## Error Handling

### No task description
```
Error: No task description provided.

Usage: /decompose [task-description] [--flags]
Example: /decompose "Add user authentication"
```

### Invalid priority
```
Error: Invalid priority "{value}". Priority must be 0-4.
- P0: Critical/blocking
- P1: High priority
- P2: Medium priority (default)
- P3: Low priority
- P4: Backlog
```

### Conflicting epic flags
```
Error: Cannot use both --epic and --epics flags.

Use --epic for a single epic:
  /decompose "task" --epic "Epic Title"

Use --epics for multiple epics (comma-separated):
  /decompose "task" --epics "Epic 1,Epic 2,Epic 3"
```

### Unknown framework
```
Error: Unknown framework "{name}".

Available frameworks:
- builtin    — Built-in Do/Verify methodology
- superpowers — Brainstorm, plan, verify (obra/superpowers)
- speckit    — Spec-driven development (GitHub spec-kit)
- bmad       — Agile AI-driven development (BMAD Method)
```

### Beads not initialized
```
Error: Beads not initialized in this project.

Run: bd init
Then try again.
```

---

## Delegation Notes

This command delegates to:
- **decompose skill** - Core decomposition logic (framework-aware)
- **issue-writer agent** - Issue creation execution

The command adds:
- Argument parsing and validation
- Framework resolution and persistence
- Flag-controlled workflow customization
- Dry-run capability
