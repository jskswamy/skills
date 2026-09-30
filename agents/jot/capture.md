## CRITICAL — CLI ONLY

Do NOT use `mcp__capacities__*` tools at any point in this workflow.
Use `$CAP` (the `cap` CLI) for ALL Capacities operations:
`cap types`, `cap validate`, `cap create`, `cap search`, `cap link`, `cap get`.

MCP tools bypass schema validation — they produce blank titles, duplicate
tags, rejected types, and wiped fields. The CLI is the only safe path.
This applies to every phase, every sub-step, the review loop, and save.

---

This spec is run inline by the capture command. All config variables
(CURRENT_DATE, BACKEND, WORKBENCH_PATH, CAP, AGENTS_DIR, routing[],
REVIEW) are pre-resolved. Run each phase in order. Do not skip phases
or jump ahead.

---

## PHASE 1: CLASSIFY

### 1a — Config (pre-loaded)

All variables were resolved by the capture command before this spec was
invoked. Do not re-fetch config or re-run `date`.

Available: `CURRENT_DATE`, `BACKEND`, `WORKBENCH_PATH`, `CAP`,
`AGENTS_DIR`, `routing[]`, `REVIEW`, `raw_args`, `CONTENT`.

If `CONTENT` is non-empty: the user passed a URL or file — treat as
Mode A with pre-extracted content; skip Phase 2 URL fetching.
If `CONTENT` is empty: detect Mode A or B in step 1b as normal.

### 1b — Detect Mode

**Mode A — post-conversation:** The conversation contains substantive prior
content (user was researching something, discussing a tool, talking about a
meeting, sharing a URL, etc.).

Scan for: URLs, type-signal words (tool, library, book, meeting, idea, task,
article, video, research), named entities (people, products, projects), the
dominant topic of the most recent exchange.

Propose: *"Capturing [detected topic] as [Label] — right?"*

Store as `MODE = "A"`.

A positive response from the user here counts as the Phase 1d confirmation — skip 1d.

**Mode B — fresh session:** No substantive prior conversation — only the
`/jot:capture` invocation itself (possibly with an explicit argument).

Store as `MODE = "B"`.

If `routing` has entries, use `AskUserQuestion`:
```
question: "What are you capturing?"
options: [one option per routing[].label] + ["Something new"]
```

If `routing` is empty, ask free text:
```
question: "What are you capturing? (e.g. meeting, book, tool, idea, task)"
options: ["Describe what you want to capture"]
```
Treat the user's free-text response as the type label going into 1c.

### 1c — Match Type

For each entry in `routing`, check (case-insensitive):
1. Does any string in `routing[].triggers` appear in the input or confirmed label?
2. Does any URL in the input match `routing[].url_patterns`?

Prefer the entry whose matching trigger string is longest.

If matched: set `TYPE_ID`, `TYPE_LABEL`, `CAPACITIES_TYPE` from the entry.

If `BACKEND == "capacities"`: resolve STRUCTURE_ID by running:
```bash
$CAP types --name "$CAPACITIES_TYPE" 2>/dev/null | jq -r '.structureId' | head -1
```
Store the result as `STRUCTURE_ID`.

If `BACKEND == "workbench"`: skip the `cap types` lookup. Set `STRUCTURE_ID = ""`.

If no match: run First-Encounter Setup (1e) before continuing.

### 1d — Confirm

Skip this step if Mode A already received confirmation in 1b.

> *"Capturing as [TYPE_LABEL] — right?"*

Single-word yes / yeah / y → proceed to Phase 2.
Any other response → re-run 1b treating the response as new input.

### 1e — First-Encounter Setup (only when no routing entry matched)

Announce: *"I haven't set up [Label] yet — configuring quickly, then we'll capture."*

**If `BACKEND == "workbench"`:** Skip Steps 1–3 (no Capacities type mapping needed).
Generate the type agent file (Step 4) with a generic schema — use `title`,
`description`, and `tags` as the only fields. Then jump to Step 5 (append routing)
and Step 6 (announce and continue). Steps 1–3 below apply only when
`BACKEND == "capacities"`.

**Step 1: List types**
```bash
$CAP types --json 2>&1
```
Parse the JSON array. Each entry has `name` and `structureId`.

**Step 2: Match or ask**

If the user's label matches a type name exactly (case-insensitive):
```
AskUserQuestion:
  question: "Map '[Label]' to the '[TypeName]' Capacities type — right?"
  options:
    - "Yes — use [TypeName]"
    - "No — let me pick from the list"
```

