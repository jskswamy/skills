# VSCode Refactoring Steps

Quick reference for refactoring operations in Visual Studio Code.

## Keyboard Shortcuts

| Operation | Shortcut (Mac) | Shortcut (Win/Linux) |
|-----------|----------------|----------------------|
| Rename Symbol | F2 | F2 |
| Go to Definition | F12 | F12 |
| Find All References | Shift+F12 | Shift+F12 |
| Quick Fix / Refactor | Cmd+. | Ctrl+. |
| Extract to Function | Select → Cmd+. | Select → Ctrl+. |
| Extract to Variable | Select → Cmd+. | Select → Ctrl+. |
| Move to New File | Cmd+. on symbol | Ctrl+. on symbol |

## Rename Symbol

1. **Select symbol**
   - Click on the symbol name
   - Or use F12 to go to definition first

2. **Initiate rename**
   - Press **F2**
   - Or right-click → Rename Symbol

3. **Enter new name**
   - Type the new name
   - VSCode shows preview of all changes inline

4. **Apply**
   - Press **Enter** to apply
   - Press **Escape** to cancel

### Notes
- Works across all files in workspace
- Requires language server support
- Preview shows changes before applying

## Move/Rename File

1. **In Explorer**
   - Right-click file → Rename
   - Or select and press Enter (on some systems)

2. **Update imports**
   - VSCode prompts to update imports
   - Click "Yes" to update all references

### For Moving Files
1. **Drag and drop** in Explorer view
2. VSCode prompts for import updates
3. Confirm to update all import statements

### Alternative: Move to New File
1. Select code to move (function, class, etc.)
2. Press **Cmd/Ctrl+.**
3. Select "Move to a new file"

## Extract Function/Method

1. **Select code**
   - Highlight the code block to extract

2. **Open Quick Actions**
   - Press **Cmd/Ctrl+.**
   - Or click the lightbulb icon

3. **Choose extraction**
   - "Extract to function" (creates new function)
   - "Extract to method" (within class)
   - Choose scope (module, file, etc.)

4. **Name the function**
   - Enter the new function name
   - Press Enter

## Extract Variable/Constant

1. **Select expression**
   - Highlight the expression to extract

2. **Open Quick Actions**
   - Press **Cmd/Ctrl+.**

3. **Choose extraction**
   - "Extract to constant"
   - "Extract to variable"
   - Choose scope

4. **Name the variable**
   - Enter the name
   - Press Enter

## Language-Specific Extensions

### Go (Go extension by Google)

| Operation | How to Access |
|-----------|---------------|
| Rename | F2 (standard) |
| Extract Function | Select → Cmd/Ctrl+. → Extract |
| Generate Interface | Code action on struct |
| Organize Imports | Cmd/Ctrl+Shift+O or on save |

**Additional Go commands:**
- `Go: Add Import` - Add specific import
- `Go: Add Tags To Struct Fields` - Add JSON tags
- `Go: Generate Unit Tests` - Create test file

### TypeScript/JavaScript

| Operation | How to Access |
|-----------|---------------|
| Rename | F2 |
| Extract to Function | Select → Cmd/Ctrl+. |
| Extract to Constant | Select → Cmd/Ctrl+. |
| Move to New File | Cmd/Ctrl+. on symbol |
| Convert to Named Export | Cmd/Ctrl+. on export |

**TypeScript-specific:**
- "Add missing import" - Quick fix for unresolved imports
- "Organize Imports" - Sort and remove unused
- "Convert to template string" - ${} syntax

### Python (Pylance/Pyright)

| Operation | How to Access |
|-----------|---------------|
| Rename | F2 |
| Extract Method | Select → Cmd/Ctrl+. |
| Extract Variable | Select → Cmd/Ctrl+. |
| Organize Imports | Cmd/Ctrl+Shift+O |

**Python-specific:**
- "Add import" - Quick fix for missing imports
- "Convert to f-string" - Modern string formatting

### Rust (rust-analyzer)

| Operation | How to Access |
|-----------|---------------|
| Rename | F2 |
| Extract Function | Select → Cmd/Ctrl+. |
| Extract Variable | Select → Cmd/Ctrl+. |
| Inline Variable | Cmd/Ctrl+. on variable |

**Rust-specific:**
- "Add missing members" - Implement trait methods
- "Fill match arms" - Complete match expressions

## Change Signature (Limited Support)

VSCode's signature change support varies by language:

### TypeScript/JavaScript
1. Rename parameter (F2 on parameter name)
2. For adding parameters:
   - Manually add to definition
   - Use "Add missing parameter" quick fix at call sites

### Go
- No built-in signature change
- Rename parameters with F2
- For adding parameters: manually update definition and call sites

### Python
- Rename parameters with F2
- No automated signature change

### Workaround for Any Language
1. Rename function to temporary name (F2)
2. Create new function with desired signature
3. Update call sites (Find All References: Shift+F12)
4. Delete old function

## Tips for VSCode Refactoring

1. **Check language server status**
   - Look at bottom status bar
   - Ensure extension is active

2. **Use Find All References (Shift+F12)**
   - Verify scope before refactoring
   - Check all usages are captured

3. **Source Control view (Cmd/Ctrl+Shift+G)**
   - Review changes after refactoring
   - Easy to see what was modified

4. **Undo with Cmd/Ctrl+Z**
   - VSCode tracks multi-file refactoring
   - Can undo across files

5. **Workspace Search (Cmd/Ctrl+Shift+F)**
   - Verify no text occurrences remain
   - Catch comments and strings

## Recommended Extensions by Language

### Go
- **Go** (by Google) - Essential, includes gopls

### TypeScript/JavaScript
- Built-in support is excellent
- **JavaScript and TypeScript Nightly** for latest features

### Python
- **Pylance** - Full refactoring support
- **Python** (by Microsoft)

### Rust
- **rust-analyzer** - Best refactoring support

### Java
- **Extension Pack for Java** - Full IDE experience
- **Language Support for Java** (Red Hat)
