# Multi-Agent review-commits — Design

Date: 2026-05-06
Status: Draft (pending user review)
Affected plugin: `plugins/clean-merge` (skill: `review-commits`)
Related plugin: `plugins/git-commit` (style files consumed as input)

## 1. Problem

When `/review-commits` rewrites history (fixup, squash, edit, reword), the
resulting commit messages frequently do not follow the user's saved commit
style preference (`.claude/git-commit.local.md` → `commit_style: classic`).
The user has to do another cycle to fix the messages, wasting tokens.

The skill's prose says it delegates to `/commit` for every message, but in
practice messages drift — the wrong style appears across all stop types
(fixup, squash, edit, reword), in every repo, not just one.

## 2. Root causes

| ID | Cause | How current skill fails |
|----|-------|-------------------------|
| R1 | Wrong env var | The skill instructs setting `GIT_SEQUENCE_EDITOR='true'` for reword/squash stops. That controls the *todo list* editor, not the *message* editor. The message editor (`GIT_EDITOR`) is left at the user's default, so `$EDITOR` pops open mid-rebase. The agent then has to improvise a message inline to escape the prompt — that improvisation is what drifts. |
| R2 | Prose enforcement | The skill mentions "invoke `/commit`" nine times as natural language. Nothing physically prevents the agent from running `git commit --amend -m "..."` directly. Mid-rebase under pressure, agents shortcut. |
| R3 | No post-condition | Once the rebase finishes, no check verifies that each rewritten commit's subject conforms to the saved style. Wrong-style messages ship. |

## 3. Design overview

Restructure the skill around a **planner / executor split**. All message
authoring moves into the planning phase; the executor is purely mechanical
replay. A revalidation step auto-amends any commit whose subject still
drifted from saved style.

When the commit count is high enough that reading commits is the bottleneck,
parallelize the read phase across subagents (multi-agent path). For smaller
branches, a single agent handles read + synthesis (fast path).

```
                ┌─────────────────────────┐
                │ Detect base, branch,    │
                │ test cmd, semantic-MCP  │
                └────────────┬────────────┘
                             │
                  ┌──────────▼──────────┐
                  │ Count commits       │
                  │ in $base..HEAD      │
                  └──┬──────────────┬───┘
                     │              │
              ≤9 commits        10+ commits
                     │              │
        ┌────────────▼─┐   ┌────────▼────────────┐
        │ Single-agent │   │ Parallel readers    │
        │ read+analyze │   │ (batches of 5)      │
        └────────────┬─┘   └────────┬────────────┘
                     │              │
                     └──────┬───────┘
                            │
                ┌───────────▼─────────────┐
                │ Synthesizer (single)    │
                │ - hygiene findings      │
                │ - test/impl correlation │
                │ - final messages        │  ← reads styles/<style>.md
                │ - rebase plan           │
                └───────────┬─────────────┘
                            │
                ┌───────────▼─────────────┐
                │ Plan review with user   │
                └───────────┬─────────────┘
                            │
                ┌───────────▼─────────────┐
                │ Executor (mechanical)   │
                │ GIT_EDITOR=true         │
                │ todo via SEQUENCE_EDITOR│
                │ replay messages by hash │
                └───────────┬─────────────┘
                            │
                ┌───────────▼─────────────┐
                │ Revalidator             │
                │ - subject style check   │
                │ - planned actions ⊆ log │
                │ - auto-amend on drift   │
                └─────────────────────────┘
```

This addresses the root causes:

- **R1** — `GIT_EDITOR=true` and a fully-formed `GIT_SEQUENCE_EDITOR` script
  mean no editor ever opens during the rebase. No improvisation possible.
- **R2** — partially addressed. The executor never makes message decisions,
  so the most common drift path is gone. But nothing physically prevents a
  future agent from ignoring the skill. See §10 (Future hardening).
- **R3** — the revalidator is the explicit post-condition, with auto-amend
  as the failure mode (no token-wasting abort).

## 4. Threshold gating

| Commit count | Path |
|--------------|------|
| < threshold | Single-agent fast path: main agent reads each commit sequentially, runs hygiene analysis inline, synthesizes plan |
| ≥ threshold | Multi-agent path: parallel readers in batches of 5, then single synthesizer |

Rationale: parallel reading only pays off when reading is the bottleneck.
For small branches, dispatch overhead exceeds the read time. The exact
crossover depends on commit size, repo, and the user's tolerance for
parallel-agent overhead, so the threshold is configurable.

### 4.1 Configuration

The threshold lives in `.claude/clean-merge.local.md` (per the standard
plugin-settings pattern):

```markdown
---
parallel_threshold: 10
parallel_batch_size: 5
---
```

| Setting | Default | Description |
|---------|---------|-------------|
| `parallel_threshold` | `10` | Commit count at which the multi-agent path activates. `< threshold` uses single-agent. |
| `parallel_batch_size` | `5` | Maximum number of reader subagents dispatched concurrently. |

Resolution order (highest to lowest):

1. CLI override (see §4.2)
2. `.claude/clean-merge.local.md`
3. Built-in defaults

