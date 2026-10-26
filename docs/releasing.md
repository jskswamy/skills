# Releasing

This repository is git-tree-first for harnesses that install directly from git.
Generated output for every harness lives in `dist/` (plus the Claude and Codex
marketplaces at `.claude-plugin/marketplace.json` and
`.agents/plugins/marketplace.json`) and is committed, because Claude Code, Pi,
Antigravity, OpenCode and Codex install from the repository tree and do not run
this repository's build script during install.

Only the release writes that output. Day-to-day work changes sources only;
`npm run build` writes to a temp dir. So `main` always installs the last
release on every harness, and a release is the moment users get changes.

## Preconditions

Start from a clean, up-to-date `main` branch:

```bash
git checkout main
git pull --ff-only origin main
git status --short
```

Run the standard checks before release work. Both build into a temp dir and
check the current sources:

```bash
npm run validate
npm test
```

`dist/` is expected to differ from the sources at this point: it still holds
the previous release.

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
- `.agents/plugins/marketplace.json`
- `dist/plugins/<plugin-name>/.claude-plugin/plugin.json`
- `dist/plugins/<plugin-name>/.codex-plugin/plugin.json`
- `dist/plugins/<plugin-name>/plugin.json`
- `dist/plugins/<plugin-name>/package.json`
- `dist/antigravity/plugins/<plugin-name>/.antigravity-plugin/plugin.json`

List the plugins whose built output changed since the last release:

```bash
node scripts/changed-plugins.mjs
```

It builds into a temp dir and compares each plugin's output with the committed
`dist/`, ignoring version fields. That catches changes to a plugin's own
resources and changes made only to adapters, runtimes or transforms. Claude
Code caches plugins by version, so every listed plugin must be bumped or its
users will not get the change. An empty list means there is nothing to
release.

Bump each listed plugin's version in `registry.json`.

## Write the Release Output

After editing `registry.json`, write every harness's output into the repo.
This is the only command that does:

```bash
npm run build:release
```

Verify the versions are synced and nothing else is left to bump:

```bash
jq -r '.plugins[] | [.name,.version] | @tsv' registry.json
jq -r '.plugins[] | [.name,.version] | @tsv' .claude-plugin/marketplace.json
jq -r .version dist/plugins/<plugin-name>/.claude-plugin/plugin.json
node scripts/changed-plugins.mjs   # prints nothing now
```

## Optional: Smoke-Test Every Harness

Unit tests prove the build writes the right files, not that a harness loads
them. Before tagging, you can install the release output into every harness
and check it end to end. This changes your own harness setup, so do it on a
disposable machine or back up first: `~/.config/skillshare/`,
`~/.local/state/skillshare/`, `~/.claude/settings.json`,
`~/.claude/plugins/*.json`, `~/.pi/agent/settings.json`,
`~/.config/opencode/` and `~/.gemini/`.

Install from a clean clone of the release commit; skillshare refuses a
working tree whose files change while it copies:

```bash
git clone -q . /tmp/skills-release && cd /tmp/skills-release
claude plugin marketplace add "$PWD"            # then: claude plugin install <plugin>@skills
agy plugin install "$PWD/dist/antigravity"
pi install "$PWD/dist/plugins/<plugin>"
# OpenCode: list "$PWD/dist/plugins/<plugin>" folders under "plugins" in opencode.json
skillshare plugin add "$PWD" --plugin <plugin> --target claude -g
skillshare plugin add "$PWD" --plugin <plugin> --target pi -g
```

Then, in a throwaway git repository, ask each harness non-interactively
(`claude -p`, `pi -p`, `opencode run`, `agy -p`) to run
`git commit --allow-empty -m smoke-test` and to quote any session-start
instruction about commits. The commit-tools guard must block the commit
and the routing reminder must arrive. Known limits (skillshare 0.26.3,
agy 1.4.1, OpenCode 2.1.1):

- agy needs a signed-in Google account to run a prompt; without one, check
  the plugins with `agy plugin list` and drive
  `runtime/antigravity/hook-shim.sh` directly.
- skillshare cannot install into Antigravity CLI ("unrecognized Antigravity
  CLI plugin inventory") and writes OpenCode plugins as `file://…/index.js`,
  which OpenCode rejects ("configured plugin path must be a directory"); use
  the native commands above for those two.

## Commit Version Bumps

Stage the registry and all generated output:

```bash
git add registry.json .claude-plugin .agents dist
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
git restore registry.json .claude-plugin dist CHANGELOG.md README.md
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
