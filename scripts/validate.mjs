#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadRegistry, validateRegistryResources, validateRegistryShape } from "./lib/registry.mjs";
import { validatePiPackage } from "./lib/pi-package.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const registry = await loadRegistry(join(repoRoot, "registry.json"));
const packageJson = JSON.parse(await readFile(join(repoRoot, "package.json"), "utf8"));

const errors = [
  ...validateRegistryShape(registry),
  ...(await validateRegistryResources({ repoRoot, registry })),
  ...(await validatePiPackage({ repoRoot, packageJson })),
];

if (errors.length > 0) {
  for (const error of errors) console.error(error);
  process.exit(1);
}

console.log("Validation passed");
