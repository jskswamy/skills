---
name: recall
description: Run a Feynman recall session on a previously coached topic
argument-hint: "<topic|url> [--depth shallow|standard|deep]"
---

# Recall Command

Run a Feynman-style recall session on a topic you've previously coached or studied independently. Reads the existing coaching note to target known gaps, then appends a row to the Recall Log.

## Arguments

- `<topic|url>` - Topic name or original URL used during coaching (required)
- `--depth shallow|standard|deep` - How many Feynman iterations to run (default: standard)

## Workflow

### Step 1: Parse Arguments

Extract topic/url and depth (default: standard).

### Step 2: Read Config

```bash
cat "${CLAUDE_CONFIG_DIR:-$HOME/.claude}/study.md" 2>/dev/null
```

Extract `notes_path` and `content_vaults`. Expand `~`:
```bash
NOTES_PATH=$(eval echo "<notes_path>")
```

### Step 3: Find Coaching Note

Generate slug from input (lowercase, hyphens, strip special chars).

```bash
ls "${NOTES_PATH}/<slug>.md" 2>/dev/null
```

If not found, try fuzzy match:
```bash
ls "${NOTES_PATH}/" | grep -i "<keywords_from_topic>"
```

If still not found, search content vaults for a matching note:
```bash
grep -ril "<topic_keywords>" <vault_1> <vault_2> --include="*.md" 2>/dev/null | head -5
```
If vault matches found, show them and let the user pick one. Use the selected
file as the note path (treat as a vault note — recall agent handles it the
same way as a coaching note).

If nothing found anywhere:
- Inform user no note exists for this topic
- Ask: start a coaching session first with `/study:coach <topic>`, or run recall without prior note?
- If they choose to proceed without note: run recall as cold recall (no gap targeting)

### Step 4: Run Recall Session

Read `${CLAUDE_PLUGIN_ROOT}/agents/recall-agent.md` for the full session
logic. Run it directly in this conversation — do not spawn an agent.

Context to carry in:
- Topic name
- Coaching note path (or null for cold recall)
- Notes path: `NOTES_PATH`
- Depth: from `--depth` argument
- `from_coach: false`

### Step 5: Done

Report: "Recall log updated in `<note_path>`"
