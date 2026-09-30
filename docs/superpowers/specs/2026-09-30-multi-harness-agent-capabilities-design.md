# Multi-Harness Agent Capabilities Repository Design

## Summary

Refactor this repository from a Claude Code-only plugin marketplace into a multi-harness agent capabilities repository. The repository will keep reusable behavior in standard top-level resource directories (`skills/`, `commands/`, `agents/`, `hooks/`, `templates/`, and shared scripts), while harness-specific packaging lives in `harnesses/` and generated install wrappers.

Claude Code remains a first-class multi-plugin marketplace by keeping `.claude-plugin/marketplace.json` and `plugins/<plugin-name>/` at the repository root. Those Claude wrapper directories are generated from canonical resources and committed, because Claude marketplace installs read a git tree and do not run a build step. Pi support uses the root package layout directly: shared `skills/` plus `harnesses/pi/extensions/` declared through `package.json`.

## Goals

- Make the repository harness-neutral without losing the existing Claude Code marketplace workflow.
- Keep each skill body in exactly one canonical source location.
- Support the standard Agent Skills layout: `skills/<skill-name>/SKILL.md`.
- Generate Claude Code multi-plugin wrappers from registry metadata and canonical resources.
- Allow Pi to install from the repository root via `package.json` `pi` metadata.
- Establish release engineering that works for git-based harness installers, which expect installable files to already exist in the cloned tree.
- Leave room for future Codex, OpenCode, Gemini, and other harness adapters without another large reorganization.

## Non-Goals

- Do not create a universal plugin format; harness plugin formats remain different.
- Do not rely on GitHub Release assets for Claude Code plugin installation.
- Do not require harness installers to run build scripts.
- Do not duplicate canonical skill text by hand.
- Do not complete Codex/OpenCode/Gemini native support in the first refactor unless their adapters are already trivial.

## Current State

The repository is currently organized as a Claude Code plugin marketplace:

```text
.claude-plugin/marketplace.json
plugins/<plugin-name>/
  .claude-plugin/plugin.json
  commands/
  agents/
  skills/
  hooks/
  README.md
```

This shape works for Claude Code but makes Claude-specific packaging the source of truth. Supporting Pi or another harness directly from this structure would either duplicate skills or force other harnesses to understand Claude plugin wrappers.

## Reference Patterns

### Superpowers

Superpowers keeps shared skill content at the repository root:

```text
skills/
.claude-plugin/
.codex-plugin/
.pi/
.opencode/
GEMINI.md
package.json
```

Its rule is that `skills/` is the shared source of truth, while each harness supplies only a thin bootstrap/tool-mapping adapter.

### mattpocock/skills

`mattpocock/skills` also keeps root-level `skills/` and root `.claude-plugin` metadata. Its Claude plugin manifest explicitly lists skill directories, allowing the repo to contain additional non-promoted skills without shipping them to Claude.

Its release flow confirms that Claude Code consumes a git repo tree and reads `.claude-plugin/plugin.json`; the official marketplace listing pins a git SHA. Releases reach users when the marketplace source SHA moves, not because Claude downloads a GitHub Release artifact.

## Target Repository Structure

```text
agent-capabilities/
  README.md
  CHANGELOG.md
  package.json
  registry.json

  .claude-plugin/
    marketplace.json              # generated from registry.json, committed

  skills/                         # canonical Agent Skills source
    codebase-explore/
      SKILL.md
      references/
      scripts/
    commit-action/
      SKILL.md
    commit-style/
      SKILL.md
    review-commits/
      SKILL.md

  commands/                       # canonical command markdown, grouped by plugin
    codebase/
      ask.md
      graph.md
      impact.md
      index.md
    commit-tools/
      commit.md

  agents/                         # canonical agent prompts, grouped by plugin
    craft/
      issue-writer.md
      quality-reviewer.md
    refactor/
      scanner.md
      synthesizer.md

  hooks/                          # canonical hooks and hook scripts, grouped by plugin
    codebase/
      hooks.json
      pretooluse-grep.sh
    commit-tools/
      hooks.json
      scripts/
        intercept-git-commit.sh

  templates/
    jot/
    typst-notes/
    guardrails/

  shared-scripts/                 # optional runtime helpers not owned by one skill dir
    codebase/
    typst-notes/

  plugins/                        # generated Claude Code marketplace wrappers, committed
    codebase/
      .claude-plugin/
        plugin.json
      README.md
      commands/
      skills/
      hooks/
    commit-tools/
      .claude-plugin/
        plugin.json
      README.md
      commands/
      skills/
      hooks/
      styles/

  harnesses/
    pi/
      extensions/
        codebase.ts
        commit-tools.ts
      README.md
    codex/
      README.md
    opencode/
      README.md
    gemini/
      README.md

  scripts/
    build.mjs
    validate.mjs
    sync-versions.mjs
```

