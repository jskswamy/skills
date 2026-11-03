// technical-brief.typ - Engineering/specs document
// System overview, specifications, code examples, and architecture diagrams

#import "base.typ": *

#let technical-brief(
  title: "Technical Brief",
  version: "",
  status: "",
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
    margin: (top: 2cm, bottom: 2cm, left: 2.5cm, right: 2.5cm),
  )
  set text(font: f.body, size: 10.5pt, fill: t.text-primary)

  // Header
  block(width: 100%)[
    #grid(
      columns: (1fr, auto),
      align(left)[
        #text(font: f.heading, size: 20pt, weight: "bold", fill: t.primary)[#title]
      ],
      align(right)[
        #if version != "" [
          #box(
            fill: t.surface,
            stroke: 0.5pt + t.border,
            inset: (x: 8pt, y: 4pt),
            radius: 3pt,
            text(size: 8pt, weight: "semibold", fill: t.text-secondary)[v#version],
          )
        ]
        #if status != "" [
          #h(4pt)
          #box(
            fill: if status == "draft" { t.warning.lighten(85%) } else if status == "final" { t.success.lighten(85%) } else { t.surface },
            stroke: 0.5pt + if status == "draft" { t.warning } else if status == "final" { t.success } else { t.border },
            inset: (x: 8pt, y: 4pt),
            radius: 3pt,
            text(size: 8pt, weight: "semibold", fill: if status == "draft" { t.warning } else if status == "final" { t.success } else { t.text-secondary })[#upper(status)],
          )
        ]
      ],
    )
  ]
  v(4pt)
  line(length: 100%, stroke: 2pt + t.primary)
  v(12pt)

  // Show rules
  show heading.where(level: 1): it => {
    set text(font: f.heading, size: 14pt, weight: "bold", fill: t.primary)
    block(above: 1.4em, below: 0.6em, it)
  }
  show heading.where(level: 2): it => {
    set text(font: f.heading, size: 12pt, weight: "semibold", fill: t.text-primary)
    block(above: 1em, below: 0.5em, it)
  }
  show heading.where(level: 3): it => {
    set text(font: f.heading, size: 10.5pt, weight: "semibold", fill: t.text-secondary)
    block(above: 0.8em, below: 0.4em, it)
  }
  show raw: set text(font: f.mono, size: 9pt)
  show raw.where(block: true): it => {
    block(
      fill: t.surface,
      stroke: 0.5pt + t.border,
      inset: 10pt,
      radius: 4pt,
      width: 100%,
      it,
    )
  }

  body
}

// System overview block
#let overview(body-content) = {
  block(
    fill: theme.surface,
    stroke: 0.5pt + theme.border,
    inset: 14pt,
    radius: 6pt,
    width: 100%,
    below: 14pt,
    body-content,
  )
}

// Specifications table
#let spec-table(specs) = {
  block(above: 8pt, below: 12pt)[
    #table(
      columns: (auto, 1fr),
      stroke: 0.5pt + theme.border,
      inset: 8pt,
      fill: (_, y) => if y == 0 { theme.surface } else { none },
      text(size: 9pt, weight: "bold")[Property],
      text(size: 9pt, weight: "bold")[Value],
      ..specs.map(s => {
        let (prop, val) = s
        (
          text(size: 9.5pt, weight: "semibold")[#prop],
          text(size: 9.5pt, font: fonts.mono)[#val],
        )
      }).flatten()
    )
  ]
}

// Code example with language label
#let code-example(lang, body-content) = {
  block(above: 6pt, below: 10pt)[
    #box(
      fill: theme.text-primary,
      inset: (x: 8pt, y: 3pt),
      radius: (top: 4pt),
      text(size: 7pt, weight: "bold", fill: white)[#upper(lang)],
    )
    #v(-2pt)
    #block(
      fill: theme.surface,
      stroke: 0.5pt + theme.border,
      inset: 10pt,
      radius: (bottom: 4pt, top-right: 4pt),
      width: 100%,
      body-content,
    )
  ]
}

// Trade-off analysis (pros/cons)
#let tradeoffs(pros, cons) = {
  block(above: 8pt, below: 12pt)[
    #grid(
      columns: (1fr, 1fr),
      column-gutter: 12pt,
      block(
        stroke: 0.5pt + theme.success,
        fill: theme.success.lighten(95%),
        inset: 10pt,
        radius: 4pt,
        width: 100%,
      )[
        #text(font: fonts.heading, size: 10pt, weight: "bold", fill: theme.success)[Advantages]
        #v(4pt)
        #for pro in pros [
          + #text(size: 9.5pt)[#pro]
        ]
      ],
      block(
        stroke: 0.5pt + theme.error,
        fill: theme.error.lighten(95%),
        inset: 10pt,
        radius: 4pt,
        width: 100%,
      )[
        #text(font: fonts.heading, size: 10pt, weight: "bold", fill: theme.error)[Disadvantages]
        #v(4pt)
        #for con in cons [
          + #text(size: 9.5pt)[#con]
        ]
      ],
    )
  ]
}

// Dependency/requirement item
#let dependency(name, version: "", note: "") = {
  block(below: 4pt)[
    #text(font: fonts.mono, size: 9pt, weight: "bold", fill: theme.primary)[#name]
    #if version != "" [
      #h(4pt)
      #text(size: 8pt, fill: theme.text-secondary)[(#version)]
    ]
    #if note != "" [
      #h(4pt)
      #text(size: 8.5pt, fill: theme.text-secondary)[— #note]
    ]
  ]
}

// API endpoint documentation
#let api-endpoint(method, path, description) = {
  block(
    stroke: 0.5pt + theme.border,
    inset: 8pt,
    radius: 4pt,
    width: 100%,
    below: 6pt,
  )[
    #box(
      fill: if method == "GET" { theme.success.lighten(80%) }
           else if method == "POST" { theme.primary.lighten(80%) }
           else if method == "PUT" { theme.warning.lighten(80%) }
           else if method == "DELETE" { theme.error.lighten(80%) }
           else { theme.surface },
      inset: (x: 5pt, y: 2pt),
      radius: 3pt,
      text(size: 8pt, weight: "bold", fill: if method == "GET" { theme.success }
           else if method == "POST" { theme.primary }
           else if method == "PUT" { theme.warning }
           else if method == "DELETE" { theme.error }
           else { theme.text-primary })[#method],
    )
    #h(6pt)
    #text(font: fonts.mono, size: 9pt)[#path]
    #v(4pt)
    #text(size: 9pt, fill: theme.text-secondary)[#description]
  ]
}
