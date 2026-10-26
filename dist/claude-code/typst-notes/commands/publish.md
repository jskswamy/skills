---
name: publish
description: Generate beautiful PDF/HTML shareable notes using Typst with professional templates
arguments:
  - name: template
    description: "Template to use: exec, cheat, sketch, meeting, study, tech, portfolio"
    required: false
  - name: theme
    description: "Color theme: light, dark, minimal, vibrant"
    required: false
  - name: format
    description: "Output format: pdf, html, or both"
    required: false
  - name: output
    description: "Output filename (without extension)"
    required: false
  - name: source
    description: "Content source: conversation, jot:<note-path>, or file:<path>"
    required: false
---

# Publish Command

Invoke the `typst-publish` skill with this command request.
Forward all arguments exactly as provided.
