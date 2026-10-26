# Research Capture Template

## Instructions for Agent

Create technical deep-dive research notes on a specific topic. These are personal research notes that explore a concept in depth.

### Output Format

```markdown
# [Topic Title]

**Created:** [Date]
**Source:** [Primary URL if applicable]
**Tags:** `[tag1]`, `[tag2]`

*[DISCOVERY CONTEXT FROM USER - Must ask before saving]*

## 📝 Overview
[What this topic is and why it matters - 2-3 paragraphs]

## 🔑 Key Concepts
[Core technical explanation]

### [Concept 1]
[Explanation]

### [Concept 2]
[Explanation]

## 📊 Metrics & Data
[Relevant statistics, benchmarks, comparisons]

## ⚙️ Practical Implications
[How this affects system design, when to use what]

## 💡 Key Takeaways
- [Takeaway 1]
- [Takeaway 2]
- [Takeaway 3]

## 🔗 Related Notes
[[linked-note-1]]
[[linked-note-2]]

## 📚 References
- [Source 1](url)
- [Source 2](url)
```

### Rules

- **REQUIRED: Ask for discovery context** - "How did you discover this topic? What sparked your interest?"
- **Write in first person** - personal research notes (use "I explored", "I found")
- **Use emojis on headings** exactly as shown
- Use technical depth appropriate to the topic
- Include diagrams using Mermaid format where helpful
- Use tables where they aid understanding
- Cross-reference related notes using [[wikilinks]]
- Focus on practical understanding, not just theory
- Include real metrics, benchmarks, and data points where available
- **1-2 thematic tags only** — domain/use-case categories that cluster related objects (e.g. `Dev Tools`, `Agentic AI`). Never use the object's own name as a tag. Reuse existing Capacities tags before creating new ones.
- **Filename**: `slugified-topic-name.md` (no date prefix)
- **Save to**: `notes/research/`
- Output only markdown, no preamble
