#!/usr/bin/env node
// Execute only messages already validated and confirmed by commit-action.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { parseArgs } from "node:util";

function git(args) {
  const result = spawnSync("git", args, { encoding: "utf8" });
  if (result.error || result.status !== 0) throw new Error(result.error?.message || result.stderr || "Git failed");
  return result.stdout.trim();
}

try {
  const { values } = parseArgs({ options: {
    "message-file": { type: "string" },
    style: { type: "string", default: "classic" },
    amend: { type: "boolean", default: false },
    "allow-style-override": { type: "boolean", default: false },
  } });
  if (process.env.__GIT_COMMIT_PLUGIN__ !== "1") throw new Error("Load commit-action and confirm the message before committing");
  if (!["classic", "conventional"].includes(values.style)) throw new Error("Unknown commit style");
  if (!values["message-file"]) throw new Error("--message-file is required");
  const message = readFileSync(values["message-file"], "utf8");
  const [subject, ...body] = message.trimEnd().split(/\r?\n/);
  if (!subject?.trim()) throw new Error("Commit message is empty");
  if (body.length && body[0] !== "") throw new Error("Separate subject and body with a blank line");
  if (body.some((line) => [...line].length > 72)) throw new Error("Body lines must be at most 72 characters");
  if (/^Co-Authored-By:.*(?:claude|anthropic|openai|copilot|\bgpt\b)/im.test(message)) {
    throw new Error("AI co-author attribution is not allowed");
  }
  const styleFile = fileURLToPath(new URL(`../styles/${values.style}.md`, import.meta.url));
  const check = spawnSync("bash", [fileURLToPath(new URL("style-check.sh", import.meta.url)), subject, styleFile], { encoding: "utf8" });
  if (check.error || (check.status !== 0 && !(check.status === 1 && values["allow-style-override"]))) {
    throw new Error(check.error?.message || check.stdout || check.stderr || "Style validation failed");
  }
  git(["rev-parse", "--git-dir"]);
  if (values.amend) {
    if (git(["log", "-1", "--format=%ae"]) !== git(["config", "user.email"])) {
      throw new Error("Cannot amend another author's commit");
    }
    if (git(["for-each-ref", "--format=%(refname)", "--contains=HEAD", "refs/remotes/"])) {
      throw new Error("Cannot amend a commit contained in a known remote branch");
    }
  }
  // Feed the validated bytes, not a file that could change after validation.
  const result = spawnSync("git", ["commit", ...(values.amend ? ["--amend"] : []), "--file=-"], {
    input: message, encoding: "utf8", stdio: ["pipe", "inherit", "inherit"],
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
