# Shared Harness Hook Runtime Library (`harnesses/lib`)

## Overview
Self-contained runtime helpers shared by non-Claude harnesses (`opencode`, `pi`) and build-time transform tools. Translates harness-specific tool invocations into the standard JSON stdin payload expected by canonical Claude Code hook scripts, and executes those hook scripts with process-group timeouts, time budgets, exit-code-2 blocking semantics, and context extraction.

## Interface
- `CLAUDE_EVENTS` (`hook-input.mjs`): Mapping from neutral hook event names (`"session-start"`, `"subagent-start"`, `"pre-tool"`, `"post-tool"`, `"stop"`) to Claude event names (`"SessionStart"`, `"SubagentStart"`, `"PreToolUse"`, `"PostToolUse"`, `"Stop"`).
- `toClaudeToolName(harnessName, table)` (`hook-input.mjs`): Maps a harness tool name back to its canonical Claude tool name via `table.tools` or `table.mcp.toClaude(harnessName)`, returning `null` if unmapped.
- `claudeHookInput({ event, toolName, input, table = {}, extra = {} })` (`hook-input.mjs`): Builds the JSON object sent to a Claude hook script on stdin (`hook_event_name`, `tool_name`, mapped `tool_input`, plus `extra`).
- `DEFAULT_TIMEOUT_MS` (`hook-runner.mjs`): Default per-hook execution timeout (`10_000` ms).
- `START_BUDGET_MS` (`hook-runner.mjs`): Total cumulative time budget (`20_000` ms) across all `session-start` or `subagent-start` hooks in a session.
- `matchesClaude(matcher, name)` (`hook-runner.mjs`): Tests whether `name` matches a Claude regex `matcher` (empty or `"*"` matches all; otherwise anchored as `^(?:${matcher})$`).
- `runHook({ command, input, cwd, env, timeoutMs = DEFAULT_TIMEOUT_MS, plainStdoutIsContext = false, log })` (`hook-runner.mjs`): Spawns `sh -c <command>` with `JSON.stringify(input)` on stdin and returns `{ blocked: boolean, reason?: string, context?: string }`.
- `runEvent({ entries, event, target = "", input, cwd, env, log, budgetMs = Infinity })` (`hook-runner.mjs`): Sequentially runs all `entries` matching `event` and `target` within `budgetMs`, accumulating `context` strings and stopping early on the first blocking hook (`{ blocked, reason?, context }`).

## Invariants
- Must remain self-contained with zero dependencies outside Node.js built-ins so harness adapters can copy `harnesses/lib/` directly into generated standalone plugin packages.
- Only exit code `2` blocks execution (`{ blocked: true, reason }` from stderr or `"blocked by hook"`). Missing scripts, non-zero exit codes other than `2`, invalid regex matchers, timeouts, and spawn errors never throw and never block (`{ blocked: false }`).
- Plain non-JSON stdout is treated as model context only when `plainStdoutIsContext` is `true` (used for `session-start` and `subagent-start` events); for all other events, context must come from JSON `hookSpecificOutput.additionalContext`.
- In `runEvent`, once `budgetMs` is exhausted, remaining hooks for that event are skipped and logged rather than started with a zero or negative timeout.

## Side Effects
- `runHook` and `runEvent` spawn detached child shell processes (`sh -c <command>`), pipe JSON to child stdin, and send `SIGKILL` to the child process group (`-child.pid`) upon timeout.
- Logs hook timeouts, unexpected exit codes, invalid matchers, and spawn errors to `stderr` via the `log` callback (defaults to `console.error`).

## Verification
- Run: `npm test`
