---
name: setup
description: Configure jot's capture backend. Run once to choose workbench or Capacities. Types are configured automatically on first capture — no upfront type mapping needed.
argument-hint: ""
---

# Jot Setup

Configure where jot saves your captures. Type agents are configured automatically the first time you capture each type — no need to set them up in advance.

## Config Location

Reads and writes `${CLAUDE_CONFIG_DIR:-$HOME/.claude}/jot.md` (global config, not per-project).
Expand `~` to home directory before reading or writing.

## Step 1: Ask Backend Preference

Use AskUserQuestion with two options:
- **workbench** — Save captures as markdown files in a local workbench folder
- **capacities** — Save captures to your Capacities knowledge space via the `cap` CLI

## Step 2: If workbench chosen

Read `${CLAUDE_CONFIG_DIR:-$HOME/.claude}/jot.md` if it exists (preserve any existing fields unrelated to this step).
Write or update these fields:
```yaml
capture_backend: workbench
agents_dir: ${CLAUDE_CONFIG_DIR:-$HOME/.claude}/jot/agents/
routing: []
```

Report: "Configured for workbench. Captures will save to your workbench folder."

## Step 3: If capacities chosen

### Step 3a: Find cap CLI

```bash
which cap 2>/dev/null || ls /Users/subramk/.local/bin/cap 2>/dev/null
```

Store the path as `CAP`. If not found, stop:
> "capacities-cli is not installed or not in PATH. Install it and re-run `/jot:setup`."

### Step 3b: Verify connectivity

```bash
$CAP types --json 2>&1
```

If exit non-zero or output contains error, stop:
> "Cannot connect to Capacities. Check your authentication (`cap auth`) and re-run `/jot:setup`."

### Step 3c: Create agents directory

```bash
mkdir -p ${CLAUDE_CONFIG_DIR:-$HOME/.claude}/jot/agents
```

### Step 3d: Write config

Read `${CLAUDE_CONFIG_DIR:-$HOME/.claude}/jot.md` if it exists (preserve unrelated fields).
Write or update these fields:
```yaml
capture_backend: capacities
agents_dir: ${CLAUDE_CONFIG_DIR:-$HOME/.claude}/jot/agents/
routing: []
```

## Step 4: Report Success

**Workbench:** "Configured. Captures save to your workbench folder. Use `/jot:capture` to start capturing."

**Capacities:** "Ready. The first time you capture each type, jot will configure it automatically. No upfront setup needed — just start capturing."
