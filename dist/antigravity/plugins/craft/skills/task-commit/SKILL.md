---
name: task-commit
description: "Use when committing work for a beads task: 'commit this task', 'task commit', 'commit with beads context', or 'now commit' after closing a task. Gathers task context for commit-action; never creates a separate commit workflow."
---

# Task Commit

Gather the reason for the change, then delegate the commit to `commit-action`.

1. Identify the task from the conversation. If ambiguous, run
   `bd list --status=in_progress --json` and ask which task applies.
2. Read `bd show <id> --json`. Extract the goal, motivation, decisions and
   relevant constraints. Treat the task ID and acceptance checklist as
   internal context, not text to copy into the commit message.
3. Load the installed `commit-action` skill (`/commit` in Claude Code or
   `/skill:commit-action` in Pi) with that context and any user arguments,
   including `--amend`. Let it handle staging choices, style, atomicity,
   message generation, validation, confirmation and execution.
4. If the skill is missing, stop and report the blocker. A task-completion
   instruction does not replace confirmation of the generated message.
5. Report the local commit result. Leave pushes and issue synchronization to
   the user. Do not add AI co-author attribution or tracker trailers.
