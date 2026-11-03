---
name: code-architecture
description: Template for visualizing code structure and architecture
layout: hierarchical
---

# Code Architecture Template

Structure for visualizing codebase organization and dependencies.

## Content Discovery

Analyze the codebase to identify:

1. **Entry Points** (top level)
   - Main files (main.ts, index.js, app.py)
   - CLI entry points
   - Server bootstraps

2. **Modules/Packages** (core boxes)
   - Major directories
   - Feature modules
   - Service layers

3. **Dependencies** (arrows)
   - Import relationships
   - Data flow direction
   - API calls

4. **External Services** (distinct boxes)
   - Databases
   - APIs
   - Message queues

5. **Shared Utilities** (bottom/side)
   - Common libraries
   - Helpers
   - Types/interfaces

## Layout Structure

```
        [Entry Point]
             |
    ┌────────┼────────┐
    ▼        ▼        ▼
[Module A] [Module B] [Module C]
    │        │        │
    └────────┼────────┘
             ▼
      [Shared Utils]
             │
    ┌────────┼────────┐
    ▼        ▼        ▼
  [DB]    [Cache]   [API]
```

## Element Types by Role

| Role | Shape | Color |
|------|-------|-------|
| Entry Point | Rectangle | `#d0bfff` (purple) |
| Module | Rectangle | `#a5d8ff` (blue) |
| Service | Rectangle | `#b2f2bb` (green) |
| External | Rectangle (dashed) | `#e9ecef` (gray) |
| Database | Ellipse | `#ffd8a8` (orange) |
| Shared/Utils | Rectangle | `#e9ecef` (gray) |

## Dependency Arrows

- **Import:** Solid arrow, standard head
- **Data flow:** Solid arrow with label
- **Optional:** Dashed arrow
- **Bidirectional:** Double-headed arrow

## Layered Layout

Organize by architectural layer:

1. **Top:** Entry points, CLI, API endpoints
2. **Middle:** Business logic, services, modules
3. **Bottom:** Data layer, utilities, infrastructure

Horizontal spacing: 200px between modules
Vertical spacing: 150px between layers

## Module Box Content

Each module box should show:
- Module name (bold)
- Key files count (optional label)
- Brief purpose (small text)

## Grouping

Use frames or visual proximity for:
- Related modules
- Feature areas
- Domain boundaries

## Example Structure

For a typical web app:

```
[API Server] ─────────────────────┐
     │                            │
     ▼                            ▼
[Auth Module]  [User Module]  [Product Module]
     │              │              │
     └──────────────┼──────────────┘
                    ▼
            [Database Layer]
                    │
              ┌─────┼─────┐
              ▼     ▼     ▼
            [DB] [Cache] [S3]
```

## Discovery Commands

Use these patterns to find architecture elements:

```bash
# Find entry points
glob: "**/main.{ts,js,py}" OR "**/index.{ts,js}"

# Find modules
glob: "src/*/" (top-level directories)

# Find imports
grep: "^import|^from|require\\("
```
