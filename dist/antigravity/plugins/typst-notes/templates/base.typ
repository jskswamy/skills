// base.typ - Shared utilities, page setup, fonts, and theme system
// All templates import this for consistent styling

// Theme colors (overridable via template parameters)
#let theme = (
  primary: rgb("#2563eb"),
  secondary: rgb("#7c3aed"),
  background: rgb("#ffffff"),
  surface: rgb("#f8fafc"),
  text-primary: rgb("#1e293b"),
  text-secondary: rgb("#64748b"),
  border: rgb("#e2e8f0"),
  success: rgb("#16a34a"),
  warning: rgb("#d97706"),
  error: rgb("#dc2626"),
  chart-1: rgb("#2563eb"),
  chart-2: rgb("#7c3aed"),
  chart-3: rgb("#0891b2"),
  chart-4: rgb("#16a34a"),
  chart-5: rgb("#d97706"),
)

// Font configuration
#let fonts = (
  heading: "Inter",
  body: "Source Serif 4",
  mono: "JetBrains Mono",
)

// Apply theme to a document
#let apply-theme(custom-theme: (:), custom-fonts: (:), body) = {
  let t = theme
  for (key, value) in custom-theme {
    t.insert(key, value)
  }
  let f = fonts
  for (key, value) in custom-fonts {
    f.insert(key, value)
  }

  set text(font: f.body, size: 11pt, fill: t.text-primary)
  set heading(numbering: none)
  show heading.where(level: 1): it => {
    set text(font: f.heading, size: 18pt, weight: "bold", fill: t.primary)
    block(above: 1.5em, below: 0.8em, it)
  }
  show heading.where(level: 2): it => {
    set text(font: f.heading, size: 14pt, weight: "semibold", fill: t.text-primary)
    block(above: 1.2em, below: 0.6em, it)
  }
  show heading.where(level: 3): it => {
    set text(font: f.heading, size: 12pt, weight: "semibold", fill: t.text-secondary)
    block(above: 1em, below: 0.5em, it)
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

// Utility: accent line separator
#let accent-line(color: theme.primary, width: 100%) = {
  line(length: width, stroke: 2pt + color)
}

// Utility: info card
#let info-card(title: "", body-content, accent: theme.primary) = {
  block(
    stroke: (left: 3pt + accent, rest: 0.5pt + theme.border),
    fill: theme.surface,
    inset: 12pt,
    radius: (right: 4pt),
    width: 100%,
    [
      #if title != "" [
        #text(font: fonts.heading, size: 11pt, weight: "semibold", fill: accent)[#title]
        #v(4pt)
      ]
      #body-content
    ],
  )
}

// Utility: metric box
#let metric-box(label, value, accent: theme.primary) = {
  block(
    stroke: 0.5pt + theme.border,
    fill: theme.surface,
    inset: 10pt,
    radius: 4pt,
    width: 100%,
    align(center)[
      #text(font: fonts.heading, size: 20pt, weight: "bold", fill: accent)[#value]
      #v(2pt)
      #text(size: 9pt, fill: theme.text-secondary)[#label]
    ],
  )
}

// Utility: callout box (tip, warning, error)
#let callout(type: "tip", body-content) = {
  let (icon, color) = if type == "tip" {
    ("💡", theme.primary)
  } else if type == "warning" {
    ("⚠️", theme.warning)
  } else if type == "error" {
    ("❌", theme.error)
  } else {
    ("ℹ️", theme.primary)
  }

  block(
    stroke: (left: 3pt + color, rest: 0.5pt + theme.border),
    fill: color.lighten(95%),
    inset: 10pt,
    radius: (right: 4pt),
    width: 100%,
    [#icon #body-content],
  )
}

// Utility: tag/badge
#let badge(label, color: theme.primary) = {
  box(
    fill: color.lighten(85%),
    stroke: 0.5pt + color.lighten(50%),
    inset: (x: 6pt, y: 2pt),
    radius: 3pt,
    text(size: 8pt, weight: "semibold", fill: color.darken(20%))[#label],
  )
}

// Utility: decision/highlight box
#let highlight-box(title: "Key Decision", body-content, accent: theme.success) = {
  block(
    stroke: 1pt + accent,
    fill: accent.lighten(95%),
    inset: 12pt,
    radius: 6pt,
    width: 100%,
    [
      #text(font: fonts.heading, size: 11pt, weight: "bold", fill: accent)[#title]
      #v(6pt)
      #body-content
    ],
  )
}

// Utility: page header
#let page-header(title, subtitle: "", date: "") = {
  block(width: 100%)[
    #text(font: fonts.heading, size: 24pt, weight: "bold", fill: theme.primary)[#title]
    #if subtitle != "" [
      #v(4pt)
      #text(size: 13pt, fill: theme.text-secondary)[#subtitle]
    ]
    #if date != "" [
      #h(1fr)
      #text(size: 10pt, fill: theme.text-secondary)[#date]
    ]
  ]
  accent-line()
  v(12pt)
}
