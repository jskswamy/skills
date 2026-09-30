# IntelliJ/GoLand Refactoring Steps

Quick reference for IDE refactoring operations in IntelliJ IDEA, GoLand, and other JetBrains IDEs.

## Keyboard Shortcuts

| Operation | Shortcut (Mac) | Shortcut (Win/Linux) |
|-----------|----------------|----------------------|
| Rename | Shift+F6 | Shift+F6 |
| Move | F6 | F6 |
| Change Signature | Cmd+F6 | Ctrl+F6 |
| Inline | Cmd+Alt+N | Ctrl+Alt+N |
| Extract Method | Cmd+Alt+M | Ctrl+Alt+M |
| Extract Variable | Cmd+Alt+V | Ctrl+Alt+V |
| Extract Interface | Refactor menu | Refactor menu |
| Safe Delete | Alt+Delete | Alt+Delete |
| Refactor This | Ctrl+T | Ctrl+Alt+Shift+T |

## Rename Symbol

1. **Navigate to symbol**
   - Use Cmd/Ctrl+Click or Cmd/Ctrl+B to go to definition
   - Or use Navigate → Symbol (Cmd/Ctrl+Alt+O)

2. **Initiate rename**
   - Press **Shift+F6**
   - Or right-click → Refactor → Rename

3. **Enter new name**
   - Type the new name
   - IDE shows inline preview of changes

4. **Review and apply**
   - Press Enter to apply immediately
   - Or click "Preview" to see all changes first
   - Review changes in Refactoring Preview window
   - Click "Do Refactor"

### Options
- **Search in comments and strings:** Include non-code occurrences
- **Search for text occurrences:** Find in unstructured text

## Move Package/Directory

1. **Select in Project view**
   - Click on package/directory in Project tool window (Alt+1)

2. **Initiate move**
   - Press **F6**
   - Or right-click → Refactor → Move

3. **Choose destination**
   - Select target package/directory
   - Or type new path

4. **Review imports**
   - IDE shows import statements that will be updated
   - Review in Refactoring Preview

5. **Apply**
   - Click "Refactor" to apply all changes

### Tips
- Move multiple packages by selecting them (Ctrl/Cmd+Click)
- Use "Move inner class to upper level" for nested types

## Move File

1. **Select file(s)**
   - In Project view or Editor tab

2. **Initiate move**
   - Press **F6**
   - Or drag with Ctrl held down in Project view

3. **Choose destination**
   - Navigate to target directory

4. **Update references**
   - IDE automatically updates import statements

## Change Function Signature

1. **Place cursor on function**
   - In function definition or any call site

2. **Open dialog**
   - Press **Cmd/Ctrl+F6**
   - Or right-click → Refactor → Change Signature

3. **Modify signature**
   - Add parameters: Click "+" button
   - Remove parameters: Select and click "-"
   - Reorder: Drag parameters
   - Rename: Double-click parameter name
   - Change type: Double-click type

4. **Set default values**
   - For new parameters, specify default value
   - This updates all call sites

5. **Preview and apply**
   - Click "Preview" to review
   - "Refactor" to apply

### Go-specific
- Adding `context.Context`: Add as first parameter, default `context.TODO()`
- Adding `error` return: Modify return type, update all callers

## Extract Interface

1. **Position cursor**
   - On struct/class definition

2. **Open Extract dialog**
   - Refactor menu → Extract → Interface
   - Or Ctrl+T → Extract Interface

3. **Configure interface**
   - Name the interface
   - Select methods to include
   - Choose destination package

4. **Apply**
   - IDE creates interface and updates type references

## Inline

1. **Select symbol**
   - Variable, method, or constant

2. **Initiate inline**
   - Press **Cmd/Ctrl+Alt+N**
   - Or right-click → Refactor → Inline

3. **Choose scope**
   - Inline all occurrences
   - Inline this occurrence only
   - Inline and keep original

## Safe Delete

Use when removing unused code to ensure no references exist.

1. **Select symbol**
   - Class, method, function, variable

2. **Initiate delete**
   - Press **Alt+Delete**
   - Or right-click → Refactor → Safe Delete

3. **Review usages**
   - IDE shows any remaining usages
   - Fix or acknowledge before deletion

## Best Practices

1. **Save all files** before refactoring
2. **Commit first** for easy rollback
3. **Use Preview** for large refactorings
4. **Run tests** after refactoring
5. **Review git diff** to verify changes
