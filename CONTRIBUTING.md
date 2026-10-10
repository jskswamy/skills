# Contributing

This repository publishes canonical agent skills to multiple harnesses. Pi loads
root skills directly; Claude Code installs generated plugin wrappers from
`plugins/`.

For the source-of-truth model, read
[`docs/authoring-skills.md`](docs/authoring-skills.md). For release steps, read
[`docs/releasing.md`](docs/releasing.md). For Claude command to Pi skill
mapping, read [`docs/command-skill-map.md`](docs/command-skill-map.md).

## Prerequisites

This project uses [Nix](https://nixos.org/) for reproducible development
environments. Required tools such as `git-cliff`, `gomplate`, `shellcheck`, and
pre-commit hooks are provided by the flake.

1. Install Nix with flakes enabled:

   ```bash
   curl -L https://nixos.org/nix/install | sh
   echo "experimental-features = nix-command flakes" >> ~/.config/nix/nix.conf
   ```

2. Enter the development shell:

   ```bash
   nix develop
   ```

   Or use direnv for automatic activation:

   ```bash
   direnv allow
   ```

## Creating or Updating a Plugin

Plugins are described in `registry.json`; reusable resources live in canonical
root directories.

1. Add or update skills under `skills/<skill-name>/SKILL.md`.
2. Add or update command wrappers under `commands/<plugin-name>/`.
3. Add or update agents under `agents/<plugin-name>/`.
4. Add or update hooks under `hooks/<plugin-name>/`.
5. Add templates/assets under `templates/<plugin-name>/` or
   `shared-scripts/<plugin-name>/`.
6. Register plugin metadata and resource membership in `registry.json`.
7. Generate Claude Code wrappers:

   ```bash
   npm run build
   ```

8. Verify:

   ```bash
   npm run validate
   npm test
   git diff --exit-code -- .claude-plugin plugins
   ```

If generated wrapper changes are intentional, include them in the same pull
request as the canonical resource changes.

## Testing Locally

Claude Code wrapper:

```bash
claude --plugin-dir ./plugins/<plugin-name>
```

Pi package:

```bash
pi -e .
```

## Submitting a Change

1. Fork this repository.
2. Add canonical resources and update `registry.json` when resource membership
   or plugin metadata changes.
3. Run `npm run build`, `npm run validate`, and `npm test`.
4. Include generated `plugins/<plugin-name>/` and `.claude-plugin/` changes
   when build output changed intentionally.
5. Submit a pull request describing the user-facing workflow change.

## Plugin Entry Format

Add to the `plugins` array in `registry.json`:

```json
{
  "name": "your-plugin",
  "version": "1.0.0",
  "description": "Brief description of what it does",
  "author": { "name": "Your Name" },
  "category": "utilities",
  "tags": ["relevant", "tags"],
  "resources": {
    "skills": ["your-skill"],
    "commands": ["your-plugin/command.md"],
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

## Requirements

- Skills must have valid `SKILL.md` frontmatter with `name` and `description`.
- Plugin metadata and resource membership must be declared in `registry.json`.
- Generated Claude wrappers must be current after `npm run build`.
- `npm run validate` and `npm test` must pass.
- User-facing workflows need usage documentation.
- Plugin changes should be tested locally before submission.
