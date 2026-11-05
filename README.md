# Skills Marketplace

A multi-harness collection of agent skills for real developer workflows:
understanding codebases, keeping commits clean, planning and executing work,
capturing knowledge, publishing notes, and setting up development
environments.

The same canonical skills, agents and hooks work in Claude Code, Pi,
Antigravity, OpenCode and Codex. Each harness's install tree is generated into
`dist/` from one source, at release.

## What this is

This repository is a curated skills marketplace, not a single app. Each skill
encodes a repeatable workflow an agent can follow: ask better questions about a
codebase, write a cleaner commit, decompose a feature, capture a note, generate
a PDF, or scan for refactoring opportunities.

The repo keeps the reusable source of truth in root directories such as
`skills/`, `agents/`, `hooks/`, `templates/`, and
`shared-scripts/`. A per-harness adapter turns those canonical resources into
that harness's install tree under `dist/`. Only a release writes `dist/`, so
`main` always installs the last release on every harness.

## What you can do with it

| Area | Skills | What it helps with |
| --- | --- | --- |
| **Codebase understanding** | `codebase:*` | Ask questions, build semantic indexes, trace symbols, inspect change impact |
| **Commit hygiene** | `commit-tools:*` | Write atomic commits, clean branch history, prevent AI co-author and tracker-ID leaks |
| **Craft workflow** | `craft:*` | Understand tasks, decompose work, execute subagent batches, park follow-ups |
| **Remote agent workspaces** | `bivouac:session` | Start, monitor, retrieve, and merge disposable cloud coding-agent sessions |
| **Knowledge capture** | `jot:*` | Capture notes, ideas, session summaries, and source material |
| **Study workflows** | `study:*` | Coach through new material and run recall sessions |
| **Publishing and sketches** | `typst-notes:*`, `sketch-note:*` | Generate PDFs, shareable notes, diagrams, and Excalidraw sketches |
| **Development environments** | `devenv:manage` | Initialize and maintain Nix development environments |
| **Refactoring** | `refactor:scan` | Find refactoring opportunities and turn them into reviewable findings |

## Choose by task

| If you want to... | Use... |
| --- | --- |
| Ask where something happens in a codebase | `codebase:ask` |
| Map functional capabilities and execution corridors | `codebase:capabilities` |
| Inspect architectural seams and boundary coupling | `codebase:seams` |
| See the impact of recent changes | `codebase:impact` |
| Make a clean commit | `commit-tools:commit` |
| Clean up commits before pushing | `commit-tools:review-commits` |
| Validate history before pushing | `commit-tools:validate-commits` |
| Explore a task before decomposing it | `craft:understand` |
| Decompose work into issues | `craft:decompose` |
| Park a follow-up idea without derailing flow | `craft:park` |
| Capture notes or source material | `jot:capture` |
| Generate a PDF from content | `typst-notes:publish` |
| Create sketch notes | `sketch-note:sketch` |
| Initialize a Nix dev environment | `devenv:manage` |
| Scan for refactoring opportunities | `refactor:scan` |

## Install

### Claude Code

```text
/plugin marketplace add jskswamy/skills
/plugin install <plugin-name>@skills
```

Skills run as `/<plugin>:<skill>`, for example `/commit-tools:commit`,
`/jot:capture`, `/sketch-note:sketch` and `/typst-notes:publish`. See
[Invocation forms](docs/command-skill-map.md) for every harness. Plugins install
from `dist/claude-code/plugins/<plugin>`.

### Pi

Each plugin is a self-contained Pi package under `dist/pi/plugins/<name>/`.
From a checkout, install the packages you want:

```bash
pi install <checkout>/dist/pi/plugins/<plugin-name>
```

or via skillshare:

```bash
skillshare plugin add <checkout> --plugin <plugin-name> --target pi -g
```

Each runnable skill is a prompt template named `/<plugin>-<skill>`, such as
`/commit-tools-commit`; `/skill:<plugin>-<skill>` also works. See [harnesses/pi](harnesses/pi/README.md).

### Antigravity

Clone the repository, then install every plugin at once, where `<checkout>`
is the path of the clone:

```bash
git clone https://github.com/jskswamy/skills.git
agy plugin install <checkout>/dist/antigravity
```

Point `agy` at `dist/antigravity` (or `dist/antigravity/plugins/<plugin-name>`
for a single plugin), not the repository root. Skills run as
`/<plugin>:<skill>`. See
[harnesses/antigravity](harnesses/antigravity/README.md).

### OpenCode

