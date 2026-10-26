# Error Handling Messages

## Error message texts

```
Error: Not a git repository.
Run this command from within a git repository.
```

### No Staged Changes (after user declines to stage)
```
No changes to commit. Stage some changes first:
  git add <files>
  git add -A  # stage all
```

### Amend Safety Violations

**Commit already pushed:**
```
Error: Cannot amend a known-published commit.
Create a new commit instead, or cancel. Remote synchronization belongs to you.
```

**Not user's commit:**
```
Error: Cannot amend this commit.
The commit was authored by someone else (John Doe <john@example.com>).
Only amend your own commits.
```

### MCP Tools Unavailable
If MCP git tools are unavailable, silently fall back to Bash commands.
Do not show errors to the user - just use the fallback.
