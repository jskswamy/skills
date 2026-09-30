---
name: execute
description: Execute decomposed beads tasks using isolated subagents with batch processing, dual-stage review, and atomic commits
argument-hint: "[--batch-size N] [--auto] [--no-commit] [--no-review] [--epic <id>] [--task <id>]"
---

# /execute Command

Execute decomposed beads tasks using isolated subagents. Each task gets a fresh agent with complete context, adapted to the project's decomposition framework, followed by dual-stage review and an atomic commit via `/commit`.

## Argument Parsing

| Argument | Short | Type | Default | Description |
|----------|-------|------|---------|-------------|
| `--batch-size` | `-b` | number | 3 | Tasks per batch before human checkpoint |
| `--auto` | | boolean | false | Skip human checkpoints between batches |
| `--no-commit` | | boolean | false | Skip atomic commit after each task |
| `--no-review` | | boolean | false | Skip dual-stage review |
| `--epic` | `-e` | string | (none) | Execute tasks from specific epic only |
| `--task` | `-t` | string | (none) | Execute a single specific task |

**Examples:**
```
/execute                          # Execute all ready tasks, batch of 3
/execute --batch-size 5           # Larger batches
/execute --auto                   # No human checkpoints
/execute --epic abc123            # Only tasks from this epic
/execute --task xyz789            # Execute single task
/execute --no-commit              # Skip commits (stage changes only)
/execute --no-review --no-commit  # Fast mode: just implement
```

---

## Execution Flow

### Step 0: Resolve Framework

Read the project's decomposition framework from `.claude/task-decomposer.local.md`:

```bash
cat .claude/task-decomposer.local.md 2>/dev/null
```

Extract the `framework:` field from YAML frontmatter. Default to `builtin` if no file exists.

The framework determines:
- How subagent prompts are structured (field names, emphasis)
- What review criteria to prioritize
- How verification evidence is validated

### Step 1: Discover Ready Tasks

```bash
bd ready --json
```

Apply filters:
- If `--epic` provided, filter to tasks under that epic
- If `--task` provided, use only that task
- Otherwise, use all ready tasks

If no ready tasks:
```
No tasks are ready to execute. All tasks may be blocked or completed.

Check status: bd list --status=open
Check blockers: bd blocked
```

### Step 2: Build Execution Plan

1. **Topological sort** tasks by dependencies
2. **Group into batches** of `--batch-size` tasks
3. Within each batch, identify tasks that can run **in parallel** (no mutual dependencies)
4. Present execution plan:

```
## Execution Plan

**Framework:** {framework display name}
**Ready tasks:** {N}
**Batches:** {M}

### Batch 1:
- {id} - {title} (P{priority}) [parallel]
- {id} - {title} (P{priority}) [parallel]
- {id} - {title} (P{priority}) [sequential, depends on above]

### Batch 2:
- {id} - {title} (P{priority})
...

Proceed? [Execute / Adjust batch size / Cancel]
```

### Step 3: Execute Batch

For each task in the batch:

#### 3a. Mark In Progress

```bash
bd update {id} --status=in_progress
```

#### 3b. Build Self-Contained Prompt (Framework-Adaptive)

Read the task's full details:
```bash
bd show {id} --json
```

Construct the subagent prompt based on the active framework. The beads fields map to framework-specific terminology:

**If framework = `builtin`:**
```
You are executing a single task. Here is your complete context:

## Task: {title}

### Context (from description)
{description field — self-contained background}

### What To Do (from design)
{design field — step-by-step actions with file paths}

### How To Verify (from acceptance)
{acceptance field — exact commands with expected outputs}

### Additional Notes
{notes field — file paths, constraints, references}

## Instructions

1. Read and understand the context fully before making any changes.
2. Follow the "What To Do" steps exactly.
3. After implementation, run EVERY verification command from "How To Verify".
4. Report your results in the Implementation Report format below.
```

**If framework = `superpowers`:**
```
You are executing a single task using the Superpowers methodology.

## Task: {title}

### Context
{description field — self-contained briefing}

### Steps
{design field — ordered implementation steps}

IMPORTANT: TDD is enforced. If steps include writing tests:
1. Write the failing test FIRST
2. Run it and verify it FAILS
3. Implement the change
4. Run the test and verify it PASSES
If you write implementation code before tests, you must delete it and restart with tests.

### Verification
{acceptance field — exact commands with expected outputs}

### Additional Notes
{notes field}

## Instructions

1. Read and understand the context fully.
2. Follow TDD discipline: test → fail → implement → pass.
3. Run EVERY verification command and capture output as proof.
4. Verification-before-completion is MANDATORY — no task is done without evidence.
5. Report your results in the Implementation Report format below.
```

**If framework = `speckit`:**
```
You are executing a single task following Spec Kit methodology.

## Task: {title}

### Specification
{description field — user story + requirements traceability}

### Implementation Plan
{design field — ordered actions with file paths}

### Acceptance Criteria
{acceptance field — verification commands and checks}

### Notes
{notes field — constitution references, dependencies}

## Instructions

1. Read the specification and understand which requirement this implements.
2. Follow the implementation plan exactly.
3. Verify each acceptance criterion — every check must pass.
4. Ensure your implementation traces back to the stated specification.
5. Report your results in the Implementation Report format below.
```

**If framework = `bmad`:**
```
You are a Dev agent executing a single story using the BMAD Method.

## Story: {title}

### Goal & Context
{description field — full context with embedded architecture}

### Implementation Details
{design field — hyper-detailed implementation steps}

### Definition of Done
{acceptance field — verification commands and quality gates}

### Notes
{notes field — epic reference, complexity, dependencies}

## Instructions

1. Read the full context — everything you need is embedded here.
2. Follow implementation details exactly — they are hyper-detailed for a reason.
3. Meet every item in the Definition of Done.
4. Do not reference external documents — your context is self-contained.
5. Report your results in the Implementation Report format below.
```

