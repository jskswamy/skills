// OpenCode (V2) plugin runtime, copied into every generated package under
// dist/opencode/<name>/runtime/. The package's index.js calls
// createPlugin; everything else comes from files beside it:
//   resources.json        skills, commands and agents to register
//   hooks.manifest.json   canonical Claude-format hooks to run
//
// A schema error inside one transform disables the whole plugin, hooks
// included, so every payload is checked before it is added. A throw from
// execute.before blocks the tool, so tool hooks catch everything and throw
// only for a hook's exit 2.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { claudeHookInput, toClaudeToolName } from "../lib/hook-input.mjs";
import { runEvent } from "../lib/hook-runner.mjs";
import { OPENCODE_TOOLS } from "./tools.mjs";

// Commands OpenCode itself defines; a generated command must not shadow them.
export const BUILTIN_COMMANDS = ["init", "review"];

const REQUIRED = {
  skills: ["id", "name", "description", "path", "content"],
  commands: ["name", "description", "template"],
  agents: ["id", "description", "system"],
};

// Problems that would make OpenCode reject the payload; empty when valid.
export function payloadErrors(kind, payload) {
  return REQUIRED[kind]
    .filter((key) => typeof payload?.[key] !== "string" || payload[key].trim() === "")
    .map((key) => `${kind} ${payload?.id ?? payload?.name ?? "?"}: ${key} must be a non-empty string`);
}

export function stripFrontmatter(text) {
  return text.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
}

// Claude-style argument placement; arguments a template does not place are
// appended, as Claude does.
export function expandCommand(template, args = "") {
  args = args.trim();
  const words = args ? args.split(/\s+/) : [];
  const placed = /\$(ARGUMENTS|\d)/.test(template);
  const text = template.replaceAll("$ARGUMENTS", () => args).replace(/\$(\d)/g, (_, n) => words[Number(n) - 1] ?? "");
  return placed || !args ? text : `${text.trimEnd()}\n\nArguments: ${args}`;
}

export function createPlugin({ id, root, log = (line) => console.error(`[${id}] ${line}`) }) {
  root = typeof root === "string" ? root : fileURLToPath(root);
  const entries = readJson(join(root, "hooks.manifest.json"), log)?.entries ?? [];
  const resources = readJson(join(root, "resources.json"), log) ?? {};
  return { id, setup: (ctx) => setup(ctx, { root, entries, resources, log }) };
}

