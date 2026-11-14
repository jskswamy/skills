import test from "node:test";
import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { withTempBuild } from "../../scripts/lib/adapters/index.mjs";
import { loadRegistry } from "../../scripts/lib/registry.mjs";

const available = !spawnSync("skillshare", ["--version"], { encoding: "utf8" }).error;

async function fixture(t) {
  const cwd = await mkdtemp(join(tmpdir(), "skillshare-audit-"));
  t.after(() => rm(cwd, { recursive: true, force: true }));
  await mkdir(join(cwd, ".skillshare"));
  await cp(".skillshare/audit-rules.yaml", join(cwd, ".skillshare/audit-rules.yaml"));
  await mkdir(join(cwd, "skills/commit-tools/review-commits/lib"), { recursive: true });
  await writeFile(join(cwd, "skills/commit-tools/review-commits/SKILL.md"), "---\nname: review-commits\ndescription: Use when reviewing local commits.\n---\n\nReview local commits.\n");
  return {
    cwd,
    audit: () => spawnSync("skillshare", ["audit", "-p", "./skills", "-T", "high", "--analyzer", "static", "--no-tui", "-y", "--format", "json"], { cwd, encoding: "utf8" }),
  };
}

test("Skillshare permits the bundled commit executor used by the split helper", { skip: !available && "skillshare is not installed" }, async (t) => {
  const { cwd, audit } = await fixture(t);
  await cp("skills/commit-tools/review-commits/lib/apply-split.sh", join(cwd, "skills/commit-tools/review-commits/lib/apply-split.sh"));
  const result = audit();
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(JSON.parse(result.stdout).summary.high, 0);
});

test("Skillshare still blocks arbitrary Python subprocess calls", { skip: !available && "skillshare is not installed" }, async (t) => {
  const { cwd, audit } = await fixture(t);
  const path = join(cwd, "skills/commit-tools/review-commits/lib/untrusted.py");
  for (const source of [
    "subprocess.run(['node', external_script])",
    "subprocess.run(['node', commit_script, '--eval', payload])",
    "subprocess.run(['bash', commit_script, '-c', payload])",
    "subprocess.run(command, shell=True)",
  ]) {
    await writeFile(path, source + "\n");
    const result = audit();
    assert.equal(result.status, 1, `${source}\n${result.stdout}${result.stderr}`);
    const report = JSON.parse(result.stdout);
    assert.ok(report.results.some((r) => r.findings.some((f) => f.ruleId === "shell-execution-0" && f.severity === "HIGH")), result.stdout);
  }
});

test(
  "Skillshare discovers Claude, Codex, Pi, and OpenCode targets for every plugin from the generated catalogs",
  { skip: !available && "skillshare is not installed" },
  async () => {
    const repoRoot = process.cwd();
    const registry = await loadRegistry(join(repoRoot, "registry.json"));
    await withTempBuild({ repoRoot, registry }, async ({ outRoot }) => {
      const result = spawnSync("skillshare", ["plugin", "discover", outRoot, "--json", "--no-tui"], { encoding: "utf8" });
      assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
      const { candidates = [] } = JSON.parse(result.stdout);
      for (const plugin of registry.plugins) {
        const entry = candidates.find((p) => p.name === plugin.name);
        assert.ok(entry, `missing candidate ${plugin.name}`);
        const targets = entry.targets ?? [];
        for (const target of ["claude", "codex", "pi", "opencode"]) {
          assert.ok(targets.includes(target), `${plugin.name} missing target ${target}: ${targets.join(", ")}`);
        }
        assert.equal(entry.targetInfo?.claude?.path, `dist/claude-code/plugins/${plugin.name}`);
        assert.equal(entry.targetInfo?.codex?.manifest, ".codex-plugin/plugin.json");
        assert.equal(entry.path, `dist/codex/plugins/${plugin.name}`);
        assert.equal(entry.targetInfo?.pi?.path, `dist/pi/plugins/${plugin.name}`);
        assert.equal(entry.targetInfo?.pi?.problem, undefined);
        assert.equal(entry.targetInfo?.opencode?.path, `dist/opencode/plugins/${plugin.name}`);
        assert.equal(entry.targetInfo?.opencode?.problem, undefined);
      }

      const home = await mkdtemp(join(tmpdir(), "skillshare-home-"));
      try {
        const env = {
          ...process.env,
          HOME: home,
          XDG_CONFIG_HOME: join(home, "config"),
          XDG_STATE_HOME: join(home, "state"),
          XDG_DATA_HOME: join(home, "data"),
        };
        const add = spawnSync(
          "skillshare",
          ["plugin", "add", outRoot, "--plugin", "bivouac", "--name", "bivouac", "--target", "pi", "--target", "opencode", "--dry-run", "--json", "--no-tui", "-g"],
          { env, encoding: "utf8" },
        );
        assert.equal(add.status, 0, `${add.stdout}${add.stderr}`);
        const plan = JSON.parse(add.stdout);
        assert.equal(plan.blocked, false);
        assert.deepEqual(
          plan.changes.map(({ target, action }) => ({ target, action })),
          [
            { target: "opencode", action: "install" },
            { target: "pi", action: "install" },
          ],
        );
      } finally {
        await rm(home, { recursive: true, force: true });
      }
    });
  },
);
