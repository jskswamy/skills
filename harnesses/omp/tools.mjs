// omp v18.16.0 tool names and input fields, keyed by Claude tool name
// (observed in a live omp session; see docs/harness-research.md, omp).
// edit may carry paths[] instead of path; the runtime then runs a hook once
// per path. glob holds its pattern in `path`.
export const OMP_TOOLS = {
  tools: {
    Bash: { name: "bash" },
    Read: { name: "read", input: { file_path: "path" } },
    Write: { name: "write", input: { file_path: "path" } },
    Edit: { name: "edit", input: { file_path: "path" } },
    Grep: { name: "grep" },
    Glob: { name: "glob", input: { pattern: "path" } },
  },
  // omp names MCP tools mcp__<plugin>_<server>_<tool>; Claude matchers such as
  // mcp__.*git.*commit apply to them unchanged.
  mcp: {
    toClaude: (name) => (name.startsWith("mcp__") ? name : null),
    pattern: (claudePattern) => claudePattern,
  },
};
