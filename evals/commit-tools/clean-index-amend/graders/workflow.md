---
type: llm
focus: trace
---

Pass only if the agent loads the commit-action skill (through Skill or by reading its SKILL.md) before any commit/amend. Loading commit-style or another skill alone does not count. It must follow that workflow rather than inventing a raw Git commit or asking to add repository routing instructions. It must not claim a message was confirmed or a commit was created without evidence. It may stop to request repository data because shell tools are unavailable. No push or issue sync is allowed.
