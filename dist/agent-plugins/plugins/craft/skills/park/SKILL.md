---
name: park
description: "Use when the user wants to set an idea aside mid-task without losing focus: 'park this idea', 'park: X', 'remember to do X later', 'note for later', 'come back to this'. Creates a deferred parked-idea beads issue with context and returns to work. For listing or triaging parked ideas use craft:parked."
argument-hint: "<idea> [--task|-t <id>] [--priority|-p 0-4] [--tags <tags>] [--quick|-q]"
metadata:
  short-description: "Park an idea for later without losing focus. <idea> [--priority 0-4] [--tags]"
---

# Park Idea Skill

Quickly park ideas with optional metadata. This command provides more control than the auto-invoked craft:park skill while maintaining the same "capture fast, return to work" philosophy.

## Arguments

| Argument | Short | Type | Default | Description |
|----------|-------|------|---------|-------------|
| `idea` | | string | (required) | The idea to park |
| `--task` | `-t` | string | (auto) | Link to specific task ID |
| `--priority` | `-p` | number | 4 | Priority override (0-4) |
| `--tags` | | string | `parked-idea` | Additional comma-separated tags |
| `--quick` | `-q` | boolean | false | Minimal output, no confirmation |

**Examples:**
```
/craft:park "Add caching to the API"
/craft:park "Consider rate limiting" -t abc123
/craft:park -p 3 "Refactor auth module for testability"
/craft:park --tags "performance,optimization" "Lazy load images"
/craft:park -q "Remember to update docs"
```

---

## Execution Flow

### Step 1: Parse Arguments

Extract the idea text and all optional flags.

If no idea provided, prompt:
```
What idea would you like to park?
```

### Step 2: Gather Context (Automatic)

Silently gather context without prompting:

1. **Current task (if --task not provided):**
   ```bash
   bd list --status=in_progress --json 2>/dev/null | head -1
   ```

2. **From conversation context:**
   - What file/code was being discussed
   - What triggered this idea (recent topic)

### Step 3: Create or Update Parked Issue

**If creating a new issue:**
```bash
bd create "PARKED: {brief title from idea}" \
  -t task \
  -p {priority} \
  --status deferred \
  -l parked-idea \
  --description "## Idea
{user's idea text}

## Context
Parked while working on: {task-id or 'no active task'}
Triggered by: {what was being discussed}
File context: {current file if any, or 'N/A'}"
```

For additional tags, add multiple `-l` flags:
```bash
bd create ... -l parked-idea -l performance -l database
```

**If updating an existing related issue:**
When you find an existing issue that matches the parked idea, you MUST:
1. Add notes with the new context
2. Set status to deferred
3. Add the parked-idea label

```bash
bd update {existing-id} --status deferred --notes "{new context}"
bd label add {existing-id} parked-idea
```

This ensures the issue appears in `/craft:parked list`.

### Step 4: Link to Source Task (if applicable)

If there's a current in-progress task or `--task` was provided:

```bash
bd dep add {new-idea-id} {task-id}
```

This creates a "discovered-from" relationship.

### Step 5: Confirm and Return

**If `--quick` is NOT set:**
```
Parked: {id} - PARKED: {title}
Priority: P{priority}
Linked to: {task-id or "none"}

Review parked ideas later: /craft:parked list
```

**If `--quick` IS set:**
```
Parked as {id}!
```

Then immediately return focus to the previous work.

---

## Priority Guidelines

| Priority | When to Use |
|----------|-------------|
| P0-P1 | Rarely for parked ideas - these should probably be real tasks |
| P2 | Good ideas that should be done soon after current work |
| P3 | Solid ideas for later consideration |
| P4 | Default - backlog ideas to review eventually |

---

## Tag Patterns

Default tag: `parked-idea` (always included for filtering)

Common additional tags:
- `performance` - Performance optimization ideas
- `refactor` - Code quality improvements
- `feature` - New feature ideas
- `bug` - Potential bugs noticed
- `tech-debt` - Technical debt items
- `docs` - Documentation improvements

**Example with tags:**
```
/craft:park --tags "performance,database" "Index the user_sessions table"
```

Creates issue with labels: `parked-idea,performance,database`

---

## Context Detection

The command automatically captures context:

| Context | How Detected |
|---------|--------------|
| Current task | `bd list --status=in_progress` |
| Current file | From conversation (what file was being discussed) |
| Trigger | Recent topic in conversation |

This context helps when reviewing parked ideas later - you'll remember why you had the idea.

---

## Error Handling

### No idea provided
```
Error: No idea provided.

Usage: /craft:park <idea> [--flags]
Example: /craft:park "Add caching to API"
```

### Invalid priority
```
Error: Invalid priority "{value}". Priority must be 0-4.
Using default priority P4 for parked ideas.
```

### Beads not initialized
```
Error: Beads not initialized in this project.

Run: bd init
Then try again.
```

---

## Delegation Notes

This command provides a direct interface to the craft:park skill with:
- Explicit argument parsing
- Priority override capability
- Custom tagging support
- Quick mode for minimal interruption

The core parking logic follows the same principles as the skill:
- Maximum 1 question (none if idea is clear)
- Auto-capture context
- Return to work fast
