# Contributing

This repository publishes canonical agent skills to Claude Code, Pi,
Antigravity and OpenCode. Each harness's install tree is generated into
`dist/` from the canonical resources and `registry.json`; only a release
writes it.

For the source-of-truth model and generated output, read
[`docs/authoring-skills.md`](docs/authoring-skills.md). To support another
harness, read [Adding a Harness](docs/authoring-skills.md#adding-a-harness).
For release steps, read [`docs/releasing.md`](docs/releasing.md). For command
names on each harness, read
[`docs/command-skill-map.md`](docs/command-skill-map.md).

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
7. Build every harness into a temp dir and read the report of what each
   harness degrades:

   ```bash
   npm run build
   ```

8. Verify:

   ```bash
   npm run validate
   npm test
   git status --short
   ```

Commit sources only. `dist/` and `.claude-plugin/` change only in a release
commit, so a pull request never includes them.

## Testing Locally

`npm run build` ends with `Output: <dir>`, the temp dir it wrote.

Claude Code plugin:

```bash
claude --plugin-dir <dir>/dist/claude-code/<plugin-name>
```

Pi package:

```bash
pi -e <dir>
```

Antigravity and OpenCode load the trees under `<dir>/dist/`; see
[`harnesses/antigravity/README.md`](harnesses/antigravity/README.md) and
[`harnesses/opencode/README.md`](harnesses/opencode/README.md).

## Submitting a Change

1. Fork this repository.
2. Add canonical resources and update `registry.json` when resource membership
   or plugin metadata changes.
3. Run `npm run build`, `npm run validate`, and `npm test`.
4. Leave `dist/` and `.claude-plugin/` out; the next release writes them.
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
    "antigravity": { "enabled": true },
    "opencode": { "enabled": true },
    "pi": { "enabled": true }
  }
}
```

## Requirements

- Skills must have valid `SKILL.md` frontmatter with `name` and `description`.
- Plugin metadata and resource membership must be declared in `registry.json`.
- `npm run build` must report no errors.
- `npm run validate` and `npm test` must pass.
- User-facing workflows need usage documentation.
- Plugin changes should be tested locally before submission.
