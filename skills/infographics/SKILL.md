---
name: infographics
description: This skill should be used when deciding whether to add charts, diagrams, flowcharts, or other data visualizations to a Typst document. Provides guidance on when and how to use CeTZ-Plot, Fletcher, Pintorita, and custom CeTZ drawings for infographic generation.
---

# Infographics Decision Guide

## When to Add Infographics

Add a visualization when content contains:

| Content Pattern | Visualization Type | Package |
|----------------|-------------------|---------|
| 3+ numeric values being compared | Bar chart | CeTZ-Plot |
| Values changing over time/sequence | Line chart | CeTZ-Plot |
| Percentage breakdown | Pie/donut chart | CeTZ-Plot |
| Step-by-step process (3+ steps) | Flowchart | Fletcher |
| System with 3+ connected components | Architecture diagram | Fletcher |
| Request/response between services | Sequence diagram | Pintorita |
| Hierarchical concepts | Mind map | CeTZ (custom) |
| Before/after comparison | Side-by-side boxes | Layout (no package) |
| Pro/con analysis | Two-column layout | Layout (no package) |

## When NOT to Add Infographics

- Content is purely textual/narrative
- Only 1-2 data points (use inline text instead)
- Data is already in a clear table
- The visualization would be trivially simple
- Template is already dense (cheat-sheet with limited space)

## Bar Chart Pattern

Best for: Comparing quantities across categories.

```typst
#import "@preview/cetz:0.3.4"
#import "@preview/cetz-plot:0.1.1": chart

#cetz.canvas({
  chart.barchart(
    size: (9, 5),
    label-key: 0,
    value-key: 1,
    (
      ("Q1 Revenue", 2.4),
      ("Q2 Revenue", 3.1),
      ("Q3 Revenue", 2.8),
      ("Q4 Revenue", 3.5),
    ),
    bar-style: (fill: theme.chart-1.lighten(40%), stroke: theme.chart-1),
  )
})
```

Tips:
- Keep to 3-8 categories
- Sort by value if no natural ordering
- Use theme colors for consistency

## Line Chart Pattern

Best for: Showing trends over time or continuous data.

```typst
#import "@preview/cetz:0.3.4"
#import "@preview/cetz-plot:0.1.1": plot

#cetz.canvas({
  plot.plot(
    size: (10, 5),
    x-label: "Month",
    y-label: "Users (K)",
    x-tick-step: 1,
    {
      plot.add(
        ((1, 12), (2, 15), (3, 18), (4, 22), (5, 28), (6, 35)),
        style: (stroke: 2pt + theme.chart-1),
        label: "Active Users",
      )
      plot.add(
        ((1, 8), (2, 10), (3, 11), (4, 14), (5, 16), (6, 20)),
        style: (stroke: 2pt + theme.chart-2, dash: "dashed"),
        label: "Paying Users",
      )
    },
  )
})
```

Tips:
- Limit to 2-3 series for readability
- Label axes clearly
- Use dashed lines for secondary series

## Flowchart Pattern

Best for: Processes, decision trees, workflows.

```typst
#import "@preview/fletcher:0.5.8" as fletcher: diagram, node, edge

#diagram(
  node-stroke: 0.5pt + theme.border,
  spacing: (2em, 1.5em),

  // Process nodes
  node((0, 0), [Start], fill: theme.success.lighten(85%), shape: fletcher.shapes.pill),
  node((1, 0), [Step 1], fill: theme.surface),
  node((2, 0), [Decision?], fill: theme.warning.lighten(85%), shape: fletcher.shapes.diamond),
  node((3, 0), [Step 2A], fill: theme.surface),
  node((2, 1), [Step 2B], fill: theme.surface),
  node((4, 0), [End], fill: theme.error.lighten(85%), shape: fletcher.shapes.pill),

  // Flow edges
  edge((0, 0), (1, 0), "->"),
  edge((1, 0), (2, 0), "->"),
  edge((2, 0), (3, 0), "->", [Yes]),
  edge((2, 0), (2, 1), "->", [No]),
  edge((3, 0), (4, 0), "->"),
  edge((2, 1), (4, 0), "->", bend: 20deg),
)
```

Tips:
- Use shapes to differentiate node types (pill for start/end, diamond for decisions)
- Keep to 5-10 nodes max
- Flow left-to-right or top-to-bottom

## Architecture Diagram Pattern

