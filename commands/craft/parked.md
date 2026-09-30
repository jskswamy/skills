---
name: parked
description: List, filter, and manage parked ideas
argument-hint: "[list|from|promote|discard|review] [args] [--flags]"
---

# /parked Command

List, filter, and batch-manage parked ideas. Use this command to review ideas you've captured and decide what to do with them.

## Subcommands

| Subcommand | Description | Example |
|------------|-------------|---------|
| `list` | List all parked ideas (default) | `/parked list` |
| `from` | Ideas from a specific task | `/parked from abc123` |
| `promote` | Promote to real issues | `/parked promote xyz` |
| `discard` | Delete parked ideas | `/parked discard xyz` |
| `review` | Interactive review session | `/parked review` |

---

## /parked list (default)

List all parked ideas with filtering options.

### Arguments

| Argument | Short | Type | Default | Description |
|----------|-------|------|---------|-------------|
| `--format` | `-f` | string | `brief` | Output format: `brief`, `full`, `json` |
| `--since` | | string | (none) | Filter by date (e.g., "1 week", "2024-01-01") |
| `--limit` | `-l` | number | 20 | Maximum results |
| `--all` | `-a` | boolean | false | Include already-reviewed (keeps tag) |

### Examples

```bash
/parked
/parked list
/parked list --format full
/parked list --since "1 week"
```

### Execution

```bash
bd list --status=deferred -l parked-idea --json
```

**Brief format:**
```
## Parked Ideas ({count} total)

1. {id} - {title without "PARKED:" prefix}
   Parked from: {source task or "N/A"}

2. {id} - {title}
   Parked from: {source task}

...

Actions:
- /parked promote <id>   - Make it a real task
- /parked discard <id>   - Delete it
- /parked review         - Review all interactively
```

**Full format:**
Includes the full idea text and context for each.

---

## /parked from <task-id>

Show ideas parked while working on a specific task.

### Arguments

| Argument | Type | Description |
|----------|------|-------------|
| `task-id` | string | The source task ID |

### Examples

```bash
/parked from abc123
/parked from claude-plugins-xyz
```

### Execution

```bash
# Find ideas that have dependency on specific task
bd list --status=deferred -l parked-idea --json | \
  jq '.[] | select(.dependencies[]? | contains("{task-id}"))'
```

**Output:**
```
## Ideas Parked During: {task-title} ({task-id})

1. {id} - {idea title}
   {brief idea text}

2. {id} - {idea title}
   {brief idea text}

No other ideas? This task had focused work!
```

If no ideas found:
```
No ideas were parked while working on {task-id}.

The work was either very focused, or ideas were captured elsewhere.
```

---

## /parked promote <id> [id2] [id3]...

Promote one or more parked ideas to real issues.

### Arguments

| Argument | Type | Description |
|----------|------|-------------|
| `id` | string | One or more parked idea IDs |
| `--priority` | `-p` | number | New priority (default: keep existing) |
| `--decompose` | `-d` | boolean | Run through decomposition for complex ideas |

### Examples

```bash
/parked promote abc123
/parked promote abc123 def456 ghi789
/parked promote abc123 -p 2
/parked promote abc123 --decompose
```

### Execution

For each ID:

1. **Update status and remove parked label:**
   ```bash
   bd update {id} --status open
   bd label remove {id} parked-idea
   ```

2. **Update title (remove PARKED: prefix):**
   ```bash
   bd update {id} --title "{title without PARKED: prefix}"
   ```

3. **Update priority if provided:**
   ```bash
   bd update {id} --priority {priority}
   ```

4. **If `--decompose` flag:**
   - Extract the idea content
   - Invoke the decompose skill with that content
   - Original parked issue becomes part of the decomposition

**Output:**
```
Promoted {N} ideas:
- {id} - {new title} (now P{priority}, open)
- {id} - {new title} (now P{priority}, open)

These are now visible in `bd ready` if they have no blockers.
```

---

## /parked discard <id> [id2] [id3]...

Delete one or more parked ideas.

### Arguments

| Argument | Type | Description |
|----------|------|-------------|
| `id` | string | One or more parked idea IDs |
| `--force` | `-f` | boolean | Skip confirmation |

### Examples

```bash
/parked discard abc123
/parked discard abc123 def456
/parked discard abc123 --force
```

### Execution

1. **Confirm (unless --force):**
   ```
   Delete these parked ideas?
   - {id} - {title}
   - {id} - {title}

   This cannot be undone. [Delete / Cancel]
   ```

2. **Delete each:**
   ```bash
   bd delete {id1} {id2} ...
   ```

**Output:**
```
Discarded {N} parked ideas.
```

---

## /parked review

Interactive review session for all parked ideas.

### Arguments

| Argument | Short | Type | Default | Description |
|----------|-------|------|---------|-------------|
| `--from` | | string | (none) | Filter to ideas from specific task |

### Examples

```bash
/parked review
/parked review --from abc123
```

### Execution

This invokes the review-parked skill for an interactive session.

**Flow:**

1. **Present summary:**
   ```
   ## Parked Ideas Review ({count} total)

   Starting interactive review...
   ```

2. **For each idea, show:**
   ```
   ## [{n}/{total}] {title}

   **Idea:**
   {full idea text}

   **Context:**
   Parked while: {source task}
   Triggered by: {trigger context}

   **What would you like to do?**
   ○ Promote - Make it a real task
   ○ Decompose - Break it down further
   ○ Keep - Leave parked for later
   ○ Discard - Delete this idea
   ○ Skip - Decide later
   ```

3. **Execute decision** (promote, decompose, keep, or discard)

4. **After all reviewed:**
   ```
   ## Review Complete

   - Promoted: {count} issues
   - Decomposed: {count} issues
   - Kept parked: {count} ideas
   - Discarded: {count} ideas
   - Skipped: {count} ideas

   Promoted issues are now visible in `bd ready`.
   ```

---

## Batch Operations

### Promote all
```bash
/parked promote $(bd list --status=deferred -l parked-idea --json | jq -r '.[].id' | tr '\n' ' ')
```

### Discard all
```bash
/parked discard --force $(bd list --status=deferred -l parked-idea --json | jq -r '.[].id' | tr '\n' ' ')
```

---

## Error Handling

### No parked ideas found
```
No parked ideas found.

Park ideas while working with: /park "your idea"
```

### Invalid idea ID
```
Error: "{id}" is not a parked idea.

Either the ID doesn't exist or it's not marked as parked.
List parked ideas: /parked list
```

### ID not found
```
Error: Issue "{id}" not found.

Check the ID and try again.
```
