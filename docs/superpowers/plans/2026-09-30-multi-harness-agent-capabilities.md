# Multi-Harness Agent Capabilities Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the repo into a multi-harness agent capabilities repository with canonical resource directories, generated committed Claude Code marketplace wrappers, and root Pi package metadata.

**Architecture:** Root resource directories (`skills/`, `commands/`, `agents/`, `hooks/`, `templates/`, `shared-scripts/`) become the canonical source. `registry.json` declares plugin metadata and resource membership. Node build/validation scripts generate `.claude-plugin/marketplace.json` and `plugins/<name>/` Claude wrappers by copying canonical resources, while Pi loads root `skills/` directly through `package.json` metadata.

**Tech Stack:** Node.js ES modules using only built-in modules, npm scripts, JSON registry files, Agent Skills `SKILL.md` directories, Claude Code plugin manifests, Pi `package.json` metadata.

**Spec:** `docs/superpowers/specs/2026-09-30-multi-harness-agent-capabilities-design.md`

## Global Constraints

- Do not rely on GitHub Release assets for Claude Code plugin installation.
- Do not require harness installers to run build scripts.
- Do not manually duplicate canonical skill text across harnesses.
- Use copy-based generated wrappers, not symlinks.
- Keep generated Claude Code wrappers committed because Claude installs from a git tree.
- Pi should load canonical root `skills/` directly through `package.json` metadata.
- Use interpreter-prefixed script invocations in skill prose when touching script instructions.
- Use Node built-ins only for build and validation scripts unless a later task explicitly adds a dependency.

## Review Focus

- Registry references a missing resource path: validation must fail with the plugin name, resource type, and missing path.
- A canonical skill lacks `SKILL.md`, `name`, or `description`: validation must fail before generating wrappers.
- Generated wrappers drift from canonical resources: `npm run validate` must detect stale generated output.
- Claude marketplace compatibility: generated `.claude-plugin/marketplace.json` must preserve plugin names, versions, descriptions, source paths, categories, tags, and author metadata from the registry.
- Pi package compatibility: `package.json` `pi.skills` and `pi.extensions` entries must point to existing committed paths.

---

## File Structure

Create or modify these files and directories:

```text
package.json                              # npm scripts and Pi package metadata
registry.json                             # canonical plugin registry
scripts/build.mjs                         # build entrypoint
scripts/validate.mjs                      # validation entrypoint
scripts/lib/registry.mjs                  # load/validate registry schema and resources
scripts/lib/fs-utils.mjs                  # copy/remove/hash helpers
scripts/lib/claude-code.mjs               # generate Claude marketplace and plugin wrappers
scripts/lib/pi-package.mjs                # validate/update package.json pi metadata
tests/build/registry.test.mjs             # registry unit tests
tests/build/claude-code.test.mjs          # Claude generation tests with temp fixtures
tests/build/pi-package.test.mjs           # Pi metadata tests
skills/                                   # canonical skills moved from plugins/*/skills
commands/                                 # canonical commands moved from plugins/*/commands
agents/                                   # canonical agents moved from plugins/*/agents
hooks/                                    # canonical hooks moved from plugins/*/hooks
templates/                                # canonical templates moved from plugins/*/templates
shared-scripts/                           # canonical plugin helper scripts where not skill-local
harnesses/pi/extensions/.gitkeep          # existing path for Pi extension loading
harnesses/pi/README.md                    # Pi install notes
.claude-plugin/marketplace.json           # generated, committed
plugins/<plugin-name>/                    # generated Claude wrappers, committed
```

`plugins/<plugin-name>/README.md` remains committed as part of the Claude wrapper. During this refactor, copy existing README files into the generated wrapper instead of moving them to a separate docs source. A later cleanup can make README generation more sophisticated.

## Registry Shape

`registry.json` must have this shape:

```json
{
  "marketplace": {
    "name": "jskswamy-plugins",
    "description": "A curated collection of reusable agent skills and plugins",
    "owner": {
      "name": "Krishnaswamy Subramanian",
      "email": "jskswamy@gmail.com"
    }
  },
  "plugins": [
    {
      "name": "codebase",
      "version": "0.1.4",
      "description": "Intelligent codebase exploration powered by codebase-memory-mcp. Natural language queries, change impact analysis, symbol graph traversal, and automatic brainstorming/planning integration.",
      "author": { "name": "Krishnaswamy Subramanian" },
      "category": "code-intelligence",
      "tags": ["codebase", "exploration", "semantic-search"],
      "resources": {
        "skills": ["codebase-explore"],
        "commands": ["codebase/ask.md"],
        "agents": [],
        "hooks": ["codebase/hooks.json"],
        "templates": [],
        "extra": []
      },
      "harnesses": {
        "claude-code": { "enabled": true },
        "pi": { "enabled": true }
      }
    }
  ]
}
```

