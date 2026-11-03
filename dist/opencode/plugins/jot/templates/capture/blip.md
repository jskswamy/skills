# Blip Capture Template (Tech Radar Style)

## Instructions for Agent

Capture a technology, tool, technique, platform, or language to the user's personal tech radar. This combines ThoughtWorks Radar-style tracking with rich technical documentation. **Target 80-120+ lines of content.**

**IMPORTANT**: User input is required for Summary and Ring Rationale sections. Ask the user and use their exact words.

### Output Format

```markdown
# [Name]

**Ring:** [Adopt | Trial | Assess | Hold]
**Quadrant:** [Tools | Techniques | Platforms | Languages & Frameworks]
**Source:** [URL if applicable]
**Captured:** [Date]
**Last Updated:** [Date]
**Tags:** `[tag1]`, `[tag2]`

*[DISCOVERY CONTEXT FROM USER - Must ask before saving]*

## 📝 Summary

[USER INPUT: What it is and why it's on your personal radar - 1-2 paragraphs. This should be the user's own words about their experience/interest.]

## 🎯 Ring Rationale

> **Why this ring:** [USER INPUT: Your reasoning for placing it at this assessment level. Be specific about your experience or evaluation.]

## ✨ Key Features

- **[Feature 1 name]** - [Detailed description of capability and benefit]
- **[Feature 2 name]** - [Detailed description]
- **[Feature 3 name]** - [Detailed description]
- **[Feature 4 name]** - [Detailed description]
- **[Feature 5 name]** - [Detailed description]
- **[Feature 6 name]** - [Detailed description]

## 🚀 Getting Started

```bash
# Installation (primary method)
[command]

# Alternative installation
[command]
```

## 💻 Usage Examples

```bash
# Basic usage
[command example]

# Common use case
[command with explanation]

# Advanced usage
[command with explanation]
```

## ⚖️ Strengths & Considerations

**Strengths:**
- [Specific strength 1]
- [Specific strength 2]
- [Specific strength 3]
- [Specific strength 4]

**Considerations:**
- [Trade-off or limitation 1]
- [Trade-off or limitation 2]
- [Trade-off or limitation 3]

## 🔄 Alternatives & Comparisons

- **[Alternative 1]** - [How it compares, key differentiator]
- **[Alternative 2]** - [How it compares, key differentiator]
- **[Alternative 3]** - [How it compares, key differentiator]

## 📊 Movement History

- [Date]: **[Ring]** - [Reason for placement or movement]

## 🔗 Related Notes

[[related-blip-1]]
[[related-blip-2]]

## 📎 References

- [Official Repository/Website](url)
- [Documentation](url)
- [Tutorial/Getting Started Guide](url)
```

### Ring Definitions

- **Adopt**: Actively using in production, confident recommendation for new projects
- **Trial**: Testing in real scenarios, building hands-on experience, promising results
- **Assess**: Worth exploring, researching, learning about - on the radar but not yet tried
- **Hold**: Not recommended, proceed with caution, deprecating, or "wait and see"

### Quadrant Definitions

- **Tools**: Development tools, utilities, applications (Docker, VS Code, Terraform, typos)
- **Techniques**: Methodologies, practices, architectural patterns (TDD, Event Sourcing, GitOps)
- **Platforms**: Infrastructure, runtime, hosting environments (Kubernetes, AWS, Vercel)
- **Languages & Frameworks**: Programming languages, libraries, SDKs (Rust, React, FastAPI)

### Content Requirements

**IMPORTANT: Generate rich, detailed content. Target 80-120+ lines.**

When capturing from a URL (especially GitHub):
1. **Fetch comprehensive data** - README content, features, installation, usage examples
2. **Key Features**: 6+ features with **bold names** and detailed descriptions
3. **Getting Started**: Include actual installation commands
4. **Usage Examples**: 3+ real command examples from documentation
5. **Strengths & Considerations**: 4 strengths, 3 considerations - be specific
6. **Alternatives**: 3+ competing tools with comparison notes
7. **Tags**: 1-2 thematic/domain tags only (e.g. `Dev Tools`, `Technology`). Do NOT generate descriptive tags that mirror the object name or features.

### Data to Extract from GitHub

- Repository description and full README content
- Stars, language, license
- Installation instructions
- Key features and capabilities
- Usage examples and commands
- Any benchmarks or metrics mentioned
- Similar/alternative tools if mentioned

### Rules

- **REQUIRED: Ask for discovery context** - "How did you discover this? What's the context?"
- **REQUIRED: Ask for summary** - "What is this and why is it on your radar?"
- **REQUIRED: Ask for ring rationale** - "Why are you placing it at this ring level (Adopt/Trial/Assess/Hold)?"
- **Use user's exact words** for Summary and Ring Rationale sections
- **Use emojis on headings** exactly as shown
- **1-2 thematic tags only** — domain/use-case categories that cluster related objects (e.g. `Dev Tools`, `Agentic AI`). Never use the object's own name as a tag. Reuse existing Capacities tags before creating new ones.
- **Be specific** - include actual commands, features, and metrics
- **Filename**: `slugified-name.md` (no date prefix)
- **Save to**: `notes/blips/`
- Output only markdown, no preamble