Each plugin is a self-contained OpenCode V2 package under
`dist/opencode/plugins/<name>/`. From a checkout, list
the packages you want in `opencode.json`:

```json
{ "plugins": ["/path/to/skills/dist/opencode/plugins/commit-tools"] }
```

or copy a package directory to `.opencode/plugins/<name>/` in your project.
Each runnable skill is a command named `/<plugin>-<skill>`.
Loading by path is the tested route. See
[harnesses/opencode](harnesses/opencode/README.md).

### Codex

Each plugin is packaged under `dist/codex/plugins/<name>/` and indexed by
`.agents/plugins/marketplace.json`. Install via skillshare:

```bash
skillshare plugin add <checkout> --plugin <plugin-name> --target codex -g
```

Skills run as `$<plugin>:<skill>`. See
[harnesses/codex](harnesses/codex/README.md).

## Harness support

Each harness has an adapter at `harnesses/<id>/adapter.mjs` that declares what
it can carry:

| | Claude Code | Pi | Antigravity | OpenCode | Codex |
| --- | --- | --- | --- | --- | --- |
| Skills | native | native | native | native, registered by the plugin runtime | native |
| Entry for a skill | the skill, `/plugin:skill` | prompt template, `/plugin-skill` | the skill, `/plugin:skill` | command, `/plugin-skill` | the skill, `$plugin:skill` |
| Agents | native | not available | native, name and description only | native, with plugin-prefixed ids | not available |
| Hooks | native | runtime shim | `hooks.json` plus a shim | runtime shim | native (`codex-hooks.json`) |
| Hook events | all five | session-start, pre-tool, post-tool, stop | session-start, pre-tool, post-tool, stop | all five | session-start, pre-tool, post-tool, stop |

The five hook events are session-start, subagent-start, pre-tool, post-tool
and stop. Every shim runs the canonical hook scripts under Claude Code's
contract: only exit code 2 blocks, and a broken or slow script never does.

`dist/agent-plugins` is not a harness install: it is the portable
[Agent Plugins](https://agent-plugins.org) 1.0.0 package (`plugin.json`,
`skills/`, `mcp.json`), for clients that read that standard. It carries no
hooks or agents. See [harnesses/agent-plugins](harnesses/agent-plugins/README.md).

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
  codebase's `discovery-augment`, and devenv's `nix-tools`. The reasons are recorded under `harnesses.antigravity.optional`
  in `registry.json`.
- **OpenCode**: devenv's `.mcp.json` is not read; add the server to
  `opencode.json`. The jot `capture` agent has no frontmatter, so it is not
  registered (Antigravity gives it a generic description).
- **Codex**: plugin agents and `subagent-start` hooks do not apply in Codex's
  `.codex-plugin` format. Canonical skills and supported lifecycle hooks
  (`codex-hooks.json`) are carried natively; codebase's `discovery-augment`
  (no Grep/Glob tool) and devenv's `nix-tools` (edits use `apply_patch`) are
  marked optional in `registry.json`.

Tested with Claude Code, Pi 1.4.0, agy 1.4.1, OpenCode 2.1.1 and Codex.

## How this repo is organized

```text
# Source
registry.json        # Source of truth for plugin metadata, resources and harnesses
skills/              # Canonical Agent Skills source, skills/<plugin>/<skill>/
agents/              # Agent prompts grouped by plugin
hooks/               # Claude-format hook definitions and scripts grouped by plugin
templates/           # Reusable templates, static assets and plugin READMEs
shared-scripts/      # Shared runtime scripts
scripts/             # Build, validate, eval and release helpers; transforms under lib/
harnesses/lib/       # Hook runner and tool translation shared by harness runtimes
harnesses/<id>/      # One folder per harness: adapter, runtime or shim, tool table, docs

# Generated at release
dist/<harness>/plugins/<plugin>/  # One generated tree per harness: claude-code, codex, antigravity, opencode, pi, agent-plugins (portable skills + MCP only)
.claude-plugin/marketplace.json   # Claude Code marketplace, pointing into dist/claude-code/plugins
.agents/plugins/marketplace.json  # Codex marketplace, pointing into dist/codex/plugins
.plugin/marketplace.json          # OpenCode marketplace, pointing into dist/opencode/plugins
marketplace.json                  # Pi marketplace, pointing into dist/pi/plugins
```

