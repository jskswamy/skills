// Regenerate the Claude output snapshot: node tests/fixtures/update-claude-snapshot.mjs
// The snapshot is of a fresh build of the current sources, not of the
// committed dist/, which changes only at release.
import { createHash } from "node:crypto";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import * as claudeCode from "../../harnesses/claude-code/adapter.mjs";
import { runAdapters } from "../../scripts/lib/adapters/index.mjs";
import { readJson, writeJson } from "../../scripts/lib/fs-utils.mjs";

const FIXTURE = "tests/fixtures/claude-snapshot.json";

async function listFiles(root, dir) {
  const entries = await readdir(join(root, dir), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) files.push(...(await listFiles(root, path)));
    else files.push(path);
  }
  return files;
}

export async function snapshotClaudeOutput(outRoot) {
  const files = [...(await listFiles(outRoot, claudeCode.pluginsDir)), ".claude-plugin/marketplace.json"].sort();
  const snapshot = {};
  for (const path of files) {
    const content = await readFile(join(outRoot, path));
    snapshot[path] = createHash("sha256").update(path).update("\0").update(content).digest("hex");
  }
  return snapshot;
}

export async function buildClaudeSnapshot(repoRoot) {
  const outRoot = await mkdtemp(join(tmpdir(), "claude-snapshot-"));
  try {
    const registry = await readJson(join(repoRoot, "registry.json"));
    await runAdapters({ repoRoot, outRoot, registry, adapters: [claudeCode] });
    return await snapshotClaudeOutput(outRoot);
  } finally {
    await rm(outRoot, { recursive: true, force: true });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const repoRoot = join(fileURLToPath(import.meta.url), "../../..");
  const snapshot = await buildClaudeSnapshot(repoRoot);
  await writeJson(join(repoRoot, FIXTURE), snapshot);
  console.log(`Wrote ${Object.keys(snapshot).length} entries to ${relative(process.cwd(), join(repoRoot, FIXTURE))}`);
}
