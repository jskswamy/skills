#!/bin/bash
# Blocks direct Git commits so they go through the commit-action workflow.
# Reads a Claude-format PreToolUse event on stdin; exit 2 blocks with the
# reason on stderr. Needs only bash (3.2+) and jq; without jq it does nothing.
#
# Workflow guard, not a shell sandbox. Aliases, generated scripts and arbitrary
# interpreters need OS-level controls if the agent is not trusted.
command -v jq >/dev/null 2>&1 || exit 0
export LC_ALL=C

COMMIT_REQUIRED="Direct commit blocked. Load the commit-action skill (/commit), validate the message and get explicit confirmation before retrying. Leave commits local; do not push or sync."

# Splits a command into shell-like words in TOKENS, with ";" for each command
# separator, and the bodies of $(...) and `...` in NESTED.
tokenize() {
  local cmd=$1 n=${#1} i=0 ch value="" quote="" offset close rest inner end
  TOKENS=()
  NESTED=()
  while ((i < n)); do
    ch=${cmd:i:1}
    if [[ $ch == "\\" && $quote != "'" ]]; then
      i=$((i + 1))
      [[ ${cmd:i:1} == $'\n' ]] || value+=${cmd:i:1}
    elif [[ -n $quote ]]; then
      if [[ $ch == "$quote" ]]; then
        quote=""
      else
        value+=$ch
        if [[ $quote == '"' ]] && { [[ $ch == '$' && ${cmd:i+1:1} == '(' ]] || [[ $ch == '`' ]]; }; then
          if [[ $ch == '$' ]]; then offset=2 close=')'; else offset=1 close='`'; fi
          rest=${cmd:i+offset}
          if [[ $rest == *"$close"* ]]; then
            inner=${rest%%"$close"*}
            end=$((i + offset + ${#inner}))
          else
            inner=$rest
            end=-1
          fi
          NESTED+=("$inner")
          if [[ $ch == '`' ]]; then
            if ((end < 0)); then value+=${cmd:i+1}; i=$n; else value+=${cmd:i+1:end-i}; i=$end; fi
          fi
        fi
      fi
    elif [[ $ch == "'" || $ch == '"' ]]; then
      quote=$ch
    elif [[ $ch == ' ' || $ch == $'\t' || $ch == $'\r' ]]; then
      [[ -n $value ]] && TOKENS+=("$value")
      value=""
    elif [[ $ch == $'\n' || $ch == ';' || $ch == '&' || $ch == '|' || $ch == '(' || $ch == ')' ]]; then
      [[ -n $value ]] && TOKENS+=("$value")
      value=""
      TOKENS+=(";")
    elif [[ $ch == '`' ]]; then
      [[ -n $value ]] && TOKENS+=("$value")
      value=""
      rest=${cmd:i+1}
      if [[ $rest == *'`'* ]]; then
        inner=${rest%%'`'*}
        NESTED+=("$inner")
        i=$((i + 1 + ${#inner}))
      else
        NESTED+=("$rest")
        i=$n
      fi
    else
      value+=$ch
    fi
    i=$((i + 1))
  done
  [[ -n $value ]] && TOKENS+=("$value")
  return 0
}

# Succeeds when the command runs git commit (or commit-tree) anywhere,
# including inside sh -c and command substitutions, unless that commit is
# prefixed by exactly the __GIT_COMMIT_PLUGIN__=1 workflow token.
blocks_direct_commit() {
  # Fast path: every way to spell the subcommand leaves "commit" once quotes,
  # backslashes and line breaks are removed.
  local plain=${1//[\\\"\']/} newline=$'\n'
  plain=${plain//$newline/}
  [[ $plain == *commit* ]] || return 1

  tokenize "$1"
  local -a toks nest
  local count=${#TOKENS[@]} i j begin shell_re='(^|/)(bash|sh|zsh|dash)$' git_re='(^|/)git$' flags_re='^-[a-z]*c[a-z]*$'
  ((count > 0)) && toks=("${TOKENS[@]}")
  ((${#NESTED[@]} > 0)) && nest=("${NESTED[@]}")

  for ((i = 0; i < ${#nest[@]}; i++)); do
    blocks_direct_commit "${nest[i]}" && return 0
  done
  for ((i = 0; i < count; i++)); do
    if [[ ${toks[i]} =~ $shell_re ]]; then
      j=$((i + 1))
      while [[ ${toks[j]} == -* ]]; do
        if [[ ${toks[j]} =~ $flags_re ]] && blocks_direct_commit "${toks[j + 1]}"; then return 0; fi
        j=$((j + 1))
      done
    fi
    [[ ${toks[i]} =~ $git_re ]] || continue
    j=$((i + 1))
    while [[ ${toks[j]} == -* ]]; do
      case ${toks[j]} in
        -C | -c | --git-dir | --work-tree | --namespace | --config-env) j=$((j + 2)) ;;
        *) j=$((j + 1)) ;;
      esac
    done
    [[ ${toks[j]} == commit || ${toks[j]} == commit-tree ]] || continue
    begin=$i
    while ((begin > 0)) && [[ ${toks[begin - 1]} != ";" ]]; do begin=$((begin - 1)); done
    if ((i - begin != 1)) || [[ ${toks[begin]} != "__GIT_COMMIT_PLUGIN__=1" ]]; then return 0; fi
  done
  return 1
}

input=$(cat)
if ! jq -e 'type == "object" and (.tool_input | type == "object")' >/dev/null 2>&1 <<<"$input"; then
  echo "Commit guard input error: expected hook JSON with a tool_input object" >&2
  exit 2
fi

tool=$(jq -r '.tool_name // "Bash"' <<<"$input")
lower_tool=$(tr '[:upper:]' '[:lower:]' <<<"$tool")
mcp_commit_re='(^|[_-])git([_-].*)?[_-]commit$'
bash_re='(^|[_-])bash$'

if [[ $tool =~ $mcp_commit_re ]]; then
  echo "$COMMIT_REQUIRED" >&2
  exit 2
fi
if [[ $lower_tool =~ $bash_re ]]; then
  # A sentinel keeps trailing newlines that command substitution would strip.
  command=$(jq -j '.tool_input.command | strings' <<<"$input"; printf x)
  command=${command%x}
  if blocks_direct_commit "$command"; then
    echo "$COMMIT_REQUIRED" >&2
    exit 2
  fi
fi
exit 0
