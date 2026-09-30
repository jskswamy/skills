---
name: epic
description: Create and manage epics, add/remove tasks, track progress
argument-hint: "<subcommand> [args] [--flags]"
---

# /epic Command

Create and manage epics. Epics are larger initiatives that group related tasks together.

## Subcommands

| Subcommand | Description | Example |
|------------|-------------|---------|
| `create` | Create a new epic | `/epic create "Auth System"` |
| `add` | Add tasks to epic | `/epic add abc123 task1 task2` |
| `remove` | Remove tasks from epic | `/epic remove abc123 task1` |
| `progress` | Show completion progress | `/epic progress abc123` |
| `close` | Close epic | `/epic close abc123` |

---

## /epic create

Create a new epic with optional details.

### Arguments

| Argument | Short | Type | Default | Description |
|----------|-------|------|---------|-------------|
| `title` | | string | (required) | Epic title |
| `--description` | `-d` | string | (none) | Epic description |
| `--priority` | `-p` | number | 2 | Priority (0-4) |
| `--design` | | string | (none) | Design/approach notes |

### Examples

```bash
/epic create "User Authentication System"
/epic create "Performance Optimization" -p 1
/epic create "API v2" -d "Complete redesign of the public API" --design "RESTful with OpenAPI spec"
```

### Execution

```bash
bd create "{title}" \
  -t epic \
  -p {priority} \
  --description "{description}" \
  --design "{design}"
```

### Output

```
Created epic: {id} - {title}

Add tasks to this epic:
- /epic add {id} <task-id>
- /task create "Task title" --parent {id}

Or decompose tasks: /decompose "..." --epic "{title}"
```

---

## /epic add <epic-id> <task-id> [task-id2]...

Add one or more existing tasks to an epic.

### Arguments

| Argument | Type | Description |
|----------|------|-------------|
| `epic-id` | string | The epic to add tasks to |
| `task-id` | string | One or more task IDs to add |

### Examples

```bash
/epic add abc123 task1
/epic add abc123 task1 task2 task3
```

### Execution

For each task:
```bash
bd update {task-id} --parent {epic-id}
```

### Output

```
Added to epic {epic-id} - {epic-title}:
- {task-id} - {task-title}
- {task-id} - {task-title}

Epic now has {n} tasks ({completed} completed).
```

### Validation

Before adding:
1. Verify epic exists and is type=epic
2. Verify each task exists
3. Verify tasks aren't already in a different epic (warn if so)

```
Warning: {task-id} is already in epic {other-epic-id}.

Move it to {epic-id}? [Move / Keep in current / Cancel]
```

---

## /epic remove <epic-id> <task-id> [task-id2]...

Remove tasks from an epic (makes them standalone).

### Arguments

| Argument | Type | Description |
|----------|------|-------------|
| `epic-id` | string | The epic to remove tasks from |
| `task-id` | string | One or more task IDs to remove |

### Examples

```bash
/epic remove abc123 task1
/epic remove abc123 task1 task2
```

### Execution

For each task:
```bash
bd update {task-id} --parent ""
```

### Output

```
Removed from epic {epic-id}:
- {task-id} - {task-title}

These are now standalone tasks.
Epic {epic-id} now has {n} tasks.
```

---

## /epic progress <epic-id>

Show detailed progress for an epic.

### Arguments

| Argument | Type | Description |
|----------|------|-------------|
| `epic-id` | string | The epic to show progress for |
| `--format` | `-f` | string | Output format: text, json, markdown |

### Examples

```bash
/epic progress abc123
/epic progress abc123 --format markdown
```

### Execution

```bash
bd show {epic-id} --json
bd list --parent={epic-id} --json
```

### Output

```
## Epic Progress: {title}

**ID:** {epic-id}
**Priority:** P{priority}
**Status:** {status}

### Progress
{completed}/{total} tasks complete ({percent}%)

```
[████████████░░░░░░░░] 60%
```

### Task Breakdown

| Status | Count | Tasks |
|--------|-------|-------|
| Completed | {n} | {id}, {id}, ... |
| In Progress | {n} | {id} |
| Open | {n} | {id}, {id} |
| Blocked | {n} | {id} |

### Completed Tasks
- [x] {id} - {title}
- [x] {id} - {title}

### In Progress
- [ ] {id} - {title} ← active

### Remaining (Open)
- [ ] {id} - {title}
- [ ] {id} - {title} (blocked by {blocker})

### Timeline
- Created: {created_at}
- Last activity: {updated_at}
- {If all P0/P1 tasks done:} Critical path complete!

### Next Steps
{Suggest what to work on next based on priorities and dependencies}
```

---

## /epic close <epic-id>

Close an epic, optionally forcing closure with open tasks.

### Arguments

| Argument | Short | Type | Default | Description |
|----------|-------|------|---------|-------------|
| `epic-id` | | string | (required) | Epic to close |
| `--force` | `-f` | boolean | false | Close even if tasks are open |
| `--reason` | `-r` | string | (none) | Reason for closing |

### Examples

```bash
/epic close abc123
/epic close abc123 --force -r "Descoped for this release"
```

### Execution

1. **Check for open tasks:**
   ```bash
   bd list --parent={epic-id} --status=open --json
   bd list --parent={epic-id} --status=in_progress --json
   ```

2. **If open tasks exist and no --force:**
   ```
   Cannot close epic - {n} tasks still open:
   - {id} - {title} ({status})
   - {id} - {title} ({status})

   Options:
   ○ Close open tasks - Mark all as done
   ○ Force close - Close epic, leave tasks open
   ○ Cancel - Don't close
   ```

3. **Close the epic:**
   ```bash
   bd close {epic-id}
   ```

### Output

```
Closed epic: {epic-id} - {title}

Summary:
- {completed} tasks completed
- {open} tasks remaining (now standalone)
{If --reason: "Reason: {reason}"}
```

---

## Epic Best Practices

### When to Create an Epic
- Work spans multiple related tasks (3+)
- Work will take multiple sessions/days
- Need to track overall progress
- Work has a clear theme or goal

### When NOT to Create an Epic
- Single task that can be completed in one session
- Unrelated tasks being grouped arbitrarily
- Just for organizational neatness (keep it simple)

### Epic Sizing
- **Too small:** 1-2 tasks → Just use standalone tasks
- **Right size:** 3-7 tasks → Good epic scope
- **Too large:** 10+ tasks → Consider breaking into multiple epics

---

## Error Handling

### No subcommand provided
```
Usage: /epic <subcommand> [args]

Subcommands:
  create <title>           Create new epic
  add <epic> <tasks...>    Add tasks to epic
  remove <epic> <tasks...> Remove tasks from epic
  progress <epic>          Show progress
  close <epic>             Close epic

Example: /epic create "Auth System"
```

### Epic not found
```
Error: Epic "{id}" not found.

List epics: bd list --type=epic
```

### Task not found
```
Error: Task "{id}" not found.

Check the ID and try again.
```

### Not an epic
```
Error: "{id}" is not an epic (type: {actual-type}).

Epics have type=epic. This is a {actual-type}.
```

### Task already in epic
```
Warning: {task-id} is already in epic {current-epic}.

Move it to {new-epic}? [Move / Cancel]
```
