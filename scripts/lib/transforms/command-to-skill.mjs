import { parseDocument, writeDocument } from "./frontmatter.mjs";

// For harnesses without commands: our commands are thin wrappers that forward
// to a skill, so the same name, description and body work as a skill.
export function commandToSkill({ name, text }, { name: skillName = name } = {}) {
  const { frontmatter, body } = parseDocument(text);
  return {
    name: skillName,
    content: writeDocument({
      frontmatter: { name: skillName, description: frontmatter.description || skillName },
      body,
    }),
  };
}
