import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { pathExists, readJson } from "./lib/fs-utils.mjs";
import { parseFrontmatter } from "./lib/skills.mjs";

// What each harness lists to the model on every request, read from the generated tree: the
// name and listed description fields of every skill and agent the model can see. Lengths are
// JS string lengths of the parsed values. See docs/specs/2026-11-13-listing-diet-design.md.
const RULES = {
  "claude-code": { skills: "skills", fields: ["name", "description", "when_to_use"], agents: "agents" },
  antigravity: { skills: "skills", fields: ["name", "description"], agents: "agents" },
  omp: { skills: "skills", fields: ["name", "description"], agents: "agents" },
  pi: { skills: "skills", fields: ["name", "description"] },
  codex: { skills: "codex-skills", fields: ["name", "description"] },
  "agent-plugins": { skills: "skills", fields: ["name", "description"], hidesNothing: true },
  opencode: { resources: true },
};

const fieldChars = (fm, fields) => fields.reduce((sum, key) => sum + (typeof fm?.[key] === "string" ? fm[key].length : 0), 0);
const dirs = async (path) => ((await pathExists(path)) ? (await readdir(path, { withFileTypes: true })).filter((e) => e.isDirectory()) : []);

async function skillHidden(harness, dir, fm) {
  if (harness === "codex") {
    const policy = join(dir, "agents", "openai.yaml");
    return (await pathExists(policy)) && /allow_implicit_invocation:\s*false/.test(await readFile(policy, "utf8"));
  }
  return String(fm?.["disable-model-invocation"]) === "true";
}

async function plugin(harness, rule, root) {
  const size = { chars: 0, skills: 0, agents: 0 };
  if (rule.resources) {
    // OpenCode lists from resources.json; autoinvoke:false leaves a skill out
    const res = await readJson(join(root, "resources.json"));
    for (const skill of res.skills ?? []) {
      if (skill.autoinvoke === false) continue;
      size.skills += 1;
      size.chars += (skill.name ?? "").length + (skill.description ?? "").length;
    }
    for (const agent of res.agents ?? []) {
      size.agents += 1;
      size.chars += (agent.id ?? "").length + (agent.description ?? "").length;
    }
    return size;
  }
  for (const entry of await dirs(join(root, rule.skills))) {
    const dir = join(root, rule.skills, entry.name);
    const fm = parseFrontmatter(await readFile(join(dir, "SKILL.md"), "utf8"));
    if (!rule.hidesNothing && (await skillHidden(harness, dir, fm))) continue;
    size.skills += 1;
    size.chars += fieldChars(fm, rule.fields);
  }
  if (rule.agents && (await pathExists(join(root, rule.agents)))) {
    for (const file of (await readdir(join(root, rule.agents))).filter((f) => f.endsWith(".md"))) {
      const fm = parseFrontmatter(await readFile(join(root, rule.agents, file), "utf8"));
      if (typeof fm?.description !== "string") continue;
      size.agents += 1;
      size.chars += fieldChars(fm, ["name", "description"]);
    }
  }
  return size;
}

export async function listingSize(outRoot) {
  const sizes = {};
  for (const [harness, rule] of Object.entries(RULES)) {
    const base = join(outRoot, "dist", harness, "plugins");
    const total = { chars: 0, skills: 0, agents: 0 };
    for (const entry of await dirs(base)) {
      const size = await plugin(harness, rule, join(base, entry.name));
      for (const key of Object.keys(total)) total[key] += size[key];
    }
    sizes[harness] = total;
  }
  return sizes;
}