See [harnesses/README.md](harnesses/README.md) and [scripts/README.md](scripts/README.md) for the build pipeline and harness adapter contracts. Edit canonical root resources, then run `npm run build`, which writes every
harness into a temp dir and reports what each one degrades. For details, see
[Authoring Skills and Plugins](docs/authoring-skills.md) and
[Contributing](CONTRIBUTING.md). To support another harness, see
[Adding a harness](docs/authoring-skills.md#adding-a-harness).

## Complete capability reference

<!-- PLUGINS:START -->

Every plugin below ships to Claude Code, Pi, Antigravity, OpenCode and Codex. See
[Install](#install) for each harness and [Harness support](#harness-support)
for what each one carries. Skills are written `plugin:skill` below. Claude Code
and Antigravity run them as `/plugin:skill`, Codex as `$plugin:skill`, and Pi and
OpenCode as `/plugin-skill`; see the [invocation forms](docs/command-skill-map.md).
Model-only skills have no entry.
### bivouac

Safe workflows for disposable remote coding-agent sessions with bivouac

**Claude Code:**

```text
/plugin install bivouac@skills
```
**Skills:**

```text
bivouac:session
```
[View documentation](./templates/bivouac/README.md)


### codebase

Intelligent codebase exploration powered by codebase-memory-mcp. Natural language queries, change impact analysis, symbol graph traversal, and automatic brainstorming/planning integration.

**Claude Code:**

```text
/plugin install codebase@skills
```
**Skills:**

```text
codebase:explore
codebase:ask
codebase:index
codebase:impact
codebase:graph
codebase:capabilities
codebase:seams
```
[View documentation](./templates/codebase/README.md)


### commit-tools

End-to-end commit hygiene: write atomic commits with style enforcement, review and consolidate them before push, validate the final history

**Claude Code:**

```text
/plugin install commit-tools@skills
```
**Skills:**

```text
commit-tools:commit
commit-tools:commit-style
commit-tools:review-commits
commit-tools:validate-commits
```
[View documentation](./templates/commit-tools/README.md)


### craft

The craft of building software end-to-end: capture ideas, understand problems, decompose work into structured units, dispatch subagents to execute them, and commit with full task context

**Claude Code:**

```text
/plugin install craft@skills
```
**Skills:**

```text
craft:decompose
craft:execute
craft:park
craft:parked
craft:task-commit
craft:understand
craft:backlog
craft:deps
# plus 2 more skills in registry.json
```
[View documentation](./templates/craft/README.md)


### devenv

Initialize and manage Nix flake development environments with auto-detection and security tooling

**Claude Code:**

```text
/plugin install devenv@skills
```
**Skills:**

```text
devenv:manage
```
[View documentation](./templates/devenv/README.md)


### jot

Quick, low-friction capture of notes, tasks, ideas, session summaries, and tech radar blips with Obsidian-style auto-linking

**Claude Code:**

```text
/plugin install jot@skills
```
**Skills:**

```text
jot:sketch-from-capture
jot:capture
jot:configure
jot:setup
```
[View documentation](./templates/jot/README.md)


### refactor

Semantic refactoring opportunity detection. Scans committed code for structural duplication (Fowler catalog), code smells (Fowler/Beck), GoF design pattern opportunities, SOLID/DRY principle violations, and language-idiomatic anti-patterns (Go, Python, TypeScript). Creates beads issues with TDD-first refactoring plans. Run on demand with /refactor:scan.

**Claude Code:**

```text
/plugin install refactor@skills
```
**Skills:**

```text
refactor:scan
```
[View documentation](./templates/refactor/README.md)


### sketch-note

Generate visual sketch notes in Excalidraw format from conversations, code architecture, or custom content

**Claude Code:**

```text
/plugin install sketch-note@skills
```
**Skills:**

```text
sketch-note:capture-for-sketch
sketch-note:excalidraw-format
sketch-note:sketch
```
[View documentation](./templates/sketch-note/README.md)


### study

Adaptive study coach with multi-gear learning sessions (Socratic, Explain, Guide, Check, Help) and spaced recall tracking via Feynman loops. Saves coaching notes with gap tracking and a recall log that shows improvement over time.

**Claude Code:**

```text
/plugin install study@skills
```
**Skills:**

```text
study:coach
study:recall
study:setup
```
[View documentation](./templates/study/README.md)


### typst-notes

Generate beautiful PDF/HTML shareable notes using Typst with 7 professional templates, infographics, and modern typography

**Claude Code:**

```text
/plugin install typst-notes@skills
```
**Skills:**

```text
typst-notes:infographics
typst-notes:jot-to-publish
typst-notes:typst-format
typst-notes:publish
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
