// cheat-sheet.typ - Multi-column reference card (landscape)
// Dense layout with categories, code blocks, and callout boxes

#import "base.typ": *

#let cheat-sheet(
  title: "Cheat Sheet",
  subtitle: "",
  col-count: 3,
  custom-theme: (:),
  custom-fonts: (:),
  body,
) = {
  let t = theme
  for (key, value) in custom-theme {
    t.insert(key, value)
  }
  let f = fonts
  for (key, value) in custom-fonts {
    f.insert(key, value)
  }

  set page(
    paper: "a4",
    flipped: true,
    margin: (top: 1.5cm, bottom: 1.2cm, left: 1.2cm, right: 1.2cm),
  )
  set text(font: f.body, size: 9pt, fill: t.text-primary)
  set par(leading: 0.5em)

  // Compact header
  block(width: 100%)[
    #grid(
      columns: (1fr, auto),
      align(left)[
        #text(font: f.heading, size: 16pt, weight: "bold", fill: t.primary)[#title]
        #if subtitle != "" [
          #h(8pt)
          #text(size: 9pt, fill: t.text-secondary)[#subtitle]
        ]
      ],
      align(right)[
        #text(size: 8pt, fill: t.text-secondary)[Reference Card]
      ],
    )
  ]
  line(length: 100%, stroke: 1.5pt + t.primary)
  v(8pt)

  // Show rules
  show heading.where(level: 1): it => {
    set text(font: f.heading, size: 11pt, weight: "bold", fill: t.primary)
    block(above: 0.8em, below: 0.3em)[
      #it.body
      #v(1pt)
      #line(length: 100%, stroke: 1pt + t.primary.lighten(60%))
    ]
  }
  show heading.where(level: 2): it => {
    set text(font: f.heading, size: 9.5pt, weight: "semibold", fill: t.text-primary)
    block(above: 0.6em, below: 0.2em, it)
  }
  show raw: set text(font: f.mono, size: 8pt)
  show raw.where(block: true): it => {
    block(
      fill: t.surface,
      stroke: 0.5pt + t.border,
      inset: 6pt,
      radius: 3pt,
      width: 100%,
      it,
    )
  }

  // Multi-column layout
  columns(col-count, gutter: 12pt, body)
}

// Category section with colored header
#let category(name, accent: theme.primary, body-content) = {
  block(above: 8pt, below: 4pt)[
    #text(font: fonts.heading, size: 10pt, weight: "bold", fill: accent)[#name]
    #v(1pt)
    #line(length: 100%, stroke: 1pt + accent.lighten(60%))
  ]
  body-content
}

// Compact item (key-value style)
#let item(key, value) = {
  block(below: 3pt)[
    #text(font: fonts.mono, size: 8pt, weight: "bold", fill: theme.primary)[#key]
    #h(4pt)
    #text(size: 8.5pt)[#value]
  ]
}

// Tip box (compact callout)
#let tip(body-content) = {
  block(
    fill: theme.primary.lighten(92%),
    stroke: 0.5pt + theme.primary.lighten(60%),
    inset: 5pt,
    radius: 3pt,
    width: 100%,
    below: 4pt,
    [#text(size: 8pt, weight: "bold", fill: theme.primary)[TIP] #text(size: 8pt)[#body-content]],
  )
}

// Warning box
#let warning(body-content) = {
  block(
    fill: theme.warning.lighten(92%),
    stroke: 0.5pt + theme.warning.lighten(60%),
    inset: 5pt,
    radius: 3pt,
    width: 100%,
    below: 4pt,
    [#text(size: 8pt, weight: "bold", fill: theme.warning)[WARN] #text(size: 8pt)[#body-content]],
  )
}

// Compact table
#let ref-table(headers, rows) = {
  table(
    columns: headers.len(),
    stroke: 0.5pt + theme.border,
    inset: 4pt,
    fill: (_, y) => if y == 0 { theme.surface } else { none },
    ..headers.map(h => text(size: 8pt, weight: "bold")[#h]),
    ..rows.flatten().map(c => text(size: 8pt)[#c]),
  )
}
