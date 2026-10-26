---
name: conventional
description: Conventional Commits specification for automated changelog generation and semantic versioning
default: false
source: https://www.conventionalcommits.org/en/v1.0.0/
---

# Conventional Commits Style

The Conventional Commits specification provides a structured format designed for automation, including automatic changelog generation, semantic version bumping, and structured commit history.

## Reference

**Source:** https://www.conventionalcommits.org/en/v1.0.0/

For complex commits or edge cases not covered here, read the full specification. It provides the complete rules and explains the relationship with Semantic Versioning.

## Format

```
<type>[optional scope][!]: <description>

[optional body]

[optional footer(s)]
```

## Types

| Type | Description | SemVer Impact |
|------|-------------|---------------|
| `feat` | A new feature | MINOR |
| `fix` | A bug fix | PATCH |
| `docs` | Documentation only changes | - |
| `style` | Formatting, white-space, etc. (no code change) | - |
| `refactor` | Code change that neither fixes a bug nor adds a feature | - |
| `perf` | A code change that improves performance | PATCH |
| `test` | Adding missing tests or correcting existing tests | - |
| `build` | Changes to build system or external dependencies | - |
| `ci` | Changes to CI configuration files and scripts | - |
| `chore` | Other changes that don't modify src or test files | - |
| `revert` | Reverts a previous commit | - |

## Subject Line Rules

### Case
Use **lowercase** for type, scope, and description.
- Good: `feat(auth): add oauth2 login support`
- Bad: `Feat(Auth): Add OAuth2 login support`

### Character Limit
Keep the entire subject line (including type and scope) to 50 characters or fewer when possible, with a hard limit of 72 characters.

### No Trailing Period
- Good: `fix: resolve null pointer exception`
- Bad: `fix: resolve null pointer exception.`

### Imperative Mood
Use imperative mood in the description.
- Good: `feat: add user authentication`
- Bad: `feat: added user authentication`

## Scope

The scope provides additional context about what part of the codebase is affected.

### Format
Scope is enclosed in parentheses after the type: `type(scope): description`

### Guidelines
- Use lowercase
- Keep it short (one word when possible)
- Use consistent scopes across the project
- Common scopes: `api`, `ui`, `auth`, `db`, `config`, `deps`

### Examples
```
feat(auth): add password reset flow
fix(api): handle timeout errors gracefully
docs(readme): update installation instructions
refactor(ui): extract button component
```

## Breaking Changes

Breaking changes MUST be indicated in one of two ways:

### Option 1: Exclamation Mark
Append `!` after the type/scope:
```
feat(api)!: change authentication endpoint response format
```

### Option 2: Footer
Include `BREAKING CHANGE:` in the footer:
```
feat(api): change authentication endpoint response format

BREAKING CHANGE: The /auth/login endpoint now returns a JSON object
instead of a plain token string. Clients must update their parsing logic.
```

### Both Together (Recommended for Visibility)
```
feat(api)!: change authentication endpoint response format

BREAKING CHANGE: The /auth/login endpoint now returns a JSON object
instead of a plain token string.
```

## Body Rules

### Line Wrapping
Wrap all body lines at 72 characters.

### Content
Same as classic commits:
- Explain WHAT and WHY, not HOW
- Provide context for the change
- Reference related issues or discussions

## Footer Rules

### Format
Footers follow the format: `token: value` or `token #value`

### Common Footers
- `BREAKING CHANGE: <description>` - Indicates a breaking API change
- `Fixes #123` - Closes an issue
- `Refs #456` - References an issue without closing
- `Reviewed-by: Name <email>` - Code review attribution
- `Co-authored-by: Name <email>` - Pair programming attribution

## Examples

### Simple Feature
```
feat: add user profile page
```

### Feature with Scope
```
feat(ui): add dark mode toggle to settings
```

### Bug Fix with Body
```
fix(auth): resolve session timeout not refreshing

The session refresh logic was checking the wrong timestamp field,
causing sessions to expire even when the user was active.

Fixes #892
```

### Breaking Change
```
feat(api)!: require authentication for all endpoints

All API endpoints now require a valid JWT token in the Authorization
header. Previously, read-only endpoints were public.

BREAKING CHANGE: Unauthenticated requests to any endpoint will now
receive a 401 response. Clients must implement authentication before
upgrading.

Migration guide: https://docs.example.com/auth-migration
```

### Revert
```
revert: feat(ui): add experimental dashboard widget

This reverts commit abc1234def5678.

The widget caused performance issues on mobile devices. Reverting
while we investigate optimization options.
```

### Multiple Footers
```
fix(db): prevent connection pool exhaustion under load

Implement connection timeout and add health check pings to detect
and remove stale connections from the pool.

Fixes #1234
Refs #1100
Co-authored-by: Jane Doe <jane@example.com>
```

## Type Selection Guide

### When to Use `feat`
- Adding new functionality visible to users
- New API endpoints
- New UI components or pages

### When to Use `fix`
- Correcting incorrect behavior
- Fixing crashes or errors
- Resolving security vulnerabilities

### When to Use `refactor`
- Restructuring code without changing behavior
- Renaming variables/functions for clarity
- Extracting reusable components

### When to Use `chore`
- Updating `.gitignore`
- Modifying editor configs
- Maintenance tasks that don't affect src/test

### When to Use `build`
- Updating dependencies in package.json/Cargo.toml/etc.
- Modifying webpack/rollup/build configurations
- Docker/container changes

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
feat(auth): add email validation

Implements beads-abc.2 acceptance criteria. Closes beads-abc.2.
Depends on beads-abc.1 (schema migration).
Phase 2 of auth epic (beads-abc).
```

**Good — clean, meaningful:**
```
feat(auth): add email validation to registration flow

Validate email format and uniqueness before account creation.
Requires the user schema migration to be in place first.

This is part of the broader authentication hardening effort.

Fixes #234
```

**Bad — agent workflow noise:**
```
feat(api): implement rate limiting

Task dispatched from decomposition plan. Acceptance criteria:
- [x] 5 requests per minute per IP
- [x] Returns 429 with Retry-After header
Verification: npm test shows 24 passing.
```

**Good — just the substance:**
```
feat(api): add rate limiting to authentication endpoint

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

### Wrong Type
- Bad: `feat: fix login bug` (should be `fix`)
- Bad: `fix: add new button` (should be `feat`)

### Uppercase
- Bad: `Feat: Add feature`
- Bad: `FIX: Resolve bug`

### Missing Type
- Bad: `add user authentication`
- Good: `feat: add user authentication`

### Vague Description
- Bad: `fix: fix bug`
- Good: `fix(auth): handle expired tokens gracefully`

### Period at End
- Bad: `feat: add new feature.`
- Good: `feat: add new feature`

## Further Reading

For complex commits, edge cases, or deeper understanding of the specification, consult the official source:

**https://www.conventionalcommits.org/en/v1.0.0/**

The specification covers:
- Full grammar and parsing rules
- Integration with Semantic Versioning (SemVer)
- FAQ for common questions
- Links to tooling and ecosystem
