---
name: task
description: Single task operations - create, start, complete, and view individual tasks
argument-hint: "<subcommand> [args] [--flags]"
---

# /task Command

Create, start, complete, and view individual tasks. Provides quick access to common single-task operations.

## Subcommands

| Subcommand | Description | Example |
|------------|-------------|---------|
| `create` | Create a single task | `/task create "Fix login bug"` |
| `start` | Mark task in-progress, show context | `/task start abc123` |
| `done` | Close task, optionally commit | `/task done abc123 --commit` |
| `show` | Display task details | `/task show abc123` |
| `next` | Recommend next task to work on | `/task next` |

---

## /task create

Create a single task with optional rich metadata.

### Arguments

| Argument | Short | Type | Default | Description |
|----------|-------|------|---------|-------------|
| `title` | | string | (required) | Task title |
| `--description` | `-d` | string | (none) | Detailed description |
| `--design` | | string | (none) | Technical approach |
| `--acceptance` | `-a` | string | (none) | Acceptance criteria |
| `--priority` | `-p` | number | 2 | Priority (0-4) |
| `--parent` | | string | (none) | Parent epic ID |

### Examples

```bash
/task create "Fix login redirect bug"
/task create "Add email validation" -p 1 -d "Validate email format before submission"
/task create "Write auth tests" --parent abc123 --acceptance "100% coverage for auth module"
```

### Execution

```bash
bd create "{title}" \
  -t task \
  -p {priority} \
  --description "{description}" \
  --design "{design}" \
  --acceptance "{acceptance}" \
  --parent {parent}  # if provided
```

Report the created issue ID:
```
Created: {id} - {title}

Start work: /task start {id}
```

---

## /task start

Mark a task as in-progress and show its full context to help you get started.

### Arguments

| Argument | Type | Description |
|----------|------|-------------|
| `id` | string | Task ID to start |

### Examples

```bash
/task start abc123
/task start claude-plugins-xyz
```

### Execution

1. **Update status:**
   ```bash
   bd update {id} --status=in_progress
   ```

2. **Fetch full context:**
   ```bash
   bd show {id} --json
   ```

3. **Display contextual information:**
   ```
   ## Starting: {title}

   **Description:**
   {description}

   **Design Approach:**
   {design}

   **Acceptance Criteria:**
   {acceptance as checklist}

   **Dependencies:**
   - Blocked by: {list or "none"}
   - Blocks: {list or "none"}

   **Suggested first steps:**
   {Based on the task, suggest where to start}
   ```

4. **If task has dependencies that aren't done:**
   ```
   Warning: This task has unresolved dependencies:
   - {dep-id} - {dep-title} (status: {status})

   Consider completing those first, or proceed if they're non-blocking.
   ```

---

## /task done

Close a completed task, optionally creating a commit with full context.

### Arguments

| Argument | Short | Type | Default | Description |
|----------|-------|------|---------|-------------|
| `id` | | string | (required) | Task ID to close |
| `--commit` | `-c` | boolean | false | Trigger task-commit skill |
| `--reason` | `-r` | string | (none) | Reason for closing |
| `--skip-verify` | | boolean | false | Skip verification evidence check |

### Examples

```bash
/task done abc123
/task done abc123 --commit
/task done abc123 -c -r "Completed as designed"
/task done abc123 --skip-verify
```

### Execution

1. **Verify completion evidence** (unless `--skip-verify` flag is set):

   Before closing, read the task's acceptance criteria and verify each one:

   ```bash
   bd show {id} --json
   ```

   a. Parse the acceptance field for verification commands (lines matching `command` → expected result pattern)

   b. For each verification command found:
      - Run the command
      - Compare output to expected result
      - Record pass/fail with evidence

   c. Present verification report:
      ```
      ## Verification Report for {id}

      | # | Verification | Result | Evidence |
      |---|-------------|--------|----------|
      | 1 | `npm test` → all pass | PASS | 24 tests, 0 failures |
      | 2 | `npm run build` → exit 0 | PASS | Build completed |
      | 3 | `curl /api/health` → 200 | FAIL | Connection refused |

      {If all pass}: All verifications passed. Ready to close.
      {If any fail}: Some verifications failed. Fix issues before closing?
      ○ Fix and retry - Address the failures
      ○ Close anyway - Mark done despite failures (--skip-verify)
      ○ Cancel - Don't close yet
      ```

   d. If no verification commands found in acceptance criteria:
      ```
      No verification commands found in acceptance criteria.
      Proceeding without automated verification.
      ```

   **The Iron Law:** No completion claims without fresh verification evidence.
   If verification commands exist, they MUST be run before closing.