The repository name can change separately. The structure assumes a harness-neutral identity such as `agent-capabilities`, but the refactor can be done before or after a repository rename.

## Source of Truth Rules

1. `skills/`, `commands/`, `agents/`, `hooks/`, `templates/`, and `shared-scripts/` are canonical.
2. `plugins/<plugin-name>/` is generated Claude Code packaging.
3. Generated Claude wrappers are committed because Claude installs from a git tree and does not run this repository's build script.
4. Pi loads canonical root resources directly and should not need copied skill wrappers.
5. Harness-specific code belongs under `harnesses/<harness>/` unless the harness requires a root manifest such as `.claude-plugin/marketplace.json` or `package.json`.
6. Symlinks are avoided in generated install payloads. Use copies because some plugin installers drop symlinks or fail to preserve them.

## Registry Metadata

A root `registry.json` describes plugins once. It is the input to the build script.

Example shape:

```json
{
  "marketplace": {
    "name": "agent-capabilities",
    "description": "Reusable agent skills and plugins for coding workflows",
    "owner": {
      "name": "Krishnaswamy Subramanian",
      "email": "jskswamy@gmail.com"
    }
  },
  "plugins": [
    {
      "name": "codebase",
      "version": "0.1.4",
      "description": "Intelligent codebase exploration powered by codebase-memory-mcp.",
      "category": "code-intelligence",
      "tags": ["codebase", "semantic-search", "impact-analysis"],
      "skills": ["codebase-explore"],
      "commands": [
        "codebase/ask.md",
        "codebase/graph.md",
        "codebase/impact.md",
        "codebase/index.md"
      ],
      "hooks": [
        "codebase/hooks.json",
        "codebase/pretooluse-grep.sh"
      ],
      "harnesses": {
        "claude-code": { "enabled": true },
        "pi": {
          "enabled": true,
          "extensions": ["codebase.ts"]
        }
      }
    }
  ]
}
```

The registry becomes the single place to update plugin names, descriptions, categories, tags, versions, and resource membership.

## Build Script Design

`scripts/build.mjs` generates committed harness wrappers from canonical resources.

### Inputs

- `registry.json`
- `skills/`
- `commands/`
- `agents/`
- `hooks/`
- `templates/`
- harness adapter source under `harnesses/`
- existing per-plugin README files if retained as canonical docs

### Outputs

- `.claude-plugin/marketplace.json`
- `plugins/<plugin-name>/.claude-plugin/plugin.json`
- copied `plugins/<plugin-name>/skills/*`
- copied `plugins/<plugin-name>/commands/*`
- copied `plugins/<plugin-name>/agents/*`
- copied `plugins/<plugin-name>/hooks/*`
- copied plugin-specific auxiliary directories such as `styles/` or templates when declared
- updated `package.json` `pi` field, if not maintained manually

### Generation Rules

- Clean generated subdirectories before copying.
- Preserve executable file mode where possible, but skill prose should invoke scripts through interpreters (`bash script.sh`, `node script.js`) because some harness package caches strip executable bits.
- Add generated markers to files where the format permits it.
- Never copy unrelated harness files into another harness payload.
- Fail if registry entries reference missing resources.
- Fail if a skill directory lacks `SKILL.md` or invalid required frontmatter.

## Claude Code Compatibility

Claude Code remains a standard multi-plugin marketplace.

Root marketplace:

```text
.claude-plugin/marketplace.json
```

Generated entries look like:

```json
{
  "name": "codebase",
  "description": "Intelligent codebase exploration powered by codebase-memory-mcp.",
  "version": "0.1.4",
  "source": "./plugins/codebase",
  "category": "code-intelligence",
  "tags": ["codebase", "semantic-search", "impact-analysis"]
}
```

Each plugin wrapper contains its own Claude plugin manifest:

```text
plugins/codebase/.claude-plugin/plugin.json
```

Claude can install from git because `plugins/` and `.claude-plugin/` are committed generated outputs.

## Pi Compatibility

Pi should install from the repository root through package metadata in `package.json`:

```json
{
  "keywords": ["pi-package"],
  "pi": {
    "skills": ["./skills"],
    "extensions": ["./harnesses/pi/extensions"]
  }
}
```

