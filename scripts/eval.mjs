#!/usr/bin/env node
// Usage: npm run eval -- [plugin ...] [-- extra claude plugin eval flags]
// Builds the Claude plugins into a temp dir, stages evals/<plugin> into that
// build's plugin folder, runs `claude plugin eval` there, then removes the
// temp dir. Evals score the current sources, never committed dist/, and never
// ship. Runs real agent sessions: costs tokens.
import { spawnSync } from "node:child_process";
import { cp, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as claudeCode from "../harnesses/claude-code/adapter.mjs";
import { withTempBuild } from "./lib/adapters/index.mjs";
import { loadRegistry } from "./lib/registry.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const split = args.indexOf("--");
const named = split === -1 ? args : args.slice(0, split);
const extra = split === -1 ? [] : args.slice(split + 1);

const available = (await readdir(join(repoRoot, "evals"), { withFileTypes: true }))
  .filter((e) => e.isDirectory() && e.name !== "results")
  .map((e) => e.name);
const plugins = named.length ? named : available;
for (const plugin of plugins) {
  if (!available.includes(plugin)) {
    console.error(`no evals/${plugin} (have: ${available.join(", ")})`);
    process.exit(2);
  }
}

const registry = await loadRegistry(join(repoRoot, "registry.json"));
let failed = false;
await withTempBuild({ repoRoot, registry, adapters: [claudeCode] }, async ({ outRoot }) => {
  for (const plugin of plugins) {
    const pluginDir = join(outRoot, claudeCode.pluginsDir, plugin);
    await cp(join(repoRoot, "evals", plugin), join(pluginDir, "evals"), { recursive: true });
    // shortcut: --ablation none scores only that a skill loaded; drop it to compare against no plugin
    const out = join(repoRoot, "evals", "results", `${plugin}-${Date.now()}`);
    const r = spawnSync(
      "claude",
      ["plugin", "eval", pluginDir, "--ablation", "none", "--runs", "3", "--concurrency", "4",
        "--max-cost-usd", "3", "--no-publish", "--trust-plugin", "--output-dir", out, ...extra],
      { cwd: repoRoot, stdio: "inherit" },
    );
    if (r.status !== 0) failed = true;
  }
});
process.exit(failed ? 1 : 0);
