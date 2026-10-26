// creative-portfolio.typ - Visual showcase with project cards
// Large visuals, project cards, technology badges, and outcome metrics

#import "base.typ": *

#let creative-portfolio(
  title: "Portfolio",
  subtitle: "",
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
    margin: (top: 2cm, bottom: 2cm, left: 2cm, right: 2cm),
  )
  set text(font: f.body, size: 10.5pt, fill: t.text-primary)

  // Show rules
  show heading.where(level: 1): it => {
    set text(font: f.heading, size: 18pt, weight: "bold", fill: t.primary)
    block(above: 1.5em, below: 0.6em, it)
  }
  show heading.where(level: 2): it => {
    set text(font: f.heading, size: 14pt, weight: "semibold", fill: t.text-primary)
    block(above: 1.2em, below: 0.5em, it)
  }
  show raw: set text(font: f.mono, size: 9pt)

  body
}

// Hero section - full width with large text
#let hero(headline, subtitle: "", accent: theme.primary) = {
  block(
    fill: accent.lighten(92%),
    inset: (x: 24pt, y: 28pt),
    radius: 8pt,
    width: 100%,
    below: 20pt,
  )[
    #align(center)[
      #text(font: fonts.heading, size: 28pt, weight: "bold", fill: accent)[#headline]
      #if subtitle != "" [
        #v(8pt)
        #text(size: 13pt, fill: theme.text-secondary)[#subtitle]
      ]
    ]
  ]
}

// Project card
#let project-card(
  name: "",
  description: "",
  tags: (),
  metrics: (),
  accent: theme.primary,
) = {
  block(
    stroke: 0.5pt + theme.border,
    radius: 8pt,
    width: 100%,
    below: 16pt,
    clip: true,
  )[
    // Color accent bar at top
    #block(
      fill: accent,
      width: 100%,
      height: 4pt,
    )
    #block(inset: 16pt)[
      // Project name
      #text(font: fonts.heading, size: 14pt, weight: "bold", fill: accent)[#name]
      #v(6pt)

      // Description
      #text(size: 10pt, fill: theme.text-primary)[#description]
      #v(8pt)

      // Tags
      #if tags.len() > 0 [
        #for tag in tags [
          #box(
            fill: accent.lighten(88%),
            stroke: 0.5pt + accent.lighten(50%),
            inset: (x: 7pt, y: 3pt),
            radius: 3pt,
            text(size: 8pt, weight: "semibold", fill: accent.darken(10%))[#tag],
          )
          #h(4pt)
        ]
        #v(8pt)
      ]

      // Metrics
      #if metrics.len() > 0 [
        #grid(
          columns: metrics.len(),
          column-gutter: 12pt,
          ..metrics.map(m => {
            let (label, value) = m
            block(
              fill: theme.surface,
              inset: 8pt,
              radius: 4pt,
              width: 100%,
              align(center)[
                #text(font: fonts.heading, size: 16pt, weight: "bold", fill: accent)[#value]
                #v(2pt)
                #text(size: 8pt, fill: theme.text-secondary)[#label]
              ],
            )
          })
        )
      ]
    ]
  ]
}

// Skills/tools grid
#let skills-grid(items, accent: theme.primary) = {
  block(above: 8pt, below: 12pt)[
    #grid(
      columns: (1fr,) * calc.min(items.len(), 4),
      column-gutter: 8pt,
      row-gutter: 8pt,
      ..items.map(item => {
        block(
          fill: theme.surface,
          stroke: 0.5pt + theme.border,
          inset: 10pt,
          radius: 4pt,
          width: 100%,
          align(center)[
            #text(size: 9.5pt, weight: "semibold", fill: accent)[#item]
          ],
        )
      })
    )
  ]
}

// About/bio section
#let about(body-content) = {
  block(
    fill: theme.surface,
    inset: 16pt,
    radius: 6pt,
    width: 100%,
    above: 14pt,
  )[
    #text(font: fonts.heading, size: 12pt, weight: "bold", fill: theme.text-primary)[About]
    #v(8pt)
    #text(size: 10.5pt, fill: theme.text-secondary)[#body-content]
  ]
}

// Testimonial/quote card
#let testimonial(quote, author: "", role: "") = {
  block(
    stroke: (left: 3pt + theme.secondary),
    inset: (left: 14pt, rest: 10pt),
    below: 12pt,
  )[
    #text(size: 10.5pt, style: "italic", fill: theme.text-primary)[#quote]
    #if author != "" [
      #v(6pt)
      #text(size: 9pt, weight: "semibold", fill: theme.text-secondary)[
        #author
        #if role != "" [ — #role]
      ]
    ]
  ]
}

// Timeline entry
#let timeline-entry(date, title, description: "") = {
  block(below: 10pt)[
    #grid(
      columns: (auto, 1fr),
      column-gutter: 12pt,
      [
        #box(
          fill: theme.primary.lighten(85%),
          inset: (x: 8pt, y: 4pt),
          radius: 3pt,
          text(size: 8pt, weight: "bold", fill: theme.primary)[#date],
        )
      ],
      [
        #text(font: fonts.heading, size: 10.5pt, weight: "semibold")[#title]
        #if description != "" [
          #v(2pt)
          #text(size: 9.5pt, fill: theme.text-secondary)[#description]
        ]
      ],
    )
  ]
}
