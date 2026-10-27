import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import * as codex from "../../harnesses/codex/adapter.mjs";
import { runAdapters } from "../../scripts/lib/adapters/index.mjs";

const execFileP = promisify(execFile);

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
    hooks: ["sample/hooks.json", "sample/session-reminder.sh"],
    templates: [],
    extra: [{ from: "templates/sample/.mcp.json", to: ".mcp.json" }],
  },
  harnesses: {
    codex: {
      enabled: true,
      optional: {
        "pre-tool:discovery-augment": "Codex has no Grep or Glob tool",
      },
    },
  },
};

async function fixture() {
  const repoRoot = await mkdtemp(join(tmpdir(), "codex-adapter-"));
  await write(join(repoRoot, "skills/sample-skill/SKILL.md"), "---\nname: sample-skill\ndescription: Use when testing.\n---\n\nBody\n");
  await write(join(repoRoot, "commands/sample/do.md"), "---\ndescription: Do something\n---\n\nInvoke `sample-skill`.\n");
  await write(join(repoRoot, "agents/sample/helper.md"), "---\nname: helper\ndescription: Helper\n---\n");
  await write(join(repoRoot, "hooks/sample/session-reminder.sh"), "#!/usr/bin/env bash\necho hi\n");
  await write(
    join(repoRoot, "hooks/sample/hooks.json"),
    JSON.stringify({
      hooks: {
        SessionStart: [
          {
            matcher: "startup|resume",
            hooks: [
              {
                type: "command",
                command: "bash ${CLAUDE_PLUGIN_ROOT}/hooks/session-reminder.sh",
                timeout: 5,
                statusMessage: "Load sample session reminder",
              },
            ],
          },
        ],
        SubagentStart: [
          {
            hooks: [
              {
                type: "command",
                command: "bash ${CLAUDE_PLUGIN_ROOT}/hooks/session-reminder.sh",
                statusMessage: "Subagent reminder",
              },
            ],
          },
        ],
        PreToolUse: [
          {
            matcher: "Grep|Glob",
            hooks: [
              {
                type: "command",
                command: "bash ${CLAUDE_PLUGIN_ROOT}/hooks/discovery-augment.sh",
                timeout: 5,
                statusMessage: "Augment search",
              },
            ],
          },
        ],
      },
    }),
  );
  await write(join(repoRoot, "templates/sample/.mcp.json"), "{\"mcpServers\":{}}\n");
  const registry = {
    marketplace: { name: "skills", description: "Skills marketplace", owner: { name: "Owner" } },
    plugins: [PLUGIN],
  };
  return { repoRoot, registry };
}

