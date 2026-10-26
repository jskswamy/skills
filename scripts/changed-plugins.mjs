#!/usr/bin/env node
// Usage: node scripts/changed-plugins.mjs
// Prints, one per line, the plugins whose built output differs from the
// committed dist/: the plugins a release must bump. Comparing output rather
// than source paths also catches changes made only to adapters, runtimes or
// transforms, which version-keyed plugin caches would otherwise never pick up.
// Version fields are ignored, so a bump alone is no change.
import { readdir, readFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ADAPTERS, withTempBuild } from "./lib/adapters/index.mjs";
import { loadRegistry } from "./lib/registry.mjs";

// Manifests that carry the plugin version.
const VERSIONED = new Set(["plugin.json", "package.json"]);
const MARKETPLACES = [".claude-plugin/marketplace.json", ".agents/plugins/marketplace.json"];

// Compares every adapter that keeps one folder per plugin (pluginsDir).
export async function changedPlugins({ repoRoot, outRoot, adapters = ADAPTERS }) {
  const changed = new Set();
  for (const base of new Set(adapters.map((adapter) => adapter.pluginsDir).filter(Boolean))) {
    const names = new Set([...(await subdirs(join(repoRoot, base))), ...(await subdirs(join(outRoot, base)))]);
    for (const name of names) {
      if (!(await sameTree(join(repoRoot, base, name), join(outRoot, base, name)))) changed.add(name);
    }
  }
  // Marketplace metadata (description, tags) ships with the root catalogs.
  for (const marketplacePath of MARKETPLACES) {
    const entries = async (root) => {
      const marketplace = await readFile(join(root, marketplacePath), "utf8").then(JSON.parse, () => ({ plugins: [] }));
      return new Map(marketplace.plugins.map(({ version, ...entry }) => [entry.name, JSON.stringify(entry)]));
    };
    const [committed, built] = [await entries(repoRoot), await entries(outRoot)];
    for (const name of new Set([...committed.keys(), ...built.keys()])) {
      if (committed.get(name) !== built.get(name)) changed.add(name);
    }
  }
  return [...changed].sort();
}

async function subdirs(dir) {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

async function sameTree(a, b) {
  const [left, right] = [await files(a), await files(b)];
  if (left.length === 0 || left.join("\n") !== right.join("\n")) return false;
  for (const path of left) {
    const [x, y] = [await readFile(join(a, path)), await readFile(join(b, path))];
    if (x.equals(y)) continue;
    if (!VERSIONED.has(basename(path)) || unversioned(x) !== unversioned(y)) return false;
  }
  return true;
}

async function files(dir) {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true }).catch(() => []);
  return entries
    .filter((e) => e.isFile())
    .map((e) => join(e.parentPath, e.name).slice(dir.length + 1))
    .sort();
}

function unversioned(buffer) {
  try {
    const { version, ...rest } = JSON.parse(buffer.toString("utf8"));
    return JSON.stringify(rest);
  } catch {
    return buffer.toString("utf8");
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
  const registry = await loadRegistry(join(repoRoot, "registry.json"));
  const changed = await withTempBuild({ repoRoot, registry }, async ({ outRoot, report }) =>
    report.errors().length > 0 ? null : changedPlugins({ repoRoot, outRoot }),
  );
  if (!changed) {
    console.error("build failed; run npm run build for details");
    process.exit(1);
  }
  for (const name of changed) console.log(name);
}
