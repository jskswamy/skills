# Skills Marketplace

A curated collection of reusable agent capabilities focused on developer workflows, code generation, and productivity.

## About

This repository started as a Claude Code plugin marketplace and now keeps reusable behavior in harness-neutral resource directories. Claude Code remains supported through generated multi-plugin marketplace wrappers in `plugins/`, while Pi can load the canonical root `skills/` directly through `package.json` package metadata.

All skills and generated harness adapters are open to anyone who finds them helpful.

## Philosophy

- **Practical focus**: Skills solve real, everyday problems in development workflows
- **Simplicity first**: Each workflow does one thing well without unnecessary complexity
- **Quality over quantity**: A small number of polished, reliable skills is better than many half-baked ones

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

4. Use the installed workflows via commands or skills (see individual documentation)

### Pi Installation

Install the package from git:

```bash
pi install git:github.com/jskswamy/skills@<tag>
```

See [Command to Skill Map](docs/command-skill-map.md) for Pi `/skill:<name>` equivalents to the Claude Code commands.

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

## Available Capabilities

<!-- PLUGINS:START -->

This repository publishes the same canonical workflows to multiple agent harnesses:

- **Claude Code**: install a generated plugin and use its slash commands.
- **Pi**: install the package once and invoke canonical skills with `/skill:<name>`.

Install all skills in Pi:

```bash
pi install git:github.com/jskswamy/skills@main
```

Install individual Claude Code plugins from the marketplace:

```text
/plugin marketplace add jskswamy/skills
/plugin install <plugin-name>@skills
```

See [Command to Skill Map](docs/command-skill-map.md) for full command equivalents.
### codebase

Intelligent codebase exploration powered by codebase-memory-mcp. Natural language queries, change impact analysis, symbol graph traversal, and automatic brainstorming/planning integration.

**Claude Code:**

```text
/plugin install codebase@skills
# Commands are documented in the capability README
```
**Pi skills:**

```text
/skill:codebase-explore
/skill:codebase-ask
/skill:codebase-index
/skill:codebase-impact
/skill:codebase-graph
```
[View documentation](./plugins/codebase/README.md)


### commit-tools

End-to-end commit hygiene: write atomic commits with style enforcement, review and consolidate them before push, validate the final history

**Claude Code:**

```text
/plugin install commit-tools@skills
# Commands are documented in the capability README
```
**Pi skills:**

```text
/skill:commit-action
/skill:commit-style
/skill:review-commits
/skill:validate-commits
```
[View documentation](./plugins/commit-tools/README.md)


### craft

The craft of building software end-to-end: capture ideas, understand problems, decompose work into structured units, dispatch subagents to execute them, and commit with full task context

**Claude Code:**

```text
/plugin install craft@skills
# Commands are documented in the capability README
```
**Pi skills:**

```text
/skill:craft-decompose
/skill:execute-tasks
/skill:park-idea
/skill:review-parked
/skill:task-commit
/skill:craft-understand
/skill:craft-backlog
/skill:craft-deps
# plus 2 more skills in registry.json
```
[View documentation](./plugins/craft/README.md)


### devenv

Initialize and manage Nix flake development environments with auto-detection and security tooling

**Claude Code:**

```text
/plugin install devenv@skills
```
**Pi skills:**

```text
/skill:devenv
```
[View documentation](./plugins/devenv/README.md)


### guardrails

Efficiency guardrails for Claude - IDE refactoring handoff with automatic pattern detection, extensible to security, cost, and testing patterns

**Claude Code:**

```text
/plugin install guardrails@skills
# Commands are documented in the capability README
```
**Pi skills:**

```text
/skill:ide-handoff
```
[View documentation](./plugins/guardrails/README.md)


### jot

Quick, low-friction capture of notes, tasks, ideas, session summaries, and tech radar blips with Obsidian-style auto-linking

**Claude Code:**

```text
/plugin install jot@skills
# Commands are documented in the capability README
```
**Pi skills:**

```text
/skill:sketch-from-capture
/skill:jot-capture
/skill:jot-configure
/skill:jot-setup
```
[View documentation](./plugins/jot/README.md)


### refactor

Semantic refactoring opportunity detection. Scans committed code for structural duplication (Fowler catalog), code smells (Fowler/Beck), GoF design pattern opportunities, SOLID/DRY principle violations, and language-idiomatic anti-patterns (Go, Python, TypeScript). Creates beads issues with TDD-first refactoring plans. Hooks into craft after each task closes.

**Claude Code:**

```text
/plugin install refactor@skills
# Commands are documented in the capability README
```
**Pi skills:**

```text
/skill:refactor-scan
```
[View documentation](./plugins/refactor/README.md)


### sketch-note

Generate visual sketch notes in Excalidraw format from conversations, code architecture, or custom content

**Claude Code:**

```text
/plugin install sketch-note@skills
# Commands are documented in the capability README
```
**Pi skills:**

```text
/skill:capture-for-sketch
/skill:excalidraw-format
/skill:sketch-note
```
[View documentation](./plugins/sketch-note/README.md)


### study

Adaptive study coach with multi-gear learning sessions (Socratic, Explain, Guide, Check, Help) and spaced recall tracking via Feynman loops. Saves coaching notes with gap tracking and a recall log that shows improvement over time.

**Claude Code:**

```text
/plugin install study@skills
# Commands are documented in the capability README
```
**Pi skills:**

```text
/skill:study-coach
/skill:study-recall
/skill:study-setup
```
[View documentation](./plugins/study/README.md)


### typst-notes

Generate beautiful PDF/HTML shareable notes using Typst with 7 professional templates, infographics, and modern typography

**Claude Code:**

```text
/plugin install typst-notes@skills
# Commands are documented in the capability README
```
**Pi skills:**

```text
/skill:infographics
/skill:jot-to-publish
/skill:typst-format
/skill:typst-publish
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
