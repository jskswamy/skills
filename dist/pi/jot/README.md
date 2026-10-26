# Jot

Quick, low-friction capture of notes, tasks, ideas, tech radar blips, and Feynman-style learning teaching with Obsidian-style auto-linking.

## Why Jot?

Capture thoughts, tasks, and discoveries without switching context. Jot provides `/capture` for quick knowledge capture and `/teach` for deepening understanding using the Feynman Technique, automatically linking new notes to related content in your knowledge base.

## Features

- **Quick captures**: Task, note, idea, session, blip - minimal friction
- **Full captures**: Article, video, blip (GitHub/tools), person, book, organisation, trove, research - URL-based extraction
- **Feynman teaching**: Interactive `/teach` command for deepening understanding of papers, videos, articles, and concepts you've already studied
- **Teaching notes**: Capture your learning journey with analogies, misconceptions, and applied scenarios
- **Session summaries**: Capture Claude Code session outcomes with guided questions
- **URL references**: Quick captures can reference URLs without triggering full extraction
- **Type aliases**: `todo` for task, `thought` for note, `conversation` for session
- **Context capture**: Every capture asks for discovery context
- **Tech radar**: ThoughtWorks-style blips with quadrants (Tools, Techniques, Platforms, Languages & Frameworks) and rings (Adopt, Trial, Assess, Hold)
- **Rich content**: Blips include features, installation, usage examples, pros/cons, and alternatives
- **Auto-linking**: Obsidian-style wikilinks to related notes
- **Central storage**: All captures go to your configured workbench path

## Installation

```bash
claude --plugin-dir ./dist/claude-code/jot
```

Or add to your Claude Code plugins.

## Configuration

Create `.claude/jot.local.md` in your project or home directory:

```yaml
---
workbench_path: ~/workbench
---
```

**Settings:**
- `workbench_path`: Where to store captured notes (default: `~/workbench`)

## Usage

### Quick Captures (text-based)

```
/capture task Buy groceries
/capture note Meeting notes about project X
/capture idea What if we tried approach Y
/capture blip Docker --ring adopt --quadrant platforms
```

### Session Captures

```
/capture session                    # Guided questions about this Claude session
/capture conversation               # Alias for session
```

### Using Aliases

```
/capture todo Review Alice's PR     # Same as: /capture task
/capture thought API seems slow     # Same as: /capture note
```

### Quick Captures with URL References

```
/capture todo use https://git-cliff.org/ to generate changelog
```

This keeps it as a quick task (not full article extraction) with the URL as a reference.

### Full Captures (URL-based)

```
/capture https://github.com/some/repo          # Auto-detects as blip
/capture blip https://github.com/astral-sh/uv --ring trial --quadrant tools
/capture article https://blog.com/post
/capture video https://youtube.com/watch?v=xxx
/capture person https://wikipedia.org/wiki/Person
/capture book https://goodreads.com/book/show/123
```

### Blip Options

Blips are for tracking technologies on your personal tech radar. All tools, frameworks, libraries, and platforms are captured as blips.

- `--ring`: adopt, trial, assess, hold
- `--quadrant`: tools, techniques, platforms, languages

**Ring definitions:**
- **Adopt**: Actively using in production, recommend for new projects
- **Trial**: Testing in real scenarios, building experience
- **Assess**: Worth exploring, researching, learning about
- **Hold**: Not recommended, proceed with caution, or deprecating

**Quadrant definitions:**
- **Tools**: Development tools, utilities, applications (Docker, VS Code, Terraform)
- **Techniques**: Methodologies, practices, patterns (TDD, Event Sourcing, GitOps)
- **Platforms**: Infrastructure, runtime, hosting (Kubernetes, AWS, Vercel)
- **Languages & Frameworks**: Programming languages, libraries, SDKs (Rust, React, FastAPI)

## Storage Structure

```
[workbench_path]/
└── notes/
    ├── inbox/          # Quick captures (task, note, idea)
    ├── sessions/       # Claude Code session summaries
    ├── blips/          # Tech radar items (tools, technologies, frameworks)
    ├── learned/        # Teaching notes from /teach
    ├── articles/
    ├── videos/
    ├── people/
    ├── books/
    ├── organisations/
    ├── troves/
    └── research/
```

