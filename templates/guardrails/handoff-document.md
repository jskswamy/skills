# IDE Refactoring Handoff Template

Use this template when generating handoff documents.

## Document Structure

```markdown
# IDE Refactoring Handoff

## Summary
[One-line description: "Rename X to Y across codebase" or "Move package X to Y"]

## Why IDE Refactoring
This operation involves [rename/move/signature change] which IDE tools handle using
Abstract Syntax Tree (AST) analysis - providing atomic, instant, and accurate
refactoring across the entire codebase.

## Scope Analysis
- **Files affected:** [N files]
- **References found:** [N references]
- **Operation type:** [Rename | Move | Signature Change | Extract Interface]

---

## IntelliJ/GoLand Instructions

[Include intellij-steps.md content relevant to operation type]

---

## VSCode Instructions

[Include vscode-steps.md content relevant to operation type]

---

## Validation

After completing the refactoring:

```bash
# View changes
git diff --stat

# Language-specific checks
[test command]
[build command]
[lint command]
```

## What Happens Next

Once you confirm the refactoring is complete:
[Describe what AI work will continue]
```

## Guidelines

1. **Be specific** - Include exact file paths and symbol names
2. **Include counts** - Show how many files/references to set expectations
3. **Provide both IDEs** - Always include IntelliJ and VSCode sections
4. **Validation is critical** - Always include test/build commands
5. **Set expectations** - Describe what happens after handoff completes
