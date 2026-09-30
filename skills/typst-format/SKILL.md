---
name: typst-format
description: This skill should be used when generating Typst source code, formatting documents with Typst syntax, or needing to understand Typst markup, functions, packages (CeTZ, Fletcher, Pintorita), and document structure. Provides comprehensive Typst language reference and package API knowledge.
---

# Typst Language Reference

## Document Structure

```typst
// Page setup
#set page(paper: "a4", margin: (top: 2cm, bottom: 2cm, left: 2.5cm, right: 2.5cm))
#set page(paper: "a4", flipped: true)  // Landscape

// Text defaults
#set text(font: "Source Serif 4", size: 11pt, fill: rgb("#1e293b"))

// Paragraph
#set par(leading: 0.65em, justify: true)

// Show rules
#show heading.where(level: 1): it => { ... }
#show raw: set text(font: "JetBrains Mono")
```

## Typography

```typst
// Font styles
#text(size: 14pt, weight: "bold", fill: blue)[Bold blue text]
#text(font: "Inter", style: "italic")[Italic Inter]
#text(weight: "semibold", size: 12pt)[Semi-bold]

// Weights: "thin", "light", "regular", "medium", "semibold", "bold", "black"
// Styles: "normal", "italic", "oblique"

// Alignment
#align(center)[Centered text]
#align(left + top)[Top-left aligned]

// Spacing
#v(12pt)   // Vertical space
#h(6pt)    // Horizontal space
#h(1fr)    // Fill remaining horizontal space
```

## Layout

```typst
// Block - rectangular container
#block(
  fill: rgb("#f8fafc"),        // Background color
  stroke: 0.5pt + rgb("#e2e8f0"),  // Border
  inset: 12pt,                 // Inner padding
  radius: 4pt,                 // Border radius
  width: 100%,                 // Width
  above: 8pt,                  // Margin top
  below: 8pt,                  // Margin bottom
  clip: true,                  // Clip overflow
)[Content here]

// Box - inline container
#box(fill: blue.lighten(90%), inset: (x: 6pt, y: 2pt), radius: 3pt)[Inline]

// Grid
#grid(
  columns: (1fr, 2fr, auto),
  column-gutter: 12pt,
  row-gutter: 8pt,
  [Col 1], [Col 2], [Col 3],
)

// Columns
#columns(3, gutter: 12pt)[Multi-column content...]

// Padding
#pad(left: 20pt, top: 8pt)[Padded content]
```

## Colors

```typst
// RGB
rgb("#2563eb")
rgb("#2563eb").lighten(85%)
rgb("#2563eb").darken(20%)

// Named colors
blue, red, green, yellow, purple, orange, black, white

// Color operations
color.lighten(50%)    // Lighter
color.darken(20%)     // Darker
color.mix(other, 50%) // Mix two colors
```

## Tables

```typst
#table(
  columns: (auto, 1fr, auto),
  stroke: 0.5pt + gray,
  inset: 8pt,
  fill: (_, y) => if y == 0 { rgb("#f1f5f9") } else { none },
  // Header row
  [*Name*], [*Description*], [*Value*],
  // Data rows
  [Item 1], [Description], [42],
  [Item 2], [Description], [17],
)
```

## Lists

```typst
// Unordered
- Item one
- Item two
  - Nested item

// Ordered
+ First
+ Second
+ Third

// Custom markers
#set list(marker: [→])
```

## Code Blocks

```typst
// Inline code
`inline code`

// Block code with language
```rust
fn main() {
    println!("Hello");
}
`` `

// Raw block (no highlighting)
#raw(block: true, "raw text here")
```

## Lines and Shapes

```typst
// Horizontal line
#line(length: 100%, stroke: 2pt + blue)

// Custom stroke
#line(length: 50%, stroke: (paint: red, thickness: 1pt, dash: "dashed"))

// Circle, rect, ellipse
#circle(radius: 20pt, fill: blue.lighten(80%), stroke: 1pt + blue)
#rect(width: 100pt, height: 50pt, fill: gray.lighten(90%), radius: 4pt)
```

## Functions and Variables

```typst
// Define a function
#let my-func(param1, param2: "default") = {
  [Result: #param1 and #param2]
}

// Use it
#my-func("hello", param2: "world")

// Variables
#let title = "My Document"
#let accent = rgb("#2563eb")

// Conditionals
#if condition [true branch] else [false branch]

// Loops
#for item in items [
  - #item
]

#for (i, item) in items.enumerate() [
  #str(i + 1). #item
]
```

## Imports