---

## The `/teach` Command

Teach back content you've studied using the **Richard Feynman Iterative Learning Framework**.

> Based on [The Richard Feynman Iterative Learning Framework](https://tools.eq4c.com/prompt/ai-prompt-the-richard-feynman-iterative-learning-framework/) prompt.

### Philosophy: No Shortcuts to Learning

The `/teach` command implements the Feynman Technique - a method for **deepening** understanding, not acquiring it.

**Prerequisites:**
- You MUST have already engaged with the content (read the paper, watched the video, studied the concept)
- This command tests and strengthens YOUR understanding through explanation

**Why this matters:**
The Feynman Technique works because explaining reveals gaps. But you can't reveal gaps in knowledge you don't have. The command will ask if you've engaged with the material - be honest. Skipping the learning step only cheats yourself.

**The real learning happens when you:**
1. Read/watch/study the original content
2. Struggle with difficult parts
3. Make connections in your own mind
4. THEN use `/teach` to test and deepen that understanding

### The Feynman Technique

0. **Prerequisite Check** - Confirm you've engaged with the content
1. **Topic Assessment** - What do you already know?
2. **Simplified Explanation** - Explain it like you're teaching a 12-year-old
3. **Gap Identification** - Find what's missing or unclear
4. **Guided Questioning** - Answer probing questions to deepen understanding
5. **Iterative Refinement** - Explain again, simpler and clearer
6. **Application Testing** - Apply to real-world scenarios
7. **Teaching Note Creation** - Capture your understanding with analogies

### Content Types

| Type | Source | Auto-detect |
|------|--------|-------------|
| `paper` | Research papers, PDFs | arxiv.org, *.pdf |
| `video` | YouTube videos | youtube.com, youtu.be |
| `article` | Web articles | Other URLs |
| `concept` | Plain topics | No URL |

### Depth Levels

| Depth | Iterations | Use when... |
|-------|------------|-------------|
| `shallow` | 1 | Quick check, familiar topics |
| `standard` | 2 | Default, balanced teaching |
| `deep` | 3 | Complex topics, want mastery |

### Usage Examples

```bash
# Teach back of a paper you've read
/teach paper https://arxiv.org/pdf/2512.24601

# Teach back of a video you've watched
/teach video https://youtube.com/watch?v=abc123

# Teach back of an article you've read
/teach article https://martinfowler.com/articles/microservices.html

# Teach back of a concept you've studied
/teach concept Event Sourcing

# Auto-detect type from URL
/teach https://arxiv.org/abs/2103.12345

# Control depth
/teach concept CQRS --depth deep
/teach concept CAP Theorem --depth shallow
```

### Teaching Notes

After the interactive session, a teaching note is saved to `notes/learned/` containing:

- Your simplified explanation (in your own words)
- Key insight (TL;DR)
- Core concepts with simple definitions
- Memorable analogies
- Common misconceptions and corrections
- Applied scenarios
- Your learning journey (where you started, gaps filled, breakthrough moment)
- Links to related notes

### Interactive Session Flow

1. **Prerequisite check**: "Have you already engaged with this content?"
2. **Assessment**: "What do you already know about [topic]?"
3. **First explanation**: "Explain [topic] as if to a 12-year-old"
4. **Feedback**: Claude identifies gaps and strengths
5. **Questions**: Probing questions to deepen understanding
6. **Refined explanation**: Try again, addressing the gaps
7. **Scenarios**: Apply to real-world situations
8. **Analogy**: Create a memorable mental model
9. **Save**: Teaching note written to your workbench

---

## Requirements

- **For video captures**: `yt-dlp` must be installed
  - macOS: `brew install yt-dlp`
  - pip: `pip install yt-dlp`

## Sources

- [The Richard Feynman Iterative Learning Framework](https://tools.eq4c.com/prompt/ai-prompt-the-richard-feynman-iterative-learning-framework/) - The `/teach` command implementation

## License

MIT
