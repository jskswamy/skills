---
name: sketch-from-capture
description: This skill should be used when the user wants to create a visual sketch, diagram, or mind map from captured content like articles, videos, or blips. Enables creating Excalidraw visualizations from jot captures.
version: 1.0.0
---

# Sketch from Capture

When a user captures content and wants to visualize it, use the `/sketch` command from the sketch-note plugin.

## Activation Triggers

Use this skill when the user mentions:
- "visualize this article"
- "create a diagram from this video"
- "sketch the architecture from this repo"
- "mind map this capture"
- "draw what I just captured"
- "make a visual summary"

## Workflow

### 1. After Capturing Content (article, video, blip)

Extract the key information needed for visualization:
- Key concepts and main ideas
- Relationships between concepts
- Structure and hierarchy
- Flow or sequence (if applicable)

### 2. For Videos (YouTube, etc.)

When visualizing video content:
1. Extract main topics from the transcript/summary
2. Identify the flow/sequence of ideas
3. Note key takeaways and conclusions
4. Create flowchart or mind map structure

**Visualization approach:**
- Use flowchart for step-by-step tutorials
- Use mind map for conceptual explanations
- Use architecture diagram for technical overviews

### 3. For Articles/Web Pages

When visualizing article content:
1. Extract the main argument or thesis
2. Identify supporting points
3. Note relationships between concepts
4. Capture key conclusions

**Visualization approach:**
- Use hierarchical diagram for structured arguments
- Use concept map for interconnected ideas
- Use timeline for historical/sequential content

### 4. For Blips (Tools/Technologies)

When visualizing tech radar blips:
1. Extract core features and capabilities
2. Identify use cases and applications
3. Note alternatives and comparisons
4. Capture adoption considerations

**Visualization approach:**
- Use comparison diagram for alternatives
- Use architecture diagram for system integration
- Use mind map for feature exploration

## Integration with /sketch

After extracting content, invoke the sketch command:

```
/sketch --mode custom "{extracted content description}"
```

**Example workflow:**

1. User: "capture https://youtube.com/watch?v=abc123 and visualize it"

2. First, capture the video using jot capture:
   - Fetch video metadata and transcript
   - Create capture note in workbench

3. Extract key concepts:
   - Main topic: "Building REST APIs"
   - Key points: Authentication, Routing, Middleware, Error Handling
   - Flow: Setup → Routes → Middleware → Auth → Testing

4. Create visualization:
   ```
   /sketch --mode custom "REST API tutorial flow: Setup → Routing → Middleware → Authentication → Error Handling → Testing. Key concepts: Express.js framework, JWT tokens, middleware pattern"
   ```

5. Link the sketch to the capture note (both in workbench)

## Output Location

Both captures and sketches are saved to the shared workbench:
- Captures: `${workbench_path}/notes/{type}/`
- Sketches: `${workbench_path}/sketches/`

This makes it easy to find related content together.

## Cross-Referencing

When creating a sketch from captured content, include a reference in the sketch description:
- "Based on: {capture title}"
- "Source: {URL}"

This maintains traceability between captures and their visualizations.