If no exact match, or user picks "No — let me pick":
```
AskUserQuestion:
  question: "Which Capacities type should I use for '[Label]'?"
  options: [one option per type name from cap types output]
```

Store selected type name as `CAPACITIES_TYPE`. Store its `structureId` as `STRUCTURE_ID`.

**Step 3: Fetch fields**
```bash
$CAP types "$CAPACITIES_TYPE" --json 2>&1
```
Parse `fields` array. Extract fields where type is NOT `entity` or `icon`.
Build a minimal schema map: `{ fieldName → { type, validValues } }`.
Always include `title` (text, required) and `description` (text, optional).

**Step 4: Derive TYPE_ID**

Lowercase the label, replace spaces with hyphens, strip special characters.
Examples: "Meeting" → `meeting`, "Tech Eval" → `tech-eval`

**Step 5: Generate type agent file**
```bash
mkdir -p "$AGENTS_DIR"
```

Write `${AGENTS_DIR}/${TYPE_ID}.md` with this structure (fill in actual values):

```
---
name: [TYPE_ID]
label: [LABEL]
capacities-type: [CAPACITIES_TYPE]
structure-id: [STRUCTURE_ID]
triggers: [TYPE_ID, LABEL lowercase]
url-patterns: []
generated: [CURRENT_DATE]
---

## CRITICAL — CLI ONLY
Do NOT use mcp__capacities__* tools. Use $CAP for all Capacities operations.

## Schema
| Field | Type | Notes |
|-------|------|-------|
| title | text | required |
| description | text | optional |
[one row per field from the fields array — skip entity and icon fields]

## Capture Flow
- title: infer from content or ask "What's the title for this [Label]?"
- description: write a 1-2 sentence summary from context
- date: use CURRENT_DATE — do not ask
- tags: generate 1-3 thematic Title Case tags from content
[one instruction per schema field]

## Output Template
---
title: [title]
description: [description]
date: [capture date — filled at capture time]
tags: [Tag One, Tag Two]
[other fields]
---

[body content goes here]
```

**Step 6: Append routing entry**

Read `${CLAUDE_CONFIG_DIR:-$HOME/.claude}/jot.md`. In the `routing` array, append:
```yaml
- id: [TYPE_ID]
  label: [LABEL]
  capacities-type: [CAPACITIES_TYPE]
  triggers: [[TYPE_ID], [LABEL lowercase]]
  url_patterns: []
```
Write updated config back to `jot.md`.

**Step 7: Continue**

Announce: *"All set — capturing [Label] now."*
Set `TYPE_ID`, `TYPE_LABEL`, `CAPACITIES_TYPE`, `STRUCTURE_ID`. Continue to Phase 2.

---

## PHASE 2: EXTRACT

Gather raw content that becomes the note body. Store result as `CONTENT`
with keys: `title`, `description`, `body`, `raw_source`.

### 2a — URL Detection

Scan the user's input and confirmed type for URLs matching `https?://[^\s]+`.
If a URL is found, extract it as `SOURCE_URL` and proceed to 2b.
If no URL, proceed to 2c.

### 2b — URL Content Extraction

**YouTube** (host contains `youtube.com` or `youtu.be`):
```bash
mkdir -p /tmp/jot-capture
yt-dlp --print title --print description --skip-download "$SOURCE_URL" 2>/dev/null
yt-dlp --write-auto-sub --sub-lang en --skip-download --sub-format vtt \
  -o "/tmp/jot-capture/video" "$SOURCE_URL" 2>/dev/null
VTT=$(ls /tmp/jot-capture/*.vtt 2>/dev/null | head -1)
[ -n "$VTT" ] && grep -v "^WEBVTT" "$VTT" | grep -v "^[0-9]" | \
  grep -v "^$" | sed 's/<[^>]*>//g' | sort -u
```
Set `CONTENT.title` from video title, `CONTENT.body` from cleaned transcript,
`CONTENT.raw_source` = `SOURCE_URL`.

**Other URL** (article, GitHub repo, docs, etc.):
Use WebFetch on `SOURCE_URL` with prompt:
"Extract the full title, author, publication date, summary, and complete
main content of this page. Preserve headings and structure."

Set `CONTENT.title` from page title, `CONTENT.description` from summary,
`CONTENT.body` from full content, `CONTENT.raw_source` = `SOURCE_URL`.

After extracting URL content, skip to Phase 3.

### 2c — No URL: Determine Source

**Mode A (post-conversation):**
Summarise the most relevant parts of the prior conversation into structured
content. Focus on: what was discussed, key facts, decisions, and conclusions.
Do not ask the user — extract silently from conversation context.

