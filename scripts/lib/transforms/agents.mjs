import { parseDocument, writeDocument } from "./frontmatter.mjs";

// table: { keep: [key], rename: { from: to }, set: { key: value }, trimExamples }
// Keys neither kept nor renamed are dropped.
export function mapAgent(text, { keep = [], rename = {}, set = {}, trimExamples = false }) {
  const { frontmatter, body } = parseDocument(text);
  const out = {};
  for (const [key, value] of Object.entries(frontmatter)) {
    if (key in rename) out[rename[key]] = value;
    else if (keep.includes(key)) out[key] = value;
  }
  if (trimExamples && typeof out.description === "string") {
    out.description = out.description
      .replace(/<example>[\s\S]*?<\/example>/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }
  return writeDocument({ frontmatter: { ...out, ...set }, body });
}
