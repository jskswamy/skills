# Book Capture Template

## Instructions for Agent

Capture information about a book for future reference or reading list. Extract comprehensive details and apply Zettelkasten-inspired reflection prompts. **Target 60-100+ lines of rich content.**

### Output Format

```markdown
# [Book Title]

**Source:** [URL - Goodreads, Amazon, etc.]
**Captured:** [Date]
**Author:** [Author name]
**Published:** [Year if known]
**Tags:** `[tag1]`, `[tag2]`

*[DISCOVERY CONTEXT FROM USER - Must ask before saving]*

## 📝 Summary

[What the book is about in 2-3 sentences - the main thesis, approach, and why it matters.]

## 💎 Key Insight

> **Why read it:** [The single most compelling reason to read this book - one powerful sentence]

## 📖 About

- **Genre/Category:** [e.g., Technical, Business, Self-help, Biography]
- **Pages:** [If known]
- **Reading Status:** [To Read / Reading / Completed]
- **Rating:** [Personal rating after reading, if applicable]

## 🎯 Key Topics

- [Topic 1 - brief description]
- [Topic 2 - brief description]
- [Topic 3 - brief description]
- [Topic 4 - brief description]
- [Topic 5 - brief description]

## ✍️ Summarize in 3 Sentences

> **Sentence 1 (What):** [What is this book about?]
>
> **Sentence 2 (How):** [How does the author make their point?]
>
> **Sentence 3 (So what):** [Why does it matter?]

## 💡 Key Takeaways

### [Main Concept 1]

- [Key point]
- [Supporting detail]
- [Example or application]

### [Main Concept 2]

- [Key point]
- [Supporting detail]
- [Example or application]

### [Main Concept 3]

- [Key point]
- [Supporting detail]

## 💬 Notable Quotes

> "[Quote 1 - most impactful]"

> "[Quote 2 - captures key idea]"

> "[Quote 3 - memorable insight]"

> "[Quote 4]"

## 🎯 Who Would I Recommend This To?

[Describe the ideal reader - what background, interests, or challenges would make this book valuable to them? Be specific about who would benefit most and who might not find it useful.]

## 🔄 How Did This Change Me?

[USER INPUT AFTER READING: Personal reflection on impact - What shifted in your thinking? What will you do differently? What new questions emerged?]

## ❓ Questions This Raised

- [Question 1 - something to explore further]
- [Question 2 - something the book didn't address]
- [Question 3 - connection to make with other ideas]

## 📚 Author's Other Works

- [Other notable book 1]
- [Other notable book 2]

## 🔗 Related Notes

[[related-note-1]]
[[related-note-2]]
[[related-note-3]]

## 📎 References

- [Goodreads page](url)
- [Author website](url)
- [Related review or interview](url)
```

### Content Requirements

**IMPORTANT: Generate rich, detailed content. Target 60-100+ lines.**

1. **Summary**: 2-3 complete sentences explaining thesis and significance
2. **Key Insight**: One compelling reason to read
3. **Key Topics**: 4-5 main topics covered
4. **3 Sentence Summary**: Force understanding - what, how, so what
5. **Key Takeaways**: 2-3 sections with bullet points (fill after reading)
6. **Notable Quotes**: 4+ quotes that capture key ideas
7. **Recommendation**: Specific description of ideal reader
8. **Questions Raised**: 3+ questions for future exploration

### Rules

- **REQUIRED: Ask for discovery context** - "How did you discover this book? What caught your attention?"
- **Write in first person** - personal notes (use "I think", "I found")
- **Use emojis on headings** exactly as shown
- **1-2 thematic tags only** — domain/use-case categories that cluster related objects (e.g. `Dev Tools`, `Agentic AI`). Never use the object's own name as a tag. Reuse existing Capacities tags before creating new ones.
- Note reading status
- "How Did This Change Me?" section filled after reading
- Key Takeaways can be expanded after reading
- **Filename**: `slugified-title.md` (no date prefix)
- **Save to**: `notes/books/`
- Output only markdown, no preamble
