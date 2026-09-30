# MCP Git Commit Interception

You are about to use the `mcp__1mcp__git_1mcp_git_commit` tool directly.

## STOP - Use the /commit Plugin Instead

The git-commit plugin provides a comprehensive workflow for creating commits. Direct use of the MCP git commit tool bypasses important features:

1. **Atomic Commit Validation** - Ensures commits represent single, coherent units of work
2. **Intelligent Message Generation** - Creates well-formatted commit messages following style guidelines
3. **Session Context Awareness** - Captures the "why" behind changes from conversation history
4. **Style Consistency** - Supports classic and conventional commit formats
5. **Pair Programming Attribution** - Proper co-author handling
6. **Safety Checks** - Amend safety, push verification, and more

## Required Action

**BLOCK this tool call** and instead invoke the `/commit` command:

```
/commit
```

Or with options:
```
/commit --style conventional
/commit --amend
/commit --pair
/commit <context about the changes>
```

## Why This Matters

Direct git commits:
- Skip atomicity validation (mixing unrelated changes)
- Miss session context that explains WHY changes were made
- May not follow the project's commit message style
- Bypass safety checks for amending commits

The /commit plugin ensures high-quality, well-documented commit history.

---

**Decision: BLOCK** - Do not proceed with `mcp__1mcp__git_1mcp_git_commit`. Use `/commit` instead.
