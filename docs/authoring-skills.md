# Authoring Skills and Plugins

This repository keeps reusable agent behavior in canonical root resource directories and generates Claude Code plugin wrappers from `registry.json`.

## Canonical Resource Directories

```text
skills/          # Agent Skills source of truth
commands/        # command markdown grouped by plugin
agents/          # agent prompts grouped by plugin
hooks/           # hook definitions and scripts grouped by plugin
templates/       # reusable templates and static assets
shared-scripts/  # shared runtime scripts
```

Do not edit generated resource copies under `plugins/<plugin-name>/` directly. Edit the canonical source and regenerate.

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

Use lowercase hyphenated names. Keep harness-specific tool names out of shared skill prose where possible; adapters should map generic actions to harness tools.

## Add Commands, Agents, Hooks, or Templates

Use plugin-grouped paths:

```text
commands/<plugin-name>/<command>.md
agents/<plugin-name>/<agent>.md
hooks/<plugin-name>/hooks.json
templates/<plugin-name>/<template>
shared-scripts/<plugin-name>/<script>
```

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

`extra` entries may map canonical paths to Claude wrapper destinations:

```json
{ "from": "shared-scripts/my-plugin", "to": "scripts" }
```

## Generate and Verify

```bash
npm run build
npm run validate
npm test
```

Commit both canonical resources and generated Claude wrapper changes.
