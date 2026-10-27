import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { PI_TOOLS } from "./tools.mjs";
import { ensureDir, pathExists, readJson, removeDir, writeJson } from "../../scripts/lib/fs-utils.mjs";
import { parseDocument, writeDocument } from "../../scripts/lib/transforms/frontmatter.mjs";
import { canonicalPluginPaths, rewritePluginRoot } from "../../scripts/lib/transforms/paths.mjs";
import { carryHooks } from "../../scripts/lib/transforms/policy.mjs";
import { validatePiPackage } from "../../scripts/lib/pi-package.mjs";
import { commandNames } from "../../scripts/lib/transforms/names.mjs";
import { rewriteMatcher } from "../../scripts/lib/transforms/tools.mjs";
import { copyLayout, copyRuntime, wrapperLayout } from "../../scripts/lib/layout.mjs";

// One self-contained Pi package per plugin under dist/pi/<name>/: the Claude
// wrapper layout (so hook scripts find their skills through relative paths),
// prompt templates for commands, and—when the plugin carries hooks—the shared
// Pi extension runtime and hooks.manifest.json.
export const id = "pi";

export const capabilities = {
  skills: { mode: "native" },
  commands: { mode: "as-file" },
  agents: { mode: "none" },
  hooks: { mode: "shim", events: ["session-start", "pre-tool", "post-tool", "stop"] },
};

// One folder per plugin under this; changed-plugins and eval read it.
export const pluginsDir = "dist/plugins";
const MANIFEST = "runtime/pi/hooks.manifest.json";
// The runtime sets this to dist/plugins/<plugin>, its own package root.
const ROOT_TOKEN = '"${PI_PACKAGE_ROOT}"';
// Package paths keep the runtime's relative imports intact.
const RUNTIME = {
  "harnesses/pi/runtime.mjs": "runtime/pi/runtime.mjs",
  "harnesses/pi/tools.mjs": "runtime/pi/tools.mjs",
  "harnesses/lib/hook-runner.mjs": "runtime/lib/hook-runner.mjs",
  "harnesses/lib/hook-input.mjs": "runtime/lib/hook-input.mjs",
};

export async function generateRoot({ outRoot, plugins }) {
  await removeDir(join(outRoot, "dist/pi"));

  // Pi names a prompt by file name alone, so collisions across plugins are prefixed.
  return { promptName: commandNames(plugins) };
}

export async function generate({ repoRoot, outRoot, model, state, report }) {
  const out = join(outRoot, pluginsDir, model.name);
  const fullLayout = wrapperLayout(model);
  if (!(await pathExists(join(out, ".claude-plugin/plugin.json")))) {
    const layout = fullLayout.filter(
      ({ kind, from }) => !["commands", "agents"].includes(kind) && !(kind === "hooks" && from.endsWith("hooks.json")),
    );
    await copyLayout({ repoRoot, layout, to: out });
  }

  if (model.commands.length > 0) {
    await ensureDir(join(out, "prompts"));
    for (const command of model.commands) {
      const { frontmatter, body } = parseDocument(await readFile(join(repoRoot, command.path), "utf8"));
      const kept = Object.fromEntries(Object.entries(frontmatter).filter(([key]) => ["description", "argument-hint"].includes(key)));
      // Claude appends arguments a command does not place; Pi only substitutes.
      const withArguments = /\$(ARGUMENTS|@|\d|\{)/.test(body) ? body : `${body.trimEnd()}\n\nArguments: $ARGUMENTS\n`;
      await writeFile(
        join(out, "prompts", `${state.promptName(model.name, command.name)}.md`),
        writeDocument({ frontmatter: kept, body: withArguments }),
      );
    }
  }

  for (const agent of model.agents) {
    report.add({ kind: "agents", resource: agent.name, status: "degraded", reason: "Pi has no sub-agents" });
  }

  const carried = await carryHooks({ repoRoot, model, harness: id, canCarry, report });
  const hooks = [];
  for (const entry of carried) {
    try {
      canonicalPluginPaths(entry.command, fullLayout, "");
      const { statusMessage: _, ...rest } = entry;
      hooks.push({ plugin: model.name, ...rest, command: rewritePluginRoot(entry.command, ROOT_TOKEN) });
    } catch (error) {
      report.add({ kind: "hooks", resource: entry.id, status: "error", reason: error.message });
    }
  }

  if (hooks.length > 0) {
    await copyRuntime({ files: RUNTIME, to: out });
    await writeJson(join(out, MANIFEST), { entries: hooks });
  }

  const pi = {};
  if (model.skills.length > 0) pi.skills = ["./skills"];
  if (model.commands.length > 0) pi.prompts = ["./prompts"];
  if (hooks.length > 0) pi.extensions = ["./runtime/pi/runtime.mjs"];

  const pkgPath = join(out, "package.json");
  const existing = await readJson(pkgPath).catch(() => ({}));
  const keywords = [...new Set([...(existing.keywords ?? []), "pi-package", ...(model.tags ?? [])])];
  await writeJson(pkgPath, {
    ...existing,
    name: `@jskswamy/${model.name}`,
    version: model.version,
    private: true,
    type: "module",
    description: model.description,
    keywords,
    pi,
  });
}

export function canCarry(entry) {
  if (entry.event === "subagent-start") return { notApplicable: "Pi has no sub-agents" };
  if ((entry.event === "pre-tool" || entry.event === "post-tool") && rewriteMatcher(entry.matcher, PI_TOOLS) === null) {
    return { unsupported: `matcher "${entry.matcher}" names a tool Pi does not have` };
  }
  return { ok: true };
}

export async function validate({ repoRoot, outRoot = repoRoot, plugin }) {
  const out = join(outRoot, pluginsDir, plugin.name);
  const label = `pi ${plugin.name}`;
  const packageJson = await readJson(join(out, "package.json")).catch(() => undefined);
  if (!packageJson) return [`${label}: missing package.json; run npm run build`];
  const errors = (await validatePiPackage({ repoRoot: out, packageJson })).map((error) => `${label}: ${error}`);
  const manifest = await readJson(join(out, MANIFEST)).catch(() => undefined);
  for (const entry of manifest?.entries ?? []) {
    for (const [, path] of entry.command.matchAll(/"\$\{PI_PACKAGE_ROOT\}"\/([^\s"';|&]+)/g)) {
      if (!(await pathExists(join(out, path)))) errors.push(`${label}: hook ${entry.id} runs missing ${path}`);
    }
  }
  return errors;
}