Set `CONTENT.title` from the main topic name,
`CONTENT.description` from a 1-2 sentence summary,
`CONTENT.body` from the structured conversation summary,
`CONTENT.raw_source` = `"conversation"`.

**Mode B (fresh session, no URL):**
Read `${AGENTS_DIR}/${TYPE_ID}.md`. Follow its **Capture Flow** section to
ask questions and gather content. Use the field instructions there to know
what to ask and what to infer.

If the type agent file doesn't exist yet (first-encounter just completed
and generated it), the file is at `${AGENTS_DIR}/${TYPE_ID}.md` — read it.

Set `CONTENT` from user responses. `CONTENT.raw_source` = `"guided"`.

---

## PHASE 3: STUDY

**Auto-skip:** Before showing the gear check, assess whether the content has
study value. Skip Phase 3 entirely when EITHER:

- `CONTENT.body` word count is under 50 words, OR
- The content is primarily reference or factual material with no conceptual
  depth to reason through: feature lists, installation guides, command/API
  references, event metadata, location records, changelog entries, or
  documentation that describes *what* without explaining *why*.

Show the gear check when content has genuine conceptual depth: arguments or
claims, design decisions with rationale, tradeoffs or failure analysis,
security/architecture concepts, ideas that deepen through discussion.

**When ambiguous: default to showing the gear check.** A false positive
costs one click; a false negative silently kills a valuable session.

When skipping on content grounds, briefly announce it so the user can
push back:
> *"Content is primarily [reference / factual] — skipping study session.
> Say 'let's discuss this' to engage anyway."*

Set `STUDY_NOTES = { save_mode: "none", user_takeaway: "" }`.
Proceed directly to Phase 4.

### 3a — Gear Check

```
AskUserQuestion:
  question: "How do you want to engage with this content?"
  options:
    - "Study — we discuss it together (Socratic)"
    - "Explain — break it down for me directly"
    - "Guide — walk me through it step by step"
    - "Skip — straight to draft"
```

Store gear as `GEAR`. On "Skip": set `STUDY_NOTES = { save_mode: "none", user_takeaway: "" }`.
Proceed to Phase 4.

### 3b — Study Session

Run the session in the chosen gear using `CONTENT` as the material.
Track throughout: concepts that surface, the user's insights, any gaps.

**Study gear:** Discuss as a peer. Ask questions that draw out the user's
thinking. Probe reasoning. Teach only when they are genuinely stuck.

**Explain gear:** Teach the content concisely and directly. Use analogies.
No Socratic back-and-forth unless the user asks.

**Guide gear:** Walk through the content decision-by-decision, step-by-step.
Pause at each step and wait for the user to follow.

Continue until the user signals done: "ok", "let's draft", "enough",
"good", "move on", or any completion signal. No artificial cap on length.

Track:
- `CONCEPTS_COVERED`: key terms and ideas that came up
- `USER_INSIGHTS`: things the user said that show their understanding
- `GAPS`: areas where the user hesitated, gave incomplete answers, or
  got something wrong

### 3c — Session Close

Give a brief summary:
> "**Covered:** [concepts]  
> **Your take:** [distilled from USER_INSIGHTS]  
> **To explore further:** [GAPS if any]"

Ask where to save the study notes:
```
AskUserQuestion:
  question: "Where should I save the study notes?"
  options:
    - "Inline in the draft — embed as sections in the capture note"
    - "Separate note — saved as its own file, linked to the capture"
    - "Don't save — keep the takeaway only"
```

Store `SAVE_MODE`: `"inline"` | `"separate"` | `"none"`.

**If "separate":**

Derive slug from `CONTENT.title`: lowercase, hyphens for spaces.

Write study draft:
```bash
mkdir -p "${CLAUDE_CONFIG_DIR:-$HOME/.claude}/jot/study"
```

Write `${CLAUDE_CONFIG_DIR:-$HOME/.claude}/jot/study/<slug>.md`:

```markdown
---
title: Study: [CONTENT.title]
description: Study session notes for [CONTENT.title]
date: [CURRENT_DATE]
tags: Study, [one thematic tag]
---

## Summary
[what was covered in the session]

## Key Concepts
[CONCEPTS_COVERED as a bullet list with brief definitions]

## My Take
[USER_INSIGHTS — user's own words]

## Gaps / To Explore
[GAPS as a bullet list]

## Source
[CONTENT.raw_source]
```

Store path as `STUDY_DRAFT_PATH`.

