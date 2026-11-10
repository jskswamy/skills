// omp extension that runs the Claude-format hooks listed in the generated
// hooks.manifest.json. A fork of harnesses/pi/runtime.mjs for omp's events:
// session_start/session_switch/session_compact (SubagentStart in a subagent
// session), tool_call/tool_result (an edit over paths[] runs once per path),
// and session_stop. The build copies this file to
// dist/omp/plugins/<p>/runtime/omp/runtime.mjs, so the package root
// (OMP_PLUGIN_ROOT, where the manifest and hook scripts live) is two levels up.
//
// A throwing tool_call handler blocks the tool, so every handler catches
// everything; only a hook's exit 2 blocks.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { claudeHookInput, toClaudeToolName } from "../lib/hook-input.mjs";
import { START_BUDGET_MS, runEvent } from "../lib/hook-runner.mjs";
import { OMP_TOOLS } from "./tools.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = join(here, "..", "..");

// omp session_switch reasons -> Claude SessionStart sources.
const SWITCH_SOURCES = { new: "clear", resume: "resume", fork: "resume" };

export function loadManifest(path = join(here, "hooks.manifest.json")) {
  try {
    return JSON.parse(readFileSync(path, "utf8")).entries ?? [];
  } catch {
    return [];
  }
}

// One hook input per edited file: an omp edit may name several in paths[].
function perPath(input) {
  const { paths, ...rest } = input ?? {};
  return Array.isArray(paths) && paths.length > 0 ? paths.map((path) => ({ ...rest, path })) : [input];
}

export function createRuntime({ entries, root = PACKAGE_ROOT, table = OMP_TOOLS, log = (line) => console.error(`[hooks] ${line}`) }) {
  const env = { ...process.env, OMP_PLUGIN_ROOT: root };
  // Claude shows systemMessage to the user; without a UI it goes to stderr.
  const notify = (ctx, notice) => (ctx?.hasUI && ctx.ui?.notify ? ctx.ui.notify(notice, "info") : log(notice));
  const run = async (event, target, input, ctx, budgetMs) => {
    const result = await runEvent({ entries, event, target, input, cwd: ctx?.cwd, env, log, budgetMs });
    for (const notice of result.notices ?? []) notify(ctx, notice);
    return result;
  };
  const guarded = (handler) => async (event, ctx) => {
    try {
      return await handler(event, ctx);
    } catch (error) {
      log(`hook runtime error: ${error.message}`);
      return undefined;
    }
  };

  return function ompHooks(pi) {
    const pending = new Map(); // toolCallId -> context from pre-tool hooks

    // Claude runs SessionStart in the main session and SubagentStart in a subagent.
    const start = (source) =>
      guarded(async (_event, ctx) => {
        const sub = ctx?.agent?.kind === "sub";
        const event = sub ? "subagent-start" : "session-start";
        const input = claudeHookInput({ event, extra: sub ? { cwd: ctx?.cwd } : { source, cwd: ctx?.cwd } });
        const result = await run(event, sub ? "" : source, input, ctx, START_BUDGET_MS);
        if (result.context.length > 0) {
          pi.sendMessage({ customType: "hook-context", content: result.context.join("\n\n"), display: false });
        }
      });
    pi.on("session_start", start("startup"));
    pi.on("session_switch", (event, ctx) => start(SWITCH_SOURCES[event?.reason] ?? "startup")(event, ctx));
    pi.on("session_compact", start("compact"));

    // Runs the event once per edited path under one budget; stops at the first block.
    const runTool = async (hookEvent, event, ctx, extra = {}) => {
      const target = toClaudeToolName(event.toolName, table) ?? event.toolName;
      const context = [];
      for (const input of perPath(event.input)) {
        const payload = claudeHookInput({ event: hookEvent, toolName: event.toolName, input, table, extra: { ...extra, cwd: ctx?.cwd } });
        const result = await run(hookEvent, target, payload, ctx);
        context.push(...result.context);
        if (result.blocked) return { blocked: true, reason: result.reason, context };
      }
      return { blocked: false, context };
    };

    pi.on(
      "tool_call",
      guarded(async (event, ctx) => {
        const result = await runTool("pre-tool", event, ctx);
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
        const result = await runTool("post-tool", event, ctx, { tool_response: event.structuredContent ?? event.content });
        const context = [...(pending.get(event.toolCallId) ?? []), ...result.context];
        if (result.blocked) context.push(result.reason);
        pending.delete(event.toolCallId);
        if (context.length === 0) return undefined;
        return { content: [...(event.content ?? []), { type: "text", text: context.join("\n\n") }] };
      }),
    );

    // A stop hook's exit 2 asks Claude to keep going; this runtime only logs it.
    pi.on(
      "session_stop",
      guarded(async (_event, ctx) => {
        const result = await run("stop", "", claudeHookInput({ event: "stop", extra: { cwd: ctx?.cwd } }), ctx);
        if (result.blocked) log(`stop hook asked to continue, which this runtime does not do: ${result.reason}`);
      }),
    );
  };
}

export default createRuntime({ entries: loadManifest() });
