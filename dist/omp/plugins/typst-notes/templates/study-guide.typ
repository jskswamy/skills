// study-guide.typ - Educational material with objectives, concepts, and exercises
// Learning-focused layout with checkboxes, vocabulary, diagrams, and practice questions

#import "base.typ": *

#let study-guide(
  title: "Study Guide",
  subject: "",
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
    #if subject != "" [
      #text(size: 9pt, weight: "semibold", fill: t.text-secondary)[#upper(subject)]
      #v(2pt)
    ]
    #text(font: f.heading, size: 22pt, weight: "bold", fill: t.primary)[#title]
  ]
  v(6pt)
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
  show raw: set text(font: f.mono, size: 9pt)
  show raw.where(block: true): it => {
    block(
      fill: t.surface,
      stroke: 0.5pt + t.border,
      inset: 8pt,
      radius: 4pt,
      width: 100%,
      it,
    )
  }

  body
}

// Learning objectives with checkboxes
#let objectives(items) = {
  block(
    fill: theme.primary.lighten(95%),
    stroke: 0.5pt + theme.primary.lighten(60%),
    inset: 12pt,
    radius: 6pt,
    width: 100%,
    below: 14pt,
  )[
    #text(font: fonts.heading, size: 11pt, weight: "bold", fill: theme.primary)[Learning Objectives]
    #v(6pt)
    #for item in items [
      #box(
        stroke: 1pt + theme.border,
        width: 10pt,
        height: 10pt,
        radius: 2pt,
      )
      #h(6pt)
      #item
      #v(4pt)
    ]
  ]
}

// Concept explanation with example
#let concept(name, body-content) = {
  block(above: 10pt, below: 10pt)[
    #block(
      stroke: (left: 3pt + theme.primary, rest: 0.5pt + theme.border),
      fill: theme.surface,
      inset: 12pt,
      radius: (right: 4pt),
      width: 100%,
    )[
      #text(font: fonts.heading, size: 11pt, weight: "bold", fill: theme.primary)[#name]
      #v(6pt)
      #body-content
    ]
  ]
}

// Vocabulary table
#let vocab(terms) = {
  block(above: 8pt, below: 10pt)[
    #text(font: fonts.heading, size: 11pt, weight: "semibold", fill: theme.text-primary)[Key Terms]
    #v(6pt)
    #table(
      columns: (auto, 1fr),
      stroke: 0.5pt + theme.border,
      inset: 8pt,
      fill: (_, y) => if y == 0 { theme.surface } else if calc.rem(y, 2) == 0 { theme.surface.lighten(50%) } else { none },
      text(size: 9pt, weight: "bold")[Term],
      text(size: 9pt, weight: "bold")[Definition],
      ..terms.map(t => {
        let (term, def) = t
        (
          text(size: 9.5pt, weight: "semibold", fill: theme.primary)[#term],
          text(size: 9.5pt)[#def],
        )
      }).flatten()
    )
  ]
}

// Practice question
#let practice-question(number: none, body-content) = {
  block(
    stroke: 0.5pt + theme.border,
    fill: theme.surface,
    inset: 10pt,
    radius: 4pt,
    width: 100%,
    below: 8pt,
  )[
    #if number != none [
      #box(
        fill: theme.primary,
        inset: (x: 6pt, y: 3pt),
        radius: 3pt,
        text(size: 8pt, weight: "bold", fill: white)[Q#number],
      )
      #h(6pt)
    ]
    #body-content
  ]
}

// Summary/takeaways box
#let summary(body-content) = {
  block(
    stroke: 1.5pt + theme.primary,
    fill: theme.primary.lighten(95%),
    inset: 14pt,
    radius: 6pt,
    width: 100%,
    above: 14pt,
  )[
    #text(font: fonts.heading, size: 12pt, weight: "bold", fill: theme.primary)[Summary & Key Takeaways]
    #v(8pt)
    #body-content
  ]
}

// Example box
#let example(title: "Example", body-content) = {
  block(
    stroke: (left: 3pt + theme.secondary, rest: 0.5pt + theme.border),
    inset: 10pt,
    radius: (right: 4pt),
    width: 100%,
    below: 8pt,
  )[
    #text(size: 9pt, weight: "semibold", fill: theme.secondary)[#title]
    #v(4pt)
    #body-content
  ]
}
