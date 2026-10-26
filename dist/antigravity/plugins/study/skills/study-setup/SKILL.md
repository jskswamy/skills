---
name: study-setup
description: "Use when configuring the study plugin or it reports missing config: 'set up study', 'configure study notes folder', 'change study notes path', 'add a content vault'. Writes study.md with notes_path and content_vaults. Run before first study-coach or study-recall use."
---

# Study Setup Skill

Configure the study plugin by writing `${CLAUDE_CONFIG_DIR:-$HOME/.claude}/study.md`.

## Workflow

### Step 1: Check Existing Config

```bash
cat "${CLAUDE_CONFIG_DIR:-$HOME/.claude}/study.md" 2>/dev/null
```

If found, show current values and ask: update or keep?

### Step 2: Collect Settings

Ask the user for:

1. **Notes path** - where coaching notes and recall logs are saved
   - Default: `~/notes/study`

2. **Content vaults** - local directories to search when a plain topic is given
   - Optional: leave empty if you'll always supply a URL or paste content directly
   - Accepts multiple paths

### Step 3: Write Config

Expand `~` in all paths before writing.

Write to `${CLAUDE_CONFIG_DIR:-$HOME/.claude}/study.md`:

```yaml
---
notes_path: <expanded_notes_path>
content_vaults:
  - <vault_1>
  - <vault_2>
---
```

If no vaults provided, write an empty array:

```yaml
---
notes_path: <expanded_notes_path>
content_vaults: []
---
```

### Step 4: Create Notes Directory

```bash
mkdir -p <notes_path>
```

### Step 5: Confirm

Report:
```
Study plugin configured.
Notes path: <notes_path>
Content vaults: <list or "none configured">
```