test("codex adapter writes .agents/plugins/marketplace.json, .codex-plugin/plugin.json, codex-hooks.json, and converts commands to skills", async (t) => {
  const { repoRoot, registry } = await fixture();
  t.after(() => rm(repoRoot, { recursive: true, force: true }));

  const report = await runAdapters({ repoRoot, registry, adapters: [codex] });
  assert.deepEqual(report.errors(), []);
  assert.deepEqual(
    report.entries.map(({ kind, resource, status }) => `${kind} ${resource} ${status}`),
    [
      "agents helper degraded",
      "hooks subagent-start:session-reminder not-applicable",
      "hooks pre-tool:discovery-augment skipped",
    ],
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
  assert.equal(manifest.hooks, "./codex-hooks.json");

  const codexHooks = JSON.parse(await readFile(join(repoRoot, "dist/plugins/sample/codex-hooks.json"), "utf8"));
  assert.deepEqual(codexHooks, {
    hooks: {
      SessionStart: [
        {
          matcher: "startup|resume",
          hooks: [
            {
              type: "command",
              command: "bash ${CLAUDE_PLUGIN_ROOT}/hooks/session-reminder.sh",
              timeout: 5,
              statusMessage: "Load sample session reminder",
            },
          ],
        },
      ],
    },
  });

  await access(join(repoRoot, "dist/plugins/sample/codex-skills/sample-skill/SKILL.md"));
  await access(join(repoRoot, "dist/plugins/sample/codex-skills/sample-cmd-do/SKILL.md"));
  await access(join(repoRoot, "dist/plugins/sample/hooks/session-reminder.sh"));
  await access(join(repoRoot, "dist/plugins/sample/.mcp.json"));
  await assert.rejects(access(join(repoRoot, "dist/plugins/sample/commands")), "commands are converted to skills");
  await assert.rejects(access(join(repoRoot, "dist/plugins/sample/agents")), "agents are excluded");
  await assert.rejects(access(join(repoRoot, "dist/plugins/sample/hooks/hooks.json")), "Claude hooks.json is not copied in standalone codex build");

  assert.deepEqual(await codex.validate({ repoRoot, outRoot: repoRoot, plugin: PLUGIN }), []);
});

test("codex adapter generates a fallback statusMessage when missing and writes empty codex-hooks.json when all hooks are skipped", async (t) => {
  const { repoRoot, registry } = await fixture();
  t.after(() => rm(repoRoot, { recursive: true, force: true }));

  // Missing statusMessage on a carried hook generates a fallback and reports degraded.
  await write(
    join(repoRoot, "hooks/sample/hooks.json"),
    JSON.stringify({
      hooks: {
        SessionStart: [{ hooks: [{ type: "command", command: "bash ${CLAUDE_PLUGIN_ROOT}/hooks/session-reminder.sh" }] }],
      },
    }),
  );
  const fallbackReport = await runAdapters({ repoRoot, registry, adapters: [codex] });
  assert.deepEqual(fallbackReport.errors(), []);
  assert.ok(fallbackReport.entries.some((e) => e.kind === "hooks" && e.status === "degraded" && /statusMessage/.test(e.reason)));
  const fallbackHooks = JSON.parse(await readFile(join(repoRoot, "dist/plugins/sample/codex-hooks.json"), "utf8"));
  assert.equal(fallbackHooks.hooks.SessionStart[0].hooks[0].statusMessage, "sample session-start:session-reminder");

  // validate rejects a codex-hooks.json whose statusMessage was stripped.
  await write(
    join(repoRoot, "dist/plugins/sample/codex-hooks.json"),
    JSON.stringify({
      hooks: {
        SessionStart: [{ hooks: [{ type: "command", command: "bash ${CLAUDE_PLUGIN_ROOT}/hooks/session-reminder.sh" }] }],
      },
    }),
  );
  const validationErrors = await codex.validate({ repoRoot, outRoot: repoRoot, plugin: PLUGIN });
  assert.equal(validationErrors.length, 1);
  assert.match(validationErrors[0], /missing statusMessage/);

  // When all hooks are optional/skipped, codex-hooks.json is still emitted with { hooks: {} }
  // so Codex never falls back to reading Claude Code's hooks/hooks.json.
  await write(
    join(repoRoot, "hooks/sample/hooks.json"),
    JSON.stringify({
      hooks: {
        PreToolUse: [
          {
            matcher: "Grep|Glob",
            hooks: [
              {
                type: "command",
                command: "bash ${CLAUDE_PLUGIN_ROOT}/hooks/discovery-augment.sh",
                statusMessage: "Augment search",
              },
            ],
          },
        ],
      },
    }),
  );
  const skippedReport = await runAdapters({ repoRoot, registry, adapters: [codex] });
  assert.deepEqual(skippedReport.errors(), []);
  const manifest = JSON.parse(await readFile(join(repoRoot, "dist/plugins/sample/.codex-plugin/plugin.json"), "utf8"));
  assert.equal(manifest.hooks, "./codex-hooks.json");
  const codexHooks = JSON.parse(await readFile(join(repoRoot, "dist/plugins/sample/codex-hooks.json"), "utf8"));
  assert.deepEqual(codexHooks, { hooks: {} });
  assert.deepEqual(await codex.validate({ repoRoot, outRoot: repoRoot, plugin: PLUGIN }), []);
});

test("real plugins build isolated codex-hooks.json and execute carried hooks cleanly under Codex", async (t) => {
  const outRoot = await mkdtemp(join(tmpdir(), "codex-real-"));
  t.after(() => rm(outRoot, { recursive: true, force: true }));

  const registry = JSON.parse(await readFile("registry.json", "utf8"));
  const report = await runAdapters({ repoRoot: process.cwd(), outRoot, registry, adapters: [codex] });
  assert.deepEqual(report.errors(), []);

  for (const plugin of registry.plugins) {
    assert.deepEqual(await codex.validate({ repoRoot: process.cwd(), outRoot, plugin }), []);
  }

  // codebase carries only SessionStart; PreToolUse (Grep|Glob) is excluded.
  const codebaseHooks = JSON.parse(await readFile(join(outRoot, "dist/plugins/codebase/codex-hooks.json"), "utf8"));
  assert.deepEqual(Object.keys(codebaseHooks.hooks), ["SessionStart"]);
  assert.equal(codebaseHooks.hooks.SessionStart[0].hooks[0].statusMessage, "Load codebase knowledge graph protocol");

  // devenv skips PostToolUse (Write|Edit) and emits an empty codex-hooks.json so Codex does not load hooks/hooks.json.
  const devenvHooks = JSON.parse(await readFile(join(outRoot, "dist/plugins/devenv/codex-hooks.json"), "utf8"));
  assert.deepEqual(devenvHooks, { hooks: {} });

  // commit-tools carries SessionStart and PreToolUse (Bash|mcp__.*git.*commit), and routing-reminder.sh resolves codex-skills in standalone builds.
  const commitHooks = JSON.parse(await readFile(join(outRoot, "dist/plugins/commit-tools/codex-hooks.json"), "utf8"));
  assert.deepEqual(Object.keys(commitHooks.hooks), ["SessionStart", "PreToolUse"]);
  const { stdout: routingOut } = await execFileP("bash", [join(outRoot, "dist/plugins/commit-tools/hooks/scripts/routing-reminder.sh")]);
  assert.match(routingOut, /codex-skills\/commit-action\/SKILL\.md/);

  // codebase session-reminder.sh detects codebase-memory-mcp configured in CODEX_HOME/config.toml even without the binary on PATH.
  const codexHome = await mkdtemp(join(tmpdir(), "codex-home-"));
  t.after(() => rm(codexHome, { recursive: true, force: true }));
  await writeFile(join(codexHome, "config.toml"), '[mcp_servers.codebase-memory-mcp]\ncommand = "/opt/bin/codebase-memory-mcp"\n');
  const { stdout: reminderOut } = await execFileP("bash", [join(outRoot, "dist/plugins/codebase/hooks/session-reminder.sh")], {
    cwd: codexHome,
    env: { ...process.env, HOME: codexHome, CODEX_HOME: codexHome, PATH: "/usr/bin:/bin" },
  });
  assert.match(reminderOut, /Code Discovery Protocol/);
});