Defaults are tuned to be safe: parallel only kicks in when there are clearly
many commits to read (≥10), and concurrency is capped at 5 to stay within
typical harness limits.

### 4.2 Per-invocation override

Two CLI flags let users override the saved threshold without editing the
settings file:

| Flag | Effect |
|------|--------|
| `--parallel-threshold <N>` | Use N for this run only |
| `--no-parallel` | Force single-agent path regardless of commit count |
| `--force-parallel` | Force multi-agent path regardless of commit count |

These compose with the existing `--tag` and `--base` flags.

### 4.3 First-run prompt

If `.claude/clean-merge.local.md` does not exist AND the current run would
cross the default threshold, the skill asks once:

```
You have N commits to review. The default threshold for parallel reading
is 10. Save a custom threshold for this project?
○ Use default (10) — recommended
○ Custom value — enter your preferred threshold
○ Always single-agent — never parallelize for this project
```

The chosen value is written to `.claude/clean-merge.local.md`. If the user
declines to save, the default is used for this run only.

## 5. Components

### 5.1 Reader (parallel, multi-agent path only)

**Input** (per reader):
- Commit hash
- Base SHA (so the reader can request its own diffs)
- Optional: 1-commit neighbors (preceding and following hash) for fixup-pair
  detection

**Tools available:** `git show`, `git diff-tree`, `git log` (read-only).
No write access. No `bd`, no `/commit` invocation.

**Output** (one record per commit, as YAML):

```yaml
hash: <abbrev>
subject: <original subject line>
files: [<path>, ...]
top_level_dirs: [<dir>, ...]
concern: <one-line description of what this commit does>
change_type: feat|fix|refactor|docs|test|chore|style|build
suggested_action: pick|fixup|squash|drop|reword|edit
fixup_candidate_for: <hash or null>      # local guess
unrelated: true|false                    # local guess
notes: <free text, optional>
```

The reader does NOT author final messages. It only describes the commit
objectively. Synthesizer correlates and decides actions.

Schema is intentionally small. Future fields can be added without breaking
existing readers.

### 5.2 Synthesizer (single agent)

**Inputs:**
- All reader records (multi-agent path) OR inline analysis (single-agent path)
- `git diff --name-only $base..HEAD` (full branch diff for cross-commit correlation)
- Codebase-memory-mcp handle if `$SEMANTIC_AVAILABLE=true`
- Saved style file: `plugins/git-commit/styles/<style>.md` (resolved from
  `.claude/git-commit.local.md` → `commit_style`)

**Duties:**

1. **Hygiene correlation** — confirm or reject each reader's local guesses:
   - Introduce-then-fix pairs (Layer 1 of current skill)
   - Non-atomic commits across top-level dirs (Layer 2)
   - Semantic verification via codebase-memory-mcp if available (Layer 3)
   - **New:** test-with-impl detection — if commit A touches `src/foo.ts`
     and commit B touches `tests/foo.test.ts` (or `src/foo.test.ts`), and B
     adds no new product code, mark B as fixup-of-A.

2. **Author final messages** — for every commit whose action is not `pick`
   (i.e. fixup target, squash target, reword target, split children),
   compose the new commit message in the saved style by reading
   `plugins/git-commit/styles/<style>.md` directly. The synthesizer is the
   *single source of truth* for message text. Messages are stored alongside
   the plan; the executor replays them.

3. **Build the rebase plan**:
   ```yaml
   base: <sha>
   actions:
     - hash: <abbrev>
       action: pick|fixup|squash|drop|reword|edit
       new_message: |
         <full message text, classic style>      # only if action != pick/drop/fixup
       split_into:                               # only if action == edit
         - files: [<paths>]
           message: |
             <full message>
   ```

### 5.3 Plan review (user gate)

Present the plan via AskUserQuestion. Show the original log, the proposed
sequence, and the *first line* of each new message inline. Provide a way to
expand the full message text on request. Options: Accept / Modify / Reset
(soft-reset escape hatch, unchanged from current skill).

### 5.4 Executor (mechanical, option α)

```bash
# Write the todo script and the per-commit message files
GIT_EDITOR=true \
GIT_SEQUENCE_EDITOR=<plan-todo-script> \
  git rebase -i $base
```

`GIT_EDITOR=true` makes any message-editor stop accept the existing message
without prompting. `GIT_SEQUENCE_EDITOR=<plan-todo-script>` writes the todo
list (drop / fixup / squash / reword / edit / pick lines).

Pre-authored messages are applied during the same rebase via
`--exec` rather than as a post-rebase sweep. The executor builds the todo
script so that each commit needing a new message is followed by an
`exec` line that amends with the synthesizer's text:

```
pick <hash-A>
exec git commit --amend -F .git/.review-msg/<hash-A>
fixup <hash-B>
exec git commit --amend -F .git/.review-msg/<hash-A>     # post-fixup retitle
pick <hash-C>
edit <hash-D>
exec /<skill-helper>/apply-split <hash-D>
pick <hash-E>
exec git commit --amend -F .git/.review-msg/<hash-E>
```

