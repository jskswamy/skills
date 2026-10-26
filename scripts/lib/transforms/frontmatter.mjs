import { parseFrontmatter } from "../skills.mjs";

const FRONTMATTER = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/;

export function parseDocument(text) {
  const match = FRONTMATTER.exec(text);
  if (!match) return { frontmatter: {}, body: text };
  return { frontmatter: parseFrontmatter(text), body: text.slice(match[0].length) };
}

// Writes what parseFrontmatter reads: plain or JSON-quoted scalars, | blocks
// for multi-line strings, and nested values (kept as raw lines) verbatim.
export function writeDocument({ frontmatter, body }) {
  const lines = Object.entries(frontmatter).flatMap(([key, value]) => {
    if (Array.isArray(value)) return [`${key}:`, ...value];
    if (value.includes("\n")) return [`${key}: |`, ...value.split("\n").map((line) => (line ? `  ${line}` : ""))];
    return [`${key}: ${isPlain(value) ? value : JSON.stringify(value)}`];
  });
  return lines.length === 0 ? body : `---\n${lines.join("\n")}\n---\n${body}`;
}

function isPlain(value) {
  return /^[A-Za-z0-9_.\/(<$]/.test(value) && value === value.trim() && !/: | #|:$/.test(value);
}
