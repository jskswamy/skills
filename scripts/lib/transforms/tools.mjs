// Hook matchers stay in Claude tool names; these helpers translate at the
// edges. The runtime-side pieces live in harnesses/lib because generated
// packages ship them without the rest of this repo.
export { CLAUDE_EVENTS, claudeHookInput, toClaudeToolName } from "../../../harnesses/lib/hook-input.mjs";
// Claude matchers are regexes over the whole tool name; empty or "*" matches all.
export { matchesClaude } from "../../../harnesses/lib/hook-runner.mjs";

// For harnesses with native hook files, and to check a matcher is fully
// mappable. Returns null when any alternative cannot be mapped, because a
// guard whose matcher never fires fails silently.
export function rewriteMatcher(matcher, table) {
  if (matcher === undefined) return undefined;
  if (matcher === "" || matcher === "*") return matcher;
  const mapped = matcher.split("|").map((alternative) => {
    if (table.tools?.[alternative]) return table.tools[alternative].name;
    if (alternative.startsWith("mcp__") && table.mcp) return table.mcp.pattern(alternative);
    return null;
  });
  return mapped.includes(null) ? null : mapped.join("|");
}