2. **Close the task:**
   ```bash
   bd close {id}
   ```

3. **If `--commit` flag is set:**
   - Invoke the task-commit skill to create a rich commit message
   - The skill will gather beads context + git changes

3. **Check for parked ideas:**
   ```bash
   bd list --status=deferred -l parked-idea --json | \
     jq '.[] | select(.dependencies[]? | contains("{id}"))'
   ```

4. **If parked ideas linked to this task:**
   ```
   Task closed!

   You have {N} parked ideas from this task:
   - {idea-id} - {idea-title}

   Would you like to review them now? [Yes / Later]
   ```

5. **Report completion:**
   ```
   Closed: {id} - {title}

   {If --commit was used: "Committed: {commit-hash}"}

   Next available tasks:
   {Output from bd ready | head -3}
   ```

---

## /task show

Display detailed information about a task.

### Arguments

| Argument | Short | Type | Default | Description |
|----------|-------|------|---------|-------------|
| `id` | | string | (required) | Task ID to show |
| `--format` | `-f` | string | `full` | Output format: `brief`, `full`, `json` |

### Examples

```bash
/task show abc123
/task show abc123 --format brief
/task show abc123 -f json
```

### Execution

```bash
bd show {id} --json
```

**Brief format:**
```
{id} - {title} (P{priority}, {status})
```

**Full format:**
```
## {title}

**ID:** {id}
**Status:** {status}
**Priority:** P{priority}
**Type:** {type}
**Parent:** {parent or "none"}

### Description
{description}

### Design
{design}

### Acceptance Criteria
{acceptance as checklist}

### Dependencies
- Blocked by: {list with status}
- Blocks: {list}

### Metadata
- Created: {created_at}
- Updated: {updated_at}
```

**JSON format:**
Output raw JSON from `bd show --json`

---

## /task next

Recommend the next task to work on based on priorities, dependencies, and context.

### Arguments

| Argument | Short | Type | Default | Description |
|----------|-------|------|---------|-------------|
| `--epic` | `-e` | string | (none) | Filter to specific epic |
| `--priority` | `-p` | number | (none) | Filter to priority or higher |

### Examples

```bash
/task next
/task next --epic abc123
/task next -p 1
```

### Execution

1. **Get ready tasks:**
   ```bash
   bd ready --json
   ```

2. **Apply filters** (if provided)

3. **Rank tasks by:**
   - Priority (P0 > P1 > P2 > P3 > P4)
   - Unblocks other tasks (more dependent tasks = higher value)
   - Age (older tasks may be stale or important)
   - Parent epic priority

4. **Present recommendation:**
   ```
   ## Recommended Next Task

   **{id} - {title}** (P{priority})

   {brief description}

   **Why this task:**
   - {reason 1: e.g., "Highest priority ready task"}
   - {reason 2: e.g., "Unblocks 2 other tasks"}

   Start this task: /task start {id}

   ---

   **Other ready tasks ({N} total):**
   - {id} - {title} (P{priority})
   - {id} - {title} (P{priority})
   ```

---

## Error Handling

### No subcommand provided
```
Usage: /task <subcommand> [args]

Subcommands:
  create <title>   Create a single task
  start <id>       Mark task in-progress
  done <id>        Close task
  show <id>        Display task details
  next             Recommend next task

Example: /task create "Fix login bug"
```

### Task not found
```
Error: Task "{id}" not found.

Check the ID and try again. List all tasks: bd list
```

### Task already in target status
```
Task {id} is already {status}.
```

### Invalid priority
```
Error: Invalid priority "{value}". Must be 0-4.
```
