import test from "node:test";
import assert from "node:assert/strict";
import { chmod, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const canonicalPath = "skills/typst-publish/SKILL.md";
const generatedPath = "plugins/typst-notes/skills/typst-publish/SKILL.md";

test("typst-publish accepts Nix as a non-install fallback", async () => {
  const content = await readFile(canonicalPath, "utf8");

  assert.match(content, /command -v nix\b/, "preflight checks for the nix command");
  assert.match(content, /NIX_AVAILABLE/, "preflight has a Nix availability state");
  assert.match(content, /nix shell nixpkgs#typst -c typst/, "skill documents nix shell invocation for Typst");
  assert.match(content, /without installing Typst globally/i, "Nix fallback is documented as no global install");
});

test("typst-publish generated plugin skill stays in sync", async () => {
  const canonical = await readFile(canonicalPath, "utf8");
  const generated = await readFile(generatedPath, "utf8");

  assert.equal(generated, canonical);
});

test("compile script uses nix command when typst and nix-shell are unavailable", async () => {
  const dir = await mkdtemp(join(tmpdir(), "typst-nix-fallback-"));
  const binDir = join(dir, "bin");
  await import("node:fs/promises").then(({ mkdir }) => mkdir(binDir));

  const input = join(dir, "note.typ");
  const output = join(dir, "note");
  const invoked = join(dir, "nix-invoked");
  await writeFile(input, "= Test\n");
  await writeFile(
    join(binDir, "nix"),
    `#!/usr/bin/env bash\nset -euo pipefail\nif [[ "$1 $2 $3 $4 $5" != "shell nixpkgs#typst -c typst compile" ]]; then\n  echo "unexpected nix invocation: $*" >&2\n  exit 42\nfi\ntouch "${invoked}"\ntouch "\${@: -1}"\n`,
  );
  await chmod(join(binDir, "nix"), 0o755);

  const result = await spawnProcess("/bin/bash", ["shared-scripts/typst-notes/compile.sh", input, output], {
    PATH: `${binDir}:/usr/bin:/bin`,
  });

  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, new RegExp(`${escapeRegExp(output)}\\.pdf`));
  assert.equal(await readFile(invoked, "utf8"), "");
});

function spawnProcess(command, args, env) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { env: { ...process.env, ...env } });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("close", (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
