# Person Capture Template

## Instructions for Agent

Extract biographical information about a person into a structured profile with engagement prompts. **Target 60-100+ lines of rich content.**

### Output Format

```markdown
# [Person Name]

**Source:** [URL]
**Captured:** [Date]

*[DISCOVERY CONTEXT FROM USER - Must ask before saving]*

## 📝 Summary

[Who they are in 2-3 sentences - their role, what they're known for, and why they matter in their field.]

## 💎 Key Insight

> **Their life in one sentence:** [Capture the essence of who this person is and what they represent - one powerful sentence]

## 🏷️ Tags

`[tag1]` `[tag2]` `[tag3]` `[tag4]` `[tag5]` `[tag6]` `[tag7]`

## 👤 Bio Snapshot

- **Current Role:** [Title, Company/Organization]
- **Location:** [City, Country if known]
- **Known For:** [Main claim to fame - 1-2 items]
- **Active Years:** [Period of influence, if historical]

## 📖 Background

### Early Life & Education

[Education, early influences, formative experiences that shaped them]

### Career Path

[Key career milestones and transitions]

## 🏆 Achievements & Impact

- **[Achievement 1]** - [Context and significance]
- **[Achievement 2]** - [Context and significance]
- **[Achievement 3]** - [Context and significance]
- **[Achievement 4]** - [Context and significance]

## 💼 Notable Work

### [Category 1: e.g., Publications / Companies / Projects]

- [Work 1 with brief description]
- [Work 2 with brief description]

### [Category 2: e.g., Talks / Inventions / Contributions]

- [Work 1 with brief description]
- [Work 2 with brief description]

## 💭 Philosophy & Ideas

### Core Beliefs

- [Key belief or principle 1]
- [Key belief or principle 2]
- [Key belief or principle 3]

### Methodologies/Approaches

[Their distinctive approach or methodology, if applicable]

## 💬 Notable Quotes

> "[Quote 1 - most iconic or representative]"

> "[Quote 2 - captures their philosophy]"

> "[Quote 3 - insightful or provocative]"

> "[Quote 4]"

## ❓ Questions I'd Ask Them

- [Question 1 - about their expertise or experience]
- [Question 2 - about their decision-making or philosophy]
- [Question 3 - about advice or predictions]

## 🤝 Connections & Influences

### Influenced By

- [Mentor or influence 1]
- [Mentor or influence 2]

### Collaborators

- [Collaborator 1 - context]
- [Collaborator 2 - context]

### Organizations

- [Company/Organization 1 - role]
- [Company/Organization 2 - role]

## 📚 Resources

### Books/Publications By Them

- [Book/Publication 1]
- [Book/Publication 2]

### Recommended Talks/Interviews

- [Talk/Interview 1](url)
- [Talk/Interview 2](url)

## 🔗 Related Notes

[[related-note-1]]
[[related-note-2]]
[[related-note-3]]

## 📎 References

- [Wikipedia](url)
- [Personal website](url)
- [LinkedIn](url)
- [Notable interview or profile](url)
```

### Content Requirements

**IMPORTANT: Generate rich, detailed content. Target 60-100+ lines.**

1. **Summary**: 2-3 sentences explaining who they are and their significance
2. **Life in One Sentence**: Essence-capturing statement
3. **Bio Snapshot**: Quick reference facts
4. **Background**: Education and career path
5. **Achievements**: 4+ notable accomplishments with context
6. **Notable Work**: Organized by category
7. **Philosophy**: Core beliefs and approaches
8. **Notable Quotes**: 4+ quotes that capture their thinking
9. **Questions I'd Ask**: 3+ engagement prompts
10. **Connections**: Influences, collaborators, organizations

### Rules

- **REQUIRED: Ask for discovery context** - "How did you discover this person? What caught your attention?"
- **Write in first person** - personal notes (use "I think", "I found")
- **Use emojis on headings** exactly as shown
- **Generate 5-7 relevant tags** - lowercase, hyphenated (e.g., `ai-researcher`, `founder`, `systems-thinking`)
- Only include publicly available information
- Note achievements without excessive praise
- Respect privacy - no personal contact info
- **Filename**: `slugified-name.md` (no date prefix)
- **Save to**: `notes/people/`
- Output only markdown, no preamble
