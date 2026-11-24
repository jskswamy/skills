import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { pathExists } from "./fs-utils.mjs";
import { derivedId } from "./transforms/names.mjs";

const RESOURCE_KEYS = ["skills", "agents", "hooks", "templates", "extra"];

export async function loadRegistry(registryPath) {
  return JSON.parse(await readFile(registryPath, "utf8"));
}

export async function validateRegistryResources({ repoRoot, registry }) {
  const errors = [];

  for (const plugin of registry.plugins ?? []) {
    const resources = plugin.resources ?? {};
    await validatePathList({ repoRoot, plugin, type: "agents", base: "agents", values: resources.agents ?? [], errors });
    await validatePathList({ repoRoot, plugin, type: "hooks", base: "hooks", values: resources.hooks ?? [], errors });
    await validatePathList({ repoRoot, plugin, type: "templates", base: "templates", values: resources.templates ?? [], errors });

    // harnesses.<id>.exclude: a map of a listed agent's path to a non-empty reason.
    const agentPaths = new Set((resources.agents ?? []).map((entry) => `agents/${entry}`));
    for (const [harness, config] of Object.entries(plugin.harnesses ?? {})) {
      if (config?.exclude === undefined) continue;
      if (!isObject(config.exclude) || Array.isArray(config.exclude)) {
        errors.push(`${plugin.name} harnesses.${harness}.exclude must map an agent path to a reason`);
        continue;
      }
      for (const [path, reason] of Object.entries(config.exclude)) {
        if (!agentPaths.has(path)) errors.push(`${plugin.name} harnesses.${harness}.exclude names ${path}, which the plugin does not list in resources.agents`);
        if (typeof reason !== "string" || reason.trim() === "") errors.push(`${plugin.name} harnesses.${harness}.exclude ${path} needs a reason`);
      }
    }

    for (const skill of resources.skills ?? []) {
      // Frontmatter is checked for every skill by validateSkills.
      if (!(await pathExists(join(repoRoot, "skills", skill, "SKILL.md")))) {
        errors.push(`${plugin.name} skills missing SKILL.md: skills/${skill}`);
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

  // omp and Antigravity prefer their own marketplace over the Claude catalog, so a
  // catalog listing only some plugins would hide the rest from those users.
  for (const harness of ["omp", "antigravity"]) {
    const enabled = registry.plugins.filter((plugin) => plugin?.harnesses?.[harness]?.enabled === true).length;
    if (enabled > 0 && enabled < registry.plugins.length) {
      errors.push(`harnesses.${harness} must be enabled for every plugin or for none (${enabled} of ${registry.plugins.length} enable it)`);
    }
  }

  const seenNames = new Set();
  const derivedIds = new Map();
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
      for (const entry of Array.isArray(plugin.resources.skills) ? plugin.resources.skills : []) {
        const [group, skill, ...rest] = String(entry).split("/");
        if (!skill || rest.length > 0 || group !== plugin.name) {
          errors.push(`${label} skill entry must be "${plugin.name}/<skill>": ${entry}`);
          continue;
        }
        // plugin a-b with skill c and plugin a with skill b-c would both register a-b-c
        const id = derivedId(group, skill);
        if (derivedIds.has(id)) errors.push(`derived id ${id} is used by ${derivedIds.get(id)} and ${entry}`);
        derivedIds.set(id, entry);
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

function requireNonEmptyString(value, field, errors) {
  if (typeof value !== "string" || value.trim() === "") {
    errors.push(`${field} must be a non-empty string`);
  }
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
