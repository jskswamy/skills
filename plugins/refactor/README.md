# Refactor Plugin

Semantic refactoring opportunity detection for Claude Code. After each task completes (or on demand), scans committed code against the codebase-memory index to find cross-package duplication, code smells, and design pattern opportunities. Creates actionable beads issues with TDD-first refactoring plans.

## Prerequisites

- **codebase-memory-mcp** — Semantic code index. Available through a configured MCP server or the installed CLI on `PATH`. Scans and scanner agents prefer MCP and automatically fall back to `codebase-memory-mcp cli` when MCP is missing or unreachable.
- **codebase plugin** — Index management. The refactor plugin calls `/codebase:index` to ensure the index is fresh.
- **beads plugin** — Issue tracker. The validator creates beads issues for confirmed opportunities.
- **task-executor plugin** (optional) — Enables automatic post-task scanning.

## Usage

### Manual Scan

```
/refactor:scan                   # scan changes since upstream
/refactor:scan --base abc1234    # scan changes since specific SHA
```

### Automatic (with task-executor)

When installed alongside `task-executor`, the plugin automatically scans after each task closes. Suppress with `--no-refactor` on the execute command.

## What It Detects

### Structural Duplication (Fowler Catalog)
- Replace Inline Code with Function Call
- Extract Function + Move Function
- Parameterize Function
- Combine Functions into Class/Group
- Pull Up Method
- Introduce Parameter Object
- Replace Conditional with Polymorphism

### Code Smells (Fowler/Beck)
- Duplicate Code, Feature Envy, Data Clumps
- Parallel Inheritance Hierarchies, Shotgun Surgery
- Divergent Change, Message Chains, Inappropriate Intimacy

### Design Pattern Opportunities (GoF)
- Strategy, Template Method, Factory Method
- Decorator, Facade, Observer, Command

### Principle Violations
- DRY (logic, knowledge, structural duplication)
- SOLID (SRP, OCP, ISP, DIP)
- Law of Demeter

### Language Idioms (Go, Python, TypeScript)
- Go: raw strings for typed values, error chain loss, unmanaged goroutines
- Python: manual resource management, mutable defaults, missing type annotations
- TypeScript: `any` type, manual null guards, `.then()` chains

## How It Works

1. **Scanner agent** queries `codebase-memory-mcp` for semantic similarity + analyzes the diff for structural patterns. Provides breadth — covers the entire codebase cheaply via the index.

2. **Validator agent** reads actual source files for confirmed candidates. Provides depth — checks test coverage, deduplicates against existing issues, creates beads issues with TDD-first plans.

## Output

```
Refactoring scan complete.

Issues created:
  beads-xxx  P2  Extract writeJSON to internal/framework
  beads-yyy  P3  Parameterize FaultParam as generic FaultParam[T]

Dismissed (false positives): 1
Deferred (trivial): 0
```

Each created issue includes:
- TDD-first refactoring steps in the design field
- Pattern classification in notes
- Test coverage status
- Priority based on scope (P2 for cross-layer, P3 for same-layer, P4 for minor)

## Codebase-wide scanning

Beyond the default diff-anchored scan, `/refactor:scan` supports two broader scopes:

```
/refactor:scan --scope=package internal/api
/refactor:scan --scope=all
```

Both scopes produce **architectural** beads issues (root-cause findings that group many surface-level symptoms), not per-symptom issues. The pipeline is:

1. **Sharded scanners** — one scanner subagent per package (for `--scope=all`) reads the codebase-memory-mcp index and writes raw candidates to `.refactor-scan/<ts>/candidates/<pkg>.yaml`.
2. **Synthesizer** — correlates candidates by package locus, repeated patterns, cross-layer duplication, shared types, call-graph hubs, and architectural seams. Writes a human-reviewable `.refactor-scan/<ts>/findings.md`.
3. **Human review gate** — you edit `findings.md` to keep, drop, or promote findings. Reply `proceed` to continue or `abort` to stop.
4. **Per-section validators** — one validator subagent per finding creates a rich beads issue with the full evidence dossier embedded in `--notes`.
5. **Report** — issue IDs, singletons, skips, and failures.

### Resumability

If a session drops mid-scan, just re-run `/refactor:scan` (with the same scope). The command auto-detects the in-flight working dir and offers to resume from the right stage:

| State on disk | Resume action |
|---|---|
| `candidates/*.yaml` exist, no `findings.md` | Resume from synthesis |
| `findings.md` exists, no `.proceeded` | Resume at review gate |
| `.proceeded` exists, no `.completed` | Resume at validator (skips already-created issues) |
| `.completed` exists | Print final report |

Use `--fresh` to force a new scan instead of resuming. Use `--clean` to remove completed scans older than 30 days.

### Coverage

The codebase-wide scan covers the cross-codebase subset of Fowler's refactoring catalog (https://refactoring.com/catalog/). For the full pass-by-pass mapping, see the design spec at `docs/superpowers/specs/2026-05-05-codebase-wide-refactor-scan-design.md`.

Single-file refactorings (extract variable, rename, decompose conditional, etc.) are out of scope — they belong to `quality-reviewer`.
