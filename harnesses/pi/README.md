# Pi Harness Support

This repository exposes canonical Agent Skills to Pi through the root `package.json` `pi` metadata.

## Install from Git

```bash
pi install git:github.com/jskswamy/agent-capabilities@<tag>
```

Until the repository is renamed, use the current repository URL instead:

```bash
pi install git:github.com/jskswamy/claude-plugins@<tag>
```

## Local Development

From the repository root:

```bash
pi -e .
```

Pi loads:

- `./skills` for canonical skills
- `./harnesses/pi/extensions` for Pi-specific extensions
