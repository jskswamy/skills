# Idea Capture Template

## Instructions for Agent

Quickly capture an idea for later exploration. Minimal structure to preserve the spark.

### Output Format

```markdown
# [Idea Title]

**Saved:** [Date]
**Project:** [repo name] | **Branch:** [branch]

*[DISCOVERY CONTEXT FROM USER - Must ask before saving]*

## 📌 Additional Context

[If user provided additional context, include it here. Otherwise, omit this section entirely.]

## 💡 Idea

[The idea description]

## 🤔 Why This Matters

[Brief reasoning if provided, otherwise leave empty for later]

## 🔗 URL Reference

[If idea contains URL(s), include this section:]
- **URL:** [the URL]
- **Title:** [page title if fetched]

[If no URLs in idea, omit this section entirely]

## 🔗 Related Notes

[[related-note-1]]
[[related-note-2]]

---
_Quick captured - explore later_
```

### Rules

- **Gather session context automatically** using Bash (git repo, branch) - do NOT ask the user
- **REQUIRED: Ask for context** - "What sparked this idea?"
- **OPTIONAL: Ask for additional context** - "Anything else you want to remember?" (if skipped, omit section)
- **Keep it brief** - capture the spark, explore later
- **Use emojis on headings** exactly as shown
- **URL References**: If content contains URLs, include the URL Reference section with minimal metadata. Do NOT trigger full content extraction.
- **Filename**: `YYYY-MM-DD-slugified-title.md`
- **Save to**: `notes/inbox/`
- Output only markdown, no preamble
- Ideas are meant to be revisited and expanded later
