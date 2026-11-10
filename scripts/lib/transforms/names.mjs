import { basename } from "node:path";

// The id a skill or agent has on harnesses that cannot namespace (Pi, OpenCode):
// plugin-name, without repeating a plugin prefix the name already has.
export function derivedId(plugin, name) {
  return name.startsWith(`${plugin}-`) ? name : `${plugin}-${name}`;
}

// Every `plugin:skill` and `plugin:agent` the registry names, enabled or not, so a
// reference never depends on enablement. A skill wins a name an agent shares.
export function referencePairs(registry) {
  const pairs = new Set();
  const agents = [];
  for (const plugin of registry.plugins ?? []) {
    for (const entry of plugin.resources?.skills ?? []) pairs.add(`${plugin.name}:${entry.split("/").at(-1)}`);
    for (const entry of plugin.resources?.agents ?? []) agents.push(`${plugin.name}:${basename(entry, ".md")}`);
  }
  for (const agent of agents) pairs.add(agent);
  return pairs;
}

const NAME = "[a-z0-9]+(?:-[a-z0-9]+)*";
// Left boundary: the reference (its `/`, or the plugin name) must not follow a letter, digit,
// `-`, `_`, `.`, `/` or `:`. Right boundary: not followed by a letter, digit, `-` or `_`.
const REFERENCE = new RegExp(`(?<![A-Za-z0-9_.\\-/:])(/?)(${NAME}):(${NAME})(?![A-Za-z0-9_-])`, "g");

// join "-" (Pi, OpenCode): plugin:skill becomes plugin-skill, a leading `/` stays.
// keepSlash with join "-" (omp): /plugin:skill is left alone, because a command
// wrapper already provides that slash name; only bare references are rewritten.
// join ":" with sigil (Codex): the name keeps its colon and a leading `/` becomes the sigil.
export function rewriteReferences(text, pairs, { join = "-", sigil, keepSlash = false } = {}) {
  return text.replace(REFERENCE, (match, slash, plugin, name) => {
    if (!pairs.has(`${plugin}:${name}`)) return match;
    if (join === "-") return slash && keepSlash ? match : `${slash}${plugin}-${name}`;
    return slash && sigil ? `${sigil}${plugin}:${name}` : match;
  });
}

// The body of a Pi prompt and an OpenCode command. Pi drops arguments from a prompt
// that has no placeholder, so the placeholder is written here.
export function wrapperText(id) {
  return `Invoke the \`${id}\` skill with this command request.
Forward all arguments exactly as provided.

Arguments: $ARGUMENTS
`;
}
