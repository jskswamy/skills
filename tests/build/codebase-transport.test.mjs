import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const consumers = [
  "skills/refactor-scan/SKILL.md",
  ...["ask", "graph", "impact", "index", "explore"].map(name => `skills/codebase-${name}/SKILL.md`),
  "skills/review-commits/SKILL.md",
  "agents/refactor/scanner.md",
];

for (const path of consumers) {
  test(`${path} defines MCP-first automatic CLI fallback`, async () => {
    const text = await readFile(path, "utf8");
    assert.match(text, /## Codebase Transport/);
    assert.match(text, /MCP.*(?:first|prefer)/i);
    assert.match(text, /command -v codebase-memory-mcp/);
    assert.match(text, /codebase-memory-mcp cli --json list_projects/);
    assert.match(text, /automatically.*CLI/i);
    assert.match(text, /isError/);
    assert.match(text, /content\[\]/);
    assert.match(text, /indexing.*errors.*not.*transport/i);
    assert.doesNotMatch(text, /MCP server (?:is )?(?:not available|unreachable)[^\n]*→ print and exit/);
    assert.doesNotMatch(text, /codebase-memory-mcp not found\./);
  });
}

test("refactor dispatch carries transport to scanners", async () => {
  const scan = await readFile("skills/refactor-scan/SKILL.md", "utf8");
  const agent = await readFile("agents/refactor/scanner.md", "utf8");
  assert.match(scan, /subagent prompt must include:[\s\S]*codebase_transport/);
  assert.match(agent, /codebase_transport.*mcp.*cli/);
});

test("commit review only disables semantic analysis after both transports fail", async () => {
  const text = await readFile("skills/review-commits/SKILL.md", "utf8");
  assert.match(text, /both MCP and CLI.*unavailable/);
  assert.doesNotMatch(text, /If the MCP server is \*\*not available\*\*/);
});
