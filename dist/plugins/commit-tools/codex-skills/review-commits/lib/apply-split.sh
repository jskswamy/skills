#!/bin/bash
# apply-split.sh: invoked by git rebase --exec when an edit stops the rebase
# Usage: apply-split.sh <hash> <plan-path>
set -euo pipefail
hash="$1"
plan="$2"
if [[ "${__GIT_COMMIT_PLUGIN__:-}" != 1 ]]; then
  echo 'Load commit-action and obtain plan confirmation before splitting.' >&2
  exit 1
fi
commit_script="$(cd -- "$(dirname -- "$0")/../../commit-action/lib" && pwd)/commit.sh"

python3 - "$hash" "$plan" "$commit_script" <<'PY'
import sys, re, subprocess, os, tempfile

hash_arg, plan_path, commit_script = sys.argv[1:]
text = open(plan_path).read()

# Find this action's block.
m = re.search(
    r'^  - hash:\s*' + re.escape(hash_arg) + r'\s*$([\s\S]*?)(?=^  - hash:|\Z)',
    text, re.MULTILINE)
if not m:
    sys.exit("hash not found in plan: " + hash_arg)
block = m.group(1)

# Extract each split_into group.
group_re = re.compile(
    r'^      - files:[ \t]*\[([^\]]*)\][ \t]*\n'
    r'^        message:[ \t]*\|[ \t]*\n'
    r'([\s\S]*?)(?=^      - files:|\Z)',
    re.MULTILINE)

style = os.environ.get('COMMIT_ACTION_STYLE', 'classic')
splits = []
for files_csv, msg_block in group_re.findall(block):
    files = [f.strip() for f in files_csv.split(',') if f.strip()]
    # Strip 10-space indent from message lines, drop blank trailing lines.
    msg_lines = []
    for line in msg_block.splitlines():
        if line.startswith('          '):
            msg_lines.append(line[10:])
        elif line.strip() == '':
            msg_lines.append('')
        else:
            break  # left the message scalar
    msg = '\n'.join(msg_lines).rstrip() + '\n'

    if not files or not msg.strip():
        sys.exit('split requires files and a nonempty message')
    splits.append((files, msg))

if not splits:
    sys.exit('no split groups found in plan')
subprocess.check_call(['git', 'reset', 'HEAD~1'], stdout=subprocess.DEVNULL)
for files, msg in splits:
    subprocess.check_call(['git', 'add', '--', *files])
    with tempfile.NamedTemporaryFile(mode='w+', suffix='.message') as message_file:
        message_file.write(msg)
        message_file.flush()
        subprocess.run(['bash', commit_script, '--message-file', message_file.name,
                        '--style', style], check=True)
PY
