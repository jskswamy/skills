---
name: jot-to-publish
description: This skill should be used when the user wants to publish or convert a jot capture into a formatted document. Handles reading jot notes and feeding them through the publish pipeline to generate PDF/HTML output.
---

# Jot to Publish Integration

## When This Activates

This skill activates when:
- User runs `/publish --source jot:<path>`
- User mentions wanting to "publish" or "format" a jot note
- User wants to convert captured notes into a shareable document

## Jot Note Structure

Jot captures are markdown files typically stored in the project's notes directory. They may contain:

```markdown
---
type: note|task|idea|blip
tags: [tag1, tag2]
created: 2024-01-15T10:30:00Z
---

# Title

Content with various markdown elements:
- Lists
- Code blocks
- Links
- Quotes
```

## Reading Jot Content

1. **Read jot config**: Use the Read tool to read `.claude/jot.local.md` directly (do NOT search/glob for it — it's always at this fixed path). Extract `workbench_path` from YAML frontmatter. If the file doesn't exist, default `workbench_path` to `~/workbench`.
2. **Resolve path**: The jot path is relative to `${workbench_path}/notes/`. Expand `~` to the user's home directory.
   - `jot:inbox/meeting.md` → `${workbench_path}/notes/inbox/meeting.md`
   - `jot:learned/react-hooks` → `${workbench_path}/notes/learned/react-hooks.md`
3. **Read file**: Use the Read tool to get the note content
4. **Parse frontmatter**: Extract metadata (type, tags, created date)
5. **Extract body**: Get the markdown body after frontmatter

## Template Selection Heuristics

Based on jot note characteristics, suggest a template:

| Note Pattern | Suggested Template |
|-------------|-------------------|
| Meeting notes with attendees/actions | `meeting` |
| Technical decisions, specs, code | `tech` |
| Learning notes, definitions, concepts | `study` |
| Quick reference, commands, syntax | `cheat` |
| Project descriptions, outcomes | `portfolio` |
| Summary with metrics, findings | `exec` |
| Creative brainstorm, visual concepts | `sketch` |

## Workflow

```
User: /publish --source jot:inbox/meeting-2024-01-15.md

1. Read `.claude/jot.local.md` → workbench_path: ~/workbench
2. Resolve path: ~/workbench/notes/inbox/meeting-2024-01-15.md
3. Read the jot file at resolved path
4. Parse frontmatter for metadata
5. Analyze content type and suggest template (if not specified)
6. Pass content to content-analyzer agent
7. content-analyzer structures it for the template
8. typst-generator produces the .typ file
9. Compile to PDF/HTML
10. Report output path
```

## Content Mapping

### From Jot Metadata

| Jot Field | Document Field |
|-----------|---------------|
| Title (# heading) | Document title |
| `created` date | Document date |
| `tags` | Can become badges/categories |
| `type: task` | Consider action-item formatting |
| `type: idea` | Consider sketch/brainstorm layout |

### From Jot Body

- **Headers** → Section headings in template
- **Lists** → Bullet points, action items, or objectives
- **Code blocks** → Code examples (technical-brief) or reference items (cheat-sheet)
- **Quotes** → Highlight boxes or annotations
- **Tables** → Spec tables, vocabulary, or data tables
- **Links** → References section

## Examples

### Meeting Note → Meeting Minutes

```
Jot content:
# Sprint Planning - Jan 15

Attendees: Alice (PM), Bob (Dev), Carol (QA)

## Agenda
1. Review last sprint
2. New priorities

## Discussion
- Shipped auth feature
- Bug in checkout needs fixing

## Decisions
- Prioritize checkout fix
- Delay dark mode to next sprint

## Action Items
- Bob: Fix checkout bug by Jan 18
- Carol: Write regression tests by Jan 19
```

Maps to meeting-minutes template with attendees, numbered agenda, decision boxes, and action items table.

### Technical Note → Technical Brief

```
Jot content:
# Caching Strategy

We need to add caching to reduce API latency.

## Options
- Redis: Fast, distributed, complex setup
- In-memory: Simple, not shared across instances
- CDN: Only for static content

## Decision
Redis for session data, in-memory for config.

## Implementation
```typescript
const cache = new Redis({ host: 'cache.internal' });
```

Latency targets: p50 < 10ms, p99 < 50ms
```

Maps to technical-brief template with overview, tradeoffs, code example, and spec table.

### Learning Note → Study Guide

```
Jot content:
# React Hooks

## Key Concepts
- useState: State management in functional components
- useEffect: Side effects and lifecycle
- useContext: Access context without prop drilling

## Rules
1. Only call at top level
2. Only call from React functions

## Examples
```jsx
const [count, setCount] = useState(0);
```
```

Maps to study-guide template with objectives, concepts, vocabulary, and code examples.

## Error Handling

- **File not found**: Report clearly with the attempted path
- **Empty file**: Warn and ask user for content to publish
- **No frontmatter**: Treat entire file as body content
- **Binary file**: Report that only markdown/text files are supported
