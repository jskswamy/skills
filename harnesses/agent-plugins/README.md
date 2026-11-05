# Agent Plugins adapter

Build adapter for the portable [Agent Plugins 1.0.0](https://agent-plugins.org) package. It writes one tree per plugin with `harnesses.agent-plugins.enabled`, to `dist/agent-plugins/plugins/<plugin>/`, and no catalog (installation is each client's business).

## Layout

```text
<plugin>/
  plugin.json   # $schema 1.0.0, name, version, description, author, keywords
  skills/       # the canonical skills, unchanged
  mcp.json      # only when the plugin ships a .mcp.json extra
  README.md     # any other extra
```

## Why a separate tree

The native trees cannot carry a root `plugin.json`. Observed with codex-cli 0.166.0: a root manifest makes Codex ignore `.codex-plugin/`, which drops `codex-skills/` and every hook. OpenCode loads only a directory with a `package.json`. Claude Code and Antigravity ignore the root files, so they gain nothing from them.

## What is not carried

- Hooks: the spec defines none, so each is reported `not-applicable`.
- Agents: the spec defines none, so each is reported `degraded`.
- `.mcp.json` becomes `mcp.json`: servers get `type`, `${CLAUDE_PLUGIN_ROOT}` becomes `${PLUGIN_ROOT}`, and a `${CLAUDE_PLUGIN_ROOT}/` command becomes `./`.

## Validation

`validate` checks the `$schema`, the `name` rules, the closed manifest fields, one `SKILL.md` per skill, no stray `hooks/`, `agents/` or `.mcp.json`, and the `mcp.json` shape.

## Observed loading

| Client | Skills | MCP |
|---|---|---|
| Codex | yes | yes |
| Antigravity | yes | yes, behind the `enable-agent-plugins-spec` flag |
| Claude Code | yes | no (reads `.mcp.json` only) |
| Pi | yes | n/a |
| OpenCode | no (needs `package.json`) | no |
