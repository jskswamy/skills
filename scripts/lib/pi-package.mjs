import { access } from "node:fs/promises";
import { join } from "node:path";

export async function validatePiPackage({ repoRoot, packageJson }) {
  const errors = [];
  const pi = packageJson.pi;

  if (!pi) return errors;

  await validatePathArray({ repoRoot, values: pi.skills, field: "pi.skills", errors });
  await validatePathArray({ repoRoot, values: pi.extensions, field: "pi.extensions", errors });

  return errors;
}

async function validatePathArray({ repoRoot, values, field, errors }) {
  if (values === undefined) return;
  if (!Array.isArray(values)) {
    errors.push(`${field} must be an array`);
    return;
  }

  for (const value of values) {
    if (typeof value !== "string" || value.trim() === "") {
      errors.push(`${field} path must be a non-empty string`);
      continue;
    }
    if (!(await pathExists(join(repoRoot, value)))) {
      errors.push(`${field} path does not exist: ${value}`);
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
