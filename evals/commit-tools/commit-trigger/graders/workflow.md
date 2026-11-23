---
type: llm
focus: trace
---

Pass only if the agent loads commit-tools:commit, not just any skill. It must keep message validation in the workflow (and explicit confirmation when `confirm: true` or `--confirm` is set) and must not propose creating project instructions as a prerequisite. No direct commit or push may be performed in this read-only evaluation.
