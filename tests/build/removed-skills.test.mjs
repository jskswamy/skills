import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

test("ide-handoff skill is no longer packaged", async () => {
  const removedPaths = [
    "skills/ide-handoff",
    "commands/guardrails/handoff.md",
    "templates/guardrails",
    "hooks/guardrails",
    "plugins/guardrails",
  ];

  for (const path of removedPaths) {
    assert.equal(await exists(path), false, `${path} should not exist`);
  }

  const registry = JSON.parse(await readFile("registry.json", "utf8"));
  assert.equal(
    registry.plugins.some((plugin) => plugin.name === "guardrails"),
    false,
    "guardrails plugin should not be registered",
  );
  assert.equal(
    JSON.stringify(registry).includes("ide-handoff"),
    false,
    "registry should not reference ide-handoff",
  );
});
