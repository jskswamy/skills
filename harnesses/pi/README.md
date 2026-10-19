# Pi Harness Support

This repository exposes canonical Agent Skills to Pi through the root
`package.json` `pi` metadata.

Pi loads:

- `./skills` for canonical skills
- `./harnesses/pi/extensions` for Pi-specific extensions

## Stable install

Install a released tag when you want a stable snapshot:

```bash
pi install git:github.com/jskswamy/skills@vX.Y.Z
```

Tags are the recommended install target for repeatable use.

## Latest install

Install `main` when you want the latest development version:

```bash
pi install git:github.com/jskswamy/skills@main
```

`main` can move at any time. Prefer a tag for shared team setup.

## Local development

From the repository root:

```bash
pi -e .
```

This loads the working tree directly, including local edits under `skills/` and
`harnesses/pi/extensions`.

## Commit workflow

The package extension registers `/commit` and routes agent-initiated commits
through `commit-action` in every repository. No project instructions or
configuration are required. `/skill:commit-action` reaches the same workflow.
Classic style is the default; message confirmation is still required. Commits
stay local and the user handles pushing and remote issue synchronization.

A `tool_call` handler blocks direct shell/MCP commits, including nested calls
from codemode, and redirects the agent to the workflow. The environment bypass
token is a convention, not a security boundary or proof of approval.

A Skillshare skill-only copy does not load executable Pi extensions. Install
the Pi package once for the `/commit` alias and guard; copying skill files alone
still supports `/skill:commit-action` with self-contained resources. See the
[commit-tools documentation](../../templates/commit-tools/README.md).

## Invoking skills

Invoke a skill by name:

```text
/skill:<skill-name>
```

Examples:

```text
/skill:codebase-ask
/skill:review-commits
/skill:jot-capture
/skill:typst-publish
```

## Claude command equivalents

Claude Code commands in this repository are thin wrappers around canonical
skills. Use [`docs/command-skill-map.md`](../../docs/command-skill-map.md) to
find the Pi skill name that corresponds to a Claude command.

For example:

| Claude Code command | Pi skill |
| --- | --- |
| `/commit` | `/skill:commit-action` |
| `/review-commits` | `/skill:review-commits` |
| `/publish` | `/skill:typst-publish` |
