# Background Pattern Implementation

## Background patterns

Since Excalidraw doesn't have native background patterns, implement them as subtle elements:

**Dots pattern:**
- Create small ellipse elements in a grid pattern
- Color: Very light gray (#e0e0e0)
- Size: 2px diameter
- Spacing: 20px grid

**Grid pattern:**
- Create line elements forming a grid
- Color: Very light gray (#e8e8e8)
- Stroke width: 0.5px
- Spacing: 20px

**Lines pattern:**
- Create horizontal line elements
- Color: Very light gray (#e8e8e8)
- Stroke width: 0.5px
- Spacing: 30px

**Note:** Pattern elements should be at the back (lowest z-index) and non-interactive.
