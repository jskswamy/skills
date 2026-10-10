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
