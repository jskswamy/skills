import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { CLAUDE_EVENTS } from "./tools.mjs";

const NEUTRAL_EVENTS = Object.fromEntries(Object.entries(CLAUDE_EVENTS).map(([neutral, claude]) => [claude, neutral]));

// Flattens a Claude-format hooks.json into entries
// { id, event, matcher?, command, timeoutMs?, statusMessage? }. Claude timeouts are seconds.
export function parseHooks(hooksJson) {
  const entries = [];
  for (const [claudeEvent, groups] of Object.entries(hooksJson.hooks ?? {})) {
    const event = NEUTRAL_EVENTS[claudeEvent];
    if (!event) throw new Error(`unsupported hook event: ${claudeEvent}`);
    let index = 0;
    for (const group of groups) {
      for (const hook of group.hooks ?? []) {
        if (hook.type !== "command") throw new Error(`unsupported hook type: ${hook.type}`);
        const entry = { id: hookId(event, hook.command, index++), event };
        if (group.matcher !== undefined) entry.matcher = group.matcher;
        entry.command = hook.command;
        if (hook.timeout !== undefined) entry.timeoutMs = hook.timeout * 1000;
        if (hook.statusMessage !== undefined) entry.statusMessage = hook.statusMessage;
        entries.push(entry);
      }
    }
  }
  return entries;
}

// Stable name for registry optional markers: event plus script basename.
export function hookId(event, command, index) {
  const script = [...command.matchAll(/([\w.-]+)\.(?:sh|bash|mjs|js|py)\b/g)].at(-1);
  return `${event}:${script ? script[1] : index}`;
}

export async function loadPluginHooks({ repoRoot, hooks }) {
  const entries = [];
  for (const { path } of hooks) {
    if (!path.endsWith("hooks.json")) continue;
    entries.push(...parseHooks(JSON.parse(await readFile(join(repoRoot, path), "utf8"))));
  }
  return entries;
}
