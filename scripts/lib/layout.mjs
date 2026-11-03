import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { copyResourceTree, pathExists } from "./fs-utils.mjs";
import { parseFrontmatter } from "./skills.mjs";
import { derivedId, rewriteReferences } from "./transforms/names.mjs";

// Where each canonical resource lands inside a Claude-style plugin tree.
// Hook commands address files through this layout via ${CLAUDE_PLUGIN_ROOT},
// so every harness that ships hook scripts reuses it.
export function wrapperLayout(model) {
  return [
    ...model.skills.map(({ name, path }) => ({ kind: "skills", from: path, to: `skills/${name}` })),
    ...model.agents.map(({ path }) => ({ kind: "agents", from: path, to: `agents/${path.split("/").at(-1)}` })),
    ...["hooks", "templates"].flatMap((kind) =>
      model[kind].map(({ path }) => ({
        kind,
        from: path,
        to: `${kind}/${stripLeadingGroup(path.slice(kind.length + 1), model.name)}`,
      })),
    ),
    ...model.extra.map(({ from, to }) => ({ kind: "extra", from, to })),
  ];
}

// a skill's tests/ are dev-only; installs should not carry them
const skillFilter = (source) => (src) => src !== join(source, "tests");

export async function copyLayout({ repoRoot, layout, to }) {
  for (const entry of layout) {
    const source = join(repoRoot, entry.from);
    await copyResourceTree({
      from: source,
      to: join(to, entry.to),
      filter: entry.kind === "skills" ? skillFilter(source) : undefined,
    });
  }
}

// Reads, rewrites and writes every file with a listed extension under dir (or the file itself, when
// dir is a file). A missing path is skipped.
export async function rewriteTree(dir, { pairs, join: joiner, sigil, exts }) {
  if (!(await pathExists(dir))) return;
  if (!(await stat(dir)).isDirectory()) {
    const text = await readFile(dir, "utf8");
    const rewritten = rewriteReferences(text, pairs, { join: joiner, sigil });
    if (rewritten !== text) await writeFile(dir, rewritten);
    return;
  }
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      await rewriteTree(path, { pairs, join: joiner, sigil, exts });
    } else if (exts.includes(extname(entry.name))) {
      const text = await readFile(path, "utf8");
      const rewritten = rewriteReferences(text, pairs, { join: joiner, sigil });
      if (rewritten !== text) await writeFile(path, rewritten);
    }
  }
}

// Pi and OpenCode cannot namespace: copy the skills, point each frontmatter name at plugin-skill,
// and rewrite plugin:skill references to plugin-skill in the skills and, where present, the
// agents, templates and hook scripts already copied into the same tree.
export async function copyRewrittenSkills({ repoRoot, model, to, pairs }) {
  for (const skill of model.skills) {
    const source = join(repoRoot, skill.path);
    const dest = join(to, "skills", skill.name);
    await copyResourceTree({ from: source, to: dest, filter: skillFilter(source) });
    const file = join(dest, "SKILL.md");
    await writeFile(file, setNameLine(await readFile(file, "utf8"), derivedId(model.name, skill.name)));
  }
  const md = [".md", ".yaml"];
  await rewriteTree(join(to, "skills"), { pairs, join: "-", exts: [...md, ".sh"] });
  await rewriteTree(join(to, "agents"), { pairs, join: "-", exts: md });
  await rewriteTree(join(to, "templates"), { pairs, join: "-", exts: md });
  await rewriteTree(join(to, "hooks"), { pairs, join: "-", exts: [".sh"] });
  await rewriteTree(join(to, "README.md"), { pairs, join: "-", exts: md });
}

// Line-level frontmatter edits. writeDocument re-serializes the whole block (it drops comments and
// quote style and writes a value starting with `<` unquoted), so these touch one line only.
function frontmatterLines(text, path = "SKILL.md") {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!match) throw new Error(`${path}: no frontmatter`);
  return { lines: match[1].split(/\r?\n/), head: match[0].length, rest: text.slice(match[0].length) };
}

function joinFrontmatter({ lines, rest }) {
  return `---\n${lines.join("\n")}\n---${rest}`;
}

// Puts the picker line where a harness shows it, as a line-level edit of a copied SKILL.md:
// "when_to_use" (Claude Code): description becomes the line and the original text moves, verbatim,
// to a new when_to_use line after it. "prefix" (Antigravity): description becomes the line, a space,
// then the original text. Scalars are written with JSON.stringify, which parseFrontmatter reads back.
export function restatePicker(text, line, target, path = "SKILL.md") {
  const fm = frontmatterLines(text, path);
  const at = fm.lines.findIndex((l) => /^description:/.test(l));
  if (at < 0) throw new Error(`${path}: no description line`);
  const original = parseFrontmatter(`---\n${fm.lines[at]}\n---`).description;
  if (target === "when_to_use") {
    if (fm.lines.some((l) => /^when_to_use:/.test(l))) throw new Error(`${path}: already has when_to_use`);
    fm.lines.splice(at, 1, `description: ${JSON.stringify(line)}`, `when_to_use: ${JSON.stringify(original)}`);
  } else if (target === "prefix") {
    const combined = `${line} ${original}`;
    if (combined.length > 1024) throw new Error(`${path}: picker line plus description is ${combined.length} chars (max 1024)`);
    fm.lines[at] = `description: ${JSON.stringify(combined)}`;
  } else {
    throw new Error(`unknown picker target ${target}`);
  }
  return joinFrontmatter(fm);
}

export function setNameLine(text, name) {
  const fm = frontmatterLines(text);
  const at = fm.lines.findIndex((line) => /^name:/.test(line));
  if (at < 0) throw new Error("SKILL.md: no name line");
  fm.lines[at] = `name: ${name}`;
  return joinFrontmatter(fm);
}

// Inserts a whole frontmatter line (`key: value`) right after the single-line description.
export function insertAfterDescription(text, line) {
  const fm = frontmatterLines(text);
  const at = fm.lines.findIndex((l) => /^description:/.test(l));
  if (at < 0) throw new Error("SKILL.md: no description line");
  fm.lines.splice(at + 1, 0, line);
  return joinFrontmatter(fm);
}

// The shared hook runtime is code, not plugin content, so it always comes
// from this repo, even when generating from a fixture registry.
const SELF_ROOT = join(import.meta.dirname, "..", "..");

export async function copyRuntime({ files, to }) {
  for (const [from, dest] of Object.entries(files)) {
    await copyResourceTree({ from: join(SELF_ROOT, from), to: join(to, dest) });
  }
}

function stripLeadingGroup(path, group) {
  const prefix = `${group}/`;
  return path.startsWith(prefix) ? path.slice(prefix.length) : path;
}
