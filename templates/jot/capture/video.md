# Video Capture Template

## Instructions for Agent

Extract comprehensive information from YouTube videos or other video content using transcripts. **Target 80-130+ lines of rich content.**

**Prerequisite**: Requires `yt-dlp` for transcript extraction. Check with `which yt-dlp`.

### Output Format

```markdown
# [Video Title] - [Speaker Name] ([Year])

**Source:** [URL]
**Captured:** [Date]
**Creator:** [Channel/Speaker name]
**Duration:** [HH:MM:SS]
**Tags:** `[tag1]`, `[tag2]`

*[DISCOVERY CONTEXT FROM USER - Must ask before saving]*

## 📝 Summary

[2-3 sentences capturing what the video is about, the speaker's main thesis, and why it matters. Be specific about the approach or framework presented.]

## 💎 Key Insight

> **TL;DW:** [The single most important takeaway if you don't watch the full video - one powerful sentence that captures the core message]

## 🎯 Key Topics

- [Topic 1 - brief description]
- [Topic 2 - brief description]
- [Topic 3 - brief description]
- [Topic 4 - brief description]
- [Topic 5 - brief description]
- [Topic 6 - brief description]

## 💡 Main Points

### [Section 1: Core Concept/Framework]

- **[Key term/concept]**: [Definition or explanation]
- [Supporting point]
- [Supporting point]
- [Example or elaboration]

### [Section 2: The Problem/Challenge]

- [Point about why this matters]
- [What happens if you ignore this]
- [Common misconceptions]

### [Section 3: The Solution/Approach]

- [How to apply the concept]
- [What to do differently]
- [Trade-offs to consider]

### [Section 4: Practical Application] (if applicable)

| [Category A] | [Category B Alternative] |
|--------------|-------------------------|
| [Item 1]     | [Better alternative]    |
| [Item 2]     | [Better alternative]    |
| [Item 3]     | [Better alternative]    |

### [Section 5: Additional Insights]

- [Insight about application]
- [Common pitfall to avoid]
- [Meta-point about the topic]

## 💬 Notable Quotes

> "[Verbatim quote 1 - most memorable]"

> "[Verbatim quote 2 - captures key insight]"

> "[Verbatim quote 3 - provocative or thought-provoking]"

> "[Verbatim quote 4]"

> "[Verbatim quote 5]"

## ✅ Actionable Takeaways

- [Specific action 1 - what to do differently based on this video]
- [Specific action 2]
- [Specific action 3]
- [Specific action 4]
- [Specific action 5]

## 📚 Resources Mentioned

- [Book/Paper/Tool mentioned with context]
- [Person referenced]
- [Concept or framework referenced]

## ⏱️ Timestamps

- 00:00 - [Section/Topic]
- MM:SS - [Section/Topic]
- MM:SS - [Section/Topic]
- MM:SS - [Section/Topic]

## 🔗 Related Notes

[[related-note-1]]
[[related-note-2]]

## 📎 References

- [Video URL](url)
- [Speaker/Creator profile](url)
- [Related talk or resource](url)
```

### Content Requirements

**IMPORTANT: Generate rich, detailed content. Target 80-130+ lines.**

1. **Summary**: 2-3 complete sentences explaining thesis and significance
2. **Key Insight**: One powerful TL;DW sentence
3. **Key Topics**: 5-6 main topics covered
4. **Main Points**:
   - 4-5 subsections with descriptive headers
   - Include definitions of key terms
   - Use bullet points with explanations
   - Add comparison tables where relevant
5. **Notable Quotes**: 5+ verbatim quotes that capture key ideas
6. **Actionable Takeaways**: 5+ specific things to do or change
7. **Timestamps**: Key moments for reference

### Rules

- **REQUIRED: Ask for discovery context** - "How did you discover this video? What caught your attention?"
- **Write in first person** - personal notes (use "I think", "I found", "I connected")
- **Use emojis on headings** exactly as shown
- **1-2 thematic tags only** — domain/use-case categories that cluster related objects (e.g. `Dev Tools`, `Agentic AI`). Never use the object's own name as a tag. Reuse existing Capacities tags before creating new ones.
- **Preserve speaker's key phrases** - use their language in quotes
- **Note when transcription is unclear** with [unclear]
- **Attribute quotes** if multiple speakers
- **Include comparison tables** when the speaker compares approaches
- **Filename**: `slugified-title.md` (no date prefix)
- **Save to**: `notes/videos/`
- Output only markdown, no preamble
