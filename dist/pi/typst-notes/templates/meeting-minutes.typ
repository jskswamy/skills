// meeting-minutes.typ - Structured meeting notes with action items
// Clean layout with metadata header, agenda, decisions, and action items

#import "base.typ": *

#let meeting-minutes(
  title: "Meeting Minutes",
  date: "",
  time: "",
  location: "",
  attendees: (),
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
    #text(font: f.heading, size: 20pt, weight: "bold", fill: t.primary)[#title]
    #v(6pt)
    #grid(
      columns: (auto, 1fr),
      column-gutter: 16pt,
      row-gutter: 4pt,
      ..{
        let items = ()
        if date != "" {
          items.push(text(size: 9pt, weight: "semibold", fill: t.text-secondary)[Date:])
          items.push(text(size: 9pt)[#date])
        }
        if time != "" {
          items.push(text(size: 9pt, weight: "semibold", fill: t.text-secondary)[Time:])
          items.push(text(size: 9pt)[#time])
        }
        if location != "" {
          items.push(text(size: 9pt, weight: "semibold", fill: t.text-secondary)[Location:])
          items.push(text(size: 9pt)[#location])
        }
        items
      }
    )
  ]
  v(4pt)
  line(length: 100%, stroke: 2pt + t.primary)
  v(8pt)

  // Attendees
  if attendees.len() > 0 {
    block(
      fill: t.surface,
      stroke: 0.5pt + t.border,
      inset: 10pt,
      radius: 4pt,
      width: 100%,
    )[
      #text(font: f.heading, size: 10pt, weight: "semibold", fill: t.text-secondary)[Attendees]
      #v(4pt)
      #grid(
        columns: (1fr, 1fr),
        column-gutter: 12pt,
        row-gutter: 3pt,
        ..attendees.map(a => {
          let (name, role) = a
          [#text(weight: "semibold")[#name] #text(size: 9pt, fill: t.text-secondary)[— #role]]
        })
      )
    ]
    v(12pt)
  }

  // Show rules
  show heading.where(level: 1): it => {
    set text(font: f.heading, size: 13pt, weight: "bold", fill: t.primary)
    block(above: 1.2em, below: 0.5em, it)
  }
  show heading.where(level: 2): it => {
    set text(font: f.heading, size: 11pt, weight: "semibold", fill: t.text-primary)
    block(above: 0.8em, below: 0.4em, it)
  }
  show raw: set text(font: f.mono, size: 9pt)

  body
}

// Numbered agenda item
#let agenda-item(number, title, body-content) = {
  block(above: 10pt, below: 6pt)[
    #grid(
      columns: (auto, 1fr),
      column-gutter: 8pt,
      box(
        fill: theme.primary.lighten(85%),
        inset: (x: 6pt, y: 3pt),
        radius: 3pt,
        text(size: 10pt, weight: "bold", fill: theme.primary)[#number],
      ),
      text(font: fonts.heading, size: 11pt, weight: "semibold")[#title],
    )
    #v(4pt)
    #pad(left: 28pt, body-content)
  ]
}

// Decision highlight box
#let decision(body-content) = {
  block(
    stroke: 1pt + theme.success,
    fill: theme.success.lighten(95%),
    inset: 10pt,
    radius: 5pt,
    width: 100%,
    below: 8pt,
    [
      #text(font: fonts.heading, size: 9pt, weight: "bold", fill: theme.success)[DECISION]
      #h(6pt)
      #body-content
    ],
  )
}

// Action item entry
#let action-item(who, what, when) = {
  block(below: 4pt)[
    #grid(
      columns: (auto, 1fr, auto),
      column-gutter: 10pt,
      box(
        fill: theme.primary.lighten(90%),
        inset: (x: 5pt, y: 2pt),
        radius: 3pt,
        text(size: 8pt, weight: "semibold", fill: theme.primary)[#who],
      ),
      text(size: 9.5pt)[#what],
      text(size: 8.5pt, fill: theme.text-secondary)[#when],
    )
  ]
}

// Action items table (alternative to individual items)
#let action-items-table(items) = {
  block(above: 8pt)[
    #text(font: fonts.heading, size: 11pt, weight: "semibold", fill: theme.primary)[Action Items]
    #v(6pt)
    #table(
      columns: (auto, 1fr, auto),
      stroke: 0.5pt + theme.border,
      inset: 8pt,
      fill: (_, y) => if y == 0 { theme.surface } else { none },
      text(size: 9pt, weight: "bold")[Who],
      text(size: 9pt, weight: "bold")[What],
      text(size: 9pt, weight: "bold")[When],
      ..items.map(i => {
        let (who, what, when) = i
        (
          text(size: 9pt, weight: "semibold")[#who],
          text(size: 9pt)[#what],
          text(size: 9pt, fill: theme.text-secondary)[#when],
        )
      }).flatten()
    )
  ]
}

// Note/comment block
#let note(body-content) = {
  block(
    stroke: (left: 2pt + theme.text-secondary, rest: none),
    inset: (left: 10pt, y: 4pt),
    below: 6pt,
    text(size: 9.5pt, style: "italic", fill: theme.text-secondary)[#body-content],
  )
}
