# Releasing

This repository is git-tree-first for harnesses that install directly from git.
Generated Claude Code wrappers are committed because Claude Code installs from
the repository tree and does not run this repository's build script during
install.

## Preconditions

Start from a clean, up-to-date `main` branch:

```bash
git checkout main
git pull --ff-only origin main
git status --short
```

Run the standard checks before release work:

```bash
npm run build
npm run validate
npm test
git diff --exit-code -- .claude-plugin plugins
```

A diff under `.claude-plugin` or `plugins` means the committed Claude install
tree is stale. Either commit intentional generated changes before release or
fix the canonical source that caused the drift.

## Decide the Version

Find the latest release tag:

```bash
git describe --tags --abbrev=0
```

Use a patch bump for compatible fixes and documentation updates, a minor bump
for new user-facing capabilities, and a major bump for breaking changes.

Tags use `vX.Y.Z` format.

## Bump Changed Plugins

Plugin versions live in `registry.json` and are emitted to:

- `.claude-plugin/marketplace.json`
- `plugins/<plugin-name>/.claude-plugin/plugin.json`

Identify changed plugins since the last tag:

```bash
git diff --name-only <last-tag>..HEAD
```

Any changed path under `plugins/<plugin-name>/` means that plugin should be
considered for a version bump. Canonical root changes should be mapped to the
plugin that includes them through `registry.json`.

Update the relevant plugin versions in `registry.json`.

## Regenerate Wrappers

After editing `registry.json`, regenerate Claude Code marketplace output:

```bash
npm run build
```

Verify the versions are synced:

```bash
jq -r '.plugins[] | [.name,.version] | @tsv' registry.json
jq -r '.plugins[] | [.name,.version] | @tsv' .claude-plugin/marketplace.json
jq -r .version plugins/<plugin-name>/.claude-plugin/plugin.json
```

## Commit Version Bumps

Stage version metadata:

```bash
git add registry.json .claude-plugin/marketplace.json plugins/*/.claude-plugin/plugin.json
```

Commit with the commit workflow used by this repo. Subject format:

```text
Release vX.Y.Z
```

The body should list plugin version bumps.

## Generate Changelog and README

Generate the changelog:

```bash
nix develop --command git cliff --tag vX.Y.Z -o CHANGELOG.md
```

Regenerate README if marketplace/plugin metadata changed, or if README content
is part of the release:

```bash
nix develop --command ./scripts/update-readme.sh
```

Inspect the generated diff before committing.

### If git-cliff GitHub metadata fails

If `git cliff` fails while fetching GitHub metadata, generate the changelog
with a temporary config that omits the `[remote.github]` section:

```bash
awk 'BEGIN{skip=0} /^\[remote\.github\]/{skip=1} skip==0{print}' cliff.toml > /tmp/cliff-no-remote.toml
nix develop --command git cliff -c /tmp/cliff-no-remote.toml --tag vX.Y.Z -o CHANGELOG.md
```

## Commit Docs

Stage release docs:

```bash
git add CHANGELOG.md README.md
```

Commit with subject:

```text
Update CHANGELOG and README for vX.Y.Z
```

If README did not change, commit only `CHANGELOG.md` with a subject that names
the changelog update.

## Tag and Push

Create an annotated tag:

```bash
git tag -a vX.Y.Z -m "Release vX.Y.Z"
```

Run final checks:

```bash
npm run validate
npm test
git status --short
```

Push `main` and the tag:

```bash
git push origin main
git push origin vX.Y.Z
```

Pi users can install the stable tag:

```bash
pi install git:github.com/jskswamy/skills@vX.Y.Z
```

## Recovery

If release fails before any commit, restore the modified files and retry:

```bash
git restore registry.json .claude-plugin plugins CHANGELOG.md README.md
```

If one or more release commits were created but should be abandoned:

```bash
git reset --hard HEAD~<N>
```

If a tag was created but should be abandoned:

```bash
git tag -d vX.Y.Z
```

If a bad tag was already pushed, coordinate before deleting or replacing it.
Tags are user-facing install targets.
