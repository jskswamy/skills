# Skills Marketplace

A curated collection of reusable agent capabilities focused on developer workflows, code generation, and productivity.

## About

This repository started as a Claude Code plugin marketplace and now keeps reusable behavior in harness-neutral resource directories. Claude Code remains supported through generated multi-plugin marketplace wrappers in `plugins/`, while Pi can load the canonical root `skills/` directly through `package.json` package metadata.

All plugins are open to anyone who finds them helpful.

## Philosophy

- **Practical focus**: Plugins solve real, everyday problems in development workflows
- **Simplicity first**: Each plugin does one thing well without unnecessary complexity
- **Quality over quantity**: A small number of polished, reliable plugins is better than many half-baked ones

## Quick Start

### Prerequisites

- [Claude Code](https://claude.ai/code) installed on your machine for Claude plugins
- [Pi](https://pi.dev) installed on your machine for Pi package usage

### Claude Code Installation

1. Add this marketplace to Claude Code:

   ```
   /plugin marketplace add jskswamy/skills
   ```

2. Browse available plugins:

   ```
   /plugin search @skills
   ```

3. Install any plugin:

   ```
   /plugin install <plugin-name>@skills
   ```

4. Use the plugin via its commands or skills (see individual plugin documentation)

### Pi Installation

Install the package from git:

```bash
pi install git:github.com/jskswamy/skills@<tag>
```

### Repository Layout

Canonical reusable resources live at the repository root:

```text
skills/       # Agent Skills source of truth
commands/     # command markdown grouped by plugin
agents/       # agent prompts grouped by plugin
hooks/        # hook definitions and scripts grouped by plugin
templates/    # reusable templates and static assets
```

Claude Code install wrappers are generated into `plugins/` from `registry.json` with `npm run build`. Do not edit copied resources under `plugins/<name>/` directly; edit canonical root resources and regenerate.

## Available Plugins

<!-- PLUGINS:START -->


### codebase

Intelligent codebase exploration powered by codebase-memory-mcp. Natural language queries, change impact analysis, symbol graph traversal, and automatic brainstorming/planning integration.

**Features:**
- Codebase
- Exploration
- Semantic Search
- Impact Analysis
- Codebase Memory

**Install:**
```
/plugin install codebase@skills
```

**Usage:**
```
/codebase
```

[View documentation](./plugins/codebase/README.md)


### commit-tools

End-to-end commit hygiene: write atomic commits with style enforcement, review and consolidate them before push, validate the final history

**Features:**
- Git
- Commit
- Atomic
- Classic
- Conventional

**Install:**
```
/plugin install commit-tools@skills
```

**Usage:**
```
/committools
```

[View documentation](./plugins/commit-tools/README.md)


### craft

The craft of building software end-to-end: capture ideas, understand problems, decompose work into structured units, dispatch subagents to execute them, and commit with full task context

**Features:**
- Craft
- Work
- Build
- Planning
- Decomposition

**Install:**
```
/plugin install craft@skills
```

**Usage:**
```
/craft
```

[View documentation](./plugins/craft/README.md)


### devenv

Initialize and manage Nix flake development environments with auto-detection and security tooling

**Features:**
- Auto-detection: Automatically detects your project's tech stack and suggests appropriate packages
- Native Nix pre-commit: Uses [git-hooks.nix](https://github.com/cachix/git-hooks.nix) for pure Nix pre-commit integration
- Security tooling: Built-in support for gitleaks and SAST tools
- Nix best practices: Generated flakes follow Nix conventions and are automatically linted/formatted
- No system dependencies: All tools run via Nix, ensuring reproducibility

**Install:**
```
/plugin install devenv@skills
```

**Usage:**
```
/devenv
```

[View documentation](./plugins/devenv/README.md)


### guardrails

Efficiency guardrails for Claude - IDE refactoring handoff with automatic pattern detection, extensible to security, cost, and testing patterns

**Features:**
- Guardrails
- Refactoring
- Ide
- Efficiency
- Handoff

**Install:**
```
/plugin install guardrails@skills
```

**Usage:**
```
/handoff
```

[View documentation](./plugins/guardrails/README.md)


### jot

Quick, low-friction capture of notes, tasks, ideas, session summaries, and tech radar blips with Obsidian-style auto-linking

**Features:**
- Quick captures: Task, note, idea, session, blip - minimal friction
- Full captures: Article, video, blip (GitHub/tools), person, book, organisation, trove, research - URL-based extraction
- Feynman teaching: Interactive `/teach` command for deepening understanding of papers, videos, articles, and concepts you've already studied
- Teaching notes: Capture your learning journey with analogies, misconceptions, and applied scenarios
- Session summaries: Capture Claude Code session outcomes with guided questions

**Install:**
```
/plugin install jot@skills
```

**Usage:**
```
/capture task Buy groceries
/capture note Meeting notes about project X
/capture idea What if we tried approach Y
/capture blip Docker --ring adopt --quadrant platforms
```

[View documentation](./plugins/jot/README.md)


### refactor

Semantic refactoring opportunity detection. Scans committed code for structural duplication (Fowler catalog), code smells (Fowler/Beck), GoF design pattern opportunities, SOLID/DRY principle violations, and language-idiomatic anti-patterns (Go, Python, TypeScript). Creates beads issues with TDD-first refactoring plans. Hooks into craft after each task closes.

**Features:**
- Refactoring
- Duplication
- Fowler
- Beads
- Codebase Memory

**Install:**
```
/plugin install refactor@skills
```

**Usage:**
```
/refactor:scan                   # scan changes since upstream
/refactor:scan --base abc1234    # scan changes since specific SHA
```

[View documentation](./plugins/refactor/README.md)


### sketch-note

Generate visual sketch notes in Excalidraw format from conversations, code architecture, or custom content

**Features:**
- Multiple content modes: Capture conversation summaries, visualize code architecture, or sketch custom content
- Excalidraw output: Creates `.excalidraw` files that open directly in Excalidraw
- PNG export: Interactive workflow detects available tools and guides you through export options
- Customizable styling: Configure background, pen type, roughness, and visual effects
- Persistent preferences: Settings saved per-project for consistent output

**Install:**
```
/plugin install sketch-note@skills
```

**Usage:**
```
/sketch                           # Interactive mode selection
/sketch --mode conversation       # Sketch current conversation
/sketch --mode code               # Visualize code architecture
/sketch --mode custom             # Custom content input
/sketch --output my-diagram       # Specify output filename
/sketch --format png              # PNG via Excalidraw conversion
```

[View documentation](./plugins/sketch-note/README.md)


### study

Adaptive study coach with multi-gear learning sessions (Socratic, Explain, Guide, Check, Help) and spaced recall tracking via Feynman loops. Saves coaching notes with gap tracking and a recall log that shows improvement over time.

**Features:**
- Learning
- Coaching
- Feynman
- Recall
- Spaced Repetition

**Install:**
```
/plugin install study@skills
```

**Usage:**
```
/study
```

[View documentation](./plugins/study/README.md)


### typst-notes

Generate beautiful PDF/HTML shareable notes using Typst with 7 professional templates, infographics, and modern typography

**Features:**
- 7 Professional Templates: Executive summary, cheat sheet, sketchnote, meeting minutes, study guide, technical brief, portfolio
- Multiple Themes: Light, dark, minimal, and vibrant color schemes
- Auto Infographics: CeTZ charts, Fletcher flowcharts, Pintorita sequence diagrams
- Multi-Format Output: Generate PDF, HTML, or both from the same source
- Jot Integration: Publish your jot captures directly as beautiful documents

**Install:**
```
/plugin install typst-notes@skills
```

**Usage:**
```
/publish [--template exec|cheat|sketch|meeting|study|tech|portfolio]
         [--theme light|dark|minimal|vibrant]
         [--format pdf|html|both]
         [--output <name>]
         [--source conversation|jot:<path>|file:<path>]
         [content description...]
```

[View documentation](./plugins/typst-notes/README.md)
<!-- PLUGINS:END -->

## Roadmap

### Dev Workflows
- Code review automation
- Test generation and coverage analysis

### Code Generation
- Project scaffolding and boilerplate generators
- Component templates for common frameworks

### Productivity
- Documentation generators
- Task and todo management

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on creating and submitting plugins.

## License

MIT
