# Codebase Plugin

Intelligent codebase exploration powered by [codebase-memory-mcp](https://github.com/DeusData/codebase-memory-mcp). Ask questions about your code in natural language, analyze change impact, and traverse symbol relationships — all from indexed knowledge instead of expensive grep/glob exploration.

## Prerequisites

- **codebase-memory-mcp** must be available either as a configured MCP server (`.claude.json` or `.mcp.json`) or as an installed CLI on `PATH`. Skills prefer MCP and automatically use `codebase-memory-mcp cli` when MCP is missing or unreachable. No MCP configuration is needed for CLI use. If neither works, commands explain the requirement and explore falls back to grep/glob/read.

## Commands and Skills

Claude Code, Codex and Antigravity run the skills as `/codebase:*` (Codex: `$codebase:*`).
Pi and OpenCode have no namespace and use `/codebase-*`:

| Workflow | Claude Code | Pi and OpenCode |
|----------|-------------|-----------------|
| Index | `$codebase:index [--mode full\|moderate\|fast\|cross-repo-intelligence] [--link <project\|*>]` | `/codebase-index [--mode full\|moderate\|fast\|cross-repo-intelligence] [--link <project\|*>]` |
| Ask | `$codebase:ask <question>` | `/codebase-ask <question>` |
| Impact | `$codebase:impact [--base <sha>]` | `/codebase-impact [--base <sha>]` |
| Graph | `$codebase:graph <symbol> ...` | `/codebase-graph <symbol> ...` |
| Capabilities | `$codebase:capabilities [<capability>] [--project <name>...] [--depth 1-5]` | `/codebase-capabilities [<capability>] [--project <name>...] [--depth 1-5]` |
| Seams | `$codebase:seams [<source> [<target>]] [--project <name>...]` | `/codebase-seams [<source> [<target>]] [--project <name>...]` |
| Architecture | `$codebase:architecture [--check] [--project <name>...]` | `/codebase-architecture [--check] [--project <name>...]` |
| Tour | `$codebase:tour [<area>]` | `/codebase-tour [<area>]` |
| Domain | `$codebase:domain [<concept>]` | `/codebase-domain [<concept>]` |
| Hotspots | `$codebase:hotspots [--since <date>] [<path>]` | `/codebase-hotspots [--since <date>] [<path>]` |
| Dead code | `$codebase:dead-code [<path>]` | `/codebase-dead-code [<path>]` |
| Explore | auto-triggered skill | auto-triggered skill |

### `$codebase:index [--mode full|moderate|fast|cross-repo-intelligence] [--link <project|*>]`

Index, re-index, or link the codebase across repositories. Run this first after installing the plugin.

```
$codebase:index                  # moderate mode (default)
$codebase:index --mode full      # all semantic signals, slowest
$codebase:index --mode fast      # structural only, fastest
$codebase:index --link *         # link cross-repo service calls across all indexed projects
$codebase:index --link billing-service
```

### `$codebase:ask <question>`

Ask a natural language question. The command classifies your intent and routes to the right queries.

```
$codebase:ask where does webhook validation happen?
$codebase:ask how does the auth pipeline work end to end?
$codebase:ask I want to add a new API endpoint — what should I know?
$codebase:ask anything similar to the writeJSON helper?
```

### `$codebase:impact [--base <sha>]`

Analyze the impact of recent code changes with risk classification.

```
$codebase:impact                 # compare against upstream
$codebase:impact --base abc1234  # compare against specific SHA
```

### `$codebase:graph <symbol> [--depth 1-5] [--direction inbound|outbound|both]`

Explore a symbol's callers, callees, and relationships.

```
$codebase:graph writeJSON
$codebase:graph ValidateToken --depth 3
$codebase:graph HandleGet --direction inbound
```

### `$codebase:capabilities [<capability>] [--project <name>[,<name>...]] [--depth 1-5]`

Discover all functional capabilities (high-cohesion clusters anchored to entry points) or trace a specific capability's execution corridor across one or more indexed projects.

```
$codebase:capabilities
$codebase:capabilities authentication
$codebase:capabilities checkout --depth 4
$codebase:capabilities billing --project api-gateway,billing-service
```

### `$codebase:seams [<source> [<target>]] [--project <name>[,<name>...]]`

Inspect architectural seams, module boundaries, instability metrics, and enabling points within a codebase or across multiple indexed repositories.

```
$codebase:seams
$codebase:seams internal/auth
$codebase:seams internal/api internal/db
$codebase:seams api-gateway billing-service
```

### `$codebase:architecture [--check] [--project <name>[,<name>...]]`

Recover the logical architecture (components, responsibilities, dependencies with edge counts, layers, cycles, a Mermaid diagram) and check it against your rules. The check runs automatically when `ARCHITECTURE.md` has a `codebase-rules` block.

```
$codebase:architecture
$codebase:architecture --check
$codebase:architecture --project api-gateway,billing-service
```

### `$codebase:tour [<area>]`

A guided reading order: entry points, then the core everything depends on, then the edges, each with why to read it next.

```
$codebase:tour
$codebase:tour scripts/lib
```

### `$codebase:domain [<concept>]`

The main domain entities, the component that owns each, and who creates, modifies and reads them.

```
$codebase:domain
$codebase:domain PluginModel
```

### `$codebase:hotspots [--since <date>] [<path>]`

Files ranked by churn (git history, default 6 months) times fan-in: where a change is most likely to break something.

```
$codebase:hotspots
$codebase:hotspots --since 2026-01-01 scripts/lib
```

### `$codebase:dead-code [<path>]`

Symbols nothing uses, each verified with a text search and labelled `likely dead` or `unsure`. Never deletes anything.

```
$codebase:dead-code
$codebase:dead-code scripts/lib
```

## Architecture Rules

Code shows what depends on what; only you can say what is *allowed*. Write those decisions in one `codebase-rules` block in `ARCHITECTURE.md` at the repo root. Prose around it is yours and is never read as rules.

````markdown
```codebase-rules
components:
  transforms: ["scripts/lib/transforms/**"]
  adapters:   ["harnesses/*/adapter.mjs"]
rules:
  - forbid: transforms -> adapters
    why: transforms stay harness-agnostic
```
````

`forbid: A -> B` bans dependencies from A to B; `allow-only: A -> [B, C]` limits A to those. Every rule needs a `why`. Each run checks every rule against the live code and reports violations with `file:line` and components whose globs match no files. The skills never edit this file on their own.

## Always Current

Nothing these skills derive is saved for later. Before any graph query, each skill checks that the index matches the repo's current commit and uncommitted edits (in every repo in scope). If only your uncommitted edits changed, it re-indexes in `fast` mode without asking; otherwise it follows `auto_index`. If the index cannot be refreshed, answers come from source inspection and say so.

Report skills offer a shareable Markdown copy (Mermaid diagrams; also an HTML page through the Artifact tool in Claude Code). Each copy is stamped with the commit and date and marked as a snapshot for people: agents re-run the skill instead of reading it.

## Explore Skill

The plugin includes an auto-trigger skill that activates during brainstorming and planning sessions. When superpowers brainstorming reaches "Explore project context", the skill queries the codebase index for relevant architecture and code, providing grounded context for the session.

The skill also activates on direct codebase questions like "where does X happen?" or "how does Y work?"

If MCP is unavailable, the skill automatically tries the installed CLI first. If neither transport works, it falls back silently to grep/glob/read — it never blocks a workflow.

## Settings

Stored in `.claude/codebase.local.md` (not committed). Created automatically on first use.

| Setting | Values | Default | Description |
|---------|--------|---------|-------------|
| `auto_index` | `always`, `never`, `ask` | `ask` | Auto-index before queries |
| `index_mode` | `full`, `moderate`, `fast` | `moderate` | Default indexing mode |
| `last_indexed` | ISO timestamp | — | Last successful index time (informational) |
| `last_indexed_commit` | commit SHA | — | `HEAD` when last indexed |
| `dirty_hash` | hash | — | Hash of `git diff HEAD` when last indexed |
| `projects` | map | — | Same two fields for other repos used with `--project` |
