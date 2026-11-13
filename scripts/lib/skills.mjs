import { access, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

// shortcut: minimal YAML subset (top-level scalar keys; plain, quoted, | and > block scalars;
// nested maps skipped). Swap for a real YAML lib if frontmatter grows more complex.
export function parseFrontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!m) return null;
  const lines = m[1].split(/\r?\n/);
  const out = {};
  for (let i = 0; i < lines.length; i++) {
    const kv = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(lines[i]);
    if (!kv) continue;
    const [, key, raw] = kv;
    // continuation lines: indented or blank, up to next top-level line
    const cont = [];
    while (i + 1 < lines.length && (/^\s/.test(lines[i + 1]) || lines[i + 1] === "")) cont.push(lines[++i]);
    while (cont.length && cont.at(-1).trim() === "") cont.pop();
    const block = /^([|>])[+-]?$/.exec(raw);
    if (block) {
      const body = cont.map((l) => l.trim());
      out[key] = block[1] === "|" ? body.join("\n") : body.join(" ").replace(/\s+/g, " ").trim();
    } else if (raw === "") {
      out[key] = cont; // nested map/list: not interpreted
    } else {
      const v = [raw, ...cont.map((l) => l.trim())].join(" ").trim();
      if (v.startsWith('"')) out[key] = JSON.parse(v);
      else if (v.startsWith("'")) out[key] = v.slice(1, -1).replace(/''/g, "'");
      else out[key] = v;
    }
  }
  return out;
}

const TRIGGER = /\b(use when|use this|use for|triggers?|activates (when|on))\b/i;

// The picker line is `short-description` inside the nested `metadata:` block, which
// parseFrontmatter returns as raw lines.
export function pickerLine(frontmatter) {
  const lines = Array.isArray(frontmatter?.metadata) ? frontmatter.metadata : [];
  for (const line of lines) {
    const kv = /^\s+short-description:\s*(.*)$/.exec(line);
    if (!kv) continue;
    const v = kv[1].trim();
    return v.startsWith('"') ? JSON.parse(v) : v.startsWith("'") ? v.slice(1, -1).replace(/''/g, "'") : v;
  }
  return undefined;
}

// A skill is model-only when its frontmatter says `user-invocable: false`; parseFrontmatter returns strings.
export const isRunnable = (frontmatter) => frontmatter?.["user-invocable"] !== "false";

const PICKER_MAX = 120;
const COMBINED_MAX = 1024;