All existing marketplace plugins must be represented: `codebase`, `commit-tools`, `craft`, `devenv`, `guardrails`, `jot`, `refactor`, `sketch-note`, `study`, and `typst-notes`.

### Task 1: Add registry, package scripts, and registry validation

**Files:**
- Create: `package.json`
- Create: `registry.json`
- Create: `scripts/lib/registry.mjs`
- Create: `tests/build/registry.test.mjs`
- Modify: `.gitignore` only if needed to keep temporary test output ignored

**Interfaces:**
- Produces: `loadRegistry(registryPath: string) -> Promise<Registry>` in `scripts/lib/registry.mjs`
- Produces: `validateRegistryShape(registry: Registry) -> string[]` in `scripts/lib/registry.mjs`, returning human-readable error strings
- Produces: npm scripts `build`, `validate`, and `test`
- Consumes: Existing `.claude-plugin/marketplace.json` values for initial registry metadata

- [ ] **Step 1: Write failing registry tests**

Create `tests/build/registry.test.mjs` using `node:test` and `node:assert/strict` with these tests:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { validateRegistryShape } from "../../scripts/lib/registry.mjs";

test("validateRegistryShape accepts a minimal valid registry", () => {
  const errors = validateRegistryShape({
    marketplace: {
      name: "agent-capabilities",
      description: "Reusable agent capabilities",
      owner: { name: "Owner", email: "owner@example.com" }
    },
    plugins: [{
      name: "codebase",
      version: "0.1.0",
      description: "Codebase plugin",
      author: { name: "Owner" },
      category: "code-intelligence",
      tags: ["codebase"],
      resources: { skills: ["codebase-explore"], commands: [], agents: [], hooks: [], templates: [], extra: [] },
      harnesses: { "claude-code": { enabled: true }, pi: { enabled: true } }
    }]
  });
  assert.deepEqual(errors, []);
});

