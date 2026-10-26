# Claude Code Harness Support

`npm run build:release` writes one Claude Code plugin per plugin in
`registry.json` (unless `harnesses.claude-code.enabled` is `false`) and the
marketplace that lists them, `.claude-plugin/marketplace.json`. Claude Code
reads hooks, skills, commands and agents natively, so the plugins are the
canonical resources laid out the way Claude expects; nothing is converted.
Do not edit the generated plugins by hand.

## Install

```text
/plugin marketplace add jskswamy/skills
/plugin install <plugin>@skills
```

To try a plugin from a checkout without installing it:

```bash
claude --plugin-dir <dir>/<plugin>
```

`<dir>` is the Claude output of a build: the path `npm run build` prints,
followed by the Claude plugin folder.