Best for: System components, microservices, layers.

```typst
#import "@preview/fletcher:0.5.8" as fletcher: diagram, node, edge

#diagram(
  node-stroke: 0.5pt + theme.border,
  spacing: (3em, 2em),

  // Layers
  node((0, 0), [Web App], fill: theme.chart-1.lighten(85%)),
  node((2, 0), [Mobile App], fill: theme.chart-1.lighten(85%)),

  node((1, 1), [API Gateway], fill: theme.chart-2.lighten(85%)),

  node((0, 2), [Auth Service], fill: theme.chart-3.lighten(85%)),
  node((1, 2), [Core Service], fill: theme.chart-3.lighten(85%)),
  node((2, 2), [Notification], fill: theme.chart-3.lighten(85%)),

  node((1, 3), [PostgreSQL], fill: theme.chart-4.lighten(85%)),

  // Connections
  edge((0, 0), (1, 1), "->"),
  edge((2, 0), (1, 1), "->"),
  edge((1, 1), (0, 2), "->"),
  edge((1, 1), (1, 2), "->"),
  edge((1, 1), (2, 2), "->"),
  edge((0, 2), (1, 3), "->"),
  edge((1, 2), (1, 3), "->"),
)
```

Tips:
- Group related components visually
- Use color to indicate layers/types
- Show data flow direction with arrows
- Label edges only when the relationship isn't obvious

## Sequence Diagram Pattern

Best for: API calls, authentication flows, message passing.

```typst
#import "@preview/pintorita:0.2.0"

#render(```
sequenceDiagram
  participant U as User
  participant C as Client
  participant A as Auth
  participant S as Server

  U->>C: Login
  C->>A: POST /auth/token
  A-->>C: JWT Token
  C->>S: GET /api/data (Bearer token)
  S->>A: Validate token
  A-->>S: Valid
  S-->>C: 200 OK + Data
  C-->>U: Display data
```)
```

Tips:
- Keep to 3-5 participants
- Show the happy path first
- Use solid arrows for requests, dashed for responses
- Group related exchanges with labels

## Mind Map Pattern (Custom CeTZ)

Best for: Concept relationships, brainstorming, topic overview.

Use the `sketchnote-canvas` function from `visual-sketchnote.typ` or build a custom CeTZ canvas:

```typst
#import "@preview/cetz:0.3.4"

#cetz.canvas(length: 1cm, {
  import cetz.draw: *

  // Central concept
  circle((5, 5), radius: 1.2, fill: theme.primary.lighten(85%), stroke: 2pt + theme.primary)
  content((5, 5), text(weight: "bold", size: 11pt)[Core Idea])

  // Branches (positioned around center)
  let branches = (
    (angle: 0deg, label: "Topic A", color: theme.chart-1),
    (angle: 72deg, label: "Topic B", color: theme.chart-2),
    (angle: 144deg, label: "Topic C", color: theme.chart-3),
    (angle: 216deg, label: "Topic D", color: theme.chart-4),
    (angle: 288deg, label: "Topic E", color: theme.chart-5),
  )

  for b in branches {
    let x = 5 + 3.5 * calc.cos(b.angle)
    let y = 5 + 3.5 * calc.sin(b.angle)
    line(
      (5 + 1.2 * calc.cos(b.angle), 5 + 1.2 * calc.sin(b.angle)),
      (x, y),
      stroke: 1.5pt + b.color,
    )
    circle((x, y), radius: 0.8, fill: b.color.lighten(85%), stroke: 1pt + b.color)
    content((x, y), text(size: 8pt, weight: "semibold", fill: b.color)[#b.label])
  }
})
```

## Sizing Guidelines

| Template | Max Chart Width | Recommended Height |
|----------|----------------|-------------------|
| Executive Summary | 100% (full width) | 5-6cm |
| Cheat Sheet | Per-column width | 3-4cm |
| Study Guide | 80-100% | 5-7cm |
| Technical Brief | 100% | 6-8cm |
| Visual Sketchnote | 100% | 8-12cm |
| Creative Portfolio | 100% | 5-6cm |
| Meeting Minutes | Avoid large charts | 4-5cm max |

## Color Usage

Always use theme colors for consistency:
- `theme.chart-1` through `theme.chart-5` for data series
- `theme.primary` for emphasis
- `theme.surface` for node backgrounds
- `theme.border` for strokes
- `theme.text-secondary` for labels
