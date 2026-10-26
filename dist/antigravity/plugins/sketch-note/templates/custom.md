---
name: custom
description: Template for custom user-defined sketches
layout: adaptive
---

# Custom Template

Flexible structure for user-provided descriptions and concepts.

## Content Parsing

From user description, identify:

1. **Nouns** → Boxes/nodes
   - Entities, objects, components
   - People, systems, concepts

2. **Verbs** → Arrows/connections
   - Actions, flows, relationships
   - "sends to", "depends on", "creates"

3. **Adjectives** → Styling hints
   - "main" → Primary color
   - "optional" → Dashed style
   - "important" → Bold/highlighted

4. **Structure words** → Layout
   - "flow", "process", "steps" → Left-to-right
   - "hierarchy", "levels" → Top-to-bottom
   - "related", "connected" → Clustered

## Diagram Type Detection

| Keywords | Diagram Type | Layout |
|----------|-------------|--------|
| flow, process, steps, then | Flowchart | Left-to-right |
| hierarchy, levels, parent, child | Tree | Top-to-bottom |
| components, modules, parts | Architecture | Layered |
| concepts, ideas, related | Mind map | Radial |
| sequence, timeline, events | Sequence | Left-to-right |
| compare, vs, options | Comparison | Side-by-side |

## Adaptive Layout

### Flowchart Layout
```
[Start] → [Step 1] → [Step 2] → [End]
              ↓
          [Branch]
```

### Hierarchical Layout
```
        [Root]
       /      \
   [Child]  [Child]
   /    \
[Leaf] [Leaf]
```

### Mind Map Layout
```
     [Topic]
    /   |   \
[Idea] [Idea] [Idea]
```

### Comparison Layout
```
┌─────────┐    ┌─────────┐
│ Option A│    │ Option B│
├─────────┤    ├─────────┤
│ Pro 1   │    │ Pro 1   │
│ Pro 2   │    │ Pro 2   │
│ Con 1   │    │ Con 1   │
└─────────┘    └─────────┘
```

## Element Assignment

| Concept Type | Shape | Default Color |
|-------------|-------|---------------|
| Primary entity | Rectangle | `#a5d8ff` |
| Secondary entity | Rectangle | `#b2f2bb` |
| Decision point | Diamond | `#ffec99` |
| Terminal (start/end) | Ellipse | `#e9ecef` |
| External system | Rectangle (dashed) | `#e9ecef` |
| Data store | Ellipse | `#ffd8a8` |

## Connection Types

| Relationship | Arrow Style |
|-------------|-------------|
| Direct flow | Solid, single arrow |
| Data transfer | Solid, labeled |
| Optional path | Dashed |
| Bidirectional | Double arrow |
| Dependency | Dotted |

## Sizing Guidelines

- **Primary elements:** 200x100 px
- **Secondary elements:** 150x80 px
- **Small elements:** 100x60 px
- **Text labels:** Fit content + padding

## Example Parsing

User input: "Show how a user request flows through authentication, then to the API, which queries the database"

Parsed elements:
1. `user request` → Start node (ellipse)
2. `authentication` → Process box
3. `API` → Process box
4. `database` → Data store (ellipse)

Connections:
1. User request → Authentication ("flows through")
2. Authentication → API ("then to")
3. API → Database ("queries")

Result:
```
[User Request] → [Authentication] → [API] → [Database]
```

## Fallback Behavior

If structure unclear:
1. Create one box per noun/concept
2. Arrange in grid layout
3. Add arrows for any mentioned relationships
4. Ask user for clarification if ambiguous