```typst
// Import from file
#import "base.typ": *           // Import all
#import "base.typ": theme, fonts // Import specific

// Import packages
#import "@preview/cetz:0.3.4"
#import "@preview/fletcher:0.5.8" as fletcher: diagram, node, edge
#import "@preview/cetz-plot:0.1.1": chart
#import "@preview/pintorita:0.2.0"
```

## Show/Set Rules

```typst
// Set rules (change defaults)
#set text(size: 11pt)
#set heading(numbering: "1.1")
#set page(numbering: "1")

// Show rules (transform elements)
#show heading.where(level: 1): it => {
  set text(font: "Inter", size: 18pt, weight: "bold", fill: blue)
  block(above: 1.5em, below: 0.8em, it)
}

// Show with template function
#show: my-template.with(title: "Doc Title")
```

## Template Pattern

```typst
// Define template
#let my-template(title: "", body) = {
  set page(paper: "a4")
  set text(size: 11pt)

  // Header
  text(size: 20pt, weight: "bold")[#title]

  body
}

// Use template
#show: my-template.with(title: "Hello")

Content goes here...
```

---

## Package: CeTZ (Canvas)

```typst
#import "@preview/cetz:0.3.4"

#cetz.canvas(length: 1cm, {
  import cetz.draw: *

  // Shapes
  circle((0, 0), radius: 1, fill: blue.lighten(80%), stroke: 1pt + blue)
  rect((-1, -1), (1, 1), fill: none, stroke: 1pt + gray)
  line((0, 0), (3, 2), stroke: 2pt + red)
  arc((0, 0), start: 0deg, stop: 180deg, radius: 2)

  // Text content
  content((2, 1), [Label text])
  content((0, 0), box(inset: 4pt, fill: white)[Node])

  // Bezier curves
  bezier((0, 0), (4, 0), (1, 2), (3, 2), stroke: 1pt + blue)

  // Groups and transforms
  group({
    translate((5, 0))
    rotate(45deg)
    rect((0, 0), (1, 1))
  })
})
```

## Package: CeTZ-Plot (Charts)

```typst
#import "@preview/cetz:0.3.4"
#import "@preview/cetz-plot:0.1.1": chart, plot

// Bar chart
#cetz.canvas({
  chart.barchart(
    size: (10, 6),
    (
      ("Category A", 42),
      ("Category B", 28),
      ("Category C", 65),
    ),
    fill: blue.lighten(60%),
    bar-style: (fill: blue.lighten(60%), stroke: blue),
  )
})

// Line plot
#cetz.canvas({
  plot.plot(
    size: (10, 6),
    x-label: "Time",
    y-label: "Value",
    {
      plot.add(
        ((0, 1), (1, 3), (2, 2), (3, 5), (4, 4)),
        style: (stroke: 2pt + blue),
      )
    },
  )
})
```

## Package: Fletcher (Diagrams)

```typst
#import "@preview/fletcher:0.5.8" as fletcher: diagram, node, edge

#diagram(
  node-stroke: 0.5pt + gray,
  spacing: 2em,
  // Nodes
  node((0, 0), [Client], fill: blue.lighten(90%)),
  node((2, 0), [Server], fill: green.lighten(90%)),
  node((4, 0), [Database], fill: orange.lighten(90%)),
  // Edges
  edge((0, 0), (2, 0), "->", [request]),
  edge((2, 0), (4, 0), "->", [query]),
  edge((4, 0), (2, 0), "-->", [result], bend: -20deg),
  edge((2, 0), (0, 0), "-->", [response], bend: -20deg),
)
```

## Package: Pintorita (Sequence Diagrams)

```typst
#import "@preview/pintorita:0.2.0"

#render(```
sequenceDiagram
  participant C as Client
  participant S as Server
  participant D as Database

  C->>S: HTTP Request
  S->>D: SQL Query
  D-->>S: Results
  S-->>C: JSON Response
```)
```

## Math Mode

```typst
// Inline math
$x^2 + y^2 = z^2$

// Display math
$ sum_(i=0)^n x_i = integral_0^1 f(x) dif x $

// Aligned equations
$ a &= b + c \
  d &= e + f $
```

## Figures and Images

```typst
// Figure with caption
#figure(
  image("path/to/image.png", width: 80%),
  caption: [Figure caption here],
)

// Image sizing
#image("photo.jpg", width: 50%, height: auto)
```

## Page Numbering and Headers

```typst
#set page(
  numbering: "1 / 1",
  header: [
    #text(size: 8pt, fill: gray)[Document Title]
    #h(1fr)
    #text(size: 8pt, fill: gray)[Page]
  ],
  footer: align(center)[#counter(page).display("1")],
)
```