**Store STUDY_NOTES:**
```
STUDY_NOTES = {
  key_concepts: [CONCEPTS_COVERED],
  user_takeaway: [distilled USER_INSIGHTS, 1-2 sentences],
  gaps: [GAPS],
  save_mode: SAVE_MODE,
  study_draft_path: STUDY_DRAFT_PATH  // only if save_mode == "separate"
}
```

Proceed to Phase 4.

---

## PHASE 4: DRAFT

Assemble the note from `CONTENT` + `STUDY_NOTES`. Write to disk.

### 4a — Load Template / Type Agent

**Capacities backend:**
Read `${AGENTS_DIR}/${TYPE_ID}.md`. Follow its **Output Template** and
**Capture Flow** sections to determine the frontmatter fields and body
structure. Use `CONTENT` values to fill in the fields as specified.

If the type agent was just generated in Phase 1 first-encounter setup,
the file exists at `${AGENTS_DIR}/${TYPE_ID}.md` — read it.

**Workbench backend:**
Match `TYPE_LABEL` (case-insensitive) to a template:

| Type label contains | Template |
|---------------------|----------|
| meeting, session, call, sync, catch-up, event | `session.md` |
| article, post, blog, essay | `article.md` |
| book, reading | `book.md` |
| person, contact, personality | `person.md` |
| tool, technology, framework, library, blip, radar | `blip.md` |
| organisation, company, org, startup | `organisation.md` |
| video, youtube, talk, lecture | `video.md` |
| research, paper, study, arxiv | `research.md` |
| idea, thought, concept | `idea.md` |
| task, todo, action | `task.md` |
| (no match) | `note.md` |

Read template from `${CLAUDE_PLUGIN_ROOT}/templates/capture/<matched>.md`.
Follow the template instructions to generate content.

### 4b — Assemble Note

Build frontmatter + body from `CONTENT`. Use `CURRENT_DATE` for all date
fields. Generate 1-3 thematic Title Case tags from content.

### 4c — Inject Study Notes

Append study sections to the body based on `STUDY_NOTES.save_mode`:

**inline:**
```markdown
## My Understanding
[STUDY_NOTES.user_takeaway]

## Key Concepts
[STUDY_NOTES.key_concepts as bullet list]

## What to Explore Further
[STUDY_NOTES.gaps as bullet list — omit section if gaps is empty]
```

**separate:**
```markdown
## Study Notes
*Full session: Study — [CONTENT.title] (to be linked after save)*
```

**none:**
```markdown
## My Take
[STUDY_NOTES.user_takeaway — omit entire section if user_takeaway is empty]
```

### 4d — Write Draft File

Derive slug from `CONTENT.title`: lowercase, hyphens, strip special chars.
Example: "Atomic Habits" → `atomic-habits`
Store as `SLUG`.

```bash
mkdir -p "${CLAUDE_CONFIG_DIR:-$HOME/.claude}/jot/drafts"
```

Write assembled note (full frontmatter + body) to:
`${CLAUDE_CONFIG_DIR:-$HOME/.claude}/jot/drafts/${CURRENT_DATE}-${SLUG}.md`

Store this path as `DRAFT_PATH`.

---

## PHASE 5: REVIEW

### 5a — Gate Check

Use `REVIEW` (pre-resolved by the capture command, default `both`).

| review value | workbench path | capacities path |
|---|---|---|
| `both` or absent | fire | fire |
| `workbench` | fire | skip |
| `capacities` | skip | fire |
| `off` | skip | skip |

If skip for the current `BACKEND`: proceed directly to Phase 6.

### 5b — Display Draft

Read `DRAFT_PATH`. Display the full file content as a fenced code block:

````
```markdown
[full frontmatter + body from DRAFT_PATH]
```
````

### 5c — Review Loop

```
AskUserQuestion:
  question: "Review your capture — ready to save?"
  options:
    - "Save it"
    - "Edit something"
    - "Cancel"
```

**"Save it":** Proceed to Phase 6.

**"Cancel":**
```bash
rm "$DRAFT_PATH"
```
Output: *"Capture discarded."* Stop — do not proceed to Phase 6.

**"Edit something":**
```
AskUserQuestion:
  question: "What would you like to change?"
  (free text — no fixed commands)
```

Interpret the response and apply the edit to the draft in memory:
- Title change → update `title:` in frontmatter
- Field update → update that field's value in frontmatter
- Body section rewrite → replace the relevant section in body
- Tag edit → update `tags:` in frontmatter
- Addition → append new section to body

Do NOT call `cap validate` or spawn sub-agents during the edit loop.

Write the updated content back to `DRAFT_PATH`.

