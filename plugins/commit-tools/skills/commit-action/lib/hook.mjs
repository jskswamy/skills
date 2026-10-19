import { readFileSync } from "node:fs";
import { commitToolBlock } from "./guard.mjs";

try {
  const event = JSON.parse(readFileSync(0, "utf8"));
  if (typeof event !== "object" || event === null || !event.tool_input || typeof event.tool_input !== "object") {
    throw new Error("Expected hook tool_input object");
  }
  const reason = commitToolBlock(event.tool_name ?? "Bash", event.tool_input);
  if (reason) {
    console.error(reason);
    process.exitCode = 2;
  }
} catch (error) {
  console.error(`Commit guard input error: ${error.message}`);
  process.exitCode = 2;
}
