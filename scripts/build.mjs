#!/usr/bin/env node
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generateClaudeCode } from "./lib/claude-code.mjs";
import { loadRegistry, validateRegistryShape } from "./lib/registry.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const registry = await loadRegistry(join(repoRoot, "registry.json"));
const errors = validateRegistryShape(registry);

if (errors.length > 0) {
  for (const error of errors) {
    console.error(error);
  }
  process.exit(1);
}

await generateClaudeCode({ repoRoot, registry });
console.log("Generated Claude Code marketplace wrappers");
