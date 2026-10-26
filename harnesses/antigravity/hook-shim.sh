#!/usr/bin/env bash
# Antigravity entry point for canonical Claude-format hooks. The adapter
# copies it into each generated plugin as runtime/antigravity/hook-shim.sh,
# next to tools.json and the plugin's hooks.manifest.json, and the root
# hooks.json runs it from the plugin root (agy's hook cwd) as
#   bash runtime/antigravity/hook-shim.sh <hook id>
#
# agy speaks a different contract: camelCase input ({toolCall:{name,args}}),
# JSON decisions on stdout and no exit-2 convention. The shim translates the
# input into the Claude-shaped stdin our scripts read, runs the script and
# maps the result back:
#   PreToolUse   exit 2 -> {"decision":"deny","reason":...}
#   Stop         exit 2 -> {"decision":"continue","reason":...}
#   SessionStart context -> {"injectSteps":[{"systemMessage":{"systemMessage":...}}]}
# Everything else, including any failure of the shim itself or a missing jq,
# prints {} and exits 0, so a broken hook never blocks. It never prints
# "allow", which would auto-approve the tool and skip agy's own permission
# check.
#
# Needs only bash (3.2 or later, as macOS ships) and jq.

DEFAULT_TIMEOUT_MS=10000

log() { printf '[hooks] %s\n' "$*" >&2; }

# Without jq the hook does nothing.
if ! command -v jq >/dev/null 2>&1; then
  printf '{}\n'
  exit 0
fi

HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
PLUGIN_ROOT=$(cd "$HERE/../.." && pwd)
TMP=$(mktemp -d "${TMPDIR:-/tmp}/agy-hook.XXXXXX") || {
  log "hook shim failed: cannot create a temporary directory"
  printf '{}\n'
  exit 0
}
trap 'rm -rf "$TMP"' EXIT

# Claude-shaped stdin for the hook script, built from agy's input. Tool
# names and argument fields map through tools.json; others pass through.
CLAUDE_INPUT='
def truthy: . != null and . != false and . != "" and . != 0;
def first_truthy(f): [f | select(truthy)][0];
{"session-start": "SessionStart", "subagent-start": "SubagentStart",
 "pre-tool": "PreToolUse", "post-tool": "PostToolUse", "stop": "Stop"} as $events
