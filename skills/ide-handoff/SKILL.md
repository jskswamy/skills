---
name: ide-handoff
description: >
  Guardrail for efficient refactoring. IDEs use AST-based semantic refactoring
  (instant, atomic, accurate). AI uses text-based pattern matching (slower,
  sequential, error-prone for structural changes). This skill provides decision
  criteria for when to delegate to IDE vs proceed with AI. Consult before:
  renames across files, moving packages, changing signatures, extracting
  interfaces, or any multi-file coordinated structural change.
---

# IDE Refactoring Handoff Protocol

This skill teaches you when to STOP and delegate structural refactoring to the user's IDE, versus when to proceed with AI-based editing.

## Why This Matters

**IDEs use Abstract Syntax Tree (AST) semantic refactoring:**
- Understands code structure, not just text
- Atomic operations (all-or-nothing)
- Instant execution across entire codebase
- Guaranteed consistency (no missed references)

**AI uses text-based pattern matching:**
- Sequential file-by-file edits
- Risk of missed references or inconsistencies
- Time-consuming for structural changes
- Error-prone for cross-file coordination

## When to STOP and Create Handoff (IDE Territory)

**STOP and generate a handoff document when you're about to:**

### 1. Move Packages/Directories
Moving files or directories that require import path updates across the codebase.

**Examples:**
- `pkg/old/` → `internal/new/`
- `src/components/Button/` → `src/ui/Button/`
- Reorganizing module structure

**IDE advantage:** Drag-and-drop with automatic import updates

### 2. Rename Types/Functions/Variables Across Multiple Files
Changing the name of a symbol that's referenced throughout the codebase.

**Examples:**
- Rename `UserService` to `AccountService`
- Rename `getData()` to `fetchData()`
- Rename `config` to `settings` across modules

**IDE advantage:** Single rename operation with preview, all references updated atomically

### 3. Change Function Signatures with Many Call Sites
Adding, removing, or reordering parameters on functions called from multiple locations.

**Examples:**
- Add `ctx context.Context` as first parameter
- Change `func Process(data []byte)` to `func Process(ctx context.Context, data []byte, opts Options)`
- Deprecate a parameter and provide default

**IDE advantage:** Signature change with automatic call site updates

### 4. Extract Interfaces from Concrete Types
Creating an interface from an existing implementation.

**IDE advantage:** Automatic interface extraction with method selection

### 5. Inline Functions/Variables Across Files
Replacing function calls or variable references with their definitions.

**IDE advantage:** Safe inlining with usage analysis

### 6. Any Coordinated Change to 10+ Files
If the same structural change needs to happen across many files, IDE refactoring is more efficient.

## When to PROCEED with AI (AI Territory)

**Continue with AI-based editing when:**

- **Generating new code** - Controllers, services, tests, CRDs, configuration files
- **Writing documentation** - README, comments, API docs
- **Single-file changes** - Logic modifications within one file
- **Logic changes within existing structure** - Algorithm updates, bug fixes, feature additions
- **Creating boilerplate and templates** - Scaffolding new components
- **Code review and analysis** - Understanding, explaining, suggesting improvements

## Self-Check Before Multi-File Structural Edits

**Before making edits that touch 5+ files with similar changes, ask:**

1. **Is this a rename/move/signature change?**
   - YES → Create handoff document
   - NO → Continue

2. **Would an IDE do this with a menu command or keyboard shortcut?**
   - YES → Create handoff document
   - NO → Continue

3. **Am I generating new code or modifying logic?**
   - Generating new → Continue
   - Modifying structure → Create handoff document

4. **Is the same substitution pattern repeated across files?**
   - YES (same old→new across files) → Create handoff document
   - NO (different changes per file) → Continue

## Handoff Document Template

When stopping for handoff, generate a document with this structure:

```markdown
# IDE Refactoring Handoff

## What Needs to Change
[Describe the structural change needed]

## Why This is Better in IDE
[Brief explanation of why IDE is more efficient for this specific change]

## IntelliJ/GoLand Steps
1. [Step-by-step instructions using IntelliJ/GoLand]
2. [Include keyboard shortcuts: Shift+F6 for rename, F6 for move, etc.]
3. [Mention Refactor menu location]

## VSCode Steps
1. [Step-by-step instructions using VSCode]
2. [Include keyboard shortcuts: F2 for rename, etc.]
3. [Mention relevant extensions if needed]

## Validation
```bash
# Run these after IDE refactoring:
git diff --stat
[language-specific test command]
[language-specific build command]
```

## What I'll Do After
[Describe what AI work will continue after the structural refactoring is complete]
```

## Detecting Refactoring as Side Effect

**IMPORTANT:** Refactoring often emerges as a side effect, not an explicit user request.

**Example scenario:**
- User asks: "Add infrastructure controller binary"
- You think: "I should restructure cmd/ first..."
- **STOP!** This restructuring is IDE territory

**Before starting ANY task that involves restructuring:**
1. Identify if structural changes are needed
2. If yes, create handoff document FIRST
3. User executes IDE refactoring
4. THEN proceed with the original task

## Quick Reference: IDE Keyboard Shortcuts

### IntelliJ/GoLand
| Action | Shortcut |
|--------|----------|
| Rename | Shift+F6 |
| Move | F6 |
| Change Signature | Cmd/Ctrl+F6 |
| Extract Interface | Refactor menu |
| Inline | Cmd/Ctrl+Alt+N |
| Safe Delete | Alt+Delete |

### VSCode
| Action | Shortcut |
|--------|----------|
| Rename Symbol | F2 |
| Move/Rename File | Right-click → Rename |
| Go to References | Shift+F12 |

## Examples of Good Handoffs

### Example 1: Package Move
**User request:** "Move the user package to internal/domain"

**Response:** "This is a package move operation - IDE semantic refactoring will handle this much more efficiently. Let me create a handoff document..."

### Example 2: Type Rename
**User request:** "Rename Config to Settings throughout the codebase"

**Response:** "This is a cross-file rename operation. IDE's rename refactoring will update all references atomically. Here's the handoff..."

### Example 3: Implicit Refactoring
**User request:** "Add a new API endpoint for user preferences"

**Your analysis reveals:** Need to reorganize handlers/ first

**Response:** "Before adding the endpoint, I notice the handlers need reorganization. This structural change is best done in your IDE. Let me create a handoff for that first, then I'll add the endpoint..."