**Common Implementation Report format (appended to all frameworks):**
```
### Implementation Report
- **Files changed:** {list with brief description}
- **Verification results:**
  | Command | Expected | Actual | Status |
  |---------|----------|--------|--------|
  | {cmd} | {expected} | {actual} | PASS/FAIL |
- **Concerns or deviations:** {any issues encountered}
```

#### 3c. Dispatch Subagent

```
Use the Agent tool with subagent_type="general-purpose" and isolation="worktree":
- Send the self-contained prompt
- The agent works in an isolated worktree
- Capture the implementation report
```

For parallel tasks within a batch, dispatch multiple subagents simultaneously.

#### 3d. Collect Results and Record in Beads

Parse the subagent's implementation report and record key outcomes in beads:

```bash
# Record execution notes on the task
bd update {id} --notes "## Execution Results
Files changed: {list}
Verification: {pass/fail summary}
Executed on: {date}"
```

This ensures execution history is preserved in beads as long-term memory, regardless of which framework was used.

### Step 4: Review (unless --no-review)

#### 4a. Spec Compliance Review (Framework-Adaptive)

Spawn the spec-reviewer agent with framework-specific emphasis:

```
You are reviewing a task implementation for spec compliance.

## Framework: {framework name}
## Original Task Specification
{task title, description, design, acceptance}

## Implementation Report
{subagent's report}

## Your Job

Check for:
1. **Missing requirements** — things in the spec that weren't implemented
2. **Extra work** — things implemented that weren't in the spec
3. **Misunderstandings** — wrong interpretation of requirements
4. **Verification gaps** — claims without evidence
```

**Additional framework-specific review criteria:**

- **Superpowers**: Check TDD discipline — were tests written before implementation? Was verification evidence captured (not just "tests pass")? Flag if implementation came before tests.
- **Spec Kit**: Check requirements traceability — does the implementation trace back to the user story? Were all acceptance criteria from the specification met?
- **BMAD**: Check context compliance — did the dev agent stay within the embedded context? Was the architecture respected? Were all Definition of Done items met?

If FAIL: Present issues to user, ask whether to re-execute or skip.

#### 4b. Code Quality Review (only if spec compliance passes)

Spawn the quality-reviewer agent (same across all frameworks):

```
You are reviewing code quality for a task implementation.

## Git Diff
{diff of changes}

## Review Criteria

Check for:
1. **Code style** — consistent with project conventions
2. **Error handling** — appropriate for the context
3. **Security** — no vulnerabilities introduced (OWASP top 10)
4. **Test quality** — tests are meaningful, not just coverage padding
5. **Complexity** — no over-engineering

Categorize issues:
- **Critical** — must fix before merge (security, data loss, crashes)
- **Important** — should fix (poor patterns, missing edge cases)
- **Minor** — nice to fix (naming, formatting)

Output: PASS (with strengths noted) or FAIL (with categorized issues)
```

If Critical issues found: Block completion, present to user.
If only Important/Minor: Present but allow proceeding.

### Step 5: Atomic Commit (unless --no-commit)

After successful review (or if --no-review):

1. Stage the changed files from the task
2. Invoke `/commit` with task context:
   ```
   /commit {task title} - {brief description of what was implemented}
   ```
3. The commit plugin handles message generation, style enforcement, and noise filtering

### Step 6: Close Task

```bash
bd close {id}
```

### Step 7: Batch Checkpoint (unless --auto)

After each batch completes, present a summary:

```
## Batch {N} Complete

| Task | Status | Review | Commit |
|------|--------|--------|--------|
| {id} - {title} | DONE | PASS | abc1234 |
| {id} - {title} | DONE | PASS | def5678 |
| {id} - {title} | FAILED | FAIL (spec) | — |

**Next batch:** {M} tasks
- {id} - {title}
- {id} - {title}

Continue? [Execute next batch / Re-execute failed / Stop]
```

If `--auto`: Skip checkpoint, continue to next batch automatically.

### Step 8: Final Report

After all batches complete:

```
## Execution Complete

**Framework:** {framework display name}

**Summary:**
- Tasks executed: {N}
- Passed: {P}
- Failed: {F}
- Commits created: {C}

**Commits:**
- abc1234 - {subject}
- def5678 - {subject}

**Failed tasks (require attention):**
- {id} - {title}: {reason}

**Newly unblocked tasks:**
{Output from bd ready}
```

---

## Error Handling

### Subagent failure
If a subagent crashes or times out:
- Report the failure
- Record failure in beads: `bd update {id} --notes "Execution failed: {reason}"`
- Ask user: Retry / Skip / Abort

### Review failure
If review identifies critical issues:
- Present the issues
- Record in beads: `bd update {id} --notes "Review failed: {issues summary}"`
- Ask user: Re-execute with fixes / Skip review / Abort

### Commit failure
If `/commit` fails:
- Stage changes are preserved
- Report the error
- Ask user: Retry commit / Skip commit / Abort

### Dependency violation
If a task's dependencies aren't met (race condition in parallel execution):
- Move task to next batch
- Continue with other tasks

---

## Integration Points

- **beads plugin**: Task discovery, status updates, closing, long-term memory for execution history
- **git-commit plugin**: Atomic commits via `/commit` command
- **task-decomposer**: Framework resolution from `.claude/task-decomposer.local.md`; tasks follow framework-specific structure stored in beads fields
