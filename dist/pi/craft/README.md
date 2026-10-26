# craft

The craft of building software end-to-end. Capture ideas before they
escape, understand problems deeply before planning, decompose work into
units that can actually be executed, dispatch subagents to do the work,
and commit with full task context.

## Commands

### Capture and explore

| Command | Purpose |
|---------|---------|
| `/park` | Quick-capture an idea while in flow without breaking it; minimal metadata, fast path |
| `/parked` | List, filter, and manage previously parked ideas |
| `/review-parked` | On-demand review of the parking lot |
| `/understand` | Structured questioning to deeply explore a task before planning |

### Plan and structure

| Command | Purpose |
|---------|---------|
| `/decompose` | Transform a complex task into structured units with dependencies, supports configurable frameworks (built-in, superpowers, speckit, bmad) |
| `/epic` | Create and manage epics, add/remove tasks, track progress |
| `/task` | Single-task operations: create, start, complete, view |
| `/deps` | Manage and visualize dependencies |
| `/backlog` | Dashboard views with filtering and statistics |

### Execute and commit

| Command | Purpose |
|---------|---------|
| `/execute` | Dispatch subagents to work through ready tasks with batch processing and dual-stage review |
| `/task-commit` | Create rich commit messages by combining task context with code changes |

## Skills

- `decompose` — The decomposition engine: planning frameworks, dependency graph generation
- `park-idea` — Frictionless idea capture
- `review-parked` — Periodic and on-demand triage
- `task-commit` — Task-context-aware commit message authoring
- `understand` — Pre-planning exploration
- `execute-tasks` — Subagent dispatch with two-stage review

## Agents

- `issue-writer` — Creates well-structured issues from a decomposition plan
- `quality-reviewer` — Reviews implementation against quality standards
- `spec-reviewer` — Reviews implementation against the spec it implements

## Hook

A `Stop` hook periodically reminds you to triage parked ideas so they
don't accumulate forever. Auto-rebases via `${CLAUDE_PLUGIN_ROOT}` to
the plugin's installed location.

## Backend

`craft` currently uses [beads](https://github.com/steveyegge/beads) as
the task store backend. The backend is an implementation detail; the
plugin's surface is the developer-facing capability ("decompose this
work, execute it, commit it") and the backend can swap without changing
how you use the plugin.

## Install

```
/plugin install craft@skills
```

## History

`craft` is the v2.0.0 consolidation of the former `task-decomposer`
and `task-executor` plugins. Command names and behavior are unchanged;
only the package they ship in changed. See `MIGRATION-v2.md` at the
repo root for upgrade steps.
