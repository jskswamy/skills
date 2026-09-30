# Refactoring Pattern Detected

A repeated structural edit pattern has been detected. This suggests you may be performing a refactoring operation that would be more efficient in an IDE.

## What Was Detected

The same substitution pattern (rename, import path change, or signature modification) has been applied to multiple files sequentially.

## Why This Matters

- **IDE refactoring:** AST-based, atomic, instant across entire codebase
- **AI text editing:** Sequential, file-by-file, risk of inconsistencies

## Recommended Action

1. **Stop** the current edit sequence
2. **Run** `/handoff` to generate IDE-specific instructions
3. **Execute** the refactoring in your IDE (IntelliJ/GoLand or VSCode)
4. **Continue** with AI for the remaining non-structural work

## Quick Reference

| IDE | Rename | Move | Change Signature |
|-----|--------|------|------------------|
| IntelliJ/GoLand | Shift+F6 | F6 | Cmd/Ctrl+F6 |
| VSCode | F2 | Right-click | Extension-dependent |

## If This Detection Was Incorrect

If the detected pattern is intentional and not a refactoring operation (e.g., applying similar but distinct changes to multiple files), you can proceed. The safety net is conservative and may occasionally flag legitimate multi-file edits.