Per-commit message files are written to `.git/.review-msg/<hash>` before
the rebase starts. `--exec` runs in the rebase environment, so HEAD is
the just-applied commit at each step — no hash-mapping ambiguity.

For `edit` (split) actions, the helper at `<skill-helper>/apply-split`
runs `git reset HEAD~1`, then iterates `split_into` groups: stages each
group's files (`git add <files>`) and creates a commit using the
group's pre-authored message
(`__GIT_COMMIT_PLUGIN__=1 git commit -F <msg-file>`). All message
content is from the synthesizer; the helper authors nothing.

The `__GIT_COMMIT_PLUGIN__=1` env-prefix bypasses the existing PreToolUse
hook in `plugins/git-commit/hooks` that blocks raw `git commit`.

### 5.5 Revalidator

After the executor reports success, walk every commit in `$base..HEAD`:

1. **Style check** — does the commit's subject conform to the saved style?
   For `classic`: capitalized first letter, no trailing period, ≤72 chars,
   no `type(scope):` prefix. For `conventional`: lowercase `type(scope):`
   prefix, present and matching the type allowlist.
2. **Action audit** — every action in the plan with `action != pick` must
   have a corresponding hash in the rewritten log (or the expected number
   of split children for `edit`). Missing actions are flagged.
3. **Auto-amend on drift** — if a subject fails the style check AND the
   synthesizer authored a message for that commit, run a *secondary*
   `git rebase --exec` pass that re-amends only the drifted commits using
   their saved message files at `.git/.review-msg/<hash>`. Re-run the
   style check. If it still fails, surface as a warning (do not abort).

Rationale: aborting after a successful rebase wastes the tokens already
spent. Auto-amending uses the synthesizer's already-authored text, so it's
deterministic, free of further token burn, and produces the right outcome.

## 6. Data flow

```
single-agent path (≤9 commits):
  main agent ─→ read all commits ─→ synthesize ─→ plan ─→ user ─→ execute ─→ revalidate

multi-agent path (10+ commits):
  main agent ─→ dispatch N readers (batches of 5) ─→ collect records
            ─→ synthesizer agent ─→ plan ─→ user ─→ execute ─→ revalidate
```

The synthesizer is always a single agent. Parallelism is only in reading.

## 7. Failure handling

| Failure | Response |
|---------|----------|
| Reader fails on one commit | Synthesizer treats that commit as `pick` with a warning; user can override in plan review |
| Codebase-memory-mcp unavailable | Skip Layer 3; Layers 1+2 still run (current behavior preserved) |
| Synthesizer fails to author a message | Surface to user before plan review; either accept original message (downgrade action to `pick`) or abort |
| Rebase conflict | Stop, report files via `git diff --name-only --diff-filter=U`, await user resolution + `git rebase --continue` (current behavior preserved) |
| Revalidator finds drifted subject | Auto-amend with pre-authored message (no user intervention) |
| Revalidator finds missing action | Warn loudly; user must decide |

## 8. Testing approach

The skill is markdown prompt content, not executable code. "Testing" here
means harness-level integration scenarios:

1. **Style preservation** — fixture branch with 5 commits in mixed style →
   run skill with `commit_style: classic` saved → assert all rewritten
   subjects are classic.
2. **Threshold split** — 9 commits → assert single-agent path; 10 commits
   → assert parallel reader dispatch in transcript.
3. **Test-with-impl detection** — commit A adds `src/auth.ts`, commit B
   adds `tests/auth.test.ts` only → assert plan marks B as fixup of A.
4. **Auto-amend on drift** — synthesize a plan, intentionally inject a
   wrong-style message at execute (mock), assert revalidator catches and
   amends.
5. **Conflict path** — induce a conflict, assert skill stops gracefully and
   resumes after `git rebase --continue`.

These run as scripted Claude Code sessions against fixture repos.

## 9. Migration

Replace the contents of
`plugins/clean-merge/skills/review-commits/SKILL.md` in a single change.
The current skill's *external contract* (CLI flags `--tag`, `--base`,
auto-detect branch vs main, soft-reset escape hatch) is preserved. Only
the internals change.

The git-commit plugin is unchanged. Style files at
`plugins/git-commit/styles/*.md` are read by the synthesizer; they remain
the single source of truth for style rules.

## 10. Future hardening (out of scope for this design)

R2 (prose enforcement) is only *partially* addressed: a future agent could
still ignore the skill and amend with a wrong-style message. If drift
recurs after this design lands, harden the git-commit PreToolUse hook to
also block `git commit --amend` and `git rebase` unless the
`__GIT_COMMIT_PLUGIN__=1` bypass env-var is set. The skill sets the bypass
during execute. This was variant V3 in the brainstorm; deferred until
needed.

## 11. Open items

None — all blocking decisions resolved during brainstorming:

- Threshold: configurable per project, default 10 (see §4.1)
- Reader output schema: as specified in §5.1, extensible later
- Revalidator failure mode: auto-amend
- Executor strategy: option α (pure git, no /commit at execute)
