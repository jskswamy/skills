---
name: park-idea
description: |
  Quick idea capture while working - park thoughts without breaking flow. Use when user says:
  "park this idea", "park this thought", "save this for later",
  "side thought", "note for later", "idea for later",
  "don't forget", "remind me later", "come back to this",
  "tangent:", "btw:", "also:"
---

# Park Idea Skill

You help users quickly capture side thoughts and ideas without breaking their flow. The goal is **minimal interruption** - get the idea captured and return to work immediately.

## Workflow

### 1. Detect Current Context (Automatic)

Gather context silently without asking the user:

```bash
# Find current in-progress task
bd list --status=in_progress --json 2>/dev/null | head -1
```

Also note from the conversation:
- What file/code we were discussing
- What triggered this idea (the recent topic)

### 2. Capture the Idea

Ask **only one question**:

> What's the idea?

If the user already provided the idea in their message (e.g., "park this - we should add caching"), extract it directly without asking.

### 3. Create Parked Issue

```bash
bd create "PARKED: {brief title from idea}" \
  -t task \
  -p 4 \
  --status deferred \
  -l parked-idea \
  --description "## Idea
{user's idea text}

## Context
Parked while working on: {current-task-id or 'no active task'}
Triggered by: {what we were discussing}
File context: {current file if any, or 'N/A'}"
```

If there's a current in-progress task, also add a dependency link:
```bash
bd dep add {new-idea-id} {current-task-id}
```

This creates a "discovered-from" relationship.

### 4. Confirm Briefly

Keep confirmation minimal:

> Parked as {id}! Continuing with {current task or 'your work'}...

Then **immediately** return focus to what the user was doing before.

---

## Key Principles

1. **Maximum 1 question** - If the idea is clear, ask nothing
2. **Auto-capture context** - Don't ask "what task are you working on?"
3. **Use deferred status** - Parked ideas don't clutter active work
4. **Label consistently** - `parked-idea` label enables easy filtering
5. **Link to source** - Dependency shows where idea came from
6. **Return to work fast** - The whole interaction should take seconds
7. **Beads is the memory** - All parked ideas live in beads, not in markdown files or framework-specific storage. This ensures they survive across sessions, compaction, and context limits. No matter which decomposition framework the project uses, parked ideas are always beads issues.

---

## Examples

### User provides idea inline
**User:** "btw: we should probably add rate limiting to this API"

**Response:**
```bash
bd create "PARKED: Add rate limiting to API" -t task -p 4 --status deferred -l parked-idea --description "..."
```
> Parked as claude-plugins-abc! Continuing...

### User wants to park something
**User:** "park this thought"

**Response:**
> What's the idea?

**User:** "The config validation could use JSON schema instead of manual checks"

**Response:**
```bash
bd create "PARKED: Use JSON schema for config validation" ...
```
> Parked as claude-plugins-xyz! Back to the auth refactor...

---

## Finding Parked Ideas Later

Users can review parked ideas with:
- `/review-parked` - dedicated review skill
- `bd list --status=deferred -l parked-idea` - direct command
- Automatic prompt after task commits (via hook)