Return to 5b and re-display. Loop until "Save it" or "Cancel".

---

## PHASE 6: SAVE

Read `DRAFT_PATH`. Save to the appropriate backend. Delete draft after save.

---

### Workbench Path

**If `STUDY_NOTES.save_mode == "separate"`:**
Move `STUDY_NOTES.study_draft_path` to
`${WORKBENCH_PATH}/notes/study/<slug>.md`:
```bash
mkdir -p "${WORKBENCH_PATH}/notes/study"
mv "$STUDY_DRAFT_PATH" "${WORKBENCH_PATH}/notes/study/${SLUG}.md"
```
Update the draft file: replace the placeholder *"to be linked after save"*
with the actual workbench path.

**Main capture note — determine folder:**

| TYPE_LABEL contains | Folder |
|---------------------|--------|
| task, todo, idea, note | `inbox/` |
| session, meeting | `sessions/` |
| blip, tool, technology | `blips/` |
| (any other) | `notes/[TYPE_ID]/` |

Move draft to destination:
```bash
mkdir -p "${WORKBENCH_PATH}/notes/<folder>"
mv "$DRAFT_PATH" "${WORKBENCH_PATH}/notes/<folder>/${CURRENT_DATE}-${SLUG}.md"
```
For the "any other" case, `<folder>` is `${TYPE_ID}`. Full path:
`${WORKBENCH_PATH}/notes/${TYPE_ID}/${CURRENT_DATE}-${SLUG}.md`

Confirm: *"Captured [TYPE_LABEL] to [full path]."*

---

### Capacities Path

Use `$CAP` set in Phase 1. (No re-detection needed here.)

**Step 1: Entity scan**

Scan `CONTENT.title` and the body text from `DRAFT_PATH` for person names
and organisation names. Conversational signals: "spoke with [Name]",
"from [Name]", "[Name] said", "at [Org]".

For each candidate:
```bash
$CAP search "<name>" --json 2>&1
```
Record matches whose `structureId` starts with `RootPersonality`,
`UserPersonality`, or an Organisation type. Ask to disambiguate only on
very close matches (two results with nearly identical names).

Store as `ENTITY_LINKS`: list of `{ mention, id, propertyKey }`.
Property keys: `people` for Person/Personality, `organizations` for Org,
`related` for other types.

**Step 2: Validate**
```bash
cat "$DRAFT_PATH" | $CAP validate --type "$CAPACITIES_TYPE" --json 2>&1
```

Parse response:
- `valid: true` → use `corrected` frontmatter if provided, proceed to Step 3
- `valid: false` → read `errors[]`. For each error, ask the user for the
  missing value. Update `DRAFT_PATH` with the answer. Re-run validation
  until `valid: true`. Warnings are informational — do not block on them.

**Step 3: Create**

Use `$STRUCTURE_ID` already set in Phase 1. No re-resolution needed.
```bash
cat "$DRAFT_PATH" | $CAP create -t "$STRUCTURE_ID" --markdown - 2>&1
```
Capture stdout as `OBJECT_ID`.

**Step 4: Entity links**
```bash
# For each entity in ENTITY_LINKS:
$CAP link "$OBJECT_ID" "<propertyKey>" "<targetId>" 2>&1
```

**Step 5: Study object (only if `STUDY_NOTES.save_mode == "separate"`)**

Determine the study note Capacities type: run `cap types --json` and find
the first type whose name contains "Page", "Note", or "Document"
(case-insensitive). If none found, ask once:
```
AskUserQuestion:
  question: "Which Capacities type should I use for study notes?"
  options: [all type names from cap types output]
```
Store the chosen type. Append to `jot.md` under key `study_note_type` so
it is not asked again.

```bash
STUDY_STRUCTURE_ID=$($CAP types --name "<study_type>")
cat "$STUDY_DRAFT_PATH" | $CAP create -t "$STUDY_STRUCTURE_ID" --markdown - 2>&1
```
Capture stdout as `STUDY_OBJECT_ID`.

```bash
$CAP link "$OBJECT_ID" related "$STUDY_OBJECT_ID" 2>&1
```

Delete `STUDY_DRAFT_PATH`:
```bash
rm "$STUDY_DRAFT_PATH"
```

Update the main object's "Study Notes" section with the actual linked
object title (use `cap get $STUDY_OBJECT_ID` to fetch the title if needed).

**Step 6: Cleanup**
```bash
rm "$DRAFT_PATH"
```

**Step 7: Confirm**
> *"Captured [TYPE_LABEL] to Capacities."*
> *(if study object created): "Study notes saved and linked."*
