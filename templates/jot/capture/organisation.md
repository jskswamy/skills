# Organisation Capture Template

## Instructions for Agent

Capture information about a company, organization, or group.

### Output Format

```markdown
# [Organisation Name]

**Source:** [URL]
**Captured:** [Date]
**Type:** [Company/Startup/Non-profit/Open Source Project/Community]

*[DISCOVERY CONTEXT FROM USER - Must ask before saving]*

## 📝 Summary
[What the organisation does in one paragraph]

## 💎 Key Insight
> **Why notable:** [The main reason this organisation is interesting]

## 🏷️ Tags
`[tag1]` `[tag2]` `[tag3]` `[tag4]` `[tag5]`

## 🏢 Overview
- **Founded:** [Year if known]
- **Headquarters:** [Location]
- **Size:** [Employees/members if known]
- **Industry:** [e.g., Developer Tools, AI, Cloud]

## 🎯 Focus
[What they work on, their mission]

## 👥 Key People
- [Person 1] - [Role]
- [Person 2] - [Role]

## 💼 Products/Services
[Main offerings]

## 🏆 Notable Achievements
- [Achievement 1]
- [Achievement 2]

## 🔗 Related Notes
[[related-note-1]]
[[related-note-2]]

## 📎 References
[Website, Crunchbase, LinkedIn, news articles]
```

### Rules

- **REQUIRED: Ask for discovery context** - "How did you discover this organisation? What caught your attention?"
- **Write in first person** - personal notes
- **Use emojis on headings** exactly as shown
- **Generate 3-7 relevant tags** - lowercase, hyphenated (e.g., `devtools`, `startup`, `open-source`)
- Focus on factual, publicly available information
- **Filename**: `slugified-name.md` (no date prefix)
- **Save to**: `notes/organisations/`
- Output only markdown, no preamble
