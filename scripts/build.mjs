#!/usr/bin/env node
// Usage: node scripts/build.mjs [--release] [--out <dir>]
// Writes into a fresh temp dir by default, so day-to-day builds never touch
// the repo; only --release writes dist/ and .claude-plugin/ in place.
import { copyFile, mkdir, mkdtemp } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { runAdapters, validateHarnessIds } from "./lib/adapters/index.mjs";
import { loadRegistry, validateRegistryShape } from "./lib/registry.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const registry = await loadRegistry(join(repoRoot, "registry.json"));
const errors = validateRegistryShape(registry);
if (errors.length === 0) errors.push(...validateHarnessIds(registry));

if (errors.length > 0) {
  for (const error of errors) {
    console.error(error);
  }
  process.exit(1);
}

const { values } = parseArgs({ options: { release: { type: "boolean" }, out: { type: "string" } } });
if (values.release && values.out) {
  console.error("--release writes into the repository; it cannot be combined with --out");
  process.exit(1);
}
if (values.out && existsSync(join(values.out, "package.json"))) {
  console.error(`${values.out} already has a package.json; pick an empty or new folder for --out`);
  process.exit(1);
}
const outRoot = values.release ? repoRoot : values.out ? resolve(values.out) : await mkdtemp(join(tmpdir(), "skills-build-"));
await mkdir(outRoot, { recursive: true });
// Pi loads a package from its package.json, so a non-release build carries one.
if (outRoot !== repoRoot) await copyFile(join(repoRoot, "package.json"), join(outRoot, "package.json"));

const report = await runAdapters({ repoRoot, outRoot, registry });
console.log("Generated harness output");
for (const line of report.lines()) console.log(line);
if (report.errors().length > 0) {
  console.error(`${report.errors().length} resource(s) cannot be carried; mark hooks optional in registry.json or fix them`);
  process.exit(1);
}
console.log(`Output: ${outRoot}`);
