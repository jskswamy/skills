#!/bin/bash
# build-todo.sh: reads plan.yaml, writes per-commit message files, prints rebase todo
# Usage: build-todo.sh <plan.yaml> <msgdir>
set -euo pipefail
lib_dir=$(cd -- "$(dirname -- "$0")" && pwd)
exec python3 - "$1" "$2" "$lib_dir" <<'PYEOF'
import sys
import re
import os
import shlex

commit_script = os.path.abspath(os.path.join(sys.argv[3], '../../commit-action/lib/commit.mjs'))
split_script = os.path.join(sys.argv[3], 'apply-split.sh')
style = os.environ.get('COMMIT_ACTION_STYLE', 'classic')

plan_path = sys.argv[1]
msgdir = sys.argv[2]
os.makedirs(msgdir, exist_ok=True)

text = open(plan_path).read()

# Find actions list start
actions_start = re.search(r'^actions:\s*$', text, re.MULTILINE)
if not actions_start:
    sys.exit("no actions list")

body = text[actions_start.end():]
blocks = re.split(r'(?=^  - hash:)', body, flags=re.MULTILINE)


def parse_literal_block(block, key):
    m = re.search(
        r'^    ' + re.escape(key) + r':\s*\|\s*\n((?:^[ \t]+.*\n?|\n)*)',
        block,
        re.MULTILINE
    )
    if not m:
        return None
    raw = m.group(1)
    lines = []
    for line in raw.splitlines():
        if line.startswith('      '):
            lines.append(line[6:])
        elif line.strip() == '':
            lines.append('')
        else:
            lines.append(line.lstrip())
    return '\n'.join(lines).rstrip('\n')


prev_pick = None
todo_lines = []

for blk in blocks:
    blk = blk.strip()
    if not blk.startswith('- hash:'):
        continue
    h_match = re.search(r'- hash:\s*(\S+)', blk)
    a_match = re.search(r'^    action:\s*(\S+)', blk, re.MULTILINE)
    if not h_match or not a_match:
        continue
    h = h_match.group(1)
    if not re.match(r'^[0-9a-f]{4,40}$', h):
        sys.exit(f"plan.yaml: hash field is not a hex SHA: {h!r}")
    a = a_match.group(1)

    if a == 'pick':
        todo_lines.append(f'pick {h}')
        msg = parse_literal_block(blk, 'new_message')
        if msg is not None:
            with open(os.path.join(msgdir, h), 'w') as f:
                f.write(msg)
            todo_lines.append('exec ' + shlex.join(['node', commit_script, '--amend', '--message-file', os.path.join(msgdir, h), '--style', style]))
        prev_pick = h
    elif a == 'fixup':
        todo_lines.append(f'fixup {h}')
        msg = parse_literal_block(blk, 'fixup_target_message')
        if msg is not None and prev_pick is not None:
            with open(os.path.join(msgdir, prev_pick), 'w') as f:
                f.write(msg)
            todo_lines.append(
                'exec ' + shlex.join(['node', commit_script, '--amend', '--message-file', os.path.join(msgdir, prev_pick), '--style', style])
            )
        # Do NOT update prev_pick
    elif a == 'drop':
        todo_lines.append(f'drop {h}')
        # Do NOT update prev_pick
    elif a in ('reword', 'squash'):
        todo_lines.append(f'pick {h}')
        msg = parse_literal_block(blk, 'new_message')
        if msg is not None:
            with open(os.path.join(msgdir, h), 'w') as f:
                f.write(msg)
            todo_lines.append(
                'exec ' + shlex.join(['node', commit_script, '--amend', '--message-file', os.path.join(msgdir, h), '--style', style])
            )
        prev_pick = h
    elif a == 'edit':
        # The helper performs the approved split; a Git edit would pause first.
        todo_lines.append(f'pick {h}')
        todo_lines.append(
            'exec ' + shlex.join(['bash', split_script, h, plan_path])
        )
        prev_pick = h

print('\n'.join(todo_lines))
PYEOF
