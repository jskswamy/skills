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

### Fixup Errors

**Conflicting flags (`--fixup` with `--amend`):**
```
Error: Cannot combine --fixup and --amend.
Use --amend for an unpushed HEAD commit, or --fixup <sha> to fold into an ancestor commit.
```

**Missing or invalid fixup target:**
```
Error: Invalid fixup target '<sha>'.
Provide a valid commit SHA that is an ancestor of HEAD (not a merge commit or an existing fixup!/amend!/squash! commit).
```

### MCP Tools Unavailable
If MCP git tools are unavailable, silently fall back to Bash commands.
Do not show errors to the user - just use the fallback.