async function setup(ctx, { root, entries, resources, log }) {
  const attempt = async (what, fn) => {
    try {
      return await fn();
    } catch (error) {
      log(`${what}: ${error.message}`);
      return undefined;
    }
  };
  const has = (event) => entries.some((entry) => entry.event === event);
  const env = { ...process.env, OPENCODE_PLUGIN_ROOT: root };
  const run = (event, target, input, cwd) => runEvent({ entries, event, target, input, cwd, env, log });

  // sessionID -> { start: Promise<string[]>, notes: Set<string>, info, continued }
  const sessions = new Map();
  const session = (sessionID) => {
    if (!sessions.has(sessionID)) sessions.set(sessionID, { notes: new Set() });
    return sessions.get(sessionID);
  };
  const sessionInfo = async (sessionID) => {
    const state = session(sessionID);
    state.info ??= await attempt("session lookup", () => ctx.session.get({ sessionID }));
    return state.info ?? {};
  };
  const cwdOf = (info) => info?.location?.directory ?? ctx.location?.directory ?? process.cwd();

  const toolCall = async (event, ev, extra = {}) => {
    if (OPENCODE_TOOLS.skip.includes(ev.tool)) return null;
    const cwd = cwdOf(await sessionInfo(ev.sessionID));
    const target = toClaudeToolName(ev.tool, OPENCODE_TOOLS) ?? ev.tool;
    const input = claudeHookInput({
      event,
      toolName: ev.tool,
      input: ev.input,
      table: OPENCODE_TOOLS,
      extra: { session_id: ev.sessionID, tool_use_id: ev.id, cwd, ...extra },
    });
    const result = await run(event, target, input, cwd);
    // OpenCode has no per-tool-result context slot; the text joins the
    // session's context for the following model requests.
    for (const text of result.context) session(ev.sessionID).notes.add(text);
    return result;
  };

  if (has("pre-tool")) {
    await attempt("tool hook", () =>
      ctx.tool.hook("execute.before", async (ev) => {
        const result = await attempt("pre-tool hook", () => toolCall("pre-tool", ev));
        if (result?.blocked) throw new Error(result.reason);
      }),
    );
  }

  if (has("post-tool")) {
    await attempt("tool hook", () =>
      ctx.tool.hook("execute.after", async (ev) => {
        const result = await attempt("post-tool hook", () => toolCall("post-tool", ev, { tool_response: ev.result }));
        // Claude shows a post-tool block to the model; the tool already ran.
        if (result?.blocked) session(ev.sessionID).notes.add(result.reason);
      }),
    );
  }

  // Fires before every model request, so start hooks run once per session
  // and their context is pushed each time. Sub-agent sessions have a parent.
  const startContext = async (ev) => {
    const info = await sessionInfo(ev.sessionID);
    const cwd = cwdOf(info);
    const [event, target, extra] = info.parentID
      ? ["subagent-start", ev.agent ?? "", { agent_type: ev.agent }]
      : ["session-start", "startup", { source: "startup" }];
    const input = claudeHookInput({ event, extra: { session_id: ev.sessionID, cwd, ...extra } });
    return (await run(event, target, input, cwd)).context;
  };
  if (["session-start", "subagent-start", "pre-tool", "post-tool"].some(has)) {
    await attempt("context hook", () =>
      ctx.session.hook("context", (ev) =>
        attempt("context hook", async () => {
          const state = session(ev.sessionID);
          state.start ??= startContext(ev).catch(() => []);
          for (const text of [...(await state.start), ...state.notes]) ev.system.push({ type: "text", text });
        }),
      ),
    );
  }

  // Claude's Stop: the main agent finished. Exit 2 keeps it going with the
  // reason as the next prompt; stop_hook_active lets the script avoid loops.
  const abort = new AbortController();
  if (has("stop")) {
    const onStop = async (sessionID) => {
      const info = await sessionInfo(sessionID);
      if (info.parentID) return;
      const state = session(sessionID);
      const cwd = cwdOf(info);
      const input = claudeHookInput({ event: "stop", extra: { session_id: sessionID, stop_hook_active: Boolean(state.continued), cwd } });
      const result = await run("stop", "", input, cwd);
      state.continued = result.blocked;
      if (result.blocked) await ctx.session.prompt({ sessionID, text: result.reason });
    };
    attempt("event subscription", async () => {
      for await (const event of ctx.event.subscribe({ signal: abort.signal })) {
        if (event?.type === "session.execution.succeeded" && event.data?.sessionID) {
          attempt("stop hook", () => onStop(event.data.sessionID));
        }
      }
    });
  }

  const load = (kind, toPayload) =>
    (resources[kind] ?? []).flatMap((item) => {
      try {
        const payload = toPayload(item, stripFrontmatter(readFileSync(join(root, item.path), "utf8")));
        const errors = payloadErrors(kind, payload);
        if (errors.length === 0) return [payload];
        for (const error of errors) log(`skipped ${error}`);
      } catch (error) {
        log(`skipped ${kind} ${item.path}: ${error.message}`);
      }
      return [];
    });

  const skills = load("skills", (item, content) => ({ ...item, path: join(root, item.path), content }));
  if (skills.length > 0) {
    await attempt("skills", () => ctx.skill.transform((editor) => skills.forEach((skill) => editor.add(skill))));
  }

  const commands = load("commands", ({ name, description }, template) => ({ name, description, template }));
  if (commands.length > 0) {
    await attempt("commands", () =>
      ctx.command.transform((editor) => {
        for (const { name, description, template } of commands) {
          editor.add({
            name,
            description,
            execute: (input) =>
              ctx.session.prompt({
                ...input.prompt,
                sessionID: input.sessionID,
                text: expandCommand(template, input.prompt?.text ?? ""),
                delivery: input.delivery,
              }),
          });
        }
      }),
    );
  }

  // The agent editor has no add, but update creates a missing agent.
  // Agents that already exist (the user's own) are left alone.
  const agents = load("agents", ({ id, description }, system) => ({ id, description, system }));
  if (agents.length > 0) {
    await attempt("agents", () =>
      ctx.agent.transform((editor) => {
        for (const { id, description, system } of agents) {
          if (editor.get(id)) {
            log(`agent ${id} already exists; not replaced`);
            continue;
          }
          editor.update(id, (agent) => {
            agent.description = description;
            agent.mode = "subagent";
            agent.system = system;
          });
        }
      }),
    );
  }

  return () => abort.abort();
}

function readJson(path, log) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    log(`cannot read ${path}: ${error.message}`);
    return undefined;
  }
}
