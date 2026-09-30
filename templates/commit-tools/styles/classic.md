---
name: classic
description: Traditional git commit style following the "7 Rules of Great Git Commit Messages"
default: true
source: https://cbea.ms/git-commit/
---

# Classic Commit Style

The classic commit style follows the time-tested conventions established by the Git community and popularized by Chris Beams' "How to Write a Git Commit Message."

## Reference

**Source:** https://cbea.ms/git-commit/

For complex commits or edge cases not covered here, read the full article. It provides excellent context on why each rule matters and how to apply them in practice.

## The 7 Rules

1. **Separate subject from body with a blank line**
2. **Limit subject to 50 characters**
3. **Capitalize the subject line**
4. **Do not end subject with a period**
5. **Use imperative mood in the subject line**
6. **Wrap body at 72 characters**
7. **Use the body to explain what and why, not how**

## Subject Line Rules

### Capitalization
The first letter of the subject MUST be uppercase.
- Good: `Add user authentication`
- Bad: `add user authentication`

### No Type Prefixes
Do NOT use type prefixes like `feat:`, `fix:`, etc. This is what distinguishes classic from conventional commits.
- Good: `Add user authentication`
- Bad: `feat: add user authentication`

### Character Limit
Keep the subject line to 50 characters or fewer. This ensures readability in git log, GitHub, and other tools.

### No Trailing Period
The subject line is a title, not a sentence.
- Good: `Fix null pointer in session handler`
- Bad: `Fix null pointer in session handler.`

### Imperative Mood
Write the subject as if giving a command. The subject should complete the sentence: "If applied, this commit will ___"
- Good: `Add validation for email addresses`
- Bad: `Added validation for email addresses`
- Bad: `Adds validation for email addresses`
- Bad: `Adding validation for email addresses`

**Imperative verb examples:** Add, Fix, Update, Remove, Refactor, Rename, Move, Extract, Implement, Introduce, Merge, Release, Revert

## Body Rules

### When to Include a Body
Include a body when:
- The change requires explanation beyond the subject
- There's important context or reasoning to document
- The change has non-obvious implications
- You're reverting a previous change

Skip the body when:
- The subject fully explains the change
- The change is trivial (typo fix, formatting)

### Line Wrapping
Wrap all body lines at 72 characters. This ensures proper display in terminals and git tools.

### Content Guidelines
Explain:
- **WHAT** changed (if not obvious from the subject)
- **WHY** the change was made (motivation, context)
- **Implications** or side effects

Do NOT explain HOW - the code shows that.

### Formatting
- Use blank lines to separate paragraphs
- Use bullet points for lists (prefix with `-`)
- Reference issues/tickets when relevant

## Examples

### Minimal (Subject Only)
```
Fix typo in README
```

### With Body
```
Add rate limiting to authentication endpoint

Implement a sliding window rate limiter that allows 5 login attempts
per minute per IP address. After exceeding the limit, clients receive
a 429 response with a Retry-After header.

This prevents brute force attacks while allowing legitimate users
to recover from typos quickly.
```

### Explaining a Revert
```
Revert "Add caching to user lookup"

This reverts commit abc1234.

The caching implementation caused stale data issues when users
updated their profiles. Reverting until we implement proper cache
invalidation.
```

### With Issue Reference
```
Fix race condition in connection pool

Multiple threads could acquire the same connection when the pool
was nearly exhausted, leading to corrupted state.

The fix adds a mutex around the acquisition logic. Performance
impact is negligible since contention is rare.

Fixes #1234
```

## Content Filtering — Task Tracker & Agent Noise

Commit messages are for humans reading git history. They must be clean of internal tooling artifacts. Anyone reading the commit — a teammate, a future maintainer, an open-source contributor — should understand the message without knowledge of your task tracker, agent workflow, or AI tooling.

### MUST NEVER appear in commit messages:

**Internal task tracker references:**
- Beads IDs (`beads-xxx`, `claude-plugins-xxx`, or any internal tracker prefix)
- Task status transitions ("moved to in_progress", "marked as closed")
- Dependency references ("depends on beads-abc", "blocked by task-123")
- Parked idea markers ("PARKED:", "deferred from beads-xyz")
- `bd` CLI commands or output fragments (`bd close`, `bd update`, etc.)

**Agent workflow artifacts:**
- Workflow phase labels ("Phase 1", "Step 2 of 4", "Part 3/5")
- Agent dispatch metadata ("dispatched to subagent", "batch 2 of 3")
- Tool invocation traces ("ran bd create", "used /decompose")
- Acceptance criteria checklists copied verbatim from task trackers
- Verification command output ("$ npm test → 24 passed")

**AI attribution:**
- Any Co-Authored-By mentioning Claude, Anthropic, GPT, OpenAI, Copilot, or any AI
- Model references ("generated by Claude Opus 4.6")
- Agent identity markers ("as an AI assistant")

**Progress/metrics as structural markers:**
- "Total: 24 tests, 990 lines" (unless meaningful context like "improve coverage from 60% to 90%")
- "Completed 3/5 tasks"

### How to translate tracker context into clean messages:

Instead of leaking tracker IDs, translate the *intent* into human-readable context.

**Bad — leaks tracker noise:**
```
Add email validation

Implements beads-abc.2 acceptance criteria. Closes beads-abc.2.
Depends on beads-abc.1 (schema migration).
Phase 2 of auth epic (beads-abc).
```

**Good — clean, meaningful:**
```
Add email validation to registration flow

Validate email format and uniqueness before account creation.
Requires the user schema migration to be in place first.

This is part of the broader authentication hardening effort.
```

**Bad — agent workflow noise:**
```
Implement rate limiting

Task dispatched from decomposition plan. Acceptance criteria:
- [x] 5 requests per minute per IP
- [x] Returns 429 with Retry-After header
Verification: npm test shows 24 passing.
```

**Good — just the substance:**
```
Add rate limiting to authentication endpoint

Implement a sliding window rate limiter allowing 5 login attempts
per minute per IP address. Exceeding the limit returns a 429
response with a Retry-After header.

This prevents brute force attacks while allowing legitimate users
to recover from typos quickly.
```

### Rule of thumb:

> If someone with zero knowledge of your task tracker, agent workflow,
> or AI tools would find the reference confusing or meaningless,
> it does not belong in the commit message.

## Anti-Patterns to Avoid

### Vague Subjects
- Bad: `Fix bug`
- Bad: `Update code`
- Bad: `Changes`
- Good: `Fix null pointer when user has no profile`

### Implementation Details in Subject
- Bad: `Add null check on line 45 of UserService.java`
- Good: `Handle missing user profile gracefully`

### Multiple Concerns
- Bad: `Fix login bug and add logout button`
- Good: Two separate commits

### Past Tense
- Bad: `Fixed the authentication issue`
- Good: `Fix authentication issue`

### Ending with Period
- Bad: `Add new feature.`
- Good: `Add new feature`

## Further Reading

For complex commits, edge cases, or deeper understanding of the rationale behind these rules, consult the original source:

**https://cbea.ms/git-commit/**

The article explains the history and reasoning behind each rule, helping you make better judgment calls in ambiguous situations.
