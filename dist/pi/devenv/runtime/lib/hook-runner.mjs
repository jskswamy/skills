// Runs canonical Claude-format hook scripts for harnesses without native
// hooks. Self-contained so adapters can copy it into generated packages.
//
// Contract, matching Claude Code: the event goes to the script as JSON on
// stdin; exit 2 blocks with stderr as the reason; a JSON
// hookSpecificOutput.additionalContext on stdout is context to inject. Any
// other outcome (missing script, crash, other exit code, timeout, spawn
// error) is logged and does not block. Nothing here throws.
import { spawn } from "node:child_process";

export const DEFAULT_TIMEOUT_MS = 10_000;
// Most a harness waits on all session-start or subagent-start hooks together.
export const START_BUDGET_MS = 20_000;

// Events whose plain stdout Claude adds to the model context.
const PLAIN_CONTEXT_EVENTS = new Set(["session-start", "subagent-start"]);

export function matchesClaude(matcher, name) {
  if (!matcher || matcher === "*") return true;
  return new RegExp(`^(?:${matcher})$`).test(name);
}

export async function runHook({
  command,
  input,
  cwd,
  env,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  plainStdoutIsContext = false,
  log = (line) => console.error(line),
}) {
  try {
    const { code, stdout, stderr, timedOut } = await exec({ command, stdin: JSON.stringify(input), cwd, env, timeoutMs });
    if (timedOut) {
      log(`hook timed out after ${timeoutMs}ms: ${command}`);
      return { blocked: false };
    }
    if (code === 2) return { blocked: true, reason: stderr.trim() || "blocked by hook" };
    if (code !== 0) {
      log(`hook exited ${code}: ${stderr.trim() || command}`);
      return { blocked: false };
    }
    const context = parseContext(stdout, plainStdoutIsContext);
    return context ? { blocked: false, context } : { blocked: false };
  } catch (error) {
    log(`hook failed: ${error.message}`);
    return { blocked: false };
  }
}

// Runs every entry for the event whose matcher accepts target (the Claude
// tool name, or the session source for session-start). Stops at the first
// block; context from hooks that ran before it is kept. budgetMs caps the
// whole event: a hook gets at most what is left of it, and once it is spent
// the rest are skipped, so a slow start cannot hold up a session.
export async function runEvent({ entries, event, target = "", input, cwd, env, log, budgetMs = Infinity }) {
  const context = [];
  const deadline = Date.now() + budgetMs;
  for (const entry of entries) {
    if (entry.event !== event || !safeMatches(entry.matcher, target, log)) continue;
    const left = deadline - Date.now();
    if (left <= 0) {
      log?.(`${event} hook skipped, time budget spent: ${entry.command}`);
      continue;
    }
    const result = await runHook({
      command: entry.command,
      input,
      cwd,
      env,
      timeoutMs: Math.min(entry.timeoutMs ?? DEFAULT_TIMEOUT_MS, left),
      plainStdoutIsContext: PLAIN_CONTEXT_EVENTS.has(event),
      log,
    });
    if (result.context) context.push(result.context);
    if (result.blocked) return { blocked: true, reason: result.reason, context };
  }
  return { blocked: false, context };
}

function safeMatches(matcher, target, log = (line) => console.error(line)) {
  try {
    return matchesClaude(matcher, target);
  } catch (error) {
    log(`hook matcher invalid (${matcher}): ${error.message}`);
    return false;
  }
}

function parseContext(stdout, plainStdoutIsContext) {
  const text = stdout.trim();
  if (!text) return undefined;
  try {
    const context = JSON.parse(text)?.hookSpecificOutput?.additionalContext;
    if (typeof context === "string" && context) return context;
    return undefined;
  } catch {
    return plainStdoutIsContext ? text : undefined;
  }
}

function exec({ command, stdin, cwd, env, timeoutMs }) {
  return new Promise((resolve, reject) => {
    // detached gives the shell its own process group, so a timeout kills the
    // script's children too.
    const child = spawn("sh", ["-c", command], { cwd, env: env ?? process.env, detached: true, stdio: "pipe" });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch {
        child.kill("SIGKILL");
      }
    }, timeoutMs ?? DEFAULT_TIMEOUT_MS);
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.stdin.on("error", () => {}); // script exited without reading stdin
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr, timedOut });
    });
    child.stdin.end(stdin);
  });
}
