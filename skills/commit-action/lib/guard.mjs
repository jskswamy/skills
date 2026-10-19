// Workflow guard, not a shell sandbox. Aliases, generated scripts and arbitrary
// interpreters need OS-level controls if the agent is not trusted.
export const COMMIT_REQUIRED = "Direct commit blocked. Load the commit-action skill (/commit), validate the message and get explicit confirmation before retrying. Leave commits local; do not push or sync.";

function words(command) {
  const tokens = [], nested = [];
  let value = "", quote = "";
  const flush = () => {
    if (value) tokens.push(value);
    value = "";
  };
  for (let i = 0; i < command.length; i++) {
    const ch = command[i];
    if (ch === "\\" && quote !== "'") {
      const escaped = command[++i];
      if (escaped !== "\n") value += escaped ?? "";
    } else if (quote) {
      if (ch === quote) quote = "";
      else {
        value += ch;
        if (quote === '"' && ((ch === "$" && command[i + 1] === "(") || ch === "`")) {
          const offset = ch === "$" ? 2 : 1;
          const end = command.indexOf(ch === "$" ? ")" : "`", i + offset);
          nested.push(command.slice(i + offset, end < 0 ? undefined : end));
          if (ch === "`") {
            value += command.slice(i + 1, end < 0 ? undefined : end + 1);
            i = end < 0 ? command.length : end;
          }
        }
      }
    } else if (ch === "'" || ch === '"') {
      quote = ch;
    } else if (/\s|[;&|()]/.test(ch)) {
      flush();
      if (!/\s/.test(ch) || ch === "\n") tokens.push(";");
    } else if (ch === "`") {
      flush();
      const end = command.indexOf("`", i + 1);
      nested.push(command.slice(i + 1, end < 0 ? undefined : end));
      i = end < 0 ? command.length : end;
    } else {
      value += ch;
    }
  }
  flush();
  return { tokens, nested };
}

export function blocksDirectCommit(command) {
  const { tokens, nested } = words(command);
  if (nested.some(blocksDirectCommit)) return true;
  const takesValue = new Set(["-C", "-c", "--git-dir", "--work-tree", "--namespace", "--config-env"]);
  for (let i = 0; i < tokens.length; i++) {
    if (/(^|\/)(?:bash|sh|zsh|dash)$/.test(tokens[i])) {
      let j = i + 1;
      while (tokens[j]?.startsWith("-")) {
        if (/^-[a-z]*c[a-z]*$/.test(tokens[j]) && blocksDirectCommit(tokens[j + 1] ?? "")) return true;
        j++;
      }
    }
    if (!/(^|\/)git$/.test(tokens[i])) continue;
    let j = i + 1;
    while (tokens[j]?.startsWith("-")) j += takesValue.has(tokens[j]) ? 2 : 1;
    if (!["commit", "commit-tree"].includes(tokens[j])) continue;
    let begin = i;
    while (begin > 0 && tokens[begin - 1] !== ";") begin--;
    const prefix = tokens.slice(begin, i);
    if (prefix.length !== 1 || prefix[0] !== "__GIT_COMMIT_PLUGIN__=1") return true;
  }
  return false;
}

export function commitToolBlock(toolName, input) {
  if (/(?:^|[_-])git(?:[_-].*)?[_-]commit$/.test(toolName)) return COMMIT_REQUIRED;
  if (/(?:^|[_-])bash$/i.test(toolName) && typeof input?.command === "string" && blocksDirectCommit(input.command)) {
    return COMMIT_REQUIRED;
  }
}
