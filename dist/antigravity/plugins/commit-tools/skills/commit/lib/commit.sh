#!/bin/bash
# Execute only messages already validated (and confirmed if configured) by commit-tools:commit.
# Usage: commit.sh --message-file <path> [--style classic|conventional]
#                  [--amend] [--allow-style-override]
#        commit.sh --fixup <sha> [--message-file <path> [--style classic|conventional]
#                  [--allow-style-override]]
# Needs bash 3.2+, git and POSIX tools only.

die() {
  printf '%s\n' "$1" >&2
  exit 1
}

lib_dir=$(cd -- "$(dirname -- "$0")" && pwd) || die "Cannot locate commit-tools:commit"

message_file=""
style="classic"
amend=0
fixup_mode=0
fixup=""
allow_override=0
while [ $# -gt 0 ]; do
  case "$1" in
    --message-file=*) message_file=${1#*=} ;;
    --message-file)
      [ $# -ge 2 ] || die "Option '--message-file <value>' argument missing"
      message_file=$2
      shift
      ;;
    --style=*) style=${1#*=} ;;
    --style)
      [ $# -ge 2 ] || die "Option '--style <value>' argument missing"
      style=$2
      shift
      ;;
    --amend) amend=1 ;;
    --fixup=*)
      fixup_mode=1
      fixup=${1#*=}
      ;;
    --fixup)
      [ $# -ge 2 ] || die "Option '--fixup <sha>' argument missing"
      fixup_mode=1
      fixup=$2
      shift
      ;;
    --allow-style-override) allow_override=1 ;;
    --)
      shift
      [ $# -eq 0 ] || die "Unexpected argument '$1'. This command does not take positional arguments"
      break
      ;;
    -*) die "Unknown option '${1%%=*}'" ;;
    *) die "Unexpected argument '$1'. This command does not take positional arguments" ;;
  esac
  shift
done

[ "${__GIT_COMMIT_PLUGIN__:-}" = 1 ] || die "Load commit-tools:commit to validate the message before committing"
case "$style" in
  classic|conventional) ;;
  *) die "Unknown commit style" ;;
esac

if [ $fixup_mode -eq 1 ]; then
  [ $amend -eq 0 ] || die "Cannot combine --fixup and --amend"
  [ -n "$fixup" ] || die "Option '--fixup <sha>' argument cannot be empty"
  case "$fixup" in
    -*) die "Invalid fixup target: $fixup" ;;
    amend:*|reword:*) die "Do not pass amend:/reword: prefixes to --fixup; use --message-file to adjust the message" ;;
  esac
  if [ -z "$message_file" ] && [ $allow_override -eq 1 ]; then
    die "--allow-style-override requires --message-file"
  fi
else
  [ -n "$message_file" ] || die "--message-file is required"
fi

err_file=$(mktemp "${TMPDIR:-/tmp}/commit.XXXXXX") || die "Cannot create a temporary file"
trap 'rm -f "$err_file"' EXIT

if [ -n "$message_file" ]; then
  # Keep the exact bytes, trailing newlines included; validate and commit these
  # bytes rather than the file, which could change after validation.
  message=$(cat -- "$message_file" 2>/dev/null && printf x) || die "Cannot read message file: $message_file"
  message=${message%x}

  # Subject and body come from the message without trailing whitespace.
  trimmed=${message%"${message##*[![:space:]]}"}
  subject=""
  first=1
  body_count=0
  while IFS= read -r line; do
    line=${line%$'\r'}
    if [ $first -eq 1 ]; then
      subject=$line
      first=0
      continue
    fi
    body_count=$((body_count + 1))
    if [ $body_count -eq 1 ] && [ -n "$line" ]; then
      die "Separate subject and body with a blank line"
    fi
    # ${#line} is never below the character count, so only long-looking lines
    # need the exact count: bytes minus UTF-8 continuation bytes.
    if [ ${#line} -gt 72 ]; then
      width=$(printf '%s' "$line" | LC_ALL=C tr -d '\200-\277' | wc -c)
      [ $((width)) -le 72 ] || die "Body lines must be at most 72 characters"
    fi
  done <<EOF
$trimmed
EOF
  case "$subject" in
    *[![:space:]]*) ;;
    *) die "Commit message is empty" ;;
  esac

  if printf '%s\n' "$message" | tr '\r' '\n' \
    | LC_ALL=C grep -Eiq '^Co-Authored-By:.*(claude|anthropic|openai|copilot|[^A-Za-z0-9_]gpt([^A-Za-z0-9_]|$))'; then
    die "AI co-author attribution is not allowed"
  fi

  check_status=0
  check_out=$(bash "$lib_dir/style-check.sh" "$subject" "$lib_dir/../styles/$style.md" 2>"$err_file") \
    || check_status=$?
  if [ $check_status -ne 0 ] && ! { [ $check_status -eq 1 ] && [ $allow_override -eq 1 ]; }; then
    [ -n "$check_out" ] || check_out=$(cat "$err_file")
    die "${check_out:-Style validation failed}"
  fi
fi

# Run git, returning trimmed stdout; fail with git's stderr.
git_out() {
  local out
  out=$(git "$@" 2>"$err_file") || {
    out=$(cat "$err_file")
    die "${out:-Git failed}"
  }
  printf '%s' "$out"
}

git_out rev-parse --git-dir >/dev/null || exit 1
if [ $fixup_mode -eq 1 ]; then
  target=$(git rev-parse --verify "${fixup}^{commit}" 2>/dev/null) || die "Invalid fixup target: $fixup"
  case "$target" in
    *[!0-9a-f]*) die "Invalid fixup target: $fixup" ;;
  esac
  [ ${#target} -ge 40 ] && [ ${#target} -le 64 ] || die "Invalid fixup target: $fixup"
  git merge-base --is-ancestor "$target" HEAD 2>/dev/null || die "Fixup target is not an ancestor of HEAD: $fixup"
  parents=$(git_out rev-list --parents -n 1 "$target") || exit 1
  set -- $parents
  [ $# -le 2 ] || die "Cannot fixup a merge commit"
  target_subject=$(git_out log -1 --format=%s "$target") || exit 1
  case "$target_subject" in
    "fixup! "*|"amend! "*|"squash! "*)
      die "Cannot fixup a fixup!/amend!/squash! commit; target the original commit instead"
      ;;
  esac
elif [ $amend -eq 1 ]; then
  author=$(git_out log -1 --format=%ae) || exit 1
  email=$(git_out config user.email) || exit 1
  [ "$author" = "$email" ] || die "Cannot amend another author's commit"
  remotes=$(git_out for-each-ref --format='%(refname)' --contains=HEAD refs/remotes/) || exit 1
  [ -z "$remotes" ] || die "Cannot amend a commit contained in a known remote branch"
fi

rm -f "$err_file"
trap - EXIT
if [ $fixup_mode -eq 1 ]; then
  if [ -n "$message_file" ]; then
    printf 'amend! %s\n\n%s' "$target_subject" "$message" | git commit --file=-
  else
    git commit --fixup="$target"
  fi
elif [ $amend -eq 1 ]; then
  printf '%s' "$message" | git commit --amend --file=-
else
  printf '%s' "$message" | git commit --file=-
fi
