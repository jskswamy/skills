import test from "node:test";
import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as codex from "../../harnesses/codex/adapter.mjs";
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
  tags: ["sample", "codex"],
  resources: {
    skills: ["sample-skill"],
    commands: ["sample/do.md"],
    agents: ["sample/helper.md"],
    hooks: ["sample/hooks.json"],
    templates: [],
    extra: [{ from: "templates/sample/.mcp.json", to: ".mcp.json" }],
  },
  harnesses: { codex: { enabled: true } },
};

async function fixture() {
  const repoRoot = await mkdtemp(join(tmpdir(), "codex-adapter-"));
  await write(join(repoRoot, "skills/sample-skill/SKILL.md"), "---\nname: sample-skill\ndescription: Use when testing.\n---\n\nBody\n");
  await write(join(repoRoot, "commands/sample/do.md"), "---\ndescription: Do something\n---\n\nInvoke `sample-skill`.\n");
  await write(join(repoRoot, "agents/sample/helper.md"), "---\nname: helper\ndescription: Helper\n---\n");
  await write(
    join(repoRoot, "hooks/sample/hooks.json"),
    JSON.stringify({ hooks: { SessionStart: [{ hooks: [{ type: "command", command: "echo hi" }] }] } }),
  );
  await write(join(repoRoot, "templates/sample/.mcp.json"), "{\"mcpServers\":{}}\n");
  const registry = {
    marketplace: { name: "skills", description: "Skills marketplace", owner: { name: "Owner" } },
    plugins: [PLUGIN],
  };
  return { repoRoot, registry };
}

test("codex adapter writes .agents/plugins/marketplace.json, .codex-plugin/plugin.json, and converts commands to skills", async (t) => {
  const { repoRoot, registry } = await fixture();
  t.after(() => rm(repoRoot, { recursive: true, force: true }));

  const report = await runAdapters({ repoRoot, registry, adapters: [codex] });
  assert.deepEqual(report.errors(), []);
  assert.deepEqual(
    report.entries.map(({ kind, resource, status }) => `${kind} ${resource} ${status}`),
    ["agents helper degraded", "hooks session-start:0 not-applicable"],
  );

  const marketplace = JSON.parse(await readFile(join(repoRoot, ".agents/plugins/marketplace.json"), "utf8"));
  assert.equal(marketplace.name, "skills");
  assert.equal(marketplace.plugins.length, 1);
  assert.equal(marketplace.plugins[0].name, "sample");
  assert.equal(marketplace.plugins[0].source, "./dist/plugins/sample");

  const manifest = JSON.parse(await readFile(join(repoRoot, "dist/plugins/sample/.codex-plugin/plugin.json"), "utf8"));
  assert.equal(manifest.name, "sample");
  assert.equal(manifest.version, "1.2.3");
  assert.equal(manifest.skills, "./codex-skills");

  await access(join(repoRoot, "dist/plugins/sample/codex-skills/sample-skill/SKILL.md"));
  await access(join(repoRoot, "dist/plugins/sample/codex-skills/sample-cmd-do/SKILL.md"));
  await access(join(repoRoot, "dist/plugins/sample/.mcp.json"));
  await assert.rejects(access(join(repoRoot, "dist/plugins/sample/commands")), "commands are converted to skills");
  await assert.rejects(access(join(repoRoot, "dist/plugins/sample/agents")), "agents are excluded");
  await assert.rejects(access(join(repoRoot, "dist/plugins/sample/hooks")), "hooks are excluded");

  assert.deepEqual(await codex.validate({ repoRoot, outRoot: repoRoot, plugin: PLUGIN }), []);
});
