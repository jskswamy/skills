# Authoring Skills and Plugins

This repository keeps reusable agent behavior in canonical root resource
directories. Generated Claude Code wrappers under `plugins/` are install
artifacts produced from those canonical resources and `registry.json`.

Pi loads the canonical `skills/` directory directly through the root
`package.json` package metadata. Claude Code installs generated plugin trees
from `plugins/<plugin-name>/`.

Edit canonical resources first, then run `npm run build` to refresh generated
wrappers.

## Canonical Resource Directories

```text
skills/          # Agent Skills source of truth
commands/        # Claude command wrappers grouped by plugin
agents/          # agent prompts grouped by plugin
hooks/           # hook definitions and scripts grouped by plugin
templates/       # reusable templates and static assets
shared-scripts/  # shared runtime scripts
```

Do not edit generated resource copies under `plugins/<plugin-name>/` directly.
If a generated file is wrong, fix its canonical source and regenerate.

## Add a Skill

Create:

```text
skills/<skill-name>/SKILL.md
```

Use Agent Skills frontmatter:

```markdown
---
name: my-skill
description: What this skill does and when to use it.
---

# My Skill

Instructions here.
```

Use lowercase hyphenated names. Keep shared skill prose harness-neutral where
possible. When a harness needs special handling, describe the generic action
first and name harness-specific commands second.

## Add Commands, Agents, Hooks, or Templates

Use plugin-grouped paths:

```text
commands/<plugin-name>/<command>.md
agents/<plugin-name>/<agent>.md
hooks/<plugin-name>/hooks.json
templates/<plugin-name>/<template>
shared-scripts/<plugin-name>/<script>
```

## Command Wrappers

For cross-harness workflows, put the full workflow in
`skills/<name>/SKILL.md`. Claude command files under `commands/` should be
thin wrappers that invoke the canonical skill and forward all arguments
unchanged.

Example command wrapper:

```markdown
---
name: ask
description: Ask a natural language question about the codebase
argument-hint: "<question>"
---

# /codebase:ask Command

Invoke the `codebase-ask` skill with the user's question.
Forward all arguments exactly as provided.
```

This lets Claude Code users keep command UX while Pi users invoke the same
workflow directly with `/skill:<name>`. Keep the mapping visible in
[`docs/command-skill-map.md`](command-skill-map.md).

## Register Resources

Update `registry.json`:

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "What this plugin does",
  "author": { "name": "Author" },
  "category": "utilities",
  "tags": ["utility"],
  "resources": {
    "skills": ["my-skill"],
    "commands": ["my-plugin/do.md"],
    "agents": [],
    "hooks": [],
    "templates": [],
    "extra": []
  },
  "harnesses": {
    "claude-code": { "enabled": true },
    "pi": { "enabled": true }
  }
}
```

`extra` entries map canonical paths to Claude wrapper destinations:

```json
{ "from": "shared-scripts/my-plugin", "to": "scripts" }
```

## Generate and Verify

```bash
npm run build
npm run validate
npm test
git diff --exit-code -- .claude-plugin plugins
```

If the generated diff is intentional, commit both canonical resources and the
generated Claude wrapper changes.
