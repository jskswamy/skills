// Pi extension that runs the Claude-format hooks listed in the generated
// hooks.manifest.json. The build copies this file to
// dist/pi/runtime/pi/runtime.mjs, so the package root (PI_PACKAGE_ROOT, where
// the manifest and the hook scripts live) is two levels up.
//
// A throwing tool_call handler blocks the tool on Pi, so every handler
// catches everything; only a hook's exit 2 blocks.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { claudeHookInput, toClaudeToolName } from "../lib/hook-input.mjs";
import { runEvent } from "../lib/hook-runner.mjs";
import { PI_TOOLS } from "./tools.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(here, "..", "..");

// Pi session_start reasons -> Claude SessionStart sources.
const SESSION_SOURCES = { startup: "startup", reload: "startup", new: "clear", resume: "resume", fork: "resume" };

export function loadManifest(path = join(PACKAGE_ROOT, "hooks.manifest.json")) {
  try {
    return JSON.parse(readFileSync(path, "utf8")).entries ?? [];
  } catch {
    return [];
  }
}

export function createRuntime({ entries, root = PACKAGE_ROOT, log = (line) => console.error(`[hooks] ${line}`) }) {
  const env = { ...process.env, PI_PACKAGE_ROOT: root };
  const run = (event, target, input, ctx) => runEvent({ entries, event, target, input, cwd: ctx?.cwd, env, log });
  const guarded = (handler) => async (event, ctx) => {
    try {
      return await handler(event, ctx);
    } catch (error) {
      log(`hook runtime error: ${error.message}`);
      return undefined;
    }
  };

  return function piHooks(pi) {
    const pending = new Map(); // toolCallId -> context from pre-tool hooks

    pi.on(
      "session_start",
      guarded(async (event, ctx) => {
        const source = SESSION_SOURCES[event?.reason] ?? "startup";
        const input = claudeHookInput({ event: "session-start", extra: { source, cwd: ctx?.cwd } });
        const result = await run("session-start", source, input, ctx);
        if (result.context.length > 0) {
          pi.sendMessage({ customType: "hook-context", content: result.context.join("\n\n"), display: false });
        }
      }),
    );

    pi.on(
      "tool_call",
      guarded(async (event, ctx) => {
        const target = toClaudeToolName(event.toolName, PI_TOOLS) ?? event.toolName;
        const input = claudeHookInput({ event: "pre-tool", toolName: event.toolName, input: event.input, table: PI_TOOLS, extra: { cwd: ctx?.cwd } });
        const result = await run("pre-tool", target, input, ctx);
        if (result.context.length > 0) pending.set(event.toolCallId, result.context);
        if (result.blocked) return { block: true, reason: result.reason };
        return undefined;
      }),
    );

    // Claude gives the model hook context next to the tool result, so it is
    // appended to the result here, including any pre-tool context.
    pi.on(
      "tool_result",
      guarded(async (event, ctx) => {
        const target = toClaudeToolName(event.toolName, PI_TOOLS) ?? event.toolName;
        const input = claudeHookInput({
          event: "post-tool",
          toolName: event.toolName,
          input: event.input,
          table: PI_TOOLS,
          extra: { tool_response: event.structuredContent ?? event.content, cwd: ctx?.cwd },
        });
        const result = await run("post-tool", target, input, ctx);
        const context = [...(pending.get(event.toolCallId) ?? []), ...result.context];
        if (result.blocked) context.push(result.reason);
        pending.delete(event.toolCallId);
        if (context.length === 0) return undefined;
        return { content: [...(event.content ?? []), { type: "text", text: context.join("\n\n") }] };
      }),
    );

    // Pi cannot keep the agent going from here, so a stop hook's exit 2 is
    // only logged.
    pi.on(
      "agent_settled",
      guarded(async (_event, ctx) => {
        const result = await run("stop", "", claudeHookInput({ event: "stop", extra: { cwd: ctx?.cwd } }), ctx);
        if (result.blocked) log(`stop hook asked to continue, which Pi cannot do: ${result.reason}`);
      }),
    );
  };
}

export default createRuntime({ entries: loadManifest() });
