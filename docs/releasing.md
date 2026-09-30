# Releasing

This repository is git-tree-first for harnesses that install directly from git. Generated Claude Code wrappers are committed because Claude Code does not run this repository's build script during install.

## Pre-Release Checks

```bash
npm run build
npm run validate
npm test
git diff --exit-code -- .claude-plugin plugins
```

Also inspect the working tree for intentional source changes:

```bash
git status --short
```

## Versioning

Plugin versions live in `registry.json` and are emitted to:

- `.claude-plugin/marketplace.json`
- `plugins/<plugin-name>/.claude-plugin/plugin.json`

Update the relevant plugin versions before running `npm run build`.

## Git Tag Release

```bash
git tag vX.Y.Z
git push --follow-tags
```

Pi users can install a tag:

```bash
pi install git:github.com/jskswamy/skills@vX.Y.Z
```

## Claude Code Marketplace Notes

Claude Code consumes git repository content. For official marketplace distribution, the marketplace listing may pin a specific source SHA. A tag alone does not update installed users unless the marketplace pin moves to the new commit.

For the self-hosted marketplace, `.claude-plugin/marketplace.json` points each plugin to `./plugins/<plugin-name>` in this repository.

## Do Not Publish Stale Generated Wrappers

Before release, always run:

```bash
npm run build
git diff --exit-code -- .claude-plugin plugins
```

A diff means the committed Claude install tree is stale.
