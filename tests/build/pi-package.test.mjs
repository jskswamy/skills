import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validatePiPackage } from "../../scripts/lib/pi-package.mjs";

test("validatePiPackage accepts existing skills and extensions paths", async () => {
  const repoRoot = await mkdtemp(join(tmpdir(), "pi-package-"));
  await mkdir(join(repoRoot, "skills"), { recursive: true });
  await mkdir(join(repoRoot, "harnesses/pi/extensions"), { recursive: true });

  const errors = await validatePiPackage({
    repoRoot,
    packageJson: { pi: { skills: ["./skills"], extensions: ["./harnesses/pi/extensions"] } },
  });

  assert.deepEqual(errors, []);
});

test("validatePiPackage reports missing skills paths", async () => {
  const repoRoot = await mkdtemp(join(tmpdir(), "pi-package-"));
  const errors = await validatePiPackage({
    repoRoot,
    packageJson: { pi: { skills: ["./missing"], extensions: [] } },
  });

  assert.match(errors.join("\n"), /pi\.skills path does not exist: \.\/missing/);
});
