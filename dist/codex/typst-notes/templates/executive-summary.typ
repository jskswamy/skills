// executive-summary.typ - Professional one-pager with metrics and key findings
// Single page, portrait A4 with title, metrics grid, findings, and recommendations

#import "base.typ": *

#let executive-summary(
  title: "Executive Summary",
  subtitle: "",
  date: "",
  custom-theme: (:),
  custom-fonts: (:),
  body,
) = {
  // Merge theme
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
    margin: (top: 2cm, bottom: 2cm, left: 2.5cm, right: 2.5cm),
  )
  set text(font: f.body, size: 10.5pt, fill: t.text-primary)

  // Header
  block(width: 100%)[
    #text(font: f.heading, size: 22pt, weight: "bold", fill: t.primary)[#title]
    #if subtitle != "" [
      #v(2pt)
      #text(size: 12pt, fill: t.text-secondary)[#subtitle]
    ]
    #if date != "" [
      #v(2pt)
      #text(size: 9pt, fill: t.text-secondary)[#date]
    ]
  ]
  v(6pt)
  line(length: 100%, stroke: 2pt + t.primary)
  v(12pt)

  // Show rules for headings
  show heading.where(level: 1): it => {
    set text(font: f.heading, size: 14pt, weight: "bold", fill: t.primary)
    block(above: 1.2em, below: 0.6em, it)
  }
  show heading.where(level: 2): it => {
    set text(font: f.heading, size: 12pt, weight: "semibold", fill: t.text-primary)
    block(above: 1em, below: 0.5em, it)
  }
  show raw: set text(font: f.mono, size: 9pt)

  body
}

// Metrics row: displays 3-5 metric boxes in a grid
#let metrics-row(metrics, accent: theme.primary) = {
  let cols = metrics.len()
  grid(
    columns: (1fr,) * cols,
    column-gutter: 8pt,
    ..metrics.map(m => {
      let (label, value) = m
      block(
        stroke: 0.5pt + theme.border,
        fill: theme.surface,
        inset: 10pt,
        radius: 4pt,
        width: 100%,
        align(center)[
          #text(font: fonts.heading, size: 18pt, weight: "bold", fill: accent)[#value]
          #v(2pt)
          #text(size: 8.5pt, fill: theme.text-secondary)[#label]
        ],
      )
    })
  )
  v(12pt)
}

// Key finding card
#let finding(body-content, accent: theme.primary) = {
  block(
    stroke: (left: 3pt + accent, rest: 0.5pt + theme.border),
    fill: theme.surface,
    inset: 10pt,
    radius: (right: 4pt),
    width: 100%,
    below: 8pt,
    body-content,
  )
}

// Recommendations list
#let recommendations(items, accent: theme.primary) = {
  block(above: 8pt)[
    #heading(level: 2)[Recommendations]
    #v(4pt)
    #for (i, item) in items.enumerate() [
      #box(
        fill: accent.lighten(90%),
        inset: (x: 5pt, y: 2pt),
        radius: 3pt,
        text(size: 9pt, weight: "bold", fill: accent)[#str(i + 1)],
      )
      #h(6pt)
      #item
      #v(4pt)
    ]
  ]
}

// Next steps footer
#let next-steps(items) = {
  v(8pt)
  line(length: 100%, stroke: 0.5pt + theme.border)
  v(6pt)
  text(font: fonts.heading, size: 10pt, weight: "semibold", fill: theme.text-secondary)[Next Steps]
  v(4pt)
  for item in items [
    - #item
  ]
}
