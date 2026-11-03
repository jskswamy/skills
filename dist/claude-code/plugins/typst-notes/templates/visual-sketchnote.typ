// visual-sketchnote.typ - Creative illustrated notes with CeTZ canvas
// Central concept with radiating branches, annotations, and mixed typography

#import "base.typ": *

#let visual-sketchnote(
  title: "Sketchnote",
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
    margin: (top: 1.5cm, bottom: 1.5cm, left: 2cm, right: 2cm),
  )
  set text(font: f.body, size: 10pt, fill: t.text-primary)

  // Playful header
  align(center)[
    #text(font: f.heading, size: 28pt, weight: "bold", fill: t.primary)[#title]
  ]
  v(8pt)
  align(center)[
    #line(length: 40%, stroke: 2pt + t.primary)
  ]
  v(16pt)

  // Show rules - more playful for sketchnotes
  show heading.where(level: 1): it => {
    set text(font: f.heading, size: 16pt, weight: "bold", fill: t.primary)
    block(above: 1.2em, below: 0.5em, align(center, it))
  }
  show heading.where(level: 2): it => {
    set text(font: f.heading, size: 13pt, weight: "bold", fill: t.secondary)
    block(above: 1em, below: 0.4em, it)
  }
  show heading.where(level: 3): it => {
    set text(font: f.heading, size: 11pt, weight: "semibold", fill: t.text-primary)
    block(above: 0.8em, below: 0.3em, it)
  }
  show raw: set text(font: f.mono, size: 9pt)

  body
}

// Mind map canvas using CeTZ
// branches: array of (label, array of sub-points)
#let sketchnote-canvas(center: "Main Idea", branches: (), size: (16, 12)) = {
  import "@preview/cetz:0.3.4"

  let branch-colors = (
    theme.chart-1,
    theme.chart-2,
    theme.chart-3,
    theme.chart-4,
    theme.chart-5,
    theme.secondary,
  )

  let num-branches = branches.len()
  let angle-step = if num-branches > 0 { 360deg / num-branches } else { 0deg }

  cetz.canvas(length: 1cm, {
    import cetz.draw: *

    let cx = size.at(0) / 2
    let cy = size.at(1) / 2

    // Central node
    circle(
      (cx, cy),
      radius: 1.5,
      fill: theme.primary.lighten(85%),
      stroke: 2pt + theme.primary,
    )
    content((cx, cy), text(font: fonts.heading, size: 12pt, weight: "bold", fill: theme.primary)[#center])

    // Branches
    for (i, branch) in branches.enumerate() {
      let (label, points) = branch
      let color = branch-colors.at(calc.rem(i, branch-colors.len()))
      let angle = -90deg + angle-step * i
      let branch-r = 4.5
      let bx = cx + branch-r * calc.cos(angle)
      let by = cy + branch-r * calc.sin(angle)

      // Branch line
      line(
        (cx + 1.5 * calc.cos(angle), cy + 1.5 * calc.sin(angle)),
        (bx, by),
        stroke: 2pt + color,
      )

      // Branch node
      circle(
        (bx, by),
        radius: 1.0,
        fill: color.lighten(85%),
        stroke: 1.5pt + color,
      )
      content((bx, by), text(size: 9pt, weight: "bold", fill: color)[#label])

      // Sub-points
      for (j, point) in points.enumerate() {
        let sub-angle = angle + (j - (points.len() - 1) / 2) * 20deg
        let sub-r = 2.2
        let sx = bx + sub-r * calc.cos(sub-angle)
        let sy = by + sub-r * calc.sin(sub-angle)

        line(
          (bx + 1.0 * calc.cos(sub-angle), by + 1.0 * calc.sin(sub-angle)),
          (sx, sy),
          stroke: 1pt + color.lighten(40%),
        )
        content(
          (sx, sy),
          box(
            fill: white,
            stroke: 0.5pt + color.lighten(60%),
            inset: 4pt,
            radius: 3pt,
            text(size: 7.5pt, fill: theme.text-primary)[#point],
          ),
        )
      }
    }
  })
}

// Annotation box - floating note style
#let annotation(body-content, accent: theme.secondary) = {
  block(
    fill: accent.lighten(92%),
    stroke: 1pt + accent.lighten(40%),
    inset: 10pt,
    radius: 8pt,
    width: auto,
    below: 8pt,
    [
      #text(size: 9.5pt, style: "italic")[#body-content]
    ],
  )
}

// Concept bubble - for standalone ideas
#let bubble(label, accent: theme.primary) = {
  box(
    fill: accent.lighten(88%),
    stroke: 1.5pt + accent.lighten(40%),
    inset: (x: 12pt, y: 8pt),
    radius: 20pt,
    text(font: fonts.heading, size: 10pt, weight: "semibold", fill: accent)[#label],
  )
}

// Connection arrow with label
#let connection(from, to, label: "") = {
  // For text-based representation
  block(below: 4pt)[
    #text(weight: "semibold")[#from]
    #h(4pt)
    #text(fill: theme.text-secondary)[→]
    #h(4pt)
    #text(weight: "semibold")[#to]
    #if label != "" [
      #h(4pt)
      #text(size: 8pt, fill: theme.text-secondary)[(#label)]
    ]
  ]
}

// Quote highlight
#let quote-highlight(body-content, attribution: "") = {
  block(
    inset: (left: 16pt, rest: 10pt),
    above: 10pt,
    below: 10pt,
  )[
    #text(size: 24pt, fill: theme.primary.lighten(60%))["]
    #v(-12pt)
    #pad(left: 8pt)[
      #text(size: 11pt, style: "italic", fill: theme.text-primary)[#body-content]
      #if attribution != "" [
        #v(4pt)
        #text(size: 9pt, fill: theme.text-secondary)[— #attribution]
      ]
    ]
  ]
}

// Section divider with icon
#let section-divider(label) = {
  v(12pt)
  align(center)[
    #line(length: 30%, stroke: 1pt + theme.border)
    #h(8pt)
    #text(font: fonts.heading, size: 10pt, weight: "bold", fill: theme.text-secondary)[#label]
    #h(8pt)
    #line(length: 30%, stroke: 1pt + theme.border)
  ]
  v(8pt)
}
