import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { withTempBuild } from "../../scripts/lib/adapters/index.mjs";
import { restatePicker } from "../../scripts/lib/layout.mjs";
import { loadPluginModel } from "../../scripts/lib/model.mjs";
import { loadRegistry } from "../../scripts/lib/registry.mjs";
import { parseFrontmatter, pickerLine, validateSkills } from "../../scripts/lib/skills.mjs";

const registry = await loadRegistry("registry.json");
const models = await Promise.all(registry.plugins.map((plugin) => loadPluginModel({ repoRoot: ".", plugin })));
const skills = models.flatMap((model) => model.skills.map((skill) => ({ ...skill, plugin: model.name })));
const runnable = skills.filter((skill) => skill.userInvocable);

test("every runnable skill has a picker line of at most 120 characters, model-only skills need none", () => {
  assert.equal(skills.length, 38);
  assert.equal(runnable.length, 28);
  for (const skill of runnable) {
    assert.ok(skill.pickerLine, `${skill.plugin}:${skill.name} has a picker line`);
    assert.ok(skill.pickerLine.length <= 120, `${skill.plugin}:${skill.name} line is ${skill.pickerLine.length} characters`);
  }
});

test("pickerLine reads the metadata block, with and without other keys in it", () => {
  const line = (metadata) => pickerLine(parseFrontmatter(`---\nname: x\ndescription: Use when x.\n${metadata}\n---\n`));
  assert.equal(line('metadata:\n  short-description: "Do x. [a|b]"'), "Do x. [a|b]");
  assert.equal(line('metadata:\n  version: 1\n  short-description: "Do y."\n  other: z'), "Do y.");
  assert.equal(line("metadata:\n  version: 1"), undefined);
  assert.equal(pickerLine(parseFrontmatter("---\nname: x\ndescription: Use when x.\n---\n")), undefined);
});

test("validation rejects a 121-character picker line, a missing line and a flag the hint lacks", async () => {
  const repoRoot = await mkdtemp(join(tmpdir(), "picker-lines-"));
  try {
    const reg = { plugins: [{ name: "p", resources: { skills: ["p/a", "p/b", "p/c", "p/d"] } }] };
    const write = async (name, metadata, extra = "") => {
      await mkdir(join(repoRoot, "skills/p", name), { recursive: true });
      await writeFile(join(repoRoot, "skills/p", name, "SKILL.md"), `---\nname: ${name}\ndescription: Use when testing.\n${extra}${metadata}---\n\nbody\n`);
    };
    await write("a", 'metadata:\n  short-description: "ok"\n');
    await write("b", `metadata:\n  short-description: "${"x".repeat(121)}"\n`);
    await write("c", "");
    await write("d", 'metadata:\n  short-description: "Do it. [--fast]"\n', 'argument-hint: "[--slow]"\n');
    const { errors } = await validateSkills({ repoRoot, registry: reg });
    assert.ok(errors.some((e) => e.includes("skills/p/b/SKILL.md") && e.includes("121 chars")), errors.join("\n"));
    assert.ok(errors.some((e) => e.includes("skills/p/c/SKILL.md") && e.includes("needs metadata.short-description")));
    assert.ok(errors.some((e) => e.includes("skills/p/d/SKILL.md") && e.includes("--fast")));
    assert.ok(!errors.some((e) => e.includes("skills/p/a/SKILL.md")));
  } finally {
    await rm(repoRoot, { recursive: true, force: true });
  }
});

test("restatePicker changes only the description lines of every real skill and keeps quoted hints", async () => {
  for (const skill of runnable) {
    const source = await readFile(join(skill.path, "SKILL.md"), "utf8");
    for (const target of ["when_to_use", "prefix"]) {
      const out = restatePicker(source, skill.pickerLine, target);
      const before = source.split("\n");
      const after = out.split("\n");
      const same = (line) => !line.startsWith("description:") && !line.startsWith("when_to_use:");
      assert.deepEqual(after.filter(same), before.filter(same), `${skill.path} ${target}`);
      const fm = parseFrontmatter(out);
      if (target === "when_to_use") {
        assert.equal(fm.description, skill.pickerLine);
        assert.equal(fm.when_to_use, skill.frontmatter.description);
        assert.ok(fm.description.length + fm.when_to_use.length <= 1536);
      } else {
        assert.equal(fm.description, `${skill.pickerLine} ${skill.frontmatter.description}`);
      }
      if (skill.frontmatter["argument-hint"] !== undefined) assert.equal(fm["argument-hint"], skill.frontmatter["argument-hint"]);
    }
  }
});

test("restatePicker fails on a missing description line or an existing when_to_use", () => {
  assert.throws(() => restatePicker("---\nname: x\n---\nbody", "line", "prefix"), /no description line/);
  assert.throws(() => restatePicker("---\nname: x\ndescription: d\nwhen_to_use: w\n---\n", "line", "when_to_use"), /already has when_to_use/);
});

test("each harness carries the picker line in the field it reads", async () => {
  await withTempBuild({ repoRoot: ".", registry }, async ({ outRoot }) => {
    for (const skill of skills) {
      const id = `${skill.plugin}-${skill.name}`;
      const claude = parseFrontmatter(await readFile(join(outRoot, "dist/claude-code/plugins", skill.plugin, "skills", skill.name, "SKILL.md"), "utf8"));
      const agy = parseFrontmatter(await readFile(join(outRoot, "dist/antigravity/plugins", skill.plugin, "skills", skill.name, "SKILL.md"), "utf8"));
      const codex = parseFrontmatter(await readFile(join(outRoot, "dist/codex/plugins", skill.plugin, "codex-skills", skill.name, "SKILL.md"), "utf8"));
      if (!skill.userInvocable) {
        assert.equal(claude.description, skill.frontmatter.description);
        assert.equal(claude.when_to_use, undefined);
        assert.equal(agy.description, skill.frontmatter.description);
        continue;
      }
      assert.equal(claude.description, skill.pickerLine);
      assert.equal(claude.when_to_use, skill.frontmatter.description);
      assert.ok(agy.description.startsWith(`${skill.pickerLine} `) && agy.description.endsWith(skill.frontmatter.description));
      assert.equal(pickerLine(codex), skill.pickerLine);
      const prompt = parseFrontmatter(await readFile(join(outRoot, "dist/pi/plugins", skill.plugin, "prompts", `${id}.md`), "utf8"));
      assert.equal(prompt.description, skill.pickerLine);
      const resources = JSON.parse(await readFile(join(outRoot, "dist/opencode/plugins", skill.plugin, "resources.json"), "utf8"));
      assert.equal(resources.commands.find((command) => command.name === id).description, skill.pickerLine);
    }
    const codexTree = await readdir(join(outRoot, "dist/codex/plugins/craft/codex-skills/backlog"));
    assert.ok(!codexTree.includes("agents"), "no agents/openai.yaml is written for Codex");
  });
});