test("validateRegistryShape reports duplicate plugin names", () => {
  const registry = {
    marketplace: { name: "x", description: "x", owner: { name: "x" } },
    plugins: [
      { name: "dup", version: "1.0.0", description: "x", resources: {}, harnesses: {} },
      { name: "dup", version: "1.0.0", description: "x", resources: {}, harnesses: {} }
    ]
  };
  assert.match(validateRegistryShape(registry).join("\n"), /duplicate plugin name: dup/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/build/registry.test.mjs`

Expected: FAIL because `scripts/lib/registry.mjs` does not exist.

- [ ] **Step 3: Implement registry module**

Create `scripts/lib/registry.mjs` with:

```js
export async function loadRegistry(registryPath) { /* read JSON and return object */ }
export function validateRegistryShape(registry) { /* return array of strings */ }
```

Validation must check:

- `marketplace.name` is a non-empty string.
- `marketplace.description` is a non-empty string.
- `plugins` is a non-empty array.
- Every plugin has non-empty `name`, `version`, and `description` strings.
- Plugin names are unique.
- `resources` exists and each of `skills`, `commands`, `agents`, `hooks`, `templates`, and `extra` is an array; missing arrays are treated as empty by normalization but reported by validation for now.

- [ ] **Step 4: Create `package.json`**

Create root `package.json`:

```json
{
  "name": "agent-capabilities",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "description": "Reusable agent skills and plugins for coding workflows",
  "keywords": ["pi-package", "agent-skills", "claude-code", "coding-agents"],
  "scripts": {
    "build": "node scripts/build.mjs",
    "validate": "node scripts/validate.mjs",
    "test": "node --test tests/**/*.test.mjs"
  },
  "pi": {
    "skills": ["./skills"],
    "extensions": ["./harnesses/pi/extensions"]
  }
}
```

- [ ] **Step 5: Create initial `registry.json`**

Populate `registry.json` from current `.claude-plugin/marketplace.json`, preserving each plugin's `name`, `description`, `version`, `author`, `category`, and `tags`. Add empty resource arrays for this task. Resource membership is filled in Task 3.

- [ ] **Step 6: Run registry tests**

Run: `npm test -- tests/build/registry.test.mjs`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add package.json registry.json scripts/lib/registry.mjs tests/build/registry.test.mjs
git commit -m "build: add plugin registry validation"
```

### Task 2: Add Claude wrapper generator and tests

**Files:**
- Create: `scripts/lib/fs-utils.mjs`
- Create: `scripts/lib/claude-code.mjs`
- Create: `scripts/build.mjs`
- Create: `tests/build/claude-code.test.mjs`

**Interfaces:**
- Consumes: `loadRegistry()` and validated registry from Task 1
- Produces: `generateClaudeCode({ repoRoot: string, registry: Registry }) -> Promise<void>`
- Produces: `copyResourceTree({ from: string, to: string }) -> Promise<void>`
- Produces: `removeDir(path: string) -> Promise<void>`

- [ ] **Step 1: Write failing Claude generation tests**

Create `tests/build/claude-code.test.mjs` using a temp directory fixture. The fixture should include:

```text
skills/codebase-explore/SKILL.md
commands/codebase/ask.md
hooks/codebase/hooks.json
```

Use a test registry with one plugin named `codebase`. Assert after `generateClaudeCode()`:

- `.claude-plugin/marketplace.json` exists.
- Marketplace plugin source is `./plugins/codebase`.
- `plugins/codebase/.claude-plugin/plugin.json` exists.
- `plugins/codebase/skills/codebase-explore/SKILL.md` matches the canonical skill file.
- `plugins/codebase/commands/ask.md` matches `commands/codebase/ask.md`.
- `plugins/codebase/hooks/hooks.json` matches `hooks/codebase/hooks.json`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/build/claude-code.test.mjs`

Expected: FAIL because `scripts/lib/claude-code.mjs` does not exist.

- [ ] **Step 3: Implement filesystem helpers**

Create `scripts/lib/fs-utils.mjs` with:

```js
export async function removeDir(path) { /* rm -rf if exists */ }
export async function ensureDir(path) { /* mkdir -p */ }
export async function copyResourceTree({ from, to }) { /* recursive copy preserving mode */ }
export async function readJson(path) { /* parse JSON */ }
export async function writeJson(path, value) { /* 2-space JSON + trailing newline */ }
```

Use `node:fs/promises`, `node:path`, and no external dependencies.

- [ ] **Step 4: Implement Claude generator**

Create `scripts/lib/claude-code.mjs` with:

```js
export async function generateClaudeCode({ repoRoot, registry }) { /* writes marketplace and wrappers */ }
```

Generation rules:

- Write root `.claude-plugin/marketplace.json` from `registry.marketplace`.
- Include only plugins where `harnesses["claude-code"].enabled !== false`.
- Set each marketplace `source` to `./plugins/<name>`.
- Clean generated subdirectories in `plugins/<name>` before copying: `.claude-plugin`, `skills`, `commands`, `agents`, `hooks`, `templates`.
- Generate `plugins/<name>/.claude-plugin/plugin.json` with `name`, `description`, `version`, `author`, `category`, `tags`, and resource declarations where Claude supports them. If unsure for a field, preserve the current plugin manifest shape by copying metadata keys already present in the current plugin's manifest during migration.
- Copy command files from `commands/<group>/<file>` into `plugins/<name>/commands/<file>`.
- Copy skill directories from `skills/<skill-name>` into `plugins/<name>/skills/<skill-name>`.
- Copy agent files preserving the basename under `plugins/<name>/agents/`.
- Copy hook files preserving paths relative to `hooks/<plugin-name>/` under `plugins/<name>/hooks/`.
- Copy template and extra resources preserving their declared relative paths.

- [ ] **Step 5: Implement build entrypoint**

Create `scripts/build.mjs` to:

1. Load `registry.json`.
2. Run shape validation and exit non-zero on errors.
3. Call `generateClaudeCode({ repoRoot, registry })`.
4. Print `Generated Claude Code marketplace wrappers` on success.

- [ ] **Step 6: Run Claude generation tests**

Run: `npm test -- tests/build/claude-code.test.mjs`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add scripts/build.mjs scripts/lib/fs-utils.mjs scripts/lib/claude-code.mjs tests/build/claude-code.test.mjs
git commit -m "build: generate Claude Code plugin wrappers"
```

### Task 3: Migrate existing plugin resources to canonical root directories

**Files:**
- Create/modify: `skills/**`
- Create/modify: `commands/**`
- Create/modify: `agents/**`
- Create/modify: `hooks/**`
- Create/modify: `templates/**`
- Create/modify: `shared-scripts/**` if needed
- Modify: `registry.json`
- Regenerate: `.claude-plugin/marketplace.json`
- Regenerate: `plugins/**`

**Interfaces:**
- Consumes: `generateClaudeCode()` from Task 2
- Produces: canonical root resource directories for all current plugins
- Produces: complete `registry.json` resource membership

- [ ] **Step 1: Write failing validation expectation as a temporary test**

Extend `tests/build/registry.test.mjs` with a test named `registry lists all current marketplace plugins`. It should load `registry.json` and assert that plugin names are exactly:

```js
[
  "codebase",
  "commit-tools",
  "craft",
  "devenv",
  "guardrails",
  "jot",
  "refactor",
  "sketch-note",
  "study",
  "typst-notes"
]
```

- [ ] **Step 2: Move skills to canonical `skills/`**

For each existing `plugins/<plugin>/skills/<skill-name>/`, move or copy the directory to `skills/<skill-name>/`.

If two plugins contain the same skill name, stop and rename one canonical skill in `registry.json` before continuing. Do not overwrite skill directories.

Expected examples:

```text
plugins/codebase/skills/explore        -> skills/codebase-explore
plugins/commit-tools/skills/commit-action -> skills/commit-action
plugins/devenv/skills/devenv           -> skills/devenv
plugins/guardrails/skills/ide-handoff  -> skills/ide-handoff
plugins/refactor/skills/scan           -> skills/refactor-scan
```

Use descriptive names where current names are too generic (`explore`, `scan`) so root skill names remain globally unique.

- [ ] **Step 3: Update moved skill frontmatter names if renamed**

For each renamed skill directory, update `SKILL.md` frontmatter `name` to match the new canonical name. Ensure names use lowercase letters, numbers, and hyphens only.

- [ ] **Step 4: Move commands to canonical `commands/<plugin>/`**

For each `plugins/<plugin>/commands/*.md`, move or copy to `commands/<plugin>/*.md` with the same basename.

- [ ] **Step 5: Move agents to canonical `agents/<plugin>/`**

For each `plugins/<plugin>/agents/*.md`, move or copy to `agents/<plugin>/*.md` with the same basename.

- [ ] **Step 6: Move hooks to canonical `hooks/<plugin>/`**

For each `plugins/<plugin>/hooks/**`, move or copy to `hooks/<plugin>/**` preserving paths below `hooks/`.

- [ ] **Step 7: Move templates and styles to canonical locations**

Move plugin template directories to `templates/<plugin>/...`.

Move plugin style directories to `templates/<plugin>/styles/...` unless the style files are command-specific. Declare these paths in each plugin's `resources.extra` array so the Claude wrapper receives them at its existing location.

- [ ] **Step 8: Populate `registry.json` resources**

For every plugin, fill `resources` arrays with canonical paths. Use these conventions:

- `skills`: skill directory names under root `skills/`.
- `commands`: paths relative to root `commands/`.
- `agents`: paths relative to root `agents/`.
- `hooks`: paths relative to root `hooks/`.
- `templates`: paths relative to root `templates/`.
- `extra`: objects only if needed to copy a canonical path to a non-standard Claude wrapper destination.

- [ ] **Step 9: Run build**

Run: `npm run build`

Expected: `.claude-plugin/marketplace.json` and `plugins/**` are regenerated without missing resource errors.

- [ ] **Step 10: Run registry tests**

Run: `npm test -- tests/build/registry.test.mjs`

Expected: PASS.

- [ ] **Step 11: Manually inspect a generated wrapper**

Run:

```bash
find plugins/codebase -maxdepth 3 -type f | sort
find plugins/commit-tools -maxdepth 3 -type f | sort
```

Expected: Each wrapper contains the same install-facing files as before, generated from canonical roots.

- [ ] **Step 12: Commit**

```bash
git add registry.json skills commands agents hooks templates shared-scripts .claude-plugin plugins tests/build/registry.test.mjs
git commit -m "refactor: move plugin resources to canonical roots"
```

### Task 4: Add validation for resources, generated drift, and Pi package metadata

**Files:**
- Create: `scripts/validate.mjs`
- Create: `scripts/lib/pi-package.mjs`
- Create: `tests/build/pi-package.test.mjs`
- Modify: `scripts/lib/registry.mjs`
- Modify: `package.json`
- Create: `harnesses/pi/extensions/.gitkeep`
- Create: `harnesses/pi/README.md`

**Interfaces:**
- Produces: `validateRegistryResources({ repoRoot: string, registry: Registry }) -> Promise<string[]>`
- Produces: `validatePiPackage({ repoRoot: string, packageJson: object }) -> string[] | Promise<string[]>`
- Produces: `npm run validate` that exits non-zero on any validation error

- [ ] **Step 1: Write failing resource validation tests**

Extend `tests/build/registry.test.mjs` with tests for `validateRegistryResources()`:

- A missing command path reports `codebase commands missing: commands/codebase/ask.md`.
- A skill directory without `SKILL.md` reports `codebase skills missing SKILL.md: skills/codebase-explore`.
- A skill `SKILL.md` without `description` reports `codebase skill invalid frontmatter: skills/codebase-explore/SKILL.md`.

- [ ] **Step 2: Write failing Pi package tests**

Create `tests/build/pi-package.test.mjs` asserting:

- A package with `pi.skills: ["./skills"]` and `pi.extensions: ["./harnesses/pi/extensions"]` passes when both paths exist.
- A package with `pi.skills: ["./missing"]` fails with `pi.skills path does not exist: ./missing`.

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- tests/build/registry.test.mjs tests/build/pi-package.test.mjs`

Expected: FAIL because validation functions are missing.

- [ ] **Step 4: Implement resource validation**

In `scripts/lib/registry.mjs`, add:

```js
export async function validateRegistryResources({ repoRoot, registry }) { /* return errors */ }
```

Validation must check all resource arrays in the Review Focus section.

Frontmatter parsing can be simple: a `SKILL.md` is valid when it starts with `---`, has a closing `---`, and the frontmatter contains non-empty `name:` and `description:` lines.

- [ ] **Step 5: Implement Pi validation**

Create `scripts/lib/pi-package.mjs` with:

```js
export async function validatePiPackage({ repoRoot, packageJson }) { /* return errors */ }
```

Check that `packageJson.pi.skills` and `packageJson.pi.extensions`, when present, are arrays of paths that exist relative to `repoRoot`.

- [ ] **Step 6: Create Pi harness docs and extension directory**

Create `harnesses/pi/extensions/.gitkeep`.

Create `harnesses/pi/README.md` documenting:

```bash
pi install git:github.com/jskswamy/agent-capabilities@<tag>
```

Also document local development:

```bash
pi -e .
```

- [ ] **Step 7: Implement validation entrypoint**

Create `scripts/validate.mjs` to:

1. Load `registry.json`.
2. Run registry shape validation.
3. Run registry resource validation.
4. Load `package.json`.
5. Run Pi package validation.
6. Run `generateClaudeCode()` in a temporary directory copied from the repo or compare generated files in place after `npm run build`.
7. Print every error and exit `1` if any exist.

For drift detection, use this rule in the first version: `npm run validate` assumes `npm run build` has been run and compares canonical resource files to generated wrapper copies for every registry entry.

- [ ] **Step 8: Run tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 9: Run validation**

Run: `npm run validate`

Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add scripts/validate.mjs scripts/lib/pi-package.mjs scripts/lib/registry.mjs tests/build/registry.test.mjs tests/build/pi-package.test.mjs package.json harnesses/pi
git commit -m "build: validate resources and Pi package metadata"
```

### Task 5: Update documentation and release workflow notes

**Files:**
- Modify: `README.md`
- Modify: `CLAUDE.md`
- Create: `docs/authoring-skills.md`
- Create: `docs/releasing.md`
- Modify: `CONTRIBUTING.md` if it has plugin authoring instructions

**Interfaces:**
- Consumes: final structure and commands from Tasks 1-4
- Produces: human-facing documentation for adding skills/plugins and releasing wrappers

- [ ] **Step 1: Update README introduction**

Change README from Claude-only language to multi-harness language:

- The repo contains reusable agent capabilities.
- Claude Code is distributed as a multi-plugin marketplace.
- Pi loads canonical root skills through package metadata.
- Canonical resources live at root; `plugins/` is generated Claude packaging.

- [ ] **Step 2: Update installation docs**

Document Claude Code install:

```text
/plugin marketplace add jskswamy/agent-capabilities
/plugin install <plugin-name>@agent-capabilities
```

If the repository has not been renamed yet, keep the current install command and add a note that the marketplace name will change on repository rename.

Document Pi install:

```bash
pi install git:github.com/jskswamy/agent-capabilities@<tag>
```

- [ ] **Step 3: Add authoring guide**

Create `docs/authoring-skills.md` explaining:

- Add reusable skill content under `skills/<name>/SKILL.md`.
- Add command markdown under `commands/<plugin>/`.
- Add agents under `agents/<plugin>/`.
- Register resources in `registry.json`.
- Run `npm run build && npm run validate && npm test`.
- Do not edit generated `plugins/<name>/` resources directly.

- [ ] **Step 4: Add release guide**

Create `docs/releasing.md` explaining:

```bash
npm run build
npm run validate
npm test
git diff --exit-code
git tag vX.Y.Z
git push --follow-tags
```

Also explain that Claude official marketplace updates require moving the marketplace's pinned source SHA; tags alone are not enough for official marketplace users.

- [ ] **Step 5: Update CLAUDE.md**

Update repository guidance so future agents know:

- `registry.json` is the metadata source of truth.
- `skills/`, `commands/`, `agents/`, `hooks/`, `templates/` are canonical.
- `plugins/` is generated Claude packaging and must be regenerated with `npm run build`.
- Use `npm run validate` before committing structural changes.

- [ ] **Step 6: Run documentation checks**

Run:

```bash
npm run build
npm run validate
npm test
```

Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add README.md CLAUDE.md CONTRIBUTING.md docs/authoring-skills.md docs/releasing.md harnesses/pi/README.md
git commit -m "docs: document multi-harness authoring and release flow"
```

### Task 6: Final compatibility verification and cleanup

**Files:**
- Modify only files needed to fix verification failures
- Potentially modify: `.gitignore`
- Potentially modify: `registry.json`
- Potentially modify: generated wrappers under `plugins/`

**Interfaces:**
- Consumes: all previous tasks
- Produces: verified build, tests, and install-facing tree

- [ ] **Step 1: Run full build and tests**

Run:

```bash
npm run build
npm run validate
npm test
```

Expected: all PASS.

- [ ] **Step 2: Check generated output is committed-clean**

Run:

```bash
git status --short
npm run build
git diff --exit-code -- .claude-plugin plugins
```

Expected: no diff for `.claude-plugin` or `plugins` after rebuilding.

- [ ] **Step 3: Validate Claude marketplace shape manually**

Run:

```bash
node -e 'const m=require("./.claude-plugin/marketplace.json"); console.log(m.plugins.map(p=>`${p.name}:${p.source}`).join("\n"))'
```

Expected: every source is `./plugins/<plugin-name>` and every source directory exists.

If Claude Code plugin validation tooling is available locally, also run:

```bash
claude plugin validate ./plugins/codebase --strict
```

Expected: PASS. If unavailable, record that it was skipped because the command is not installed.

- [ ] **Step 4: Validate Pi package shape manually**

Run:

```bash
node -e 'const p=require("./package.json"); console.log(JSON.stringify(p.pi,null,2))'
```

Expected: `skills` includes `./skills`; `extensions` includes `./harnesses/pi/extensions`; both paths exist.

If Pi local package testing is safe in the environment, run:

```bash
pi -e . --version
```

Expected: Pi starts or prints version without package load errors. If unavailable or interactive-only, record that it was skipped.

- [ ] **Step 5: Remove obsolete migration leftovers**

Search for source-of-truth copies that should no longer exist outside canonical roots and generated wrappers:

```bash
find plugins -path '*/skills/*/SKILL.md' -print
find skills -name SKILL.md -print
```

Expected: `plugins/**/skills/**` exists only as generated wrapper copies; root `skills/**` contains canonical copies.

- [ ] **Step 6: Commit final fixes**

If Step 1-5 changed files:

```bash
git add .
git commit -m "chore: verify multi-harness generated wrappers"
```

If no files changed, skip this commit.

- [ ] **Step 7: Close implementation issue**

After implementation is complete and verified, close the beads issue linked to this plan:

```bash
bd close claude-plugins-4s6 --reason "Completed multi-harness design and implementation planning"
```

If implementation is deferred, leave the issue open and create child implementation issues from this plan instead.
