# Task Capture Template

## Instructions for Agent

Quickly capture a task. Minimal structure for fast capture - to be processed later in GTD inbox review.

### Output Format

```markdown
# [Task Title]

**Status:** To Process
**Saved:** [Date]
**Project:** [repo name] | **Branch:** [branch]

*[DISCOVERY CONTEXT FROM USER - Must ask before saving]*

## 📌 Additional Context

[If user provided additional context, include it here. Otherwise, omit this section entirely.]

## 📋 Task

[Task description - what needs to be done]

## 📝 Notes

[Any additional context or details]

## 🔗 URL Reference

[If task contains URL(s), include this section:]
- **URL:** [the URL]
- **Title:** [page title if fetched]

[If no URLs in task, omit this section entirely]

## 🔗 Related Notes

[[related-note-1]]
[[related-note-2]]

---
_Quick captured - process in GTD inbox review_
```

### Rules

- **Gather session context automatically** using Bash (git repo, branch) - do NOT ask the user
- **REQUIRED: Ask for context** - "What were you working on when this came up?"
- **OPTIONAL: Ask for additional context** - "Anything else you want to remember?" (if skipped, omit section)
- **Keep it brief** - minimize friction
- **Use emojis on headings** exactly as shown
- **URL References**: If content contains URLs, include the URL Reference section with minimal metadata. Do NOT trigger full content extraction.
- **Filename**: `YYYY-MM-DD-slugified-title.md`
- **Save to**: `notes/inbox/`
- Output only markdown, no preamble
- Task will be processed later during GTD inbox review
