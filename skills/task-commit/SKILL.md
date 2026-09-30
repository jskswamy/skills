---
name: task-commit
description: |
  Create rich commit messages by combining beads task context with code changes. Use when user says:
  "commit this task", "commit for task", "task commit",
  "commit with context", "beads commit", "commit with beads",
  or after closing a task: "now commit"
---

# Task Commit Skill

Generate rich, contextual commit messages by combining beads issue context with actual code changes.

## Workflow

### 1. Identify Task Context

First, find which task this commit is for:

```bash
# Check for in-progress tasks
bd list --status=in_progress --json

# Check recently closed tasks
bd list --status=closed --json | head -5
```

If multiple candidates or none found, ask:
> Which task is this commit for? {list options or ask for ID}

### 2. Gather Beads Context

```bash
bd show {task-id} --json
```

Extract:
- `title` → basis for commit subject
- `description` → what was the goal
- `design` → how it was approached
- `acceptance_criteria` → what was achieved
- `id` → for reference in commit message

### 3. Gather Code Context

```bash
# What's staged?
git diff --staged --stat

# Detailed changes
git diff --staged
```

If nothing is staged:
> No changes staged. Stage your changes first with `git add <files>`, then run task commit again.

Analyze the diff to understand:
- What files changed
- What kind of changes (new code, refactor, fix, etc.)
- Key modifications

### 4. Generate Commit Message

Combine beads + code context into a structured message:

```
{type}: {Concise subject from task + changes} (#{task-id})

## What
{From task description - the goal/problem being solved}

## Why
{From task design - the approach taken and reasoning}

## Changes
{Summary of actual code changes from the diff}
- {file1}: {what changed}
- {file2}: {what changed}

## Acceptance
{Which acceptance criteria were met, as checkboxes}
- [x] {criterion 1}
- [x] {criterion 2}

Closes: {task-id}
```

**Commit types:**
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code restructuring
- `docs`: Documentation
- `test`: Tests
- `chore`: Maintenance

### 5. Present for Approval

```
## Generated Commit Message

---
{the generated message}
---

Options:
1. Commit as-is
2. Edit message first
3. Regenerate with different focus
```

### 6. Execute Commit

Using heredoc for proper formatting:
```bash
git commit -m "$(cat <<'EOF'
{commit message here}

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

After successful commit:
```
Committed! ({short-hash})

{If there are parked ideas linked to this task, the review-after-commit hook will prompt for review.}
```

---

## Example Output

For a task about adding PNG export:

```
feat: Add PNG export to sketch plugin (#claude-plugins-uz6)

## What
Add ability to export Excalidraw sketches as PNG images for sharing
in contexts where Excalidraw files aren't supported.

## Why
Used canvas-based rendering with proper DPI scaling for crisp exports.
Integrated with existing export menu in sketch command.

## Changes
- sketch-note/lib/export.ts: Added exportToPng() function
- sketch-note/commands/sketch.md: Added --png flag handling
- package.json: Added canvas dependency

## Acceptance
- [x] PNG export produces crisp images at 2x DPI
- [x] Export works for sketches with all element types
- [x] File saved to same location as .excalidraw file

Closes: claude-plugins-uz6

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## Integration Notes

- Works alongside the existing `/commit` skill
- Adds beads context that `/commit` wouldn't have
- The `Closes: {task-id}` line helps the review-after-commit hook find linked parked ideas
- If task has no design/acceptance fields, those sections are omitted

---

## Handling Missing Context

If beads task lacks some fields:
- No description → Use title and infer from code changes
- No design → Omit "Why" section or infer from changes
- No acceptance → Omit "Acceptance" section

The commit message adapts to available information rather than showing empty sections.