Pi loads all canonical skills directly from `skills/`. Pi-specific behavior lives in TypeScript extensions under `harnesses/pi/extensions/`.

If plugin-specific Pi enablement is needed later, the registry can declare extension membership, and `build.mjs` or `validate.mjs` can ensure declared extension files exist.

## Future Harness Compatibility

### Codex

Codex support should be added as a harness adapter after verifying its current manifest capabilities. If Codex only supports a single recursive `skills` path, the build can generate a Codex-specific promoted-skill payload under `dist/codex/` or a release branch/repository. Do not depend on symlinks.

### OpenCode

OpenCode support likely needs a JavaScript plugin entrypoint. The adapter can load canonical `skills/` and inject any bootstrap/tool mapping required by OpenCode. Package from root or a generated output depending on current OpenCode install behavior.

### Gemini-style Harnesses

Gemini-like harnesses often use an always-loaded context file. The adapter should generate or maintain a harness-declared context file that includes the relevant bootstrap and tool mapping, not edit user-owned global configuration.

## Release Engineering

The release model is git-tree-first for git-based harnesses:

- Canonical root resources are committed.
- Generated Claude wrappers are committed.
- `dist/` may exist for archives but is not required for Claude or Pi git installs.
- CI validates that generated wrappers are current.

Recommended flow:

```bash
npm run build
npm run validate
git diff --exit-code
# update changelog/version as appropriate
git tag vX.Y.Z
git push --follow-tags
```

Claude Code official marketplace updates, if used, require moving the official marketplace source SHA. A GitHub tag alone does not update installed Claude users unless the marketplace pin moves.

Pi users can install from git tags or npm if published:

```bash
pi install git:github.com/jskswamy/agent-capabilities@vX.Y.Z
```

## Validation and CI

Add validation commands:

```bash
npm run build
npm run validate
git diff --exit-code
```

Validation should check:

- `registry.json` schema validity.
- Every declared resource exists.
- Every declared skill has valid Agent Skills frontmatter.
- Generated `.claude-plugin/marketplace.json` matches registry metadata.
- Generated plugin manifests match registry metadata.
- Generated copied resources match canonical resources.
- `package.json` `pi` paths exist.
- No generated wrapper references missing files.

## Migration Strategy

Migrate incrementally by plugin to reduce risk.

1. Add `registry.json` with entries matching the current marketplace.
2. Add build/validate scripts without changing behavior.
3. Move or copy one plugin's reusable resources to canonical root directories.
4. Generate that plugin's Claude wrapper under `plugins/<name>/`.
5. Validate the generated wrapper matches current Claude behavior.
6. Repeat for remaining plugins.
7. Add Pi root package metadata and minimal Pi extensions where useful.
8. Update README/install docs to describe Claude and Pi separately.

During migration, existing plugin paths can remain until their resources have canonical equivalents and generated wrappers pass validation.

## Risks and Mitigations

### Risk: Generated wrappers drift from canonical resources

Mitigation: CI runs build and fails on `git diff --exit-code`.

### Risk: Generated files are manually edited

Mitigation: generated markers and validation that compares copied files against canonical sources.

### Risk: Harness installers strip symlinks or executable bits

Mitigation: copy files instead of symlinking; invoke scripts through interpreters in skill instructions.

### Risk: Claude Code install behavior changes

Mitigation: keep using the documented multi-plugin marketplace shape and validate with Claude plugin tooling when available.

### Risk: Pi loads too many skills

Mitigation: initially Pi loads all canonical promoted skills. If private/draft skills are needed later, keep them outside root `skills/` or add package filtering documentation.

## Open Decisions

- Final repository name: `agent-capabilities`, `coding-agent-capabilities`, or another name.
- Whether plugin README files are canonical under a docs directory or maintained/generated under `plugins/<name>/README.md`.
- Whether to use one repo-wide version plus per-plugin versions, or continue per-plugin versions only.
- Whether generated Claude wrappers should include all resources by copy from day one or only skills first, then commands/hooks/agents.

## Acceptance Criteria

- The repo has canonical root resource directories for shared agent behavior.
- `registry.json` can describe all current Claude plugins.
- `npm run build` regenerates `.claude-plugin/marketplace.json` and `plugins/<plugin-name>/` wrappers.
- `npm run validate` detects stale generated wrappers and missing resources.
- Claude Code can still install each plugin from the repo marketplace.
- Pi can discover canonical skills from root package metadata.
- No skill body is manually duplicated across harnesses.
