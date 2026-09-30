---
name: capture-for-sketch
description: This skill should be used when the user wants to sketch content from a URL, YouTube video, or external source. Enables fetching and extracting content before creating a visual sketch.
version: 1.0.0
---

# Capture Content for Sketching

When the user wants to sketch external content (URLs, videos, articles), first fetch and extract the content, then generate the visualization.

## Activation Triggers

Use this skill when the user mentions:
- "sketch this YouTube video"
- "create a diagram from this article"
- "visualize https://..."
- "sketch the architecture from this GitHub repo"
- "draw a diagram of this URL"
- "make a visual summary of this video"

## Workflow

### 1. For YouTube Videos

**Step 1: Fetch video content**

Use yt-dlp to get the transcript (if available):
```bash
yt-dlp --write-auto-sub --sub-lang en --skip-download -o "%(title)s" "<URL>"
```

Or fetch video metadata:
```bash
yt-dlp --print title --print description --skip-download "<URL>"
```

**Step 2: Extract key information**
- Video title and description
- Main topics from transcript
- Sequence of ideas/steps
- Key takeaways

**Step 3: Generate diagram**
- Flowchart for tutorials/processes
- Mind map for conceptual content
- Timeline for historical content

### 2. For Articles/Web Pages

**Step 1: Fetch content**

Use the WebFetch tool to retrieve and process the page:
```
WebFetch(url, prompt="Extract the main topics, key arguments, and structure of this article")
```

**Step 2: Extract key information**
- Main thesis/argument
- Supporting points
- Relationships between concepts
- Conclusions

**Step 3: Generate diagram**
- Hierarchical diagram for structured arguments
- Concept map for interconnected ideas
- Comparison chart for reviews/analyses

### 3. For GitHub Repositories

**Step 1: Fetch README**

```
WebFetch("https://github.com/{owner}/{repo}", prompt="Extract the architecture, main features, and components")
```

Or if repo is local, read the README.md directly.

**Step 2: Extract key information**
- Project purpose and scope
- Architecture components
- Dependencies and integrations
- Key features

**Step 3: Generate diagram**
- Architecture diagram showing components
- Dependency graph
- Feature mind map

## Content Extraction Patterns

### Video Content Structure

```
Title: {video title}
Main Topic: {core subject}
Key Points:
  1. {point 1}
  2. {point 2}
  3. {point 3}
Flow: {step1} → {step2} → {step3}
Takeaways:
  - {takeaway 1}
  - {takeaway 2}
```

### Article Content Structure

```
Title: {article title}
Source: {URL}
Main Argument: {thesis}
Supporting Points:
  - {point 1}
  - {point 2}
Key Concepts:
  - {concept 1} relates to {concept 2}
Conclusions: {summary}
```

### Repository Content Structure

```
Project: {repo name}
Purpose: {description}
Components:
  - {component 1}: {description}
  - {component 2}: {description}
Dependencies:
  - {component 1} → {component 2}
Tech Stack: {technologies}
```

## Example Workflows

### Example 1: YouTube Video

User: "/sketch https://youtube.com/watch?v=abc123"

1. Detect URL is YouTube
2. Fetch video info:
   ```bash
   yt-dlp --print title --print description --skip-download "https://youtube.com/watch?v=abc123"
   ```
3. If transcript available, extract key topics
4. Generate Excalidraw diagram:
   - Title box with video name
   - Main topic boxes
   - Arrows showing flow/relationships
5. Save to `${workbench_path}/sketches/`

### Example 2: Article

User: "/sketch https://example.com/article-about-microservices"

1. Detect URL is web article
2. Fetch with WebFetch:
   ```
   WebFetch(url, "Extract main topics and structure")
   ```
3. Parse response for key concepts
4. Generate concept map diagram
5. Save to `${workbench_path}/sketches/`

### Example 3: GitHub Repo

User: "/sketch https://github.com/facebook/react"

1. Detect URL is GitHub
2. Fetch README content
3. Extract architecture and components
4. Generate architecture diagram showing:
   - Core packages
   - Dependencies
   - Data flow
5. Save to `${workbench_path}/sketches/`

## Integration Notes

### Tool Detection

Before using yt-dlp, check if it's available:
```bash
command -v yt-dlp >/dev/null 2>&1
```

If not available, offer alternatives:
- WebFetch to get video page metadata
- Ask user to provide content manually

### Fallback Behavior

If content extraction fails:
1. Inform user of the issue
2. Offer to create sketch from manual description
3. Suggest installing missing tools (yt-dlp)

### Output Location

Sketches are saved to `${workbench_path}/sketches/` (shared with jot plugin).

Read workbench_path from `.claude/jot.local.md`:
```yaml
---
workbench_path: ~/workbench
---
```

Default: `~/workbench` if not configured.
