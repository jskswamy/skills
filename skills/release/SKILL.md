---
name: release
description: Release this repo with per-plugin version bumping (registry.json), changelog generation via git-cliff, and git tagging. Use when asked to "release", "cut a release", "prepare a release", or "/release" in this repository.
---

# Release Skill

Release this repo with version bumping, changelog generation via git-cliff, and git tagging. Harness-neutral: works the same whether invoked from Claude Code, Pi, or any other agent operating in this repository — it only relies on `git`, `node`, `jq`, and this repo's own `npm run` scripts, never on a harness-specific tool.

**Philosophy:** One tag = one snapshot of all plugins, across every harness. `registry.json` is the single source of truth for plugin metadata and versions; `.claude-plugin/marketplace.json`, `.agents/plugins/marketplace.json`, and everything under `dist/` are generated from it by `npm run build:release` and must never be hand-edited. There is no marketplace-wide version field — the git tag (`vX.Y.Z`) is the only repo-wide version marker, read from tag history, not from a file.

## Argument Parsing

Parse arguments to extract:

| Argument | Short | Type | Default | Description |
|----------|-------|------|---------|-------------|
| `--bump` | `-b` | enum | `patch` | Version bump type: `major`, `minor`, or `patch` |
| `--dry-run` | `-n` | boolean | `false` | Preview changes without committing or tagging |

**Examples:**
```
release                     # patch bump
release --bump minor        # minor version bump
release -b major            # major release
release --dry-run           # preview changes without committing
release -n -b minor         # dry run with minor bump
```

---

## Execution Flow

### Step 1: Parse Arguments and Validate

1. Parse `--bump`/`-b` (major/minor/patch, default patch) and `--dry-run`/`-n`.

2. **Verify git repository:**
   ```bash
   git rev-parse --git-dir
   ```
   If not a git repo, stop: "Not a git repository. Run this from within a git repository."

3. **Check for uncommitted changes:**
   ```bash
   git status --porcelain
   ```
   If dirty, ask the user whether to proceed anyway (recommended) or cancel to commit first.

### Step 2: Read Current Versions and Bump Changed Plugins

1. **Read registry.json (source of truth):**
   ```bash
   cat registry.json
   ```
   Extract each plugin's `version` from the `plugins` array. Do not read
   `.claude-plugin/marketplace.json` or `dist/` for current versions: those
   are generated output from the previous release.

2. **Detect the last tag:**
   ```bash
   git describe --tags --abbrev=0   # e.g. v2.1.13
   ```

3. **Detect which plugins changed since the last release.**

   Compare built output, not source paths:
   ```bash
   node scripts/changed-plugins.mjs
   ```
   It builds every harness into a temp dir and prints each plugin whose
   output differs from the committed `dist/`, ignoring version fields. That
   covers changes to a plugin's own resources, to its `registry.json`
   metadata, and changes made only to adapters, runtimes or transforms.
   Claude Code caches plugins by version, so every listed plugin needs a bump
   or its users never get the change.

   A listed plugin that is no longer in `registry.json` was removed: there
   is nothing to bump, and `npm run build:release` deletes its `dist/`
   folders.

   A listed plugin that is not in the registry at the last tag
   (`git show <last-tag>:registry.json`) is brand new: its committed version
   (e.g. `0.1.0`) **is** its first release. Do not bump it; bumping would
   imply a prior release that never happened (precedent: `study` was
   introduced at `1.0.0` and was untouched in the very next release commit).

4. **Bump registry.json for each changed, pre-existing plugin:**

   For each non-new plugin with changes, apply the same semver bump type
   (`--bump`) to its `version` field in `registry.json` and write the file:

   ```
   Plugin      Current     New (patch)
   jot         1.6.0       1.6.1       → will bump in registry.json
   ```

   If no plugins changed (e.g. only root-level docs changed), skip this step.

### Step 3: Calculate New Release Tag

1. **Get the current version:** the last git tag (from Step 2.2), e.g.
   `v2.1.13` → `2.1.13`. There is no file-based marketplace version to read.

2. **Apply semver bump:**

   | Current | Bump Type | Result |
   |---------|-----------|--------|
   | 1.2.3   | patch     | 1.2.4  |
   | 1.2.3   | minor     | 1.3.0  |
   | 1.2.3   | major     | 2.0.0  |

3. **Check if tag already exists:**
   ```bash
   git tag -l "v<new-version>"
   ```
   If it exists, ask the user: bump to the next version instead, delete the
   existing tag and reuse it, or cancel.

### Step 4: Confirm Release Plan

Present the plan and ask the user to confirm before proceeding:

```
Release Plan

Tag:                  v1.1.7 → v1.1.8

Plugin versions to bump (registry.json):
  - task-decomposer: 1.3.0 → 1.3.1
  - git-commit: 1.1.1 → 1.1.2

Files to be modified:
  - registry.json
  - .claude-plugin/marketplace.json (generated)
  - .agents/plugins/marketplace.json (generated)
  - dist/ (generated, every harness)
  - CHANGELOG.md
  - README.md
```

Offer to show the changelog preview first (proceed to Step 5, then return
here) before the final go/no-go.

**If `--dry-run`:** show the plan and skip straight to Step 9 (dry-run summary).

### Step 5: Generate Changelog

1. **Check git-cliff is available:**
   ```bash
   command -v git-cliff
   ```
   If missing: tell the user to run `nix develop` to get it, or offer to skip
   the changelog update.

2. **Generate changelog for all changes since the last tag:**
   ```bash
   git cliff --unreleased --exclude-path "CHANGELOG.md" --tag "v<new-version>"
   ```

