import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { PI_TOOLS } from "./tools.mjs";
import { ensureDir, readJson, removeDir, writeJson } from "../../scripts/lib/fs-utils.mjs";
import { parseDocument, writeDocument } from "../../scripts/lib/transforms/frontmatter.mjs";
import { canonicalPluginPaths } from "../../scripts/lib/transforms/paths.mjs";
import { carryHooks } from "../../scripts/lib/transforms/policy.mjs";
import { validatePiPackage } from "../../scripts/lib/pi-package.mjs";
import { commandNames } from "../../scripts/lib/transforms/names.mjs";
import { rewriteMatcher } from "../../scripts/lib/transforms/tools.mjs";
import { copyLayout, copyRuntime, wrapperLayout } from "../../scripts/lib/layout.mjs";

// `pi install` takes one package per repo, so Pi gets one aggregate under
// dist/pi/, named by the hand-written "pi" block in the root package.json.
// It is self-contained: the Pi plugins' resources are copied there at their
// canonical paths (so hook commands keep their canonical form), next to the
// prompt templates, one hooks manifest and a copy of the runtime that runs it.
export const id = "pi";

export const capabilities = {
  skills: { mode: "native" },
  commands: { mode: "as-file" },
  agents: { mode: "none" },
  hooks: { mode: "shim", events: ["session-start", "pre-tool", "post-tool", "stop"] },
};

const OUT = "dist/pi";
const PROMPTS = `${OUT}/prompts`;
const MANIFEST = `${OUT}/hooks.manifest.json`;
// The runtime sets this to dist/pi, its own package root.
const ROOT_TOKEN = '"${PI_PACKAGE_ROOT}"';
// Package paths keep the runtime's relative imports intact.
const RUNTIME = {
  "harnesses/pi/runtime.mjs": "runtime/pi/runtime.mjs",
  "harnesses/pi/tools.mjs": "runtime/pi/tools.mjs",
  "harnesses/lib/hook-runner.mjs": "runtime/lib/hook-runner.mjs",
  "harnesses/lib/hook-input.mjs": "runtime/lib/hook-input.mjs",
};

export async function generateRoot({ outRoot, plugins }) {
  // Rebuilt whole, so a plugin that loses the harness loses its files.
  await removeDir(join(outRoot, OUT));
  if (plugins.length === 0) return undefined;
  await ensureDir(join(outRoot, PROMPTS));
  await copyRuntime({ files: RUNTIME, to: join(outRoot, OUT) });

  // Pi names a prompt by file name alone.
  return { promptName: commandNames(plugins), hooks: [] };
}

export async function generate({ repoRoot, outRoot, model, state, report }) {
  // Commands ship as prompts and Pi has no agents; the rest keeps its
  // canonical path.
  const layout = wrapperLayout(model);
  const mirrored = layout.filter(({ kind }) => kind !== "commands" && kind !== "agents").map((entry) => ({ ...entry, to: entry.from }));
  await copyLayout({ repoRoot, layout: mirrored, to: join(outRoot, OUT) });

  for (const command of model.commands) {
    const { frontmatter, body } = parseDocument(await readFile(join(repoRoot, command.path), "utf8"));
    const kept = Object.fromEntries(Object.entries(frontmatter).filter(([key]) => ["description", "argument-hint"].includes(key)));
    // Claude appends arguments a command does not place; Pi only substitutes.
    const withArguments = /\$(ARGUMENTS|@|\d|\{)/.test(body) ? body : `${body.trimEnd()}\n\nArguments: $ARGUMENTS\n`;
    await writeFile(
      join(outRoot, PROMPTS, `${state.promptName(model.name, command.name)}.md`),
      writeDocument({ frontmatter: kept, body: withArguments }),
    );
  }

  for (const agent of model.agents) {
    report.add({ kind: "agents", resource: agent.name, status: "degraded", reason: "Pi has no sub-agents" });
  }

  const carried = await carryHooks({ repoRoot, model, harness: id, canCarry, report });

  for (const entry of carried) {
    try {
      state.hooks.push({ plugin: model.name, ...entry, command: canonicalPluginPaths(entry.command, layout, ROOT_TOKEN) });
    } catch (error) {
      report.add({ kind: "hooks", resource: entry.id, status: "error", reason: error.message });
    }
  }
}

export async function finish({ repoRoot, outRoot, state }) {
  if (!state) return;
  await writeJson(join(outRoot, MANIFEST), { entries: state.hooks });

  // dist/pi is also a package on its own, so it can be installed as a folder
  // (pi install <checkout>/dist/pi, or skillshare) as well as through the
  // root package.json, whose hand-written "pi" block names the same parts.
  const root = await readJson(join(repoRoot, "package.json"));
  await writeJson(join(outRoot, OUT, "package.json"), {
    name: `${root.name}-pi`,
    private: true,
    type: "module",
    description: root.description,
    keywords: ["pi-package"],
    pi: { skills: ["./skills"], prompts: ["./prompts"], extensions: ["./runtime/pi/runtime.mjs"] },
  });
}

export function canCarry(entry) {
  if (entry.event === "subagent-start") return { notApplicable: "Pi has no sub-agents" };
  if ((entry.event === "pre-tool" || entry.event === "post-tool") && rewriteMatcher(entry.matcher, PI_TOOLS) === null) {
    return { unsupported: `matcher "${entry.matcher}" names a tool Pi does not have` };
  }
  return { ok: true };
}

// A folder install of dist/pi reads its own package.json; check the paths it
// names exist.
export async function validate({ repoRoot, outRoot = repoRoot }) {
  const root = join(outRoot, OUT);
  const packageJson = await readJson(join(root, "package.json")).catch(() => undefined);
  if (!packageJson) return [`${OUT}: missing package.json; run npm run build`];
  return (await validatePiPackage({ repoRoot: root, packageJson })).map((error) => `${OUT}: ${error}`);
}
