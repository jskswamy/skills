# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Structure

This is a multi-harness agent capabilities repository. Reusable behavior lives in canonical root resource directories; per-harness adapters generate each harness's install tree from those resources.

```text
# Source (edit these)
registry.json                         # Source of truth for plugin metadata, resource membership and harnesses
skills/                               # Canonical Agent Skills source
commands/                             # Canonical slash-command markdown grouped by plugin
agents/                               # Canonical agent prompts grouped by plugin
hooks/                                # Canonical Claude-format hook definitions/scripts grouped by plugin
templates/                            # Canonical templates/static assets, including each plugin's README.md
shared-scripts/                       # Canonical shared runtime scripts
scripts/build.mjs, scripts/validate.mjs, scripts/changed-plugins.mjs
scripts/lib/transforms/               # Conversions shared by adapters (frontmatter, commands, agents, hooks, tools, policy)
harnesses/lib/                        # Hook runner and tool translation copied into generated packages
harnesses/<id>/                       # One folder per harness: adapter.mjs, runtime or shim, tool table, README
package.json                          # The "pi" block is hand-written and points at dist/pi

# Generated (written only by the release: npm run build:release)
.claude-plugin/marketplace.json       # Claude Code marketplace; sources point into dist/claude-code
dist/claude-code/<plugin>/            # Claude Code plugins
dist/antigravity/plugins/<plugin>/    # Antigravity plugins
dist/opencode/<plugin>/               # OpenCode packages
dist/pi/                              # Self-contained Pi package: skills, hooks, prompts, hook manifest, runtime
```

## Source-of-Truth Rules

- Edit sources, never generated output. Everything under `dist/` and `.claude-plugin/marketplace.json` is generated.
- `npm run build` writes into a temp dir and prints it; it never writes into the repo. Only the release (`npm run build:release`) writes `dist/` and `.claude-plugin/`, so never commit those outside a release. `main` therefore always installs the last release.
- Update `registry.json` when adding/removing plugin resources, changing plugin metadata, or enabling a harness (`harnesses.<id>.enabled`).
- A hook a harness cannot carry fails the build unless `harnesses.<id>.optional` names it with a reason.
- Run `npm run build` after registry or canonical resource changes, and read its report of what each harness degrades.
- Run `npm run validate` before committing structural changes. It checks a fresh temp build, not the committed `dist/`.
- Generated output stays committed because Claude Code, Antigravity, OpenCode and Pi install from a git tree and do not run build scripts.

## Creating or Updating a Plugin

1. Add reusable skills under `skills/<skill-name>/SKILL.md` using Agent Skills frontmatter.
2. Add commands under `commands/<plugin-name>/`.
3. Add agents under `agents/<plugin-name>/`.
4. Add hooks under `hooks/<plugin-name>/`.
5. Add templates/assets under `templates/<plugin-name>/` or `shared-scripts/<plugin-name>/`.
6. Register all resources in `registry.json`.
7. Build into a temp dir and read the report:
   ```bash
   npm run build
   ```
8. Verify:
   ```bash
   npm run validate
   npm test
   ```

## Testing Plugins Locally

`npm run build` prints the temp dir it wrote, as its last line (`Output: <dir>`).

Claude Code plugin:

```bash
claude --plugin-dir <dir>/dist/claude-code/<plugin-name>
```

Pi package:

```bash
pi -e <dir>
```

Antigravity and OpenCode: see `harnesses/antigravity/README.md` and `harnesses/opencode/README.md`. To add a harness, see `docs/authoring-skills.md#adding-a-harness`.

## Evals

Trigger evals live in `evals/<plugin>/<case>/` (`prompt.md` + `graders/*.md`). `claude plugin eval` needs them inside the plugin folder, so `npm run eval -- [plugin ...]` builds the Claude plugins into a temp dir, stages the evals into that build, runs, and removes it; they never ship in installs. Runs real agent sessions (about $3 for all plugins), so run before a release, not in hooks.

## Git Commits

Always use the `/commit` command instead of `git commit` directly when working in Claude Code. The `/commit` plugin provides atomic commit validation, intelligent message generation from conversation context, and style enforcement.