3. **Show the preview** and ask the user to accept it, edit it, regenerate
   with different options, or skip the changelog update.

### Step 6: Update Version Files

1. **Confirm registry.json is bumped** (done in Step 2.4).

2. **Write every harness's output into the repo:**
   ```bash
   npm run build:release
   ```
   The release is the only step that writes `dist/`,
   `.claude-plugin/marketplace.json`, and `.agents/plugins/marketplace.json`;
   everyday `npm run build` writes to a temp dir. Never hand-edit the generated
   files. Afterwards `node scripts/changed-plugins.mjs` prints nothing.

3. **Validate:**
   ```bash
   npm run validate
   ```
   Confirms registry shape and resource paths are still consistent after the bump.

4. **Write changelog:**
   ```bash
   git cliff --tag "v<new-version>" -o CHANGELOG.md
   ```

5. **Update README documentation:**
   ```bash
   ./scripts/update-readme.sh
   ```

### Step 7: Commit Changes (Two Commits)

Use this repo's own commit workflow for message style consistency — in
Claude Code that's the `commit-tools` plugin's commit skill (`/commit`); in
another harness, use whatever equivalent commit-message convention this repo
documents, or fall back to a plain `git commit -m` with the message shown
below.

#### Commit 1: Version Bumps

1. **Stage version files:**
   ```bash
   git add registry.json .claude-plugin .agents dist
   ```
   Stage `registry.json` (the actual edit) together with the generated
   `.claude-plugin/marketplace.json`, `.agents/plugins/marketplace.json`, and
   `dist/` from `npm run build:release`.

2. **Commit**, message (classic style):
   ```
   Release v1.1.8

   Bump plugin versions: jot 1.6.0 → 1.6.1, git-commit 1.1.1 → 1.1.2.
   Write every harness's output via npm run build:release.
   ```

#### Commit 2: Changelog and README

1. **Stage:**
   ```bash
   git add CHANGELOG.md README.md
   ```

2. **Commit**, message:
   ```
   Update CHANGELOG and README for v1.1.8

   Document all changes included in the v1.1.8 release.
   Regenerate plugins section in README from registry.json.
   ```

**Why two commits:** keeps the docs commit separate from version bumps (it
won't appear in the next release's changelog), makes reverting easier, and
the version-bump commit is meaningful on its own.

### Step 8: Create Git Tag

1. **Create annotated tag:**
   ```bash
   git tag -a "v<new-version>" -m "Release v<new-version>"
   ```

2. **Verify:**
   ```bash
   git tag -l "v<new-version>"
   git show "v<new-version>" --quiet
   ```

### Step 9: Post-Release Summary

**Successful release:**
```
Release Complete!

Tag:          v1.1.8

Commits created:
  abc1234 Release v1.1.8
  def5678 Update CHANGELOG and README for v1.1.8

Files modified:
  - registry.json
  - .claude-plugin/marketplace.json (generated)
  - dist/ (generated, every harness)
  - CHANGELOG.md
  - README.md
```

Ask the user whether to push now (`git push origin main && git push origin
"v<new-version>"`) or leave it for later.

**Dry run:**
```
DRY RUN COMPLETE - No changes were made

Would release: v1.1.8

Plugin versions to bump (registry.json):
  - task-decomposer: 1.3.0 → 1.3.1
  - git-commit: 1.1.1 → 1.1.2

Files that would be modified:
  - registry.json: bump changed plugins' versions
  - .claude-plugin/marketplace.json, .agents/plugins/marketplace.json, dist/: written via npm run build:release
  - CHANGELOG.md: prepend v1.1.8 section
  - README.md: regenerate plugins section

Commits that would be created:
  1. Release v1.1.8
  2. Update CHANGELOG and README for v1.1.8

Tag that would be created:
  v1.1.8
```

---

## Error Handling

- **Not a git repository:** stop with that message.
- **Tag already exists:** report when it was created and offer to bump to
  the next version or delete it first.
- **git-cliff not available:** tell the user to run `nix develop`, or offer
  to skip changelog generation.
- **Commit step failed:** review staged changes (`git status`), commit
  manually, and retry.
- **Mid-release failure:** report which steps completed (version files,
  changelog, tag) and how to recover — typically `git reset --hard HEAD~<N>`
  to undo commits and `git tag -d v<version>` to remove a tag, then retry.

---

## Important Notes

- **registry.json is the source of truth:** Each plugin's version lives there. There is no marketplace-wide version field — the git tag is the only repo-wide version marker.
- **Generated files, never hand-edited:** `.claude-plugin/marketplace.json`, `.agents/plugins/marketplace.json`, and everything under `dist/` are produced by `npm run build:release` from `registry.json` and the sources. Editing them directly will be overwritten by the next release.
- **Harness-agnostic:** `npm run build:release` writes the output of every harness under `dist/`: Claude Code plugins in `dist/claude-code/`, Antigravity plugins in `dist/antigravity/plugins/`, OpenCode packages in `dist/opencode/`, Pi packages in `dist/pi/`, and Codex plugins in `dist/codex/`. Every harness manifest carries each plugin's version, so stage `dist/` with the bump.
- **Auto-bump:** Plugins listed by `node scripts/changed-plugins.mjs` (built output differs from the committed `dist/`, version fields ignored) get their `registry.json` version bumped (same bump type as `--bump`), except brand-new plugins.
- **Two-commit workflow:** version bumps and changelog are always in separate commits.
- **git-cliff required:** changelog generation requires git-cliff (available via `nix develop`).
- **Tag format:** always `v<version>` (e.g., v1.1.8).
- **Dry run is safe:** use `--dry-run` to preview without any modifications.
