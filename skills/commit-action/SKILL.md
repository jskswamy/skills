---
name: commit-action
description: Triggers when user wants to PERFORM a git commit action. Activates on phrases like "commit these changes", "commit this", "let's commit", "make a commit", "create a commit", "commit my work", "commit the changes", "time to commit", "ready to commit", "commit what I've done", "save my changes" (git context), "commit for me", "do the commit", "commit now", "go ahead and commit", "please commit", "can you commit", "would you commit"
---

# Git Commit Action Skill

This skill recognizes when the user wants to **perform** a commit action (not just learn about commits) and invokes the full `/commit` workflow.

## When to Activate

Activate this skill when the user expresses **intent to commit**, such as:

### Direct Commit Requests
- "commit these changes"
- "commit this"
- "let's commit"
- "make a commit"
- "create a commit"
- "commit my work"
- "commit the changes"
- "commit now"

### Readiness Expressions
- "time to commit"
- "ready to commit"
- "I'm ready to commit"
- "let's do the commit"
- "go ahead and commit"

### Action Delegation
- "commit for me"
- "do the commit"
- "please commit"
- "can you commit"
- "would you commit this"
- "commit what I've done"

### Contextual Git Phrases
- "save my changes" (when in git context or after making code changes)
- "save this work" (when in git context)
- "finalize these changes"
- "wrap this up with a commit"

### With Style Preferences
- "commit with conventional style"
- "make a conventional commit"
- "commit this classically"
- "commit using classic style"

### With Context
- "commit this as a bug fix"
- "commit the auth changes"
- "commit what we just did"
- "commit the refactoring"

## What This Skill Does NOT Handle

Do NOT activate for informational questions - those are handled by `commit-style.md`:
- "How do I write a commit message?"
- "What is a conventional commit?"
- "Explain atomic commits"
- "What makes a good commit?"

## Action

When this skill activates, invoke the `/commit` command workflow with any detected context.

### Detecting Style Preference

If the user's request mentions a style preference, pass it to the command:

| User Phrase | Style Flag |
|-------------|------------|
| "conventional commit", "conventional style", "use conventional" | `--style conventional` |
| "classic commit", "classic style", "use classic" | `--style classic` |

### Detecting Amend Intent

If the user wants to amend:
- "amend the commit"
- "update the last commit"
- "fix the previous commit message"

Pass: `--amend`

### Detecting Pair Programming

If user mentions pairing:
- "commit with pair attribution"
- "add my pair"
- "include co-author"

Pass: `--pair`

### Passing Context

Any descriptive text the user provides should be passed as context to help generate a better commit message:

**Example user input:** "commit these auth changes as a security fix"

**Invoke as:** `/commit security fix for auth changes`

## Workflow

1. **Recognize** this is a commit ACTION request
2. **Extract** any style preference, flags, or context from the user's message
3. **Invoke** the `/commit` command with appropriate arguments
4. **Let the command handle** all the complexity:
   - Repository state checking
   - Staging changes if needed
   - Atomic commit validation
   - Style-specific message generation
   - User confirmation flow

## Example Activations

| User Says | Action |
|-----------|--------|
| "commit these changes" | Invoke `/commit` |
| "let's make a conventional commit" | Invoke `/commit --style conventional` |
| "commit the login fix" | Invoke `/commit login fix` |
| "time to commit, this fixes the auth bug" | Invoke `/commit fixes auth bug` |
| "commit and add my pair" | Invoke `/commit --pair` |
| "amend the last commit" | Invoke `/commit --amend` |
| "save my changes" (after editing code) | Invoke `/commit` |

## Important

- This skill **overrides** Claude's default commit behavior
- Always use the full `/commit` workflow for proper atomic validation and style adherence
- The `/commit` command handles all edge cases, user preferences, and error scenarios
- Pass through any context the user provides to improve commit message quality
