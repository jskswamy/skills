---
name: conversation
description: Template for sketching conversation summaries
layout: radial
---

# Conversation Template

Structure for visualizing conversation content as a mind-map style diagram.

## Content Extraction

From the conversation, identify:

1. **Main Topic** (center node)
   - The primary subject being discussed
   - Usually from the initial user request

2. **Key Topics** (level 1 branches)
   - Major themes or areas covered
   - Typically 3-6 main branches

3. **Details** (level 2 nodes)
   - Specific points under each topic
   - Decisions made
   - Questions answered

4. **Action Items** (highlighted nodes)
   - Next steps mentioned
   - Tasks to do
   - Follow-ups needed

5. **Connections** (arrows)
   - Relationships between topics
   - Dependencies
   - Cause-effect links

## Layout Structure

```
                    [Topic 2]
                        |
                    [Detail]

[Topic 1]----[Main Topic]----[Topic 3]
    |             |              |
[Detail]     [Detail]       [Detail]
    |
[Action]
```

## Element Placement

| Element | Position | Color |
|---------|----------|-------|
| Main Topic | Center (canvas midpoint) | `#a5d8ff` (blue) |
| Key Topics | Radial around center | `#b2f2bb` (green) |
| Details | Below/beside parent topic | `#e9ecef` (gray) |
| Actions | Distinct position | `#ffec99` (yellow) |
| Questions | If unresolved | `#ffc9c9` (red) |

## Spacing

- Main topic at center: `(canvasWidth/2, canvasHeight/2)`
- Level 1 topics: 200px from center
- Level 2 details: 150px from parent
- Minimum gap: 40px between elements

## Arrow Style

- From center to topics: Straight or curved
- Topic to detail: Short, direct
- Cross-connections: Dashed stroke style

## Text Guidelines

- **Main topic:** 24px font, bold feel
- **Key topics:** 20px font
- **Details:** 16px font
- **Actions:** 16px font, distinct color

## Example Structure

For a conversation about "Building a REST API":

```
Main: "REST API Design"
├── Topic: Authentication
│   ├── Detail: JWT tokens
│   └── Detail: OAuth2 support
├── Topic: Endpoints
│   ├── Detail: /users CRUD
│   └── Detail: /products CRUD
├── Topic: Database
│   └── Detail: PostgreSQL
└── Action: Create schema first
```
