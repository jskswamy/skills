// Translates a harness's tool calls into what Claude-format hook scripts
// expect. Self-contained so adapters can copy it into generated packages.
//
// Each harness supplies a table:
//   tools: { <Claude tool name>: { name: <harness name>, input: { <Claude field>: <harness field> } } }
//   mcp:   { toClaude(harnessName) -> "mcp__server__tool" | null,
//            pattern(claudePattern) -> harness pattern }

export const CLAUDE_EVENTS = {
  "session-start": "SessionStart",
  "subagent-start": "SubagentStart",
  "pre-tool": "PreToolUse",
  "post-tool": "PostToolUse",
  stop: "Stop",
};

export function toClaudeToolName(harnessName, table) {
  const found = Object.entries(table.tools ?? {}).find(([, tool]) => tool.name === harnessName);
  return found ? found[0] : (table.mcp?.toClaude(harnessName) ?? null);
}

// The JSON a Claude hook script reads on stdin.
export function claudeHookInput({ event, toolName, input, table = {}, extra = {} }) {
  const payload = { hook_event_name: CLAUDE_EVENTS[event] };
  if (toolName !== undefined) {
    const claudeName = toClaudeToolName(toolName, table) ?? toolName;
    const fields = Object.entries(table.tools?.[claudeName]?.input ?? {});
    payload.tool_name = claudeName;
    payload.tool_input = Object.fromEntries(
      Object.entries(input ?? {}).map(([key, value]) => [fields.find(([, from]) => from === key)?.[0] ?? key, value]),
    );
  }
  return { ...payload, ...extra };
}
