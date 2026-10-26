import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as antigravity from "../../../harnesses/antigravity/adapter.mjs";
import * as claudeCode from "../../../harnesses/claude-code/adapter.mjs";
import * as codex from "../../../harnesses/codex/adapter.mjs";
import * as opencode from "../../../harnesses/opencode/adapter.mjs";
import * as pi from "../../../harnesses/pi/adapter.mjs";
import { loadPluginModel } from "../model.mjs";

export const ADAPTERS = [claudeCode, antigravity, opencode, pi, codex];

// Claude Code stays on unless disabled; every other harness is opt-in.
export function isEnabled(plugin, id) {
  const enabled = plugin.harnesses?.[id]?.enabled;
  return id === "claude-code" ? enabled !== false : enabled === true;
}

export function enabledAdapters(plugin, adapters = ADAPTERS) {
  return adapters.filter((adapter) => isEnabled(plugin, adapter.id));
}

export function validateHarnessIds(registry, adapters = ADAPTERS) {
  const ids = new Set(adapters.map((adapter) => adapter.id));
  return (registry.plugins ?? []).flatMap((plugin) =>
    Object.keys(plugin.harnesses ?? {})
      .filter((id) => !ids.has(id))
      .map((id) => `${plugin.name}.harnesses.${id} has no adapter`),
  );
}

// Sources are read from repoRoot; output is written under outRoot.
export async function runAdapters({ repoRoot, outRoot = repoRoot, registry, adapters = ADAPTERS }) {
  const report = createReport(registry.plugins);
  for (const adapter of adapters) {
    const plugins = registry.plugins.filter((plugin) => isEnabled(plugin, adapter.id));
    // generateRoot may return state that generate and finish share, for
    // harnesses that write one aggregate across plugins.
    const state = await adapter.generateRoot?.({ repoRoot, outRoot, registry, plugins, report: report.for(null, adapter.id) });
    for (const plugin of plugins) {
      const model = await loadPluginModel({ repoRoot, plugin });
      await adapter.generate({ repoRoot, outRoot, model, plugin, state, report: report.for(plugin.name, adapter.id) });
      report.ran(plugin.name, adapter.id);
    }
    await adapter.finish?.({ repoRoot, outRoot, registry, plugins, state, report: report.for(null, adapter.id) });
  }
  return report;
}

// Builds into a fresh temp dir, passes it with the report to use, and
// removes it afterwards: how checks see the current sources rather than the
// committed dist/.
export async function withTempBuild({ repoRoot, registry, adapters = ADAPTERS }, use) {
  const outRoot = await mkdtemp(join(tmpdir(), "skills-build-"));
  try {
    const report = await runAdapters({ repoRoot, outRoot, registry, adapters });
    return await use({ outRoot, report });
  } finally {
    await rm(outRoot, { recursive: true, force: true });
  }
}

// Records what each harness degrades or cannot carry, per plugin.
function createReport(plugins) {
  const entries = [];
  const ran = new Map(plugins.map((plugin) => [plugin.name, []]));
  return {
    entries,
    errors: () => entries.filter((entry) => entry.status === "error"),
    for: (plugin, harness) => ({ add: (entry) => entries.push({ plugin, harness, ...entry }) }),
    ran: (plugin, harness) => ran.get(plugin).push(harness),
    lines() {
      return [...ran].flatMap(([plugin, harnesses]) => {
        if (harnesses.length === 0) return [`${plugin}: no harness enabled`];
        const notes = entries.filter((entry) => entry.plugin === plugin);
        const summary = harnesses.map((harness) => {
          const count = notes.filter((entry) => entry.harness === harness).length;
          return count === 0 ? `${harness} ok` : `${harness} ${count} note${count === 1 ? "" : "s"}`;
        });
        return [
          `${plugin}: ${summary.join("; ")}`,
          ...notes.map((n) => `  ${n.harness} ${n.kind} ${n.resource}: ${n.status}${n.reason ? ` (${n.reason})` : ""}`),
        ];
      });
    },
  };
}
