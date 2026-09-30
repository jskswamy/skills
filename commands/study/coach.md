---
name: coach
description: Start a coaching session on any topic, URL, or local file
argument-hint: "<topic|url|path> [--depth shallow|standard|deep] [--no-recall]"
---

# Coach Command

Start an adaptive coaching session on any topic, URL, or local file. After the session, automatically flows into a recall phase to test understanding - unless `--no-recall` is passed.

## Arguments

- `<topic|url|path>` - What to study (required)
  - Plain text → concept coaching, also searches content vaults
  - URL → fetches and coaches on the content
  - Local path → reads and coaches on the file
- `--depth shallow|standard|deep` - Recall depth after coaching (default: standard)
- `--no-recall` - End after coaching without entering recall phase

## Workflow

### Step 1: Parse Arguments

Extract:
- Input (everything before flags)
- `--depth` value (default: standard)
- `--no-recall` flag presence

### Step 2: Read Config

```bash
cat "${CLAUDE_CONFIG_DIR:-$HOME/.claude}/study.md" 2>/dev/null
```

Extract `notes_path` and `content_vaults`. If config missing, prompt user to run `/study:setup` first.

Expand `~` in paths:
```bash
NOTES_PATH=$(eval echo "<notes_path>")
```

### Step 3: Detect Input Type

Determine what the user passed:

- Starts with `http://` or `https://` → **URL**
- Starts with `/`, `~/`, `./` or matches an existing file path → **local file**
- Otherwise → **topic** (search vaults, then treat as concept)

### Step 4: Extract Content (URL or File Only)

For URL or local file, delegate to the `content-extractor` agent:

**Provide:**
- Input type (url or file)
- The URL or resolved file path
- Notes path (for temp storage if needed)

**Agent returns:** extracted title, summary, full content.

### Step 5: Search Vaults (Topic Only)

For plain topic input, search configured content vaults:

```bash
grep -ril "<topic>" <vault_1> <vault_2> 2>/dev/null | head -10
```

If matches found, list them and ask the user to pick one or proceed with concept-only coaching.

### Step 6: Run Coaching Session

Read `${CLAUDE_PLUGIN_ROOT}/agents/coach-agent.md` for the full session
logic. Run it directly in this conversation — do not spawn an agent.

Context to carry in:
- Topic name or title
- Extracted content (if any)
- Source (URL, file path, or "concept")
- Notes path: `NOTES_PATH`
- Template path: `${CLAUDE_PLUGIN_ROOT}/templates/study-note.md`

Complete all phases (gear selection → engage → session close → save note).
Use the Read and Write tools for template and file operations.

When the session closes, store:
- `NOTE_PATH` — path to the saved coaching note
- `SLUG` — topic slug used for the filename
- `GAPS` — final gap list

### Step 7: Flow into Recall (Unless --no-recall)

After coaching completes, unless `--no-recall` was passed:

Read `${CLAUDE_PLUGIN_ROOT}/agents/recall-agent.md` for the full session
logic. Run it directly in this conversation — do not spawn an agent.

Context to carry in:
- Topic slug: `SLUG`
- Coaching note path: `NOTE_PATH`
- Notes path: `NOTES_PATH`
- Depth: from `--depth` argument
- `from_coach: true` (skip prerequisite check)

### Step 8: Done

Report the path to the saved coaching note.
