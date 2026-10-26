// Pi 1.4.0 tool names and input fields, keyed by Claude tool name.
// grep and find exist but are off unless enabled with --tools.
export const PI_TOOLS = {
  tools: {
    Bash: { name: "bash" },
    Read: { name: "read", input: { file_path: "path" } },
    Edit: { name: "edit", input: { file_path: "path" } },
    Write: { name: "write", input: { file_path: "path" } },
    Glob: { name: "find" },
    Grep: { name: "grep" },
  },
  // Pi already names MCP tools mcp__<server>__<tool>, with characters
  // outside [A-Za-z0-9_] turned into "_".
  mcp: {
    toClaude: (name) => (name.startsWith("mcp__") ? name : null),
    pattern: (claudePattern) => claudePattern,
  },
};
