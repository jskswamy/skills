import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { pathExists, readJson, writeJson } from "../../scripts/lib/fs-utils.mjs";
import { copyLayout, wrapperLayout } from "../../scripts/lib/layout.mjs";
import { carryHooks } from "../../scripts/lib/transforms/policy.mjs";

// The portable Agent Plugins 1.0.0 package (https://agent-plugins.org): a root
// plugin.json, skills/ and mcp.json, nothing else. It is its own tree because
// the native trees cannot carry a root manifest: Codex then ignores
// .codex-plugin/ (losing codex-skills/ and hooks) and OpenCode needs a
// package.json. There is no catalog; installation is each client's business.
export const id = "agent-plugins";

export const capabilities = {
  skills: { mode: "native" },
  agents: { mode: "none" },
  hooks: { mode: "none" },
};

// One folder per plugin under this; changed-plugins and eval read it.
export const pluginsDir = "dist/agent-plugins/plugins";

const VERSION = "1.0.0";
const SCHEMA = `https://agent-plugins.org/schemas/${VERSION}/plugin.schema.json`;
const MCP_SCHEMA = `https://agent-plugins.org/schemas/${VERSION}/mcp.schema.json`;
const MCP_SOURCE = ".mcp.json";
// The manifest schema is closed (spec section 5); anything else is ignored by clients.
const MANIFEST_FIELDS = ["$schema", "name", "version", "description", "author", "homepage", "repository", "license", "keywords", "extensions"];
const NAME = /^(?=.{1,64}$)[a-z0-9]([a-z0-9]|[-.](?![-.]))*$/;

export async function generate({ repoRoot, outRoot, model, report }) {
  const pluginRoot = join(outRoot, pluginsDir, model.name);
  await writeJson(join(pluginRoot, "plugin.json"), {
    $schema: SCHEMA,
    name: model.name,
    version: model.version,
    description: model.description,
    ...(model.author?.name ? { author: { name: model.author.name } } : {}),
    ...(model.tags?.length ? { keywords: model.tags } : {}),
  });

  const layout = wrapperLayout(model).filter(
    ({ kind, to }) => (kind === "skills" || kind === "templates" || kind === "extra") && to !== MCP_SOURCE,
  );
  await copyLayout({ repoRoot, layout, to: pluginRoot });

  for (const agent of model.agents) {
    report.add({ kind: "agents", resource: agent.name, status: "degraded", reason: "Agent Plugins 1.0.0 defines no agents" });
  }
  await carryHooks({ repoRoot, model, harness: id, canCarry, report });

  const source = model.extra.find(({ to }) => to === MCP_SOURCE);
  if (source) {
    try {
      await writeJson(join(pluginRoot, "mcp.json"), mcpJson(await readJson(join(repoRoot, source.from))));
    } catch (error) {
      report.add({ kind: "extra", resource: MCP_SOURCE, status: "error", reason: error.message });
    }
  }
}

export function canCarry() {
  return { notApplicable: "Agent Plugins 1.0.0 defines no hooks" };
}

// Claude's .mcp.json is either { name: server } or { mcpServers: { name: server } }.
export function mcpJson(source) {
  const servers = {};
  for (const [name, server] of Object.entries(source.mcpServers ?? source)) {
    servers[name] = mcpServer(name, server);
  }
  return { $schema: MCP_SCHEMA, mcpServers: servers };
}

const portable = (value) => value.replaceAll("${CLAUDE_PLUGIN_ROOT}", "${PLUGIN_ROOT}");

function mcpServer(name, server) {
  if (server.url) {
    const type = server.type === "sse" ? "sse" : "streamable-http";
    return { type, url: server.url, ...(server.headers ? { headers: server.headers } : {}) };
  }
  if (!server.command) throw new Error(`MCP server ${name} has neither command nor url`);
  // The spec takes no placeholder in command, only a bare name or a ./ path.
  const command = server.command.replace(/^\$\{CLAUDE_PLUGIN_ROOT\}\//, "./");
  return {
    type: "stdio",
    command,
    ...(server.args ? { args: server.args.map(portable) } : {}),
    ...(server.env ? { env: Object.fromEntries(Object.entries(server.env).map(([key, value]) => [key, portable(value)])) } : {}),
    ...(server.cwd ? { cwd: portable(server.cwd) } : {}),
  };
}

// Checks the tree against the normative rules of the 1.0.0 spec.
export async function validate({ outRoot = process.cwd(), plugin }) {
  const dir = join(outRoot, pluginsDir, plugin.name);
  const label = `agent-plugins ${plugin.name}`;
  const manifest = await readJson(join(dir, "plugin.json")).catch(() => undefined);
  if (!manifest) return [`${label}: missing plugin.json; run npm run build`];

  const errors = [];
  if (manifest.$schema !== SCHEMA) errors.push(`${label}: $schema must be ${SCHEMA}`);
  if (typeof manifest.name !== "string" || !NAME.test(manifest.name)) errors.push(`${label}: invalid name ${JSON.stringify(manifest.name)}`);
  for (const field of Object.keys(manifest)) {
    if (!MANIFEST_FIELDS.includes(field)) errors.push(`${label}: plugin.json field ${field} is not in the 1.0.0 schema`);
  }

  const skills = await readdir(join(dir, "skills")).catch(() => []);
  if (skills.length !== plugin.resources.skills.length) errors.push(`${label}: expected ${plugin.resources.skills.length} skills, found ${skills.length}`);
  for (const skill of skills) {
    if (!(await pathExists(join(dir, "skills", skill, "SKILL.md")))) errors.push(`${label}: skills/${skill} has no SKILL.md`);
  }
  for (const stray of ["hooks", "agents", "commands", MCP_SOURCE]) {
    if (await pathExists(join(dir, stray))) errors.push(`${label}: ${stray} does not belong in an Agent Plugins tree`);
  }

  const mcp = await readJson(join(dir, "mcp.json")).catch(() => undefined);
  const wanted = plugin.resources.extra?.some(({ to }) => to === MCP_SOURCE);
  if (wanted && !mcp) errors.push(`${label}: mcp.json was not generated`);
  if (mcp) errors.push(...mcpErrors(mcp).map((error) => `${label}: mcp.json ${error}`));
  return errors;
}

function mcpErrors(mcp) {
  const errors = [];
  if (Object.keys(mcp).sort().join() !== "$schema,mcpServers") errors.push("must have exactly $schema and mcpServers");
  if (mcp.$schema !== MCP_SCHEMA) errors.push(`$schema must be ${MCP_SCHEMA}`);
  for (const [name, server] of Object.entries(mcp.mcpServers ?? {})) {
    if (server.type === "stdio") {
      if (!/^(\.\/\S+|[^\s/$]+)$/.test(server.command ?? "")) errors.push(`${name}: command must be one bare name or ./ path`);
    } else if (server.type === "streamable-http" || server.type === "sse") {
      if (!/^https?:\/\/[^@#]+$/.test(server.url ?? "")) errors.push(`${name}: url must be absolute http(s) without userinfo or fragment`);
    } else {
      errors.push(`${name}: unknown type ${server.type}`);
    }
  }
  return errors;
}
