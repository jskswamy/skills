# Contributing

## Prerequisites

This project uses [Nix](https://nixos.org/) for reproducible development environments. All required tools (git-cliff, gomplate, shellcheck, etc.) are provided via the flake.

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

## Creating a Plugin

Plugins are described in `registry.json`; reusable resources live in root canonical directories.

1. Add skills under `skills/<skill-name>/SKILL.md`.
2. Add commands under `commands/<plugin-name>/`.
3. Add agents under `agents/<plugin-name>/`.
4. Add hooks under `hooks/<plugin-name>/`.
5. Add templates/assets under `templates/<plugin-name>/` or `shared-scripts/<plugin-name>/`.
6. Register plugin metadata and resource membership in `registry.json`.
7. Generate Claude Code wrappers:
   ```bash
   npm run build
   ```
8. Test locally:
   ```bash
   claude --plugin-dir ./plugins/<plugin-name>
   ```

## Submitting a Plugin

1. Fork this repository.
2. Add canonical resources and update `registry.json`.
3. Run:
   ```bash
   npm run build
   npm run validate
   npm test
   ```
4. Update README.md to list your plugin if needed.
5. Submit a pull request including generated `plugins/<plugin-name>/` changes.

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
- Generated Claude wrappers must be current (`npm run build` then no generated diff).
- `npm run validate` and `npm test` must pass.
- Plugin must include usage documentation.
- Plugin must be tested locally before submission.
