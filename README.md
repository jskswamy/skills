# Skills Marketplace

A multi-harness collection of agent skills for real developer workflows:
understanding codebases, keeping commits clean, planning and executing work,
capturing knowledge, publishing notes, and setting up development
environments.

The same canonical skills work in multiple harnesses. Claude Code users install
generated plugins from `plugins/`; Pi users install the package and invoke the
canonical root `skills/` directly.

## What this is

This repository is a curated skills marketplace, not a single app. Each skill
encodes a repeatable workflow an agent can follow: ask better questions about a
codebase, write a cleaner commit, decompose a feature, capture a note, generate
a PDF, or scan for refactoring opportunities.

The repo keeps the reusable source of truth in root directories such as
`skills/`, `commands/`, `agents/`, `hooks/`, `templates/`, and
`shared-scripts/`. Claude Code install wrappers are generated from those
canonical resources with `npm run build`.

## What you can do with it

| Area | Skills | What it helps with |
| --- | --- | --- |
| **Codebase understanding** | `codebase-*` | Ask questions, build semantic indexes, trace symbols, inspect change impact |
| **Commit hygiene** | `commit-*`, `review-commits`, `validate-commits` | Write atomic commits, clean branch history, prevent AI co-author and tracker-ID leaks |
| **Craft workflow** | `craft-*`, `execute-tasks`, `park-idea` | Understand tasks, decompose work, execute subagent batches, park follow-ups |
| **Remote agent workspaces** | `bivouac` | Start, monitor, retrieve, and merge disposable cloud coding-agent sessions |
| **Knowledge capture** | `jot-*` | Capture notes, ideas, session summaries, and source material |
| **Study workflows** | `study-*` | Coach through new material and run recall sessions |
| **Publishing and sketches** | `typst-*`, `sketch-*` | Generate PDFs, shareable notes, diagrams, and Excalidraw sketches |
| **Development environments** | `devenv` | Initialize and maintain Nix development environments |
| **Refactoring** | `refactor-scan` | Find refactoring opportunities and turn them into reviewable findings |

## Choose by task

| If you want to... | Use... |
| --- | --- |
| Ask where something happens in a codebase | `codebase-ask` |
| See the impact of recent changes | `codebase-impact` |
| Make a clean commit | `commit-action` or `/commit` |
| Clean up commits before pushing | `review-commits` |
| Validate history before pushing | `validate-commits` |
| Explore a task before decomposing it | `craft-understand` |
| Decompose work into issues | `craft-decompose` |
| Park a follow-up idea without derailing flow | `park-idea` |
| Capture notes or source material | `jot-capture` |
| Generate a PDF from content | `typst-publish` |
| Create sketch notes | `sketch-note` |
| Initialize a Nix dev environment | `devenv` |
| Scan for refactoring opportunities | `refactor-scan` |

## Quick start

### Claude Code

```text
/plugin marketplace add jskswamy/skills
/plugin install <plugin-name>@skills
```

Installed plugins expose slash commands such as `/commit`, `/review-commits`,
`/capture`, `/sketch`, and `/publish`. See each plugin README for its command
surface.

### Pi

Install a stable release tag:

```bash
pi install git:github.com/jskswamy/skills@vX.Y.Z
```

Install the latest development version:

```bash
pi install git:github.com/jskswamy/skills@main
```

Invoke canonical skills directly:

```text
/skill:<skill-name>
```

See [Command to Skill Map](docs/command-skill-map.md) for Pi skill equivalents
to Claude Code commands.

## How this repo is organized

```text
registry.json        # Source of truth for plugin metadata and resource membership
skills/              # Canonical Agent Skills source
commands/            # Claude command wrappers grouped by plugin
agents/              # Agent prompts grouped by plugin
hooks/               # Hook definitions and scripts grouped by plugin
templates/           # Reusable templates and static assets
shared-scripts/      # Shared runtime scripts
plugins/             # Generated Claude Code plugin wrappers
.claude-plugin/      # Generated Claude Code marketplace metadata
harnesses/pi/        # Pi-specific package docs/extensions
```

Edit canonical root resources first, then run `npm run build` to refresh the
Claude Code install tree under `plugins/`. For details, see
[Authoring Skills and Plugins](docs/authoring-skills.md) and
[Contributing](CONTRIBUTING.md).

## Complete capability reference

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
### bivouac

Safe workflows for disposable remote coding-agent sessions with bivouac

**Claude Code:**

```text
/plugin install bivouac@skills
```
**Pi skills:**

```text
/skill:bivouac
```
[View documentation](./plugins/bivouac/README.md)


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
