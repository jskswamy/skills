---
name: backlog
description: Dashboard views of all work with filtering and statistics
argument-hint: "[overview|ready|blocked|priorities|epics] [--status <status>] [--priority|-p <0-4>] [--epic|-e <id>] [--format|-f <format>] [--limit|-l <n>]"
---

# /backlog Command

Dashboard views of all work with filtering. Get a quick overview of your project's state, find work to do, or understand what's blocked.

## Views (Subcommands)

| View | Description | Example |
|------|-------------|---------|
| `overview` | Summary statistics (default) | `/backlog` |
| `ready` | Tasks ready to work on | `/backlog ready` |
| `blocked` | Blocked tasks with reasons | `/backlog blocked` |
| `priorities` | Grouped by P0-P4 | `/backlog priorities` |
| `epics` | Epic-centric view | `/backlog epics` |

## Global Options

| Argument | Short | Type | Default | Description |
|----------|-------|------|---------|-------------|
| `--status` | `-s` | string | (none) | Filter by status: open, in_progress, closed |
| `--priority` | `-p` | number | (none) | Filter by priority (0-4) or higher |
| `--epic` | `-e` | string | (none) | Filter to specific epic |
| `--format` | `-f` | string | `text` | Output format: text, json, markdown |
| `--limit` | `-l` | number | 50 | Maximum results |

---

## /backlog overview (default)

Show summary statistics and quick health check.

### Examples

```bash
/backlog
/backlog overview
```

### Execution

```bash
bd stats
bd list --status=open --json | jq length
bd list --status=in_progress --json | jq length
bd blocked --json | jq length
```

### Output

```
## Project Backlog Overview

### Statistics
| Metric | Count |
|--------|-------|
| Open tasks | {n} |
| In progress | {n} |
| Blocked | {n} |
| Closed (all time) | {n} |
| Parked ideas | {n} |

### By Priority
- P0 (Critical): {n} open, {n} in progress
- P1 (High): {n} open, {n} in progress
- P2 (Medium): {n} open, {n} in progress
- P3 (Low): {n} open, {n} in progress
- P4 (Backlog): {n} open

### Active Epics
- {epic-id} - {epic-title}: {n}/{total} tasks complete
- {epic-id} - {epic-title}: {n}/{total} tasks complete

### Health Check
{✓ or ⚠} {n} tasks ready to work on
{✓ or ⚠} {n} tasks blocked
{✓ or ⚠} {n} in-progress tasks (recommend: 1-3)
{✓ or ⚠} {n} P0/P1 tasks need attention

### Quick Actions
- Start work: /task next
- See ready tasks: /backlog ready
- See blocked: /backlog blocked
```

---

## /backlog ready

Show tasks that are ready to work on (no blockers, not in progress).

### Examples

```bash
/backlog ready
/backlog ready -p 1        # P1 or higher only
/backlog ready -e abc123   # From specific epic
```

### Execution

```bash
bd ready --json
```

Apply filters from arguments.

### Output

```
## Ready to Work ({count} tasks)

### High Priority (P0-P1)
1. {id} - {title} (P{priority})
   {first line of description}

2. {id} - {title} (P{priority})
   {first line of description}

### Medium Priority (P2)
3. {id} - {title}
   {first line of description}

### Lower Priority (P3-P4)
4. {id} - {title}
5. {id} - {title}

---

Start the recommended task: /task start {top-task-id}
Or pick one: /task start <id>
```

If no ready tasks:
```
## No Tasks Ready

All tasks are either:
- Blocked by dependencies
- Already in progress
- Closed

Check blocked tasks: /backlog blocked
```

---

## /backlog blocked

Show blocked tasks with their blocking reasons.

### Examples

```bash
/backlog blocked
/backlog blocked -e abc123
```

### Execution

```bash
bd blocked --json
```

For each blocked task, also fetch what's blocking it.

### Output

```
## Blocked Tasks ({count})

### 1. {id} - {title} (P{priority})

**Blocked by:**
- {blocker-id} - {blocker-title} ({blocker-status})
- {blocker-id} - {blocker-title} ({blocker-status})

**Unblock by:** Complete {blocker-id} first

---

### 2. {id} - {title} (P{priority})

**Blocked by:**
- {blocker-id} - {blocker-title} (in_progress)

**Unblock by:** Waiting on {blocker-id} to finish

---

### Summary
- {n} tasks blocked by open tasks (can be unblocked)
- {n} tasks blocked by in-progress tasks (waiting)

### Suggested Actions
1. Complete {id} to unblock {n} tasks
2. Complete {id} to unblock {n} tasks
```

If no blocked tasks:
```
## No Blocked Tasks

All tasks with dependencies have their blockers resolved.
```

---

## /backlog priorities

Group all open tasks by priority level.

### Examples

```bash
/backlog priorities
/backlog priorities -e abc123
```

### Execution

```bash
bd list --status=open --json
bd list --status=in_progress --json
```

Group by priority field.

### Output

```
## Tasks by Priority

### P0 - Critical ({count})
{⚠ if any exist}

| ID | Title | Status | Blocked |
|----|-------|--------|---------|
| {id} | {title} | {status} | {yes/no} |

### P1 - High ({count})

| ID | Title | Status | Blocked |
|----|-------|--------|---------|
| {id} | {title} | {status} | {yes/no} |
| {id} | {title} | {status} | {yes/no} |

### P2 - Medium ({count})
...

### P3 - Low ({count})
...

### P4 - Backlog ({count})
{Collapsed or abbreviated if many}

---

### Recommendations
{If P0/P1 tasks exist and not in progress:}
- High-priority tasks need attention! Start: /task start {id}

{If many P4 tasks:}
- Consider reviewing backlog for stale items
```

---

## /backlog epics

Show epic-centric view with progress.

### Examples

```bash
/backlog epics
/backlog epics --format markdown
```

### Execution

```bash
bd list --type=epic --json
# For each epic:
bd list --parent={epic-id} --json
```

### Output

```
## Epics Overview

### {epic-title} ({epic-id})
**Priority:** P{priority}
**Progress:** {completed}/{total} tasks ({percent}%)

```
[████████░░░░░░░░░░░░] 40%
```

**Tasks:**
- [x] {id} - {title} (closed)
- [x] {id} - {title} (closed)
- [ ] {id} - {title} (in_progress) ← active
- [ ] {id} - {title} (open, blocked)
- [ ] {id} - {title} (open)

---

### {epic-title} ({epic-id})
**Priority:** P{priority}
**Progress:** {completed}/{total} tasks ({percent}%)

...

---

### Standalone Tasks (no epic)
{count} tasks not assigned to any epic

View them: bd list --no-parent
```

---

## Filter Combinations

| Command | What it shows |
|---------|---------------|
| `/backlog ready -p 1` | P0 and P1 tasks ready to work |
| `/backlog blocked -e abc` | Blocked tasks under epic abc |
| `/backlog priorities -e abc` | Priority breakdown for epic abc |
| `/backlog overview --status open` | Statistics for open tasks only |

---

## Error Handling

### No tasks found
```
No tasks match your filters.

Try:
- Remove filters to see all: /backlog
- Check different status: /backlog --status open
```

### Invalid filter value
```
Error: Invalid {filter}: "{value}"

Valid values for --status: open, in_progress, closed
Valid values for --priority: 0, 1, 2, 3, 4
```

### Epic not found
```
Error: Epic "{id}" not found.

List epics: bd list --type=epic
```
