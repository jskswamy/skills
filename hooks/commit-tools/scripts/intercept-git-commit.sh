#!/bin/bash
# Same guard for canonical sources and installed Claude plugin wrappers.
set -euo pipefail
here=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
hook="$here/../../skills/commit-action/lib/hook.mjs"
if [[ ! -f "$hook" ]]; then
  hook="$here/../../../skills/commit-action/lib/hook.mjs"
fi
if ! command -v node >/dev/null || [[ ! -f "$hook" ]]; then
  echo 'Commit guard unavailable. Restore commit-tools before committing.' >&2
  exit 2
fi
exec node "$hook"
