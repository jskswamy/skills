import { access, readFile, stat } from "node:fs/promises";
import { join } from "node:path";

const RESOURCE_KEYS = ["skills", "commands", "agents", "hooks", "templates", "extra"];

export async function loadRegistry(registryPath) {
  return JSON.parse(await readFile(registryPath, "utf8"));
}

export async function validateRegistryResources({ repoRoot, registry }) {
  const errors = [];

  for (const plugin of registry.plugins ?? []) {
    const resources = plugin.resources ?? {};
    await validatePathList({ repoRoot, plugin, type: "commands", base: "commands", values: resources.commands ?? [], errors });
    await validatePathList({ repoRoot, plugin, type: "agents", base: "agents", values: resources.agents ?? [], errors });
    await validatePathList({ repoRoot, plugin, type: "hooks", base: "hooks", values: resources.hooks ?? [], errors });
    await validatePathList({ repoRoot, plugin, type: "templates", base: "templates", values: resources.templates ?? [], errors });

    for (const skill of resources.skills ?? []) {
      const skillDir = join(repoRoot, "skills", skill);
      const skillPath = join(skillDir, "SKILL.md");
      if (!(await pathExists(skillPath))) {
        errors.push(`${plugin.name} skills missing SKILL.md: skills/${skill}`);
        continue;
      }
      const content = await readFile(skillPath, "utf8");
      if (!hasValidSkillFrontmatter(content)) {
        errors.push(`${plugin.name} skill invalid frontmatter: skills/${skill}/SKILL.md`);
      }
    }

    for (const extra of resources.extra ?? []) {
      const from = typeof extra === "string" ? extra : extra?.from;
      if (!from || !(await pathExists(join(repoRoot, from)))) {
        errors.push(`${plugin.name} extra missing: ${from ?? "<invalid>"}`);
      }
    }
  }

  return errors;
}

export function validateRegistryShape(registry) {
  const errors = [];

  if (!isObject(registry)) {
    return ["registry must be an object"];
  }

  if (!isObject(registry.marketplace)) {
    errors.push("marketplace must be an object");
  } else {
    requireNonEmptyString(registry.marketplace.name, "marketplace.name", errors);
    requireNonEmptyString(registry.marketplace.description, "marketplace.description", errors);
  }

  if (!Array.isArray(registry.plugins) || registry.plugins.length === 0) {
    errors.push("plugins must be a non-empty array");
    return errors;
  }

  const seenNames = new Set();
  for (const [index, plugin] of registry.plugins.entries()) {
    const label = isObject(plugin) && typeof plugin.name === "string" && plugin.name.trim()
      ? plugin.name
      : `plugins[${index}]`;

    if (!isObject(plugin)) {
      errors.push(`${label} must be an object`);
      continue;
    }

    requireNonEmptyString(plugin.name, `${label}.name`, errors);
    requireNonEmptyString(plugin.version, `${label}.version`, errors);
    requireNonEmptyString(plugin.description, `${label}.description`, errors);

    if (typeof plugin.name === "string" && plugin.name.trim()) {
      if (seenNames.has(plugin.name)) {
        errors.push(`duplicate plugin name: ${plugin.name}`);
      }
      seenNames.add(plugin.name);
    }

    if (!isObject(plugin.resources)) {
      errors.push(`${label}.resources must be an object`);
    } else {
      for (const key of RESOURCE_KEYS) {
        if (!Array.isArray(plugin.resources[key])) {
          errors.push(`${label}.resources.${key} must be an array`);
        }
      }
    }
  }

  return errors;
}

async function validatePathList({ repoRoot, plugin, type, base, values, errors }) {
  for (const value of values) {
    const path = join(repoRoot, base, value);
    if (!(await pathExists(path))) {
      errors.push(`${plugin.name} ${type} missing: ${base}/${value}`);
    }
  }
}

async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function hasValidSkillFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return false;
  return /^name:\s*\S+/m.test(match[1]) && /^description:\s*\S+/m.test(match[1]);
}

function requireNonEmptyString(value, field, errors) {
  if (typeof value !== "string" || value.trim() === "") {
    errors.push(`${field} must be a non-empty string`);
  }
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
