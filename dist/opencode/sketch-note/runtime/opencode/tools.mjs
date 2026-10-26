// OpenCode 2.1.1 tool names and input fields, keyed by Claude tool name.
// Measured in spike claude-plugins-7bj.1; "patch" (gpt-* models only) has no
// Claude equivalent and passes through unmapped.
export const OPENCODE_TOOLS = {
  tools: {
    Bash: { name: "shell", input: { run_in_background: "background" } },
    Read: { name: "read", input: { file_path: "path" } },
    Edit: {
      name: "edit",
      input: { file_path: "path", old_string: "oldString", new_string: "newString", replace_all: "replaceAll" },
    },
    Write: { name: "write", input: { file_path: "path" } },
    Glob: { name: "glob" },
    Grep: { name: "grep", input: { glob: "include" } },
    Task: { name: "subagent", input: { subagent_type: "agent" } },
    Skill: { name: "skill", input: { skill: "id" } },
    WebFetch: { name: "webfetch" },
    WebSearch: { name: "websearch" },
    AskUserQuestion: { name: "question" },
    TodoWrite: { name: "todowrite" },
  },
  // Code Mode's wrapper tool. Each MCP call inside it fires its own hook
  // under the MCP name, so hooking the wrapper as well would run guards twice.
  skip: ["execute"],
  // OpenCode names MCP tools <server>_<tool>. Server names are not known
  // here, so the first "_" is taken as the split.
  mcp: {
    toClaude: (name) => {
      const split = name.indexOf("_");
      return split > 0 ? `mcp__${name.slice(0, split)}__${name.slice(split + 1)}` : null;
    },
    pattern: (claudePattern) => claudePattern.replace(/^mcp__/, "").replace("__", "_"),
  },
};
