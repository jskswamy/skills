---
name: review-parked
description: |
  Review parked ideas on demand. Use when user says:
  "review parked ideas", "show parked", "what did I park",
  "check my parking lot", "any ideas parked", "parked ideas"
---

# Review Parked Ideas Skill

Help users review ideas they parked during work sessions and decide what to do with them.

## Workflow

### 1. Find Parked Ideas

```bash
bd list --status=deferred -l parked-idea --json
```

If no parked ideas exist:
> No parked ideas found. Use "park this idea" while working to capture thoughts for later.

### 2. Present Summary

```
## Parked Ideas ({count} total)

1. **{title}** ({id})
   Parked while: {from context in description}
   Idea: {first 1-2 lines of idea}

2. **{title}** ({id})
   ...

What would you like to do?
- Review each and decide (promote/keep/discard)
- Keep all parked for later
- Discard all
```

### 3. For Each Idea to Review

Show full context:
```
## {title} ({id})

**Idea:**
{full idea text from description}

**Context:**
{context section from description}

**Options:**
1. Promote to real issue (open status, remove parked-idea label)
2. Decompose further (run through decompose workflow)
3. Keep parked (leave as-is)
4. Discard (delete the issue)
```

### 4. Execute Decision

**Promote:**
```bash
bd update {id} --status open
bd label remove {id} parked-idea
# Optionally update title to remove "PARKED:" prefix
bd update {id} --title "{title without PARKED: prefix}"
```

**Decompose:**
Invoke the decompose skill with the idea content.

**Keep:**
No action needed.

**Discard:**
```bash
bd delete {id}
```

### 5. Summary

After processing all reviewed ideas:
```
## Review Complete

- Promoted: {count} issues
- Kept parked: {count} ideas
- Discarded: {count} ideas

Promoted issues are now visible in `bd ready` if they have no blockers.
```

---

## Batch Operations

If user wants to handle all at once:

**Keep all:**
> All {count} ideas remain parked. Review again anytime with "review parked ideas".

**Discard all:**
```bash
# Get all parked idea IDs
bd list --status=deferred -l parked-idea --json | jq -r '.[].id'
# Delete each
bd delete {id1} {id2} ...
```
> Discarded {count} parked ideas.

---

## Filtering by Source Task

If user asks about ideas from a specific task:

```bash
# Find ideas that have dependency on specific task
bd list --status=deferred -l parked-idea --json | \
  jq '.[] | select(.dependencies[]? | contains("{task-id}"))'
```

This shows only ideas parked while working on that task.