// skills/<skill>/SKILL.md (a repo-local skill in no plugin, such as release) or
// skills/<plugin>/<skill>/SKILL.md.
export async function validateSkills({ repoRoot, registry }) {
  const errors = [];
  const dir = join(repoRoot, "skills");
  const plugins = new Map((registry?.plugins ?? []).map((p) => [p.name, new Set(p.resources?.skills ?? [])]));
  const found = [];
  for (const entry of (await readdir(dir, { withFileTypes: true })).filter((e) => e.isDirectory())) {
    if (await exists(join(dir, entry.name, "SKILL.md"))) {
      found.push({ plugin: null, skill: entry.name, path: join(dir, entry.name), label: `skills/${entry.name}/SKILL.md` });
      continue;
    }
    const children = (await readdir(join(dir, entry.name), { withFileTypes: true })).filter((e) => e.isDirectory());
    if (children.length === 0) errors.push(`skills/${entry.name}: plugin folder holds no skill`);
    for (const child of children) {
      const path = join(dir, entry.name, child.name);
      const label = `skills/${entry.name}/${child.name}/SKILL.md`;
      if (!(await exists(join(path, "SKILL.md")))) errors.push(`${label}: missing`);
      else found.push({ plugin: entry.name, skill: child.name, path, label });
    }
  }

  const parsed = [];
  for (const item of found) {
    let fm;
    let text;
    try {
      text = await readFile(join(item.path, "SKILL.md"), "utf8");
      fm = parseFrontmatter(text);
    } catch (e) {
      errors.push(`${item.label}: unparsable frontmatter (${e.message})`);
      continue;
    }
    if (!fm) {
      errors.push(`${item.label}: missing YAML frontmatter`);
      continue;
    }
    parsed.push({ ...item, fm, text });
  }
  // The picker-line rules apply once the first line exists in the repo (phase 3).
  const pickerActive = parsed.some(({ fm }) => pickerLine(fm) !== undefined);

  for (const { plugin, skill, path, label, fm, text } of parsed) {
    const { name, description } = fm;
    if (name !== skill) errors.push(`${label}: name "${name}" must equal directory "${skill}"`);
    if (typeof name !== "string" || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name) || name.length > 64) {
      errors.push(`${label}: name must be lowercase-hyphen and <=64 chars`);
    }
    if (plugin !== null) {
      if (!plugins.has(plugin)) errors.push(`${label}: folder "${plugin}" is not a registry plugin`);
      else if (!plugins.get(plugin).has(`${plugin}/${skill}`)) errors.push(`${label}: not listed by plugin ${plugin} in registry.json`);
      if (skill.startsWith(`${plugin}-`)) errors.push(`${label}: name must not start with "${plugin}-"`);
      if (`${plugin}-${skill}`.length > 64) errors.push(`${label}: derived id ${plugin}-${skill} is over 64 chars`);
    }
    const flag = fm["user-invocable"];
    if (flag !== undefined && flag !== "true" && flag !== "false") errors.push(`${label}: user-invocable must be true or false`);
    if (typeof description !== "string" || description.trim() === "") {
      errors.push(`${label}: description is required`);
    } else {
      if (description.length > 1024) errors.push(`${label}: description is ${description.length} chars (max 1024)`);
      if (!TRIGGER.test(description)) errors.push(`${label}: description has no trigger phrase ("Use when ...")`);
      if (!descriptionIsOneLine(text)) errors.push(`${label}: description must be a single line`);
    }
    if (plugin !== null && pickerActive && isRunnable(fm)) {
      const line = pickerLine(fm);
      if (line === undefined) errors.push(`${label}: runnable skill needs metadata.short-description`);
      else {
        if (line.length > PICKER_MAX) errors.push(`${label}: picker line is ${line.length} chars (max ${PICKER_MAX})`);
        if (typeof description === "string" && line.length + 1 + description.length > COMBINED_MAX) {
          errors.push(`${label}: picker line plus description is over ${COMBINED_MAX} chars`);
        }
        const hint = fm["argument-hint"] ?? "";
        for (const flagToken of line.match(/--[a-z][a-z-]*/g) ?? []) {
          if (!hint.includes(flagToken)) errors.push(`${label}: picker line names ${flagToken}, which is not in argument-hint`);
        }
      }
    }
    // Agent files ship flat or not at all depending on the harness, so a skill reads its own references/.
    const body = text.replace(/^---\r?\n[\s\S]*?\r?\n---/, "");
    for (const m of body.matchAll(AGENT_PATH)) errors.push(`${label}: reads ${m[1]}; move it to references/`);
    errors.push(...(await validateReferences(path, label)));
  }
  return { errors };
}

async function exists(path) {
  return access(path).then(() => true, () => false);
}

// parseFrontmatter joins continuation lines; the line-level edits need description on one line.
function descriptionIsOneLine(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  const lines = m[1].split(/\r?\n/);
  const at = lines.findIndex((l) => l.startsWith("description:"));
  return at >= 0 && (at === lines.length - 1 || /^[A-Za-z0-9_-]+:/.test(lines[at + 1]));
}

const REF = /references\/([\w.\-\/]+\.md)/g;
const AGENT_PATH = /(?:<package-root>\/)?(agents\/[a-z0-9-]+\/[\w.-]+\.md)/g;

// Every references/*.md named in a skill must exist, and every file there must be named
// somewhere in the skill (SKILL.md or another file in it).
async function validateReferences(skillDir, label) {
  const errors = [];
  const files = [];
  const walk = async (d) => {
    for (const e of await readdir(d, { withFileTypes: true })) {
      if (e.name === "tests") continue;
      const p = join(d, e.name);
      if (e.isDirectory()) await walk(p);
      else if (e.name.endsWith(".md")) files.push(p);
    }
  };
  await walk(skillDir);
  const texts = new Map(await Promise.all(files.map(async (f) => [f, await readFile(f, "utf8")])));
  const all = [...texts.values()].join("\n");
  const skillText = texts.get(join(skillDir, "SKILL.md")) ?? "";
  for (const m of skillText.matchAll(REF)) {
    try {
      await access(join(skillDir, "references", m[1]));
    } catch {
      errors.push(`${label}: links references/${m[1]} which does not exist`);
    }
  }
  for (const f of files) {
    const rel = f.slice(skillDir.length + 1);
    if (!rel.startsWith("references/")) continue;
    const others = [...texts].filter(([k]) => k !== f).map(([, t]) => t).join("\n");
    if (!others.includes(rel) && !others.includes(rel.slice("references/".length))) {
      errors.push(`${label}: ${rel} is not linked from SKILL.md or any other file in the skill`);
    }
  }
  return errors;
}
