#!/usr/bin/env node
// Usage: npm run eval -- [plugin ...] [-- extra claude plugin eval flags]
// Stages evals/<plugin> into plugins/<plugin>/evals (gitignored, so it never ships), runs
// `claude plugin eval`, then removes the staged copy. Runs real agent sessions: costs tokens.
import { spawnSync } from "node:child_process";
import { cp, readdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const split = args.indexOf("--");
const named = split === -1 ? args : args.slice(0, split);
const extra = split === -1 ? [] : args.slice(split + 1);

const available = (await readdir(join(repoRoot, "evals"), { withFileTypes: true }))
  .filter((e) => e.isDirectory() && e.name !== "results")
  .map((e) => e.name);
const plugins = named.length ? named : available;

let failed = false;
for (const plugin of plugins) {
  if (!available.includes(plugin)) {
    console.error(`no evals/${plugin} (have: ${available.join(", ")})`);
    process.exit(2);
  }
  const staged = join(repoRoot, "plugins", plugin, "evals");
  await rm(staged, { recursive: true, force: true });
  await cp(join(repoRoot, "evals", plugin), staged, { recursive: true });
  try {
    // shortcut: --ablation none scores only that a skill loaded; drop it to compare against no plugin
    const out = join(repoRoot, "evals", "results", `${plugin}-${Date.now()}`);
    const r = spawnSync(
      "claude",
      ["plugin", "eval", join("plugins", plugin), "--ablation", "none", "--runs", "3", "--concurrency", "4",
        "--max-cost-usd", "3", "--no-publish", "--trust-plugin", "--output-dir", out, ...extra],
      { cwd: repoRoot, stdio: "inherit" },
    );
    if (r.status !== 0) failed = true;
  } finally {
    await rm(staged, { recursive: true, force: true });
  }
}
process.exit(failed ? 1 : 0);
