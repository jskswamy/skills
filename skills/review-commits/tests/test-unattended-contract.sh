#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
skill="SKILL.md"
validate="../validate-commits/SKILL.md"
map="../../docs/command-skill-map.md"

require() {
  local file="$1" pattern="$2" msg="$3"
  if ! grep -Eq -- "$pattern" "$file"; then
    echo "FAIL: $msg"
    echo "  missing pattern: $pattern"
    echo "  in file: $file"
    exit 1
  fi
}

require "$skill" '`--unattended`' 'review-commits documents --unattended argument'
require "$skill" '`--style <classic\|conventional>`' 'review-commits documents --style choices'
require "$skill" '`--result <path>`' 'review-commits documents --result argument'
require "$skill" '`--test-cmd <cmd>`' 'review-commits documents --test-cmd argument'
require "$skill" '--base <ref>` \| string \| required with `--unattended`' 'review-commits requires --base in unattended mode'
require "$skill" 'never calls AskUserQuestion' 'review-commits states unattended never asks'
require "$skill" 'never check out another branch' 'review-commits forbids cross-branch checkout in unattended mode'
require "$skill" 'ignore `--tag`' 'review-commits ignores tag in unattended mode'
require "$skill" 'git rebase --abort' 'review-commits aborts rebase conflicts unattended'
require "$skill" 'reason: `conflict`' 'review-commits records conflict reason'
require "$skill" 'git diff <original HEAD> HEAD' 'review-commits enforces tree invariant'
require "$skill" 'validate-commits --unattended --base <base>' 'review-commits invokes validate unattended'
require "$skill" 'add `.review-commits/` to `.git/info/exclude`' 'review-commits excludes default result directory'
require "$validate" '`--unattended`' 'validate-commits documents --unattended argument'
require "$validate" 'reason: `no-base`' 'validate-commits records no-base reason'
require "$validate" 'six checks' 'validate-commits records all six checks'
require "$map" '/skill:review-commits --unattended --base <ref>' 'command map documents review-commits unattended invocation'
require "$map" '/skill:validate-commits --unattended --base <ref>' 'command map documents validate-commits unattended invocation'
