#!/usr/bin/env bash
#
# Pre-release smoke check for the omp harness. Installs a fresh build into omp
# from its .omp-plugin catalog in a scratch HOME, then checks that every runnable skill's
# /<plugin>:<skill> command is registered once, and that the commit-tools
# guard blocks a direct commit with a reason naming a skill omp can load.
# Per-hook behaviour is covered by tests/build/omp-runtime.test.mjs and the
# manual checklist in harnesses/omp/README.md. Skillshare's routing to this
# catalog is tested by tests/build/skillshare-audit.test.mjs; Skillshare
# 0.30 refuses omp installs into a scratch HOME (its omp install safety
# check), so this script installs with omp's own marketplace commands.
#
# Needs omp, skillshare, node and a model omp can reach (OMP_SMOKE_MODEL,
# passed to --model, optional). Exits 0 on pass, 1 on a failed check, and 2
# when the result is inconclusive (for example the model never ran bash).
#
# Usage: ./scripts/omp-smoke.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

for tool in omp node git; do
  command -v "$tool" >/dev/null || { echo "omp-smoke: $tool is not installed" >&2; exit 2; }
done

WORK="$(mktemp -d "${TMPDIR:-/tmp}/omp-smoke.XXXXXX")"
trap 'rm -rf "$WORK"' EXIT
OUT="$WORK/build"
export HOME="$WORK/home" XDG_CONFIG_HOME="$WORK/home/.config" XDG_STATE_HOME="$WORK/home/.local/state" XDG_DATA_HOME="$WORK/home/.local/share"
mkdir -p "$HOME/.omp" "$OUT"

fail=0
check() { if [[ $1 == ok ]]; then echo "ok   - $2"; else echo "FAIL - $2"; fail=1; fi; }

echo "# omp $(omp --version 2>/dev/null | head -1)"
(cd "$REPO_ROOT" && node scripts/build.mjs --out "$OUT" >/dev/null)
PLUGINS=$(node -e 'for (const p of require(process.argv[1]).plugins) console.log(p.name)' "$OUT/.omp-plugin/marketplace.json")

MARKET=$(node -e 'console.log(require(process.argv[1]).name)' "$OUT/.omp-plugin/marketplace.json")
omp plugin marketplace add "$OUT" >"$WORK/market.log" 2>&1 || { cat "$WORK/market.log" >&2; check fail "omp adds the .omp-plugin catalog"; }
installed=0
for plugin in $PLUGINS; do
  if omp plugin install "$plugin@$MARKET" >"$WORK/install-$plugin.log" 2>&1; then
    installed=$((installed + 1))
  else
    cat "$WORK/install-$plugin.log" >&2
    check fail "omp installs $plugin"
  fi
done
total=$(echo "$PLUGINS" | wc -w | tr -d ' ')
check "$([[ $installed == "$total" ]] && echo ok)" "omp installed $installed of $total plugins from .omp-plugin/marketplace.json"

# Expected commands: one /<plugin>:<skill> per wrapper in the build.
(cd "$OUT/dist/omp/plugins" && for f in */commands/*.md; do p=${f%%/*}; s=${f##*/}; echo "$p:${s%.md}"; done) | sort >"$WORK/expected"

# Slash commands expand only through RPC or the TUI, not print mode.
mkdir -p "$WORK/repo"
node - "$WORK/commands" "$WORK/repo" <<'NODE'
const { spawn } = require("node:child_process");
const { writeFileSync } = require("node:fs");
const [out, cwd] = process.argv.slice(2);
const omp = spawn("omp", ["--mode", "rpc", "--no-session"], { cwd, stdio: ["pipe", "pipe", "ignore"] });
let buffer = "";
const timer = setTimeout(() => { omp.kill(); process.exit(2); }, 120_000);
omp.stdout.on("data", (chunk) => {
  buffer += chunk;
  for (const line of buffer.split("\n").slice(0, -1)) {
    let message;
    try { message = JSON.parse(line); } catch { continue; }
    // omp 18.18 pushes available_commands_update at startup; older omp answered get_commands.
    const list = message.type === "available_commands_update" ? message.commands : message.id === "1" && message.success !== false ? message.data?.commands ?? message.data : undefined;
    if (!Array.isArray(list)) continue;
    const commands = list;
    writeFileSync(out, commands.map((command) => command.name).join("\n") + "\n");
    clearTimeout(timer);
    omp.kill();
    process.exit(0);
  }
  buffer = buffer.slice(buffer.lastIndexOf("\n") + 1);
});
omp.stdin.write(JSON.stringify({ id: "1", type: "get_commands" }) + "\n");
NODE
missing=$(comm -23 "$WORK/expected" <(sort "$WORK/commands"))
duplicated=$(sort "$WORK/commands" | uniq -d | grep -F -x -f "$WORK/expected" || true)
check "$([[ -z $missing ]] && echo ok)" "every runnable skill has a /<plugin>:<skill> command ($(wc -l <"$WORK/expected" | tr -d ' ') expected)${missing:+; missing: $(echo $missing)}"
check "$([[ -z $duplicated ]] && echo ok)" "no command is registered twice${duplicated:+: $(echo $duplicated)}"
# Each runnable skill is also listed once as /skill:<plugin>-<skill>.
sed -E 's/^([^:]+):(.*)$/skill:\1-\2/' "$WORK/expected" | sort >"$WORK/expected-skills"
skills_missing=$(comm -23 "$WORK/expected-skills" <(sort -u "$WORK/commands"))
skills_twice=$(sort "$WORK/commands" | uniq -d | grep -F -x -f "$WORK/expected-skills" || true)
check "$([[ -z $skills_missing && -z $skills_twice ]] && echo ok)" "every runnable skill is listed once as /skill:<plugin>-<skill>${skills_missing:+; missing: $(echo $skills_missing)}${skills_twice:+; twice: $(echo $skills_twice)}"

# The commit guard blocks a direct commit and names commit-tools-commit.
(cd "$WORK/repo" && git init -q && echo x >f && git add f)
model=(); [[ -n ${OMP_SMOKE_MODEL:-} ]] && model=(--model "$OMP_SMOKE_MODEL")
prompt="Use the bash tool once to run exactly: git -c user.name=smoke -c user.email=smoke@example.com commit -m smoke . Then stop."
(cd "$WORK/repo" && omp -p --no-session --no-title --mode json "${model[@]}" "$prompt" </dev/null >"$WORK/guard.jsonl" 2>"$WORK/guard.err") || true
if ! grep -q '"toolName":"bash"' "$WORK/guard.jsonl"; then
  echo "INCONCLUSIVE - the model never ran bash; see $WORK/guard.jsonl" >&2
  trap - EXIT
  exit 2
fi
check "$(grep -q 'Direct commit blocked.*commit-tools-commit' "$WORK/guard.jsonl" && echo ok)" "the commit guard blocks a direct commit and names commit-tools-commit"
check "$( (cd "$WORK/repo" && ! git rev-parse -q --verify HEAD >/dev/null) && echo ok)" "no commit was created"

exit "$fail"
