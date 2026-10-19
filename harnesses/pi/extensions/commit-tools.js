import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { commitToolBlock } from "../../../skills/commit-action/lib/guard.mjs";

const skill = fileURLToPath(new URL("../../../skills/commit-action/SKILL.md", import.meta.url));

export default function (pi) {
  pi.registerCommand("commit", {
    description: "Validate, confirm and create or amend a local Git commit",
    handler: async (args, ctx) => {
      const content = await readFile(skill, "utf8");
      pi.sendUserMessage(
        `<skill name="commit-action" location="${skill}">\n${content}\n</skill>\n\n${args}`,
        ctx.isIdle() ? undefined : { deliverAs: "followUp" },
      );
    },
  });

  pi.on("before_agent_start", () => ({
    message: {
      customType: "commit-tools-routing",
      content: `Before creating or amending any Git commit, including automatic task completion and history replay, load and follow ${skill}. Validate the message and wait for explicit confirmation. No project configuration is needed. Leave commits local; pushing and remote synchronization belong to the user.`,
      display: false,
    },
  }));

  // Pi dispatches this event for model calls and nested ctx.executeTool calls,
  // including bash/MCP calls made inside codemode.
  pi.on("tool_call", (event) => {
    const reason = commitToolBlock(event.toolName, event.input);
    if (reason) return { block: true, reason };
  });
}
