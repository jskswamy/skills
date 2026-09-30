# Guardrails Plugin

Efficiency guardrails for Claude Code - starting with IDE refactoring handoff, extensible to other patterns like security, cost, and testing.

## Problem

AI text-based refactoring is slow and expensive compared to IDE semantic refactoring:

| Approach | Speed | Accuracy | Cost |
|----------|-------|----------|------|
| **IDE (semantic)** | Seconds | AST-based, atomic | Free |
| **AI (text-based)** | Minutes | Pattern matching, sequential | Tokens |

When Claude performs structural refactoring (renames, moves, signature changes), it edits files sequentially using text patterns. IDEs use Abstract Syntax Tree (AST) analysis to make atomic changes instantly.

## Solution

The guardrails plugin provides:

1. **Background Knowledge Skill** - Claude self-regulates based on understanding when IDE is more efficient
2. **Safety Net Hook** - Detects repeated refactoring patterns and suggests handoff
3. **`/handoff` Command** - Generates structured IDE instructions for both IntelliJ/GoLand and VSCode

## Installation

```bash
/plugin install github:jskswamy/skills/plugins/guardrails
```

Or test locally:

```bash
claude --plugin-dir ./plugins/guardrails
```

## Usage

### Automatic (Primary Mechanism)

Once installed, Claude has background knowledge about when to delegate to IDE. When planning structural changes, Claude will:

1. Recognize the operation type (rename, move, signature change, etc.)
2. Determine if IDE refactoring would be more efficient
3. Automatically generate a handoff document instead of proceeding with text edits

### `/handoff` Command

Explicitly request a handoff document:

```
/handoff
```

Or with a description:

```
/handoff Rename UserService to AccountService across the codebase
```

Options:
- `--track` - Create a beads issue to track the handoff

### Safety Net

If Claude starts making repeated similar edits (e.g., the same rename across multiple files), the safety net hook detects this pattern and suggests using `/handoff` instead.

## When IDE Handoff is Triggered

### IDE Territory (Will Generate Handoff)

- **Move packages/directories** with import path updates
- **Rename types/functions/variables** across multiple files
- **Change function signatures** with many call sites
- **Extract interfaces** from concrete types
- **Inline functions/variables** across files
- **Any coordinated change to 10+ files**

### AI Territory (Will Proceed Normally)

- **Generating new code** - Controllers, tests, CRDs, configurations
- **Writing documentation** - README, comments, API docs
- **Single-file changes** - Logic within one file
- **Logic modifications** - Algorithm updates, bug fixes
- **Creating boilerplate** - Scaffolding, templates

## Handoff Document Structure

When a handoff is generated, it includes:

```markdown
# IDE Refactoring Handoff

## Summary
[What needs to change]

## Why IDE Refactoring
[Technical explanation]

## Scope Analysis
- Files affected: N
- References found: N
- Operation type: rename/move/signature/etc.

## IntelliJ/GoLand Instructions
[Step-by-step with keyboard shortcuts]

## VSCode Instructions
[Step-by-step with keyboard shortcuts]

## Validation
[Test and build commands]

## What Happens Next
[What AI will continue after]
```

## IDE Quick Reference

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
| Go to Definition | F12 |
| Find All References | Shift+F12 |
| Quick Fix / Refactor | Cmd/Ctrl+. |

## Plugin Structure

```
plugins/guardrails/
├── .claude-plugin/
│   └── plugin.json           # Plugin metadata
├── hooks/
│   ├── hooks.json            # Safety net configuration
│   ├── ide-refactoring-detected.md  # Advisory prompt
│   └── scripts/
│       └── detect-refactoring-edit.sh  # Pattern detection
├── skills/
│   └── ide-handoff.md        # Background knowledge skill
├── commands/
│   └── handoff.md            # /handoff command
├── templates/
│   ├── handoff-document.md   # Template structure
│   ├── intellij-steps.md     # IntelliJ-specific steps
│   └── vscode-steps.md       # VSCode-specific steps
└── README.md
```

## Extensibility

The `guardrails` name is intentionally generic. Future guardrails can be added:

- `skills/security.md` - Security best practices and vulnerability prevention
- `skills/cost-awareness.md` - Token cost optimization strategies
- `skills/testing.md` - When to write tests vs generate them
- `hooks/scripts/detect-secrets.sh` - Prevent committing secrets

## How It Works

### Background Skill (Primary)

The `ide-handoff.md` skill is loaded when the plugin is installed. It provides Claude with:
- Decision criteria for IDE vs AI refactoring
- Self-check questions before multi-file edits
- Handoff document template

This is the **primary mechanism** - Claude reads the skill content and self-regulates.

### Safety Net Hook (Secondary)

The `detect-refactoring-edit.sh` script runs on every Edit tool call:
1. Extracts `old_string` and `new_string` from the edit
2. Identifies substitution patterns (renames, import changes)
3. Tracks patterns across edits in the session
4. After 3+ similar patterns, triggers advisory

This is a **safety net** for cases where Claude doesn't catch the pattern during planning.

## Technical Details

### Pattern Detection

The safety net detects:
- **Import path changes**: `"old/path"` → `"new/path"`
- **Identifier renames**: Consistent substitution of CamelCase or snake_case names
- **Repeated substitutions**: Same old→new pattern across files

### Why Not UserPromptSubmit?

The hook uses `PreToolUse` on Edit, not `UserPromptSubmit`, because refactoring often emerges as a **side effect**:

```
User: "Add infrastructure controller binary"
Claude: "I'll restructure cmd/ first..." ← Refactoring decision happens HERE
```

`UserPromptSubmit` only sees the user's input, not Claude's internal decision to restructure.

## Contributing

To add a new guardrail:

1. Create a skill file in `skills/`
2. Optionally add a detection script in `hooks/scripts/`
3. Update `hooks/hooks.json` if adding PreToolUse detection
4. Document in README

## License

MIT
