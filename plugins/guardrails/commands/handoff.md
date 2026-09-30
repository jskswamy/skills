---
name: handoff
description: Generate IDE refactoring handoff document with step-by-step instructions for IntelliJ/GoLand and VSCode
arguments:
  - name: description
    description: What refactoring needs to be done (optional - will prompt if not provided)
    required: false
  - name: track
    description: Create a beads issue to track the handoff (optional)
    required: false
---

# IDE Refactoring Handoff Generator

Invoke the `ide-handoff` skill with this command request.
Forward all arguments exactly as provided.
