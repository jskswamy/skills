#!/bin/bash
# Route agent-initiated commits through commit-action from the first prompt.
# Same script for canonical sources and installed Claude plugin wrappers.
set -euo pipefail
here=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
skill="$here/../../skills/commit-action/SKILL.md"
if [[ ! -f "$skill" ]]; then
  skill="$here/../../../skills/commit-action/SKILL.md"
fi
skill="$(cd -- "$(dirname -- "$skill")" && pwd)/SKILL.md"
echo "Before creating or amending any Git commit, including automatic task completion and history replay, load and follow $skill. Validate the message and wait for explicit confirmation. No project configuration is needed. Leave commits local; pushing and remote synchronization belong to the user."