| (if type == "object" then . else {} end) as $agy
| (($tools[0].tools? // {}) | if type == "object" then . else {} end) as $table
| ($agy.toolCall | if type == "object" then . else {} end) as $call
| ($call.args | if type == "object" then . else {} end) as $args
| {hook_event_name: $events[$event]}
+ (if ($event == "pre-tool" or $event == "post-tool") and ($call | has("name")) then
     ([$table | to_entries[] | select(.value.name == $call.name) | .key][0] // $call.name) as $name
     | (if ($name | type) == "string" then ($table[$name].input? // {}) else {} end) as $fields
     | {tool_name: $name,
        tool_input: ($args | with_entries(.key as $k
          | .key = ([$fields | to_entries[] | select(.value == $k) | .key][0] // $k)))}
   else {} end)
+ ({session_id: $agy.conversationId,
    cwd: first_truthy($args.Cwd, ($agy.workspacePaths | if type == "array" then .[0] else null end))}
   | with_entries(select(.value != null)))
+ (if $event == "session-start" then {source: "startup"}
   elif $event == "stop" then {stop_hook_active: false}
   elif $event == "post-tool" then
     {tool_response: (if ($agy.error | truthy) then {error: $agy.error} else {} end)}
   else {} end)
'

# Context a successful hook asks to inject, as a JSON string, or nothing:
# hookSpecificOutput.additionalContext from JSON stdout, or plain stdout when
# $plain is "1" (Claude adds a SessionStart hook's plain stdout to context).
CONTEXT='
(sub("^\\s+"; "") | sub("\\s+$"; "")) as $text
| if $text == "" then empty
  else (try {json: ($text | fromjson)} catch null) as $parsed
  | if $parsed == null then (if $plain == "1" then $text else empty end)
    else $parsed.json | .hookSpecificOutput? | .additionalContext?
      | select(type == "string" and . != "")
    end
  end
'

trim() { printf '%s' "$1" | jq -Rrs 'sub("^\\s+"; "") | sub("\\s+$"; "")'; }

# Runs $command in $cwd with $TMP/in on stdin, killing it after $timeout_ms.
# Sets status and timed_out.
run_command() {
  local secs
  secs=$((timeout_ms / 1000)).$(printf '%03d' $((timeout_ms % 1000)))
  timed_out=
  if command -v timeout >/dev/null 2>&1; then
    (cd "$cwd" && timeout -s KILL "$secs" sh -c "$command") <"$TMP/in" >"$TMP/out" 2>"$TMP/err"
    status=$?
    if [ "$status" -eq 124 ] || [ "$status" -eq 137 ]; then timed_out=1; fi
    return
  fi
  # No timeout(1), as on macOS: a watcher kills the hook's process group.
  # Job control gives each background job its own group, so the script's
  # children die with it and the watcher's sleep can be killed too.
  local pid watcher
  set -m
  (cd "$cwd" && exec sh -c "$command") <"$TMP/in" >"$TMP/out" 2>"$TMP/err" &
  pid=$!
  (sleep "$secs" && : >"$TMP/timed-out" && kill -KILL -- "-$pid") </dev/null >/dev/null 2>&1 &
  watcher=$!
  set +m
  wait "$pid" 2>/dev/null
  status=$?
  kill -- "-$watcher" 2>/dev/null
  if [ -f "$TMP/timed-out" ]; then timed_out=1; fi
}

main() {
  local id=$1 entry event command plain cwd timeout_ms status timed_out reason context
  if ! entry=$(jq -c --arg id "$id" '.entries[$id] // empty' "$HERE/hooks.manifest.json" 2>&1); then
    log "hook shim failed: cannot read hooks.manifest.json: $entry"
    return
  fi
  if [ -z "$entry" ]; then
    log "no hook $id in hooks.manifest.json"
    return
  fi
  event=$(printf '%s' "$entry" | jq -r '.event // ""')
  command=$(printf '%s' "$entry" | jq -r '.command // ""')
  timeout_ms=$(printf '%s' "$entry" | jq -r '.timeoutMs // empty | floor')
  case "$timeout_ms" in '' | *[!0-9]*) timeout_ms=$DEFAULT_TIMEOUT_MS ;; esac

  # Unparseable input counts as {}.
  cat >"$TMP/agy"
  jq -c 'if type == "object" then . else {} end' "$TMP/agy" >"$TMP/event" 2>/dev/null || printf '{}' >"$TMP/event"
  if ! jq -c --arg event "$event" --slurpfile tools "$HERE/tools.json" "$CLAUDE_INPUT" "$TMP/event" >"$TMP/in" 2>"$TMP/err"; then
    log "hook shim failed: $(cat "$TMP/err")"
    return
  fi

  # Scripts act on the user's project (git, bd), not on the plugin folder.
  cwd=$(jq -r '.cwd | strings' "$TMP/in")
  [ -n "$cwd" ] || cwd=$PWD

  ANTIGRAVITY_PLUGIN_ROOT=$PLUGIN_ROOT
  export ANTIGRAVITY_PLUGIN_ROOT
  run_command

  if [ -n "$timed_out" ]; then
    log "hook timed out after ${timeout_ms}ms: $command"
    return
  fi
  if [ "$status" -eq 2 ]; then
    reason=$(trim "$(cat "$TMP/err")")
    [ -n "$reason" ] || reason="blocked by hook"
    case "$event" in
      pre-tool) jq -nc --arg reason "$reason" '{decision: "deny", reason: $reason}' ;;
      stop) jq -nc --arg reason "$reason" '{decision: "continue", reason: $reason}' ;;
      # agy has no channel for this; log it so it is not lost silently.
      *) log "$event hook exit 2 has no effect on Antigravity: $reason" ;;
    esac
    return
  fi
  if [ "$status" -ne 0 ]; then
    reason=$(trim "$(cat "$TMP/err")")
    log "hook exited $status: ${reason:-$command}"
    return
  fi

  plain=0
  [ "$event" = "session-start" ] && plain=1
  context=$(jq -Rsc --arg plain "$plain" "$CONTEXT" "$TMP/out" 2>/dev/null)
  [ -n "$context" ] || return
  if [ "$event" = "session-start" ]; then
    jq -nc --argjson context "$context" '{injectSteps: [{systemMessage: {systemMessage: $context}}]}'
    return
  fi
  log "$event hook context cannot reach the model on Antigravity: $(printf '%s' "$context" | jq -r .)"
}

output=$(main "$1")
[ -n "$output" ] || output={}
printf '%s\n' "$output"
exit 0
