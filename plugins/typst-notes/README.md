# typst-notes

Generate beautiful PDF/HTML shareable notes using [Typst](https://typst.app) with 7 professional templates, infographics support, and modern typography.

## Features

- **7 Professional Templates:** Executive summary, cheat sheet, sketchnote, meeting minutes, study guide, technical brief, portfolio
- **Multiple Themes:** Light, dark, minimal, and vibrant color schemes
- **Auto Infographics:** CeTZ charts, Fletcher flowcharts, Pintorita sequence diagrams
- **Multi-Format Output:** Generate PDF, HTML, or both from the same source
- **Jot Integration:** Publish your jot captures directly as beautiful documents

## Installation

```bash
claude /install github:jskswamy/skills/plugins/typst-notes
```

### Prerequisites

One of the following for compilation:
- **Typst** installed globally (`brew install typst`, `cargo install typst-cli`, or `nix-env -iA nixpkgs.typst`)
- **nix-shell** available (automatic fallback - no global install needed)

## Usage

```bash
/publish [--template exec|cheat|sketch|meeting|study|tech|portfolio]
         [--theme light|dark|minimal|vibrant]
         [--format pdf|html|both]
         [--output <name>]
         [--source conversation|jot:<path>|file:<path>]
         [content description...]
```

### Examples

```bash
# Generate an executive summary from the conversation
/publish --template exec

# Create a cheat sheet for the topic discussed
/publish --template cheat --theme dark

# Publish a jot note as a study guide
/publish --template study --source jot:notes/react-hooks.md

# Generate a technical brief as both PDF and HTML
/publish --template tech --format both --output api-design
```

## Templates

| Template | Description | Layout |
|----------|-------------|--------|
| `exec` | Executive Summary | Portrait A4, metrics grid, findings, recommendations |
| `cheat` | Cheat Sheet | Landscape A4, 2-3 columns, dense reference card |
| `sketch` | Visual Sketchnote | CeTZ mind map, annotations, mixed typography |
| `meeting` | Meeting Minutes | Attendees, agenda, decisions, action items table |
| `study` | Study Guide | Objectives, concepts, vocabulary, practice questions |
| `tech` | Technical Brief | Architecture diagrams, specs table, code examples |
| `portfolio` | Creative Portfolio | Project cards, hero sections, technology badges |

## Themes

| Theme | Description |
|-------|-------------|
| `light` | Clean blue accent on white (default) |
| `dark` | Bright accents on dark navy |
| `minimal` | Grayscale, distraction-free |
| `vibrant` | Bold red/purple, high energy |

## Infographics

Automatically suggests and generates data visualizations:

- **Bar/Line charts** via CeTZ-Plot
- **Flowcharts & architecture diagrams** via Fletcher
- **Sequence diagrams** via Pintorita
- **Mind maps** via custom CeTZ

## Jot Integration

Publish jot captures directly:

```bash
/publish --source jot:notes/meeting-2024-01-15.md --template meeting
```

## Settings

Create `.claude/typst-notes.local.md` in your project:

```yaml
---
default_template: exec
default_theme: light
default_format: pdf
output_path: ./notes
font_heading: "Inter"
font_body: "Source Serif 4"
font_mono: "JetBrains Mono"
accent_color: "#2563eb"
---
```

## Bundled Fonts

All fonts are OFL-licensed and included:
- **Inter** - Modern sans-serif for headings
- **Source Serif 4** - Readable serif for body text
- **JetBrains Mono** - Programming font for code blocks

## License

Plugin code: MIT
Bundled fonts: SIL Open Font License (see individual LICENSE files in `fonts/`)
