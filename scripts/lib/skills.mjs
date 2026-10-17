import { readdir, readFile } from "node:fs/promises";
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

export async function validateSkills({ repoRoot }) {
  const errors = [];
  const warnings = [];
  const dir = join(repoRoot, "skills");
  const entries = (await readdir(dir, { withFileTypes: true })).filter((e) => e.isDirectory());
  for (const { name: dirName } of entries) {
    const label = `skills/${dirName}/SKILL.md`;
    let fm;
    try {
      fm = parseFrontmatter(await readFile(join(dir, dirName, "SKILL.md"), "utf8"));
    } catch (e) {
      errors.push(`${label}: ${e.code === "ENOENT" ? "missing" : `unparseable frontmatter (${e.message})`}`);
      continue;
    }
    if (!fm) {
      errors.push(`${label}: missing YAML frontmatter`);
      continue;
    }
    const { name, description } = fm;
    if (name !== dirName) errors.push(`${label}: name "${name}" must equal directory "${dirName}"`);
    if (typeof name !== "string" || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name) || name.length > 64) {
      errors.push(`${label}: name must be lowercase-hyphen and <=64 chars`);
    }
    if (typeof description !== "string" || description.trim() === "") {
      errors.push(`${label}: description is required`);
    } else {
      if (description.length > 1024) errors.push(`${label}: description is ${description.length} chars (max 1024)`);
      if (!TRIGGER.test(description)) warnings.push(`${label}: description has no trigger phrase ("Use when ...")`);
    }
  }
  return { errors, warnings };
}
