#!/usr/bin/env node
// Validates the current sources: the registry, skills, and a fresh build of
// every harness in a temp dir. Committed dist/ changes only at release, so it
// is never what gets checked here.
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { enabledAdapters, validateHarnessIds, withTempBuild } from "./lib/adapters/index.mjs";
import { loadRegistry, validateRegistryResources, validateRegistryShape } from "./lib/registry.mjs";
import { validateSkills } from "./lib/skills.mjs";
import { validatePiPackage } from "./lib/pi-package.mjs";
import { validateOptionalHooks } from "./lib/transforms/policy.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const registry = await loadRegistry(join(repoRoot, "registry.json"));
const packageJson = JSON.parse(await readFile(join(repoRoot, "package.json"), "utf8"));

const skills = await validateSkills({ repoRoot });

const errors = [
  ...validateRegistryShape(registry),
  ...(await validateRegistryResources({ repoRoot, registry })),
  ...validateHarnessIds(registry),
  ...(await validateOptionalHooks({ repoRoot, registry })),
  ...skills.errors,
];

if (errors.length === 0) {
  await withTempBuild({ repoRoot, registry }, async ({ outRoot, report }) => {
    errors.push(...report.errors().map((e) => `${e.plugin ?? "*"} ${e.harness} ${e.kind} ${e.resource}: ${e.reason}`));
    errors.push(...(await validatePiPackage({ repoRoot: outRoot, packageJson })));
    for (const plugin of registry.plugins ?? []) {
      for (const adapter of enabledAdapters(plugin)) {
        errors.push(...(await adapter.validate({ repoRoot, outRoot, plugin })));
      }
    }
  });
}

if (errors.length > 0) {
  // Some checks are per harness, not per plugin, and repeat for each plugin.
  for (const error of new Set(errors)) console.error(error);
  process.exit(1);
}

console.log("Validation passed");
