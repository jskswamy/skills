# Skills Marketplace

A multi-harness collection of agent skills for real developer workflows:
understanding codebases, keeping commits clean, planning and executing work,
capturing knowledge, publishing notes, and setting up development
environments.

The same canonical skills, commands, agents and hooks work in Claude Code, Pi,
Antigravity and OpenCode. Each harness's install tree is generated into
`dist/` from one source, at release.

## What this is

This repository is a curated skills marketplace, not a single app. Each skill
encodes a repeatable workflow an agent can follow: ask better questions about a
codebase, write a cleaner commit, decompose a feature, capture a note, generate
a PDF, or scan for refactoring opportunities.

The repo keeps the reusable source of truth in root directories such as
`skills/`, `commands/`, `agents/`, `hooks/`, `templates/`, and
`shared-scripts/`. A per-harness adapter turns those canonical resources into
that harness's install tree under `dist/`. Only a release writes `dist/`, so
`main` always installs the last release on every harness.

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

## Install

### Claude Code

```text
/plugin marketplace add jskswamy/skills
/plugin install <plugin-name>@skills
```

Installed plugins expose slash commands such as `/commit`, `/capture`,
`/sketch`, and `/publish`. See each plugin README for its command surface.

### Pi

Pi installs the whole repository as one package. Use a release tag for a
stable snapshot:

```bash
pi install git:github.com/jskswamy/skills@vX.Y.Z
```

or `main`, which always holds the last release:

```bash
pi install git:github.com/jskswamy/skills@main
```

The package is `dist/pi/`, self-contained. To try unreleased sources from a
checkout, run `npm run build` and then `pi -e <dir>` with the directory it
prints. Skills are invoked with
`/skill:<skill-name>`, and commands are prompts such as `/commit`. See
[harnesses/pi](harnesses/pi/README.md).

### Antigravity

Clone the repository, then install every plugin at once, where `<checkout>`
is the path of the clone:

```bash
git clone https://github.com/jskswamy/skills.git
agy plugin install <checkout>/dist/antigravity
```

Point `agy` at `dist/antigravity`, not the repository root. Commands
become skills named `<plugin>-cmd-<command>`. See
[harnesses/antigravity](harnesses/antigravity/README.md).

### OpenCode

Each plugin is a self-contained OpenCode V2 package under
`dist/opencode/<name>/`. From a checkout, list the packages you want in
`opencode.json`:

```json
{ "plugins": ["/path/to/skills/dist/opencode/commit-tools"] }
```

or copy a package directory to `.opencode/plugins/<name>/` in your project.
Loading by path is the tested route. See
[harnesses/opencode](harnesses/opencode/README.md).

## Harness support

Each harness has an adapter at `harnesses/<id>/adapter.mjs` that declares what
it can carry:

| | Claude Code | Pi | Antigravity | OpenCode |
| --- | --- | --- | --- | --- |
| Skills | native | native | native | native, registered by the plugin runtime |
| Commands | native | prompt templates | skills named `<plugin>-cmd-<command>` | native |
| Agents | native | not available | native, name and description only | native, with plugin-prefixed ids |
| Hooks | native | runtime shim | `hooks.json` plus a shim | runtime shim |
| Hook events | all five | session-start, pre-tool, post-tool, stop | session-start, pre-tool, post-tool, stop | all five |

The five hook events are session-start, subagent-start, pre-tool, post-tool
and stop. Every shim runs the canonical hook scripts under Claude Code's
contract: only exit code 2 blocks, and a broken or slow script never does.

What `npm run build` reports as degraded or skipped:

- **Pi**: plugin agents are not available, since Pi has no sub-agents, and
  subagent-start hooks do not apply. A stop hook cannot keep the agent
  going, so its exit 2 is only logged.
- **Antigravity**: hooks follow agy's documented contract but are unverified
  at runtime, because agy 1.4.1 ran no JSON hooks without a signed-in
  account. PreToolUse hooks can block but not inject context, and
  PostToolUse output is ignored. agy has no known hook names for MCP, Grep,
  Glob or file edits, so these hooks are skipped: the MCP half of the
  commit-tools commit guard (the shell guard is carried),
  codebase's `discovery-augment`, and devenv's `nixfmt`, `statix` and
  `deadnix`. The reasons are recorded under `harnesses.antigravity.optional`
  in `registry.json`.
- **OpenCode**: devenv's `.mcp.json` is not read; add the server to
  `opencode.json`. The jot `capture` agent has no frontmatter, so it is not
  registered (Antigravity gives it a generic description).

Tested with Claude Code, Pi 1.4.0, agy 1.4.1 and OpenCode 2.1.1.

## How this repo is organized

```text
# Source
registry.json        # Source of truth for plugin metadata, resources and harnesses
skills/              # Canonical Agent Skills source
commands/            # Command wrappers grouped by plugin
agents/              # Agent prompts grouped by plugin
hooks/               # Claude-format hook definitions and scripts grouped by plugin
templates/           # Reusable templates, static assets and plugin READMEs
shared-scripts/      # Shared runtime scripts
scripts/             # Build, validate, eval and release helpers; transforms under lib/
harnesses/lib/       # Hook runner and tool translation shared by harness runtimes
harnesses/<id>/      # One folder per harness: adapter, runtime or shim, tool table, docs

# Generated at release
dist/<harness>/      # Install trees for claude-code, antigravity, opencode and pi
.claude-plugin/      # Claude Code marketplace, pointing into dist/claude-code
```

Edit canonical root resources, then run `npm run build`, which writes every
harness into a temp dir and reports what each one degrades. For details, see
[Authoring Skills and Plugins](docs/authoring-skills.md) and
[Contributing](CONTRIBUTING.md). To support another harness, see
[Adding a harness](docs/authoring-skills.md#adding-a-harness).

## Complete capability reference

<!-- PLUGINS:START -->

Every plugin below ships to Claude Code, Pi, Antigravity and OpenCode. See
[Install](#install) for each harness and [Harness support](#harness-support)
for what each one carries. Skills keep their canonical names everywhere; the
Pi lines show the `/skill:<name>` form. Command names differ per harness; see
the [Command to Skill Map](docs/command-skill-map.md).
### bivouac

Safe workflows for disposable remote coding-agent sessions with bivouac

**Claude Code:**

```text
/plugin install bivouac@skills
# Commands are documented in the capability README
```
**Pi skills:**

```text
/skill:bivouac
```
[View documentation](./templates/bivouac/README.md)


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
[View documentation](./templates/codebase/README.md)


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
[View documentation](./templates/commit-tools/README.md)


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
[View documentation](./templates/craft/README.md)


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
[View documentation](./templates/devenv/README.md)


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
[View documentation](./templates/jot/README.md)


### refactor

Semantic refactoring opportunity detection. Scans committed code for structural duplication (Fowler catalog), code smells (Fowler/Beck), GoF design pattern opportunities, SOLID/DRY principle violations, and language-idiomatic anti-patterns (Go, Python, TypeScript). Creates beads issues with TDD-first refactoring plans. Run on demand with /refactor:scan.

**Claude Code:**

```text
/plugin install refactor@skills
# Commands are documented in the capability README
```
**Pi skills:**

```text
/skill:refactor-scan
```
[View documentation](./templates/refactor/README.md)


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
[View documentation](./templates/sketch-note/README.md)


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
[View documentation](./templates/study/README.md)


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
[View documentation](./templates/typst-notes/README.md)
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
