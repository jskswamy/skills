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

Generate a structured handoff document for IDE-based refactoring operations.

## Process

### Step 1: Gather Information

If no description was provided, ask the user:

<question>
What refactoring operation do you need to perform?

Examples:
- "Rename UserService to AccountService across the codebase"
- "Move pkg/handlers/ to internal/api/handlers/"
- "Add context.Context parameter to all database methods"
- "Extract interface from ConcreteType"
</question>

### Step 2: Analyze the Refactoring

Based on the description, determine:
1. **Type of refactoring:** rename, move, signature change, extract interface, etc.
2. **Scope:** How many files/locations are affected
3. **Language:** Go, TypeScript, Python, etc. (affects IDE instructions)

Use Glob and Grep to understand the scope:
- For renames: Search for current name usage
- For moves: Identify import statements that would change
- For signature changes: Find call sites

### Step 3: Generate Handoff Document

Create a document with this structure:

```markdown
# IDE Refactoring Handoff

## Summary
[One-line description of what needs to change]

## Why IDE Refactoring
[Brief explanation of why this is better done in IDE - AST-based, atomic, etc.]

## Scope Analysis
- **Files affected:** [count]
- **References found:** [count]
- **Type:** [rename/move/signature/extract]

---

## IntelliJ/GoLand Instructions

### Prerequisites
- Ensure all files are saved
- No uncommitted changes recommended (for easy rollback)

### Steps
1. [Specific step with keyboard shortcut]
2. [Next step]
3. [Preview and confirm changes]

### Keyboard Shortcuts
| Action | Shortcut |
|--------|----------|
| [relevant action] | [shortcut] |

---

## VSCode Instructions

### Prerequisites
- Ensure language server is running
- Install recommended extensions if needed

### Steps
1. [Specific step with keyboard shortcut]
2. [Next step]
3. [Preview and confirm changes]

### Keyboard Shortcuts
| Action | Shortcut |
|--------|----------|
| [relevant action] | [shortcut] |

---

## Validation

After completing the refactoring in your IDE, run:

```bash
# Check what changed
git diff --stat

# Run tests (adjust for your project)
[language-specific test command]

# Build/compile (adjust for your project)
[language-specific build command]
```

## What Happens Next

After you've completed the IDE refactoring and validated:
1. Let me know the refactoring is done
2. I'll continue with [describe next steps]
```

### Step 4: Handle --track Flag

If `--track` was specified:
- Create a beads issue with type "task"
- Title: "IDE Refactoring: [description]"
- Include the handoff document in the issue body
- Set status to in_progress

## Refactoring Type Templates

### For Renames

**IntelliJ/GoLand:**
1. Navigate to the symbol (Cmd/Ctrl+Click or Cmd/Ctrl+B)
2. Press **Shift+F6** (Rename)
3. Type the new name
4. Preview changes in the Refactoring Preview window
5. Click "Do Refactor" to apply

**VSCode:**
1. Select the symbol name
2. Press **F2** (Rename Symbol)
3. Type the new name
4. Press Enter to apply (VSCode shows preview)

### For Package/Directory Moves

**IntelliJ/GoLand:**
1. In Project view, select the package/directory
2. Press **F6** (Move) or right-click → Refactor → Move
3. Choose destination
4. Review import updates in preview
5. Apply refactoring

**VSCode:**
1. In Explorer, right-click the file/folder
2. Select "Move to..."
3. Choose destination
4. Confirm import updates (may require language extension)

### For Signature Changes

**IntelliJ/GoLand:**
1. Place cursor on function signature
2. Press **Cmd/Ctrl+F6** (Change Signature)
3. Add/remove/reorder parameters
4. Set default values for new parameters
5. Preview and apply

**VSCode:**
1. Depends on language extension
2. For Go: Not natively supported, use manual edit + rename
3. For TypeScript: Some extensions support this

### For Extract Interface

**IntelliJ/GoLand:**
1. Place cursor on struct/class
2. Refactor menu → Extract → Interface
3. Select methods to include
4. Name the interface
5. Apply

**VSCode:**
1. Varies by language
2. Some extensions support "Extract Interface"
3. May need manual creation with rename for method alignment

## Language-Specific Validation Commands

### Go
```bash
go build ./...
go test ./...
go vet ./...
```

### TypeScript/JavaScript
```bash
npm run build
npm test
npm run lint
```

### Python
```bash
python -m pytest
python -m mypy .
python -m flake8
```

### Rust
```bash
cargo build
cargo test
cargo clippy
```

## Output Format

Display the handoff document directly in the conversation for the user to follow. Do not write it to a file unless specifically requested.
