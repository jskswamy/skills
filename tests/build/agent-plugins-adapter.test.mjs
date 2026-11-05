import test from "node:test";
import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as agentPlugins from "../../harnesses/agent-plugins/adapter.mjs";
import { runAdapters } from "../../scripts/lib/adapters/index.mjs";

async function write(path, content) {
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, content);
}

const PLUGIN = {
  name: "sample",
  version: "1.2.3",
  description: "Sample plugin",
  author: { name: "Owner" },
  category: "workflow",
  tags: ["sample"],
  resources: {
    skills: ["sample/do"],
    agents: ["sample/helper.md"],
    hooks: ["sample/hooks.json", "sample/session-reminder.sh"],
    templates: [],
    extra: [{ from: "templates/sample/.mcp.json", to: ".mcp.json" }],
  },
  harnesses: { "agent-plugins": { enabled: true } },
};

async function fixture() {
  const repoRoot = await mkdtemp(join(tmpdir(), "agent-plugins-"));
  await write(join(repoRoot, "skills/sample/do/SKILL.md"), "---\nname: do\ndescription: Use when testing.\n---\n");
  await write(join(repoRoot, "agents/sample/helper.md"), "---\nname: helper\ndescription: Helper\n---\n");
  await write(join(repoRoot, "hooks/sample/session-reminder.sh"), "#!/usr/bin/env bash\n");
  await write(
    join(repoRoot, "hooks/sample/hooks.json"),
    JSON.stringify({
      hooks: { SessionStart: [{ hooks: [{ type: "command", command: "bash ${CLAUDE_PLUGIN_ROOT}/hooks/session-reminder.sh", statusMessage: "Hi" }] }] },
    }),
  );
  await write(
    join(repoRoot, "templates/sample/.mcp.json"),
    JSON.stringify({ nixos: { command: "nix-shell", args: ["-p", "uv", "--run", "uvx mcp-nixos"] }, local: { command: "${CLAUDE_PLUGIN_ROOT}/bin/srv", args: ["${CLAUDE_PLUGIN_ROOT}/cfg"] } }),
  );
  return { repoRoot, registry: { marketplace: { name: "skills", owner: { name: "Owner" } }, plugins: [PLUGIN] } };
}

test("agent-plugins writes only plugin.json, skills/ and a spec-shaped mcp.json", async (t) => {
  const { repoRoot, registry } = await fixture();
  t.after(() => rm(repoRoot, { recursive: true, force: true }));

  const report = await runAdapters({ repoRoot, registry, adapters: [agentPlugins] });
  assert.deepEqual(report.errors(), []);
  assert.deepEqual(
    report.entries.map(({ kind, resource, status }) => `${kind} ${resource} ${status}`),
    ["agents helper degraded", "hooks session-start:session-reminder not-applicable"],
  );

  const root = join(repoRoot, agentPlugins.pluginsDir, "sample");
  assert.deepEqual(JSON.parse(await readFile(join(root, "plugin.json"), "utf8")), {
    $schema: "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
    name: "sample",
    version: "1.2.3",
    description: "Sample plugin",
    author: { name: "Owner" },
    keywords: ["sample"],
  });
  await access(join(root, "skills/do/SKILL.md"));
  for (const absent of ["agents", "hooks", ".mcp.json", ".claude-plugin"]) {
    await assert.rejects(access(join(root, absent)), `${absent} must not ship`);
  }

  const mcp = JSON.parse(await readFile(join(root, "mcp.json"), "utf8"));
  assert.deepEqual(mcp, {
    $schema: "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json",
    mcpServers: {
      nixos: { type: "stdio", command: "nix-shell", args: ["-p", "uv", "--run", "uvx mcp-nixos"] },
      local: { type: "stdio", command: "./bin/srv", args: ["${PLUGIN_ROOT}/cfg"] },
    },
  });

  assert.deepEqual(await agentPlugins.validate({ outRoot: repoRoot, plugin: PLUGIN }), []);
});

test("validate rejects a bad name, a stray hooks dir and a shell-string command", async (t) => {
  const { repoRoot, registry } = await fixture();
  t.after(() => rm(repoRoot, { recursive: true, force: true }));
  await runAdapters({ repoRoot, registry, adapters: [agentPlugins] });
  const root = join(repoRoot, agentPlugins.pluginsDir, "sample");
  await write(join(root, "plugin.json"), JSON.stringify({ $schema: "x", name: "Bad--Name", extra: 1 }));
  await write(join(root, "hooks/hooks.json"), "{}");
  await write(join(root, "mcp.json"), JSON.stringify({ $schema: "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json", mcpServers: { s: { type: "stdio", command: "uvx mcp-nixos" } } }));

  const errors = (await agentPlugins.validate({ outRoot: repoRoot, plugin: PLUGIN })).join("\n");
  for (const expected of ["schema must be", "invalid name", "field extra", "hooks does not belong", "command must be one bare name"]) {
    assert.match(errors, new RegExp(expected));
  }
});

test("mcpJson maps remote servers and rejects an entry with no command or url", () => {
  assert.deepEqual(agentPlugins.mcpJson({ mcpServers: { r: { type: "http", url: "https://x.test/mcp" } } }).mcpServers, {
    r: { type: "streamable-http", url: "https://x.test/mcp" },
  });
  assert.throws(() => agentPlugins.mcpJson({ broken: {} }), /neither command nor url/);
});
