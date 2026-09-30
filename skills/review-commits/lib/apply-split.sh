#!/bin/bash
# apply-split.sh: invoked by git rebase --exec when an edit stops the rebase
# Usage: apply-split.sh <hash> <plan-path>
set -euo pipefail
hash="$1"
plan="$2"

git reset HEAD~1 >/dev/null

python3 - "$hash" "$plan" <<'PY'
import sys, re, subprocess, os

hash_arg, plan_path = sys.argv[1], sys.argv[2]
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
    r'^      - files:\s*\[([^\]]*)\]\s*$\s*'
    r'^        message:\s*\|\s*$'
    r'([\s\S]*?)(?=^      - files:|\Z)',
    re.MULTILINE)

env = dict(os.environ, __GIT_COMMIT_PLUGIN__='1')
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

    subprocess.check_call(['git', 'add', '--', *files])
    p = subprocess.run(['git', 'commit', '-q', '-F', '-'],
                       input=msg.encode(), env=env, check=True)
PY
