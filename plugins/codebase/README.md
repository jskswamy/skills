# Codebase Plugin

Intelligent codebase exploration powered by [codebase-memory-mcp](https://github.com/DeusData/codebase-memory-mcp). Ask questions about your code in natural language, analyze change impact, and traverse symbol relationships — all from indexed knowledge instead of expensive grep/glob exploration.

## Prerequisites

- **codebase-memory-mcp** must be installed and configured in your MCP settings (`.claude.json` or `.mcp.json`). Without it, commands will print an error and the explore skill will fall back to grep/glob/read.

## Commands and Skills

Claude Code users can use `/codebase:*` commands. Pi users can invoke the
same canonical workflows directly as skills:

| Workflow | Claude Code | Pi |
|----------|-------------|----|
| Index | `/codebase:index [--mode full|moderate|fast]` | `/skill:codebase-index [--mode full|moderate|fast]` |
| Ask | `/codebase:ask <question>` | `/skill:codebase-ask <question>` |
| Impact | `/codebase:impact [--base <sha>]` | `/skill:codebase-impact [--base <sha>]` |
| Graph | `/codebase:graph <symbol> ...` | `/skill:codebase-graph <symbol> ...` |
| Explore | auto-triggered skill | `/skill:codebase-explore` |

### `/codebase:index [--mode full|moderate|fast]`

Index or re-index the codebase. Run this first after installing the plugin.

```
/codebase:index                  # moderate mode (default)
/codebase:index --mode full      # all semantic signals, slowest
/codebase:index --mode fast      # structural only, fastest
```

### `/codebase:ask <question>`

Ask a natural language question. The command classifies your intent and routes to the right queries.

```
/codebase:ask where does webhook validation happen?
/codebase:ask how does the auth pipeline work end to end?
/codebase:ask I want to add a new API endpoint — what should I know?
/codebase:ask anything similar to the writeJSON helper?
```

### `/codebase:impact [--base <sha>]`

Analyze the impact of recent code changes with risk classification.

```
/codebase:impact                 # compare against upstream
/codebase:impact --base abc1234  # compare against specific SHA
```

### `/codebase:graph <symbol> [--depth 1-5] [--direction inbound|outbound|both]`

Explore a symbol's callers, callees, and relationships.

```
/codebase:graph writeJSON
/codebase:graph ValidateToken --depth 3
/codebase:graph HandleGet --direction inbound
```

## Explore Skill

The plugin includes an auto-trigger skill that activates during brainstorming and planning sessions. When superpowers brainstorming reaches "Explore project context", the skill queries the codebase index for relevant architecture and code, providing grounded context for the session.

The skill also activates on direct codebase questions like "where does X happen?" or "how does Y work?"

If `codebase-memory-mcp` is not available, the skill falls back silently to grep/glob/read — it never blocks a workflow.

## Settings

Stored in `.claude/codebase.local.md` (not committed). Created automatically on first use.

| Setting | Values | Default | Description |
|---------|--------|---------|-------------|
| `auto_index` | `always`, `never`, `ask` | `ask` | Auto-index before queries |
| `index_mode` | `full`, `moderate`, `fast` | `moderate` | Default indexing mode |
| `last_indexed` | ISO timestamp | — | Last successful index time |
