# Harness research (consolidated)

Raw evidence from the first research round for the five harnesses this repo ships to
(Claude Code, Codex, Antigravity, OpenCode, Pi), kept as one reference for future work.
It is the evidence behind `harness_dictionary.md`, which holds the settled vocabulary,
the per-harness tables and the results of the later rounds (section 8). Later rounds
were recorded as results only; their raw logs were not kept.

Tags in the text: OBSERVED means run in an isolated config; DOCUMENTED means read in
the harness docs or code and not run.

Contents: [Claude Code](#claude-code), [Codex](#codex), [Antigravity](#antigravity), [OpenCode](#opencode), [Pi](#pi)


<a id="claude-code"></a>

## Claude Code

## Claude Code v2.1.314 skills: findings
Docs fetched: https://code.claude.com/docs/en/skills.md (saved skills_doc.md), https://code.claude.com/docs/en/plugins-reference.md (pref.md).
Fixture: claude-fixture/{fx,fy,fz}. fx: skills alpha(argument-hint "[--flag] <x>"), beta(user-invocable:false), gamma(disable-model-invocation:true), fx-delta; plus commands/alpha.md (argument-hint "[cmdarg]", description "Legacy alpha command", body "LEGACY COMMAND BODY"). fy: skill alpha. fz: name-rule probes.
Probe: `claude -p ... --plugin-dir fx --plugin-dir fy --output-format stream-json --verbose --max-turns N </dev/null`, reading the init message (`slash_commands`, `skills`, `plugins`). `claude plugin validate fx|fy|fz` passed (warnings only: author/README/LICENSE/icon).

### 1. Bundle name and manifest
- DOCUMENTED (pref.md): "A plugin manifest is the `plugin.json` file in a plugin's `.claude-plugin/` directory"; "The manifest is optional. Without it, Claude Code loads the components it finds" in default dirs. `name` required, "Use kebab-case. Every component is namespaced under it". `skills`: path(s) "Adds to the default `skills/` scan"; `commands`: "Replaces the default `commands/` scan".
- OBSERVED: init `plugins` entry: `{"name":"fx","source":"fx@inline","version":"0.0.1","path":...}`. Called "plugin". Marketplace-installed ones show `name@marketplace`.

### 2. Invocation string
- OBSERVED: init `skills` lists `fx:alpha, fx:fx-delta, fx:gamma, fy:alpha`. Format `/<plugin>:<skill>`, separator `:`.
- DOCUMENTED (skills.md "How a skill gets its command name"): "my-plugin/skills/review/SKILL.md -> /my-plugin:review"; "In a plugin skill, `name` sets the last segment of the command and the plugin prefix stays in place. The bare `/fancy` also invokes the skill unless another command already uses that name."
- OBSERVED bare: `-p "/alpha"` ran a skill whose body says "Say ok" (answer "ok"), i.e. fy:alpha (fx:alpha is the legacy command with different body). So bare name is accepted and resolved to a plugin skill despite two candidates; init slash_commands did NOT list a bare `alpha` entry. Which plugin wins a bare clash is NOT DETERMINABLE from docs (not stated); only one observation (fy, loaded second via --plugin-dir order fx,fy). Do not rely on it.
- Two plugins with same skill name: OBSERVED both load (`fx:alpha`, `fy:alpha`). DOCUMENTED: "A plugin skill and a skill at any of the locations above | Both load, because plugin skills are namespaced as /plugin-name:skill-name".
- `name` already starting with plugin prefix: DOCUMENTED "If the `name` you write already starts with the plugin's own prefix, Claude Code doesn't add the prefix again on v2.1.246 or later. e.g. `name: my-plugin:fancy` still becomes `/my-plugin:fancy`."

### 3. Separate "command" concept
- DOCUMENTED: yes, "commands" = flat markdown files. Plugin: `commands/` dir (or manifest `commands`, incl. object map with `argumentHint`, pref.md line 254). Project/user: `.claude/commands/`. skills.md: "Custom commands have been merged into skills. A file at .claude/commands/deploy.md and a skill at .claude/skills/deploy/SKILL.md both create /deploy and work the same way." "Command files ... supports the same frontmatter except `name` and `paths`." Name from file name (subdir -> `:`).
- DOCUMENTED clash: "A skill and a file in .claude/commands/ | The skill" (that row is about non-plugin locations).
- OBSERVED clash in a plugin (fx has skills/alpha AND commands/alpha.md): init lists a single `fx:alpha` in both slash_commands and skills; `/fx:alpha hello` ran the LEGACY command body (model replied that the body says "LEGACY COMMAND BODY"); model's skill list showed `fx:alpha: Legacy alpha command` (the command's description, not the skill's "Alpha skill of fx"). So inside a plugin the COMMAND won, contradicting the documented non-plugin rule. Slash-menu list order puts `fx:alpha` early (command section) while `fx:fx-delta`,`fx:gamma` appear later.
- Note: init `slash_commands` is a superset (commands + skills + builtins); init `skills` is the model-facing/skill list.

### 4. Argument hint
- DOCUMENTED (skills.md frontmatter table): `argument-hint` | "Hint shown during autocomplete to indicate expected arguments. Example: [issue-number] or [filename] [format]." Commands accept same fields (except name, paths). Manifest command objects use camelCase `argumentHint`.
- OBSERVED: field accepted without validate error on skill and command. Display in the interactive picker is NOT DETERMINABLE headless (tried: init message carries no hint field; -p has no TUI). Docs say autocomplete only.
- DOCUMENTED: "Claude Code ignores a field it doesn't recognize without reporting an error"; field names must match exactly.
- DOCUMENTED caveat: claude.ai upload / Skills API reject `argument-hint` ("Unexpected key(s) in SKILL.md frontmatter: argument-hint. Allowed properties are: allowed-tools, compatibility, description, license, metadata, name").

### 5. Invocation control
- DOCUMENTED table: default = user and Claude can invoke; `disable-model-invocation: true` = "Yes | Not on its own | Description not in context, full skill loads when invoked" (user-only); `user-invocable: false` = "hides it from the / menu and doesn't run it when you type /name" (model-only). Booleans accept yes/no/on/off/1/0.
- OBSERVED (fx, same fixture):
  - init `skills` and `slash_commands`: contain fx:gamma (disable-model-invocation) ; do NOT contain fx:beta (user-invocable:false).
  - Model's skill list (asked to list names with fx/alpha/beta/gamma/delta): showed fx:alpha, fx:beta, fx:fx-delta, fy:alpha; did NOT show gamma. Confirms model-only = beta, user-only = gamma.
  - `-p "/fx:beta"`: produced no assistant output at all (not runnable by user). `-p "/fx:gamma"`: ran, answer "ok".
- Also DOCUMENTED: `skillOverrides` setting with `"user-invocable-only"` / `"off"` (not tested, settings untouched).

### 6. Name rules
- DOCUMENTED: `name` optional, "Defaults to the directory name"; "Field names use lowercase words separated by hyphens". I found NO documented charset/length limit for the skill `name` in Claude Code docs (searched for lowercase/64 char). Plugin `name`: "Use kebab-case". Reserved: `anthropic-skills`, `synced` folder (outside plugin). Plugin skill folder names with odd characters "become hyphens in the skill's command name" (skills.md line 472).
- OBSERVED (fz plugin, validate passes, no errors): dir `dirname` with `name: other-name` -> init lists `fz:dirname`; model listing shows `fz:dirname (fz:other-name): ...`. dir `UpperDir` with `name: Upper_Case Name` -> init `fz:UpperDir`, model sees `fz:UpperDir`. So name must NOT match directory, uppercase/space/underscore not rejected; and in this version the init command id came from the DIRECTORY, not the frontmatter `name` (conflicts with docs saying name sets last segment; docs describe `/my-plugin:fancy`; observed the model listing shows both forms for the mismatch case). Treat frontmatter name != dir as unreliable; keep them identical.
- Stutter: OBSERVED skill dir/name `fx-delta` in plugin `fx` -> `fx:fx-delta` in both lists (not collapsed, not removed). Prefix only de-duplicated when name itself starts with `fx:` (DOCUMENTED above).

### 7. Other display effects
- DOCUMENTED: "the combined description and when_to_use text is truncated at 1,536 characters in the skill listing". OBSERVED: a 2000-char description appeared in the model's listing cut off and ending in a literal "…" (exact cut length NOT DETERMINABLE; model could not count). `when_to_use` is an extra field appended to description.
- DOCUMENTED: angle brackets in description are shown as &lt; &gt;; description falls back to first non-empty body line if missing.
- OBSERVED: model-facing entry format `plugin:skill: description` (with `(plugin:name)` annotation when name differs).
- DOCUMENTED other fields: when_to_use, arguments, allowed-tools, model, effort, context(fork), agent, background, hooks, paths, shell, metadata, license, compatibility (unknown keys ignored silently).


<a id="codex"></a>

## Codex

## Codex (codex-cli 0.166.0) skills: findings

Labels: DOCUMENTED = quote with URL/path; OBSERVED = ran real binary; NOT DETERMINABLE = what was tried.

Setup. Fixture: `S=<scratch>/codex-fixture`.
All runs used `CODEX_HOME=$S/home` (isolated; the user's ~/.codex was not touched; auth.json was copied in only for 2 failing `codex exec` runs, then deleted).
Fixture marketplace `$S/mp/.agents/plugins/marketplace.json` (name `fxmp`) with plugins `fx` (skills alpha, beta, fx-delta, ...) and `fy` (skill alpha). Real plugin tested: `dist/plugins/commit-tools` via the repo's own marketplace.

Probe methods (no model call needed, no auth needed):
- `codex plugin marketplace add <dir>`; `codex plugin add fx@fxmp`; `codex plugin list`: all worked with empty CODEX_HOME and no auth.
- JSON-RPC to `codex app-server` (stdio): `initialize`, then `skills/list {"cwds":[...],"forceReload":true}` returns every skill with `name`, `description`, `shortDescription`, `interface{displayName,shortDescription,defaultPrompt,...}`, `path`, `scope`, `pluginId`, plus `errors[]`. Script: `$S/rpc.py`; output `$S/skills.json`.
- `codex debug prompt-input "<text>"` prints the model-visible prompt including the "Available skills" list (no model call).
- `codex exec "$fx:alpha x"` with no usable quota: the rollout file in `$CODEX_HOME/sessions/` still records the injected `<skill><name>..</name><path>..</path>` item before the failed model request. That is how explicit mention resolution was observed. The account was at its usage limit, so no model reply ever came back.
- TUI driven via tmux for the `$` picker and `/skills`.

---------------------------------------------------------------------------
### 1. Bundle name and manifest layout

- DOCUMENTED: Codex calls the bundle a **plugin**. Install format is a plugin directory plus a marketplace.
  - https://developers.openai.com/codex/plugins/build (WebFetch result): "A portable plugin has a `plugin.json` manifest at its root." Can include `skills/`, `mcp.json`, assets. "When you add a Codex overlay, keep only its `plugin.json` inside `.codex-plugin/`."
  - Marketplace: "`$REPO_ROOT/.agents/plugins/marketplace.json`, or a personal one at `~/.agents/plugins/marketplace.json`. The desktop app also reads `$REPO_ROOT/.claude-plugin/marketplace.json`." Entry fields: `name`, `source`, `policy{installation,authentication}`, `category`; `source.path` starts with `./`.
  - Source (context7 /openai/codex, codex-rs/exec-server-protocol/src/protocol.rs): `DISCOVERABLE_PLUGIN_MANIFEST_PATHS = [".codex-plugin/plugin.json", ".claude-plugin/plugin.json", ".cursor-plugin/plugin.json"]`.
  - Source (core-plugins/src/manifest.rs): manifest fields `name, version, description, keywords, skills, mcpServers, apps, hooks, interface, extensions`. Path fields need a `./` prefix.
  - Source (core-plugins/src/loader.rs): `DEFAULT_SKILLS_DIR_NAME = "skills"`; if the manifest declares no skills path, `<plugin>/skills` is used. For a `Legacy` manifest format, `<plugin>/.codex-plugin/migrated-command-skills` is added as a skill root.
  - Source: the manifest has no `agents` or `commands` field (plugin/src/manifest.rs `PluginManifestPaths`: skills, onboarding_skill, mcp_servers, apps, hooks).
- OBSERVED: skills are discovered by each of these layouts. Command: `codex plugin add <p>@fxmp` then `skills/list`.
  - `.codex-plugin/plugin.json` with `"skills":"./skills"` -> works (fx, fy).
  - `.codex-plugin/plugin.json` with no `skills` key -> default `skills/` used (`fv:one`).
  - only `.claude-plugin/plugin.json`, no skills key -> works (`fz:one`).
  - only a root `plugin.json` -> works (`fw:one`; installed under cache `.../fw/local`).
  - custom `"skills":"./codex-skills"` -> works (our shipped commit-tools).
  - Marketplace file may be `.agents/plugins/marketplace.json` OR only `.claude-plugin/marketplace.json` (marketplace `fxc` built with only the latter: `codex plugin add fy@fxc` succeeded). In `fxc` the plugin `source` was a plain string `"./plugins/fy"`.
  - Install copies the plugin to `$CODEX_HOME/plugins/cache/<marketplace>/<plugin>/<version>/`.
- Our shipped bundle (read-only): `dist/plugins/commit-tools/.codex-plugin/plugin.json` = `{"name":"commit-tools","version":"1.3.1",...,"skills":"./codex-skills","hooks":"./codex-hooks.json"}`. Skills in `codex-skills/<dir>/SKILL.md` all list correctly (OBSERVED, section 2). The repo-root `.agents/plugins/marketplace.json` was added with `codex plugin marketplace add <repo>`, then `codex plugin add commit-tools@skills`: OK.
- Plugin manifest `interface.displayName` / `shortDescription` (my fixture had them): OBSERVED not to appear anywhere in the skill picker (section 4).

### 2. How a user runs a plugin skill

- DOCUMENTED (https://learn.chatgpt.com/docs/build-skills, redirect of developers.openai.com/codex/skills): "In Codex CLI or the IDE extension, run `/skills` or type `$` to mention a skill."
- DOCUMENTED (source core/src/context/available_plugins_instructions.rs): "Skill naming: If a plugin contributes skills, those skill entries are prefixed with `plugin_name:` in the Skills list."
- OBSERVED (`skills/list`): every plugin skill's `name` is `<plugin>:<skill>`, always namespaced. Examples: `fx:alpha`, `fy:alpha`, `fx:fx-delta`, `commit-tools:commit-action`, `commit-tools:commit-style`, `commit-tools:commit-tools-cmd-commit`, `commit-tools:review-commits`, `commit-tools:validate-commits`.
- OBSERVED, exact typed string: `$fx:alpha`. Selecting from the `$` popup inserts the full `$fy:alpha` (tmux, selected alpha (fy), result text `$fy:alpha`).
  - Resolution observed by `codex exec` rollouts (injected `<skill><name>`):
    - `$fx:alpha x` -> injected `fx:alpha`
    - `$fy:alpha x` -> `fy:alpha`
    - `$fx:alpha $fy:alpha x` -> both injected
    - `$fx:fx-delta x` -> `fx:fx-delta`
    - `$commit-tools:commit-action x` -> injected
    - `$fx:alpha(arg1 arg2) x` -> `fx:alpha` injected; the parenthesised text is not treated as arguments (just prompt text).
- **Bare name is NOT accepted for plugin skills.** OBSERVED: `$alpha x` (fx and fy both have alpha) -> nothing injected; `$beta x` -> nothing; `$fx-delta x` -> nothing (bare of a plugin skill).
  - A bare name only resolves for non-plugin skills. I created user skills `solo` and `alpha` in `$CODEX_HOME/skills/`: `$solo x` -> `solo` injected; `$alpha x` -> the user `alpha` injected (not fx:alpha or fy:alpha), so a plugin skill never collides with a user skill of the same bare name.
  - DOCUMENTED (source skills/src/selection.rs `collect_explicit_skill_mentions`): structured `UserInput::Skill{name,path}` items are matched by path; text `$name` tokens are matched by name via `skill_name_counts`. OBSERVED consistent with that.
- **Two plugins, same skill name:** OBSERVED, no collision, no dedupe. Both are listed as `fx:alpha` and `fy:alpha`, and both appear in the model's "Available skills" list (`debug prompt-input`).
  - Standalone (non-plugin) duplicates: DOCUMENTED (build-skills page): "If two skills share a `name`, Codex doesn't merge them." Not tested.
- **Picker display (OBSERVED, TUI `$` popup, tmux):**
  - format is `<skill> (<plugin>)  [Skill] <description>`:
    - `fx-delta (fx)  [Skill] Stutter test skill`
    - `beta (fx)  [Skill] Beta skill model-only? no, explicit only`
    - `hint2 (fx)  [Skill] hint2`
    - `alpha (fy)  [Skill] Alpha skill from fy (collision)`
    - `Bad_Name:X (fx)  [Skill] Weird name`
    - `commit-action (commit-tools)  [Skill] Use when any agent is about to create or amend a Git commit: ...`
  - when `agents/openai.yaml` sets `interface.display_name`, that string replaces the whole label and the plugin name is dropped: `Alpha Pretty Name  [Skill] Alpha short description for the picker`.
  - non-plugin skill: `solo  [Skill] user skill solo` (no suffix).
  - DOCUMENTED (tui/src/skills_helpers.rs `skill_display_name`): returns `interface.display_name` if set; otherwise if `name.split_once(':')` gives non-empty plugin and skill, returns `"{skill_name} ({plugin_name})"`; else the raw name. Matches the observations.
  - `/skills` opens a menu: "1. List skills  Tip: press $ to open this list directly" and "2. Enable/Disable Skills" (OBSERVED). "List skills" shows the same popup as `$`.
  - The model prompt lists the skill as `- fx:alpha: Alpha skill from fx (file: ...)` (OBSERVED in `debug prompt-input`).
- Plugin itself is not invocable: DOCUMENTED (same Rust file): "Plugins are not invoked directly. Use their underlying skills, MCP tools, and app tools".

### 3. Native commands / custom prompts

- DOCUMENTED (https://learn.chatgpt.com/docs/custom-prompts, redirect of developers.openai.com/codex/custom-prompts): "Custom prompts are deprecated. Use skills for reusable instructions that Codex can invoke explicitly or implicitly." Location: "live in your local Codex home directory (for example, `~/.codex`)"; "Codex scans only the top-level Markdown files in that folder". Frontmatter: "Document expected parameters with `argument-hint: KEY=<value>`." Invocation: "Enter `prompts:` or the prompt name, for example `/prompts:draftpr`."
- OBSERVED: the custom-prompt feature is gone or inert in 0.166.0. I put `$CODEX_HOME/prompts/draftpr.md` (with `description` and `argument-hint`) in the isolated home and ran the TUI. Typing `/draftpr` or `/prompts` showed no popup entry. Submitting `/prompts:draftpr a b` gave: `Unrecognized command '/prompts:draftpr'. Type "/" for a list of supported commands.`
- No plugin-level command concept in the manifest (DOCUMENTED, manifest fields in section 1).
- **IMPORTANT, OBSERVED: Codex auto-converts a plugin's Claude-style `commands/*.md` into skills at install time.**
  - Evidence: after `codex plugin add commit-tools@skills`, the cache contained `.codex-plugin/migrated-command-skills/source-command-commit/SKILL.md`. It is not in dist; Codex wrote it. Content:
    ```
    ---
    name: "source-command-commit"
    description: "<command description>"
    ---
    # source-command-commit
    Use this skill when the user asks to run the migrated source command `commit`.
    ## Command Template
    <command body>
    ```
  - `skills/list` then shows `commit-tools:source-command-commit`, and `$commit-tools:source-command-commit x` injects it (OBSERVED).
  - Rules found by bisecting with fixture plugin `cb2` (commands/ dir plus `.codex-plugin/plugin.json`; independent of `.claude-plugin/`, hooks or custom skills path):
    - the skill name is `source-command-<filename-without-.md>`; the frontmatter `name:` is ignored (`name: renamed-cmd` in ping.md -> `source-command-ping`).
    - `description` is copied from frontmatter; `argument-hint` is dropped (not in the generated file).
    - commands whose body contains `$ARGUMENTS` or `$1` are NOT converted. `ping.md` and `pong.md` with placeholders produced nothing. After removing the placeholders from ping.md, `source-command-ping` appeared; `pong.md` still containing `$ARGUMENTS` was skipped.
    - generated skills are not rewritten by a later `plugin add`; remove and re-add to regenerate.
    - DOCUMENTED weakly: loader.rs adds the migrated root only for the `Legacy` manifest format, but I could not tell what distinguishes it. In my tests it triggered for `.codex-plugin`-manifest plugins with commands lacking placeholders.
  - Consequence for this repo: `dist/plugins/commit-tools` ships `commands/commit.md` AND our own skill `commit-tools-cmd-commit`. Codex therefore lists BOTH `commit-tools:commit-tools-cmd-commit` and the auto-generated `commit-tools:source-command-commit` (OBSERVED in `skills/list`).

### 4. Argument hint

- OBSERVED: no `argument-hint` support for skills. `skills/list` output for `fx:alpha` (SKILL.md frontmatter has `argument-hint: "[file] [--flag]"`) contains only name, description, interface, path, scope, enabled, pluginId. The picker shows nothing for it and `debug prompt-input` does not include it. Same for `fx:hint2` with `argument-hint`, `allowed-tools`, `disable-model-invocation`, `user-invocable`: all silently ignored and the skill is still listed to the model (`- fx:hint2: hint2`).
- DOCUMENTED: the only SKILL.md frontmatter keys parsed by Codex are `name`, `description`, `metadata.short-description` (parser.rs `SkillFrontmatter{name, description, metadata}`; OBSERVED: `metadata:\n short-description: MetaShort` yields `shortDescription:"MetaShort"` in `skills/list`).
- `agents/openai.yaml` `interface` fields (DOCUMENTED: codex-rs/skills/src/assets/samples/skill-creator/references/openai_yaml.md, and interface.rs): `display_name` (max 64 chars), `short_description` (max 1024; guidance 25-64), `icon_small`, `icon_large`, `brand_color`, `default_prompt` (max 1024). Over-length values are silently dropped. There is no argument-hint field there.
- Visible effect (OBSERVED, TUI `$` popup): `display_name` replaces the label, `short_description` replaces the description column (`Alpha Pretty Name  [Skill] Alpha short description for the picker` vs. SKILL.md description "Alpha skill from fx"). The model-visible list still uses the SKILL.md `description` (`- fx:alpha: Alpha skill from fx`). `default_prompt` appears in `skills/list` JSON (`"defaultPrompt":"Use $alpha to do the alpha thing."`); I did not see it in the TUI picker. DOCUMENTED (openai_yaml.md): "default_prompt: Default prompt snippet inserted when invoking the skill" (used by app UI chips).
- Custom prompts (deprecated) had `argument-hint` per docs, but see section 3: not functional here.

### 5. Invocation control

- DOCUMENTED: `agents/openai.yaml` `policy.allow_implicit_invocation` (default true). Quote (build-skills page): "`allow_implicit_invocation`, which defaults to true. Set it to false to stop Codex from invoking the skill implicitly, while explicit `$skill` invocation still works." Sample: codex-rs/skills/src/assets/samples/review-agent/agents/openai.yaml.
- OBSERVED, `fx/skills/beta/agents/openai.yaml` = `policy:\n  allow_implicit_invocation: false`:
  - `debug prompt-input`: `fx:beta` ABSENT from the model's "Available skills" list (present: `fx:alpha`, `fx:hint2`, `fx:fx-delta`, ...).
  - `skills/list` still returns `fx:beta`, `enabled:true`; the `$` picker still shows `beta (fx)`.
  - `$fx:beta x` still injects the skill (rollout shows `<name>fx:beta</name>`). So this field = "user-only (explicit)" mode.
- **Model-only (hidden from the user's picker, model can still use it): NOT DETERMINABLE / no such field found.** Tried frontmatter `disable-model-invocation`, `user-invocable: false` (these are Claude Code names) on `fx:hint2`: ignored; skill is still in the picker and in the model list. The Codex docs and source I could query define no model-only flag. Related but not the same: `/skills` -> "Enable/Disable Skills" and the `[skills.config]` `enabled=false` setting turn a skill off for both (not tested beyond the menu existing).
- Frontmatter equivalents of Claude fields (`disable-model-invocation`, etc.) have no effect (OBSERVED). The generator must emit `agents/openai.yaml` per skill.

### 6. Name rules

- DOCUMENTED (parser.rs, interface.rs): `validate_len(&name, MAX_NAME_LEN, "name")` where `MAX_NAME_LEN = 64`; empty description is an error (`MissingField("description")`). The build-skills docs page only says `SKILL.md` "must include `name` and `description`" and gives no charset rule.
- OBSERVED (`skills/list` `errors[]` and listing):
  - name of 65 chars -> not loaded: `invalid name: exceeds maximum length of 64 characters`.
  - name of 64 chars -> loaded (`fx:` prefix not counted, final name is 67 chars).
  - empty `description:` -> not loaded: ``missing field `description` `` (skill file is listed in `errors`, not in `skills`).
  - no `name:` key -> loads, using the directory name (`skills/noname/` -> `fx:noname`).
  - `name` differing from directory -> accepted; the frontmatter name wins (dir `zeta`, `name: zeta-renamed` -> `fx:zeta-renamed`). Directory name need not match.
  - no charset validation: `name: "Bad_Name:X"` (uppercase, underscore, colon) loads as `fx:Bad_Name:X`; the picker shows it as `Bad_Name:X (fx)` (split on the first ':').
- **Stutter:** OBSERVED. Plugin `fx`, skill dir/name `fx-delta` -> `fx:fx-delta` in `skills/list` and the model prompt; picker shows `fx-delta (fx)`. Real case: `commit-tools:commit-tools-cmd-commit` listed as is. Codex does NOT strip the plugin prefix.

### 7. Other things that change how the same SKILL.md appears

- Plugin skills are always `plugin:skill`, so a skill that says "use `$commit-action`" or "/commit" will not resolve under Codex. Cross-references must use `$plugin:skill` (tested: `$commit-tools:commit-action`).
- Skills outside plugins (user): OBSERVED loaded from `$CODEX_HOME/skills/<dir>/SKILL.md` (`scope:"user"`, bare name). DOCUMENTED (build-skills page) locations: repo `.agents/skills` (cwd up to the repo root), user `$HOME/.agents/skills`, admin `/etc/codex/skills`, system bundled. Also OBSERVED: `skills/list` with my fixture isolated CODEX_HOME still included the real `~/.agents/skills/...` skills, so `$HOME/.agents/skills` is read regardless of CODEX_HOME. Note: system skills (`.system/imagegen`, `openai-docs`, ...) are auto-installed into `$CODEX_HOME/skills/.system` on first app-server start.
- Plugin-installed skills report `scope:"user"` (not a plugin scope); `pluginId` = `<plugin>@<marketplace>` identifies them.
- Frontmatter noise is harmless: unknown keys (`argument-hint`, `allowed-tools`, ...) are silently ignored, so one SKILL.md can carry the Claude keys.
- Picker description column uses `interface.short_description`, then `metadata.short-description`, then `description` (DOCUMENTED, skills_helpers.rs `skill_description`; OBSERVED `fx:short` has `shortDescription:"MetaShort"`).
- The picker truncates long descriptions with an ellipsis (OBSERVED, commit-action line).
- Plugin install trust: new/changed hooks trigger a "Hooks need review" gate at TUI start (OBSERVED; relevant only to hooks).
- A skill that fails to parse still shows up in the TUI as a warning (`⚠ 2 warnings · f2 to view`, OBSERVED) and is simply absent from skills.
- Not tested: a duplicate full `plugin:skill` name inside one plugin; plugin `policy.installation` values beyond AVAILABLE; remote/curated marketplace behaviour.

### Addendum: when does Codex convert `commands/` into skills? (codex-cli 0.166.0, isolated CODEX_HOME, 2026-11-02)
Three fixture plugins, each with `skills/real/` and `commands/cmd.md` (no `$ARGUMENTS`), added with `codex plugin add`:
- v1: only `.codex-plugin/plugin.json` -> OBSERVED `.codex-plugin/migrated-command-skills/source-command-cmd/SKILL.md` is created.
- v2: only a root `plugin.json` with `"$schema": "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json"` -> NOT created.
- v3: both of the above -> NOT created.
- The conversion runs at install time (binary string: "failed to migrate plugin commands into skills"). Codex reads a root `plugin.json` first when its `$schema` is the Agent Plugins one; a root `plugin.json` with another schema (this repo's Antigravity one, `https://antigravity.google/schemas/v1/plugin.json`) is ignored for that purpose and Codex falls through to `.codex-plugin/plugin.json`.
- Not tested: whether v3's root manifest, once chosen, still finds a custom `skills` path (`./codex-skills`) and the hooks file.

### Addendum: length limits (codex-cli 0.166.0, isolated CODEX_HOME, 2026-11-02)
- OBSERVED via `skills/list`: `agents/openai.yaml` `interface.short_description` of exactly 1024 characters is kept; 1025 characters is dropped for that field only (`interface.displayName` set in the same file survives); 300 characters is kept. A `SKILL.md` `description` of 1024 and of 1025 characters both load with no error. The picker showing `short_description` was observed earlier.
- This repo: the longest skill description is 375 characters and the longest command hint 140, so a description with the hint appended is at most about 525 characters, far below either limit.


<a id="antigravity"></a>

## Antigravity

## Antigravity CLI (agy 1.4.12) skills findings

Evidence labels: DOCUMENTED / OBSERVED / NOT DETERMINABLE.
Fixture: scratchpad/agy-fixture/{fx,fy,ed}. Isolated with `HOME=<scratch>/agy-fixture/home`; this redirected `~/.gemini` fully (`agy plugin list` showed "No plugins installed." there, while the real HOME lists 16 plugins). User's real config untouched. oauth_creds.json was NOT copied, so no logged-in session exists in the sandbox.

### Big limitation (read first)
OBSERVED: every headless/TUI path needs login before any slash handling. `HOME=<iso> agy -p "/skills" --output-format json </dev/null` printed "Authentication required. Please visit the URL to log in ..." then `{"status":"ERROR","error":"authentication failed or timed out",...}`. Same for `/help`. A pty-driven `agy` (drive.py) stops at "Welcome ... You are currently not signed in. Select login method: 1. Google OAuth / 2. Use a Google Cloud project".
So the live slash picker text, live collision behavior and model-invoked behavior are NOT OBSERVED. Where I cite the binary or changelog, that is DOCUMENTED (the changelog is shipped inside the binary via `agy changelog`, saved at agy-fixture/changelog.txt). I did not use the real HOME to run `-p "/skills"` because that would write to the user's ~/.gemini. That one command, run once in a logged-in shell with the fixture copied into `<cwd>/.agents/plugins/`, is the missing observation.

### 1. Bundle name, manifest, layout
- Bundle is called a **plugin**. DOCUMENTED https://antigravity.google/docs/plugins : "A plugin is defined by a plugin.json manifest (or .antigravity-plugin/plugin.json)". Bundled builtin guide (extracted by the binary to `<HOME>/.gemini/antigravity-cli/builtin/skills/plugin/SKILL.md`): "A plugin is a namespaced bundle of customizations ... skills, agents, rules, MCP servers and hooks".
- DOCUMENTED https://antigravity.google/docs/build-plugins : `.antigravity-plugin/plugin.json` "takes precedence over the root file". Changelog also names `.gemini-plugin/` as a manifest folder ("keep the manifest in a `.antigravity-plugin/` or `.gemini-plugin/` folder, list skills in plugin.json").
- Layout DOCUMENTED (build-plugins): `plugin.json`, README.md, assets/, scripts/, `mcp_config.json`, `hooks.json` (plugin root), `skills/<name>/SKILL.md`, `agents/<name>.md` or `agents/<name>/agent.md`, `rules/AGENTS.md` + `rules/<rule>.md`.
- plugin.json fields DOCUMENTED (build-plugins + builtin plugin SKILL.md): name (lowercase kebab-case, defaults to dir name; also "global unique key"), displayName, description, version, logo, suggestedPrompts (max 3), skills (extra dirs), disabled, author, homepage, repository, license, keywords, $schema. Builtin guide: "Unknown top-level fields are silently discarded". Changelog: `"skills": "./skills/"` as a single string is accepted.
- Manifests `skills.json`, `rules.json`, `agents.json`, `plugins.json`: DOCUMENTED (builtin `agy-customizations/docs/json_configs.md`): `{"entries":[{"path":..., "include_only":[...], "exclude":[...]}], "inherits":[...]}`. Changelog 'Changed how directory entries in skills.json ... are scanned: an entry now loads only the items directly inside the directory ... to load a nested item, name it in include_only'. Changelog also: plugin loader honors root `skills.json`, `rules.json`, `agents.json`, `sidecars.json`; `hooks/hooks.json` is NOT read, only `<plugin>/hooks.json` ("Runtime plugin discovery strictly loads hooks.json from the plugin root", builtin plugins.md).
- OBSERVED: `agy plugin --help` commands: list [--json], import [source], install <target> (plugin[@marketplace]), uninstall, enable, disable, validate [path] [--strict] [--json], link, help.
- OBSERVED: `agy plugin validate fx` with only `{"name","version","description"}` in plugin.json and `skills/` dir passed ("skills 3 ... Validation passed with 1 warning"). Plain `skills/` auto-discovery needs no skills.json.
- OBSERVED: repo's `dist/antigravity/plugins/commit-tools` (has `.antigravity-plugin/plugin.json`, `hooks.json`, `skills/`, no root plugin.json) -> `agy plugin validate .` = "Validation passed", "skills 5 · hooks 2". Skill dirs there: commit-action, commit-style, commit-tools-cmd-commit, review-commits, validate-commits.
- OBSERVED: install location `agy plugin install <dir>` copies to `<HOME>/.gemini/config/plugins/<dirname>/` and prints "Installed to ...". Real HOME already has dirs like `~/.gemini/config/plugins/commit-tools`.
- OBSERVED: `agy plugin list --json` fields: name, enabled, version, source ("antigravity"/"claude-code"), path, skills[] (bare skill names, not namespaced, e.g. fx -> ["alpha","beta","fx-delta"], fy -> ["alpha"]).
- Skill discovery locations DOCUMENTED (https://antigravity.google/docs/skills): CLI reads `<workspace>/.agents/skills/`, `~/.gemini/config/skills/`, `~/.gemini/config/plugins/<plugin>/skills/`, and also `~/.gemini/antigravity-cli/skills/` and `~/.gemini/skills/` (CLI only). `.agent/skills` legacy also supported.

### 2. Invocation string, namespace, bare name, collisions
- DOCUMENTED https://antigravity.google/docs/plugins : "Type `/<skill-name>` in chat (for example, `/dart-add-unit-test` or `/hello`) to trigger a plugin skill explicitly." and https://antigravity.google/docs/skills "every skill is automatically converted into a slash command in the interactive TUI ... `deploy-staging` becomes `/deploy-staging`."
- DOCUMENTED (conflicting/more specific) https://antigravity.google/docs/customization-discovery/ : "Skills from a plugin are named `<plugin>:<skill>`, so they don't conflict with your other skills."
- DOCUMENTED changelog (agy changelog, a release between 1.2.x-1.3.x): "Fixed plugin skill slash commands being double-prefixed (`/<plugin>:<plugin>:<skill>`) when a skill's frontmatter name already includes the plugin prefix, or being shadowed when multiple plugins define skills with the same short name". Implication: slash form is `/<plugin>:<skill>`, and a skill whose name already starts with the plugin prefix is NOT double prefixed (for plugin `fx` + skill `fx-delta` the exact result, `/fx:fx-delta` vs `/fx-delta`, is NOT DETERMINABLE; only that a doubled prefix is a fixed bug).
- Bare name accepted? NOT DETERMINABLE (docs say `/<skill-name>` for plugin skills AND `<plugin>:<skill>` naming; could not run the TUI). Treat the namespaced form as the canonical one and the bare form as possibly accepted.
- Exact picker display format: NOT DETERMINABLE (auth wall). Known pieces: DOCUMENTED changelog: emoji from `metadata.icon` in SKILL.md frontmatter shows in `/skills` list, detail header and slash autocompletion popup; plugin `displayName` is "shown in UI headers, cards, and slash command menus" (builtin plugin guide).
- Collision WITHIN one plugin: OBSERVED `agy plugin validate ed`: `skills/dup2/SKILL.md: skipped: skills/dup1/SKILL.md already defines a skill named "same"` (warning; first, in directory order, wins, later is dropped; validate warns).
- Collision between two plugins with same skill name (fx/alpha vs fy/alpha): `agy plugin validate` does not compare across plugins (each passed clean; OBSERVED). `agy plugin install` of both succeeded and `list --json` shows both with "alpha" (OBSERVED). Runtime result NOT DETERMINABLE; DOCUMENTED docs say plugin skills are namespaced so they "don't conflict with your other skills", and changelog says shadowing was fixed. Name collision between PLUGINS (same plugin.json name): builtin plugin guide "when two plugins claim the same name the first discovered wins and the other is dropped silently".
- Priority for same-name skills across sources DOCUMENTED (customization-discovery page): "in-repo personal folder, workspace, ~/.gemini/config/, built-ins" ; builtin agy-customizations lists Workspace Project > Declared (skills.json/plugins.json in workspace) > Global discovery > Built-in > Global declared. Changelog: "a path you set in your configuration now wins a name collision."

### 3. Native "command" concept
- Plugins have NO commands. OBSERVED: `agy plugin validate fx` with `fx/commands/cmd.md` -> `⚠ commands: never loaded: plugins have no commands. Make each one a skill in skills/<name>/SKILL.md (`plugin install` converts Claude Code and Gemini CLI commands)`. With `--strict` this exits 1 ("validation failed in strict mode: 1 warning"). Changelog also: warns about "`commands/` folders and `workflows/` Markdown files (which plugins don't load)".
- OBSERVED quirk: `agy plugin install fx` printed `✔ commands : 1 installed (converted to skills) (cmd)` yet `list --json` still showed skills [alpha,beta,fx-delta] and no converted SKILL.md exists in the installed copy (only the copied `commands/cmd.md`). The binary string table contains "installed (converted to skills)". What name the converted skill gets at runtime: NOT DETERMINABLE. The repo's own generator emits `<plugin>-cmd-<name>` skills (e.g. `commit-tools-cmd-commit`), and the user's real installed bivouac plugin lists `bivouac-cmd-bivouac` in `agy plugin list --json` (OBSERVED, read-only). Whether that converts-on-import naming is agy's own: DOCUMENTED https://antigravity.google/docs/cli/gcli-migration/ `agy plugin import gemini` "converts files into native layout blocks" ("4 legacy commands converted to skills"), no naming given.
- Separate non-plugin "slash commands" exist as built-ins (`/model`, `/skills`, `/plugin`, `/agents`, `/compact`, ...). DOCUMENTED https://antigravity.google/docs/slash-commands/. No markdown/toml user-command mechanism is documented: slash-commands page does not mention one; gcli-migration page doesn't mention .toml. Global slash commands via `~/.gemini/antigravity-cli/skills/`: DOCUMENTED only as skills location (gcli-migration: "Global shared skills ... `~/.gemini/skills/` or `~/.gemini/antigravity-cli/skills/`"; without moving workspace skills to `.agents/skills/` agent won't treat them as "active slash commands"). So the "command" for agy IS a skill. (Binary also contains a "-cmd-.toml" fragment; unexplained, ignore.)

### 4. Argument hint
- Frontmatter field: NONE documented. OBSERVED: strings `argument-hint`, `argumentHint`, `user-invocable`, `allowed-tools` appear nowhere in the 197 MB binary's strings (grep on `strings` output, 0 hits); the loader's yaml-tag list contains `disable-model-invocation` (yaml:"disable-model-invocation") and `disable-slash-command`.
- OBSERVED: `fx/skills/alpha/SKILL.md` with `argument-hint: "[target] [--flag]"` and `fx/skills/beta` with `user-invocable: false` pass `agy plugin validate` and `--json` with no finding mentioning them (extra keys silently ignored, even under --strict as far as skills go). The only warning was commands/.
- Arguments: DOCUMENTED slash-command args are passed through (changelog: "a slash command receiving the collapsed [Pasted text #N] placeholder instead of the pasted content when its argument was pasted"). Display of a hint for skills: NOT DETERMINABLE (built-in commands show e.g. `[model]` hint, changelog).
- Related doc: https://antigravity.google/docs/build-plugins lists only name, description, disable-model-invocation, license, compatibility as SKILL.md fields.

### 5. Invocation control
- Model-should-not-auto-invoke (user-only): `disable-model-invocation: true`. DOCUMENTED build-plugins: "defaults to false. When true, the skill runs only when invoked explicitly." Field present in the loader (OBSERVED in binary strings: `yaml:"disable-model-invocation"`, proto `disable_model_invocation`).
- Model-only (hidden from user `/` menu): `disable-slash-command: true`. DOCUMENTED changelog: "Added a `disable-slash-command: true` flag for a skill's SKILL.md frontmatter, which hides that skill from the `/` menu and from `/name` resolution while leaving it discoverable and invocable by the model". OBSERVED real use: builtin skill `ui-plugin-navigation/SKILL.md` has `disable-slash-command: true` in its frontmatter (extracted in the isolated HOME).
- `user-invocable: false` (Claude Code name) has no effect (not in binary).
- Observed effect on the live menu: NOT DETERMINABLE (auth). `disable-slash-command` was not mentioned by `agy plugin validate`.
- So mapping: Claude `disable-model-invocation: true` == agy `disable-model-invocation: true` (same key). Claude `user-invocable: false` == agy `disable-slash-command: true`.

### 6. Name rules; stutter
- DOCUMENTED build-plugins: SKILL.md `name` "1-64 characters, kebab-case, must match the parent directory name. It is exposed as `/<name>` in chat." description 1-1,024 chars. https://antigravity.google/docs/skills says name optional, defaults to folder name; description required. Binary string: "lowercase letters, digits and single hyphens".
- OBSERVED (`agy plugin validate ed`): name != folder -> warning `name "other-name" doesn't match its folder "mismatch"`; a 70-char name only produced the folder-mismatch warning, no length warning; `Up_Case` and `a--b` (uppercase/underscore/double hyphen) produced NO finding. So validate enforces folder match and duplicates only, not charset/length (loader behavior for those NOT DETERMINABLE).
- Changelog: validate "warns when `name` or `description` is missing, when `name` doesn't match its folder, when the body is over the 24 KB limit"; skill body limit 24 KB.
- Stutter: OBSERVED `fx-delta` under plugin `fx` -> validate clean, `list --json` shows bare "fx-delta". DOCUMENTED changelog fix: no `/<plugin>:<plugin>:<skill>` double prefix when frontmatter name already includes the plugin prefix. Final display string NOT DETERMINABLE. Note the stated plugin name is a global key; skill name `fx-delta` itself is fine.
- Plugin name: lowercase kebab-case (validate warns otherwise, DOCUMENTED changelog); also "must match"? no; defaults to dir name.

### 7. Other things that affect SKILL.md rendering
- Only `name` and `description` are loaded at session start; body on demand (DOCUMENTED plugins/skills docs). Body cap 24 KB (changelog).
- Unquoted colons in `description:` used to break loading ("mapping values are not allowed in this context"), fixed in a prior release (changelog) - still quote to be safe.
- Description truncation in the picker: NOT DETERMINABLE. DOCUMENTED changelog: a slash command's completion hint is "shortened or left out" when it does not fit the last line.
- `metadata.icon` (emoji) in frontmatter shows next to skills in `/skills` and the autocomplete popup (changelog).
- `/skills` lists "grouped by where they came from"; `/skills reload` re-reads from disk; a newly installed plugin directory needs a restart (builtin plugin guide).
- `-p "/skills"` (and `/usage /quota /credits /model /effort /permissions /hooks /help /changelog /config`) is documented to answer in print mode as tab-separated records, or JSON with `--output-format json`, with no agent turn / quota use (changelog) - but it still requires a signed-in session (OBSERVED auth error). Flag `--disable-slash-commands` ("Disable slash command and skill expansion in print mode") (OBSERVED in `agy --help`).
- Skills loaded twice from standalone folder + enabled plugin was a fixed bug (changelog); `agy plugin import claude` converts Claude plugins (DOCUMENTED).
- OBSERVED: `agy plugin install` of a Claude-style `commands/` dir succeeds and does not fail the build; only validate warns.

### Addendum: logged-in session (agy 1.4.12, isolated HOME, 2026-11-02)
Everything above marked NOT DETERMINABLE for lack of login was re-run with a signed-in sandbox HOME. Fixture: plugins `fx` (alpha, beta with `disable-model-invocation`, fx-delta, gamma with `disable-slash-command` and `argument-hint`) and `fy` (alpha).
- OBSERVED `agy -p "/skills" --output-format json`: entries are named `fx:alpha`, `fx:beta` (`model_invocable:false`), `fx:fx-delta`, `fy:alpha`. Both `alpha` skills are listed; neither shadows the other. `fx:gamma` is absent from the list.
- OBSERVED print mode: `/fx:alpha` and bare `/alpha` both ran fx's alpha (bare chose `fx` over `fy`, one sample). `/fy:alpha` ran fy's. `/fx:fx-delta` and bare `/fx-delta` both ran. `/fx:beta` ran. `/fx:gamma` and bare `/gamma` ran even though gamma has `disable-slash-command: true`.
- OBSERVED TUI picker (pty-driven): typing `/` shows built-ins; typing `alp` shows `/fx:alpha  Alpha from fx...` and `/fy:alpha  Alpha from fy.`; typing `fx` shows `/fx:alpha`, `/fx:beta`, `/fx:fx-delta`. The row is `/<plugin>:<skill>  <description>`. No argument hint is shown for alpha (`argument-hint` in SKILL.md). gamma does not appear in the picker.
- CORRECTION to the print-mode results above (second logged-in session, plugins `fa`, `fx`, `fy`, `fz` all shipping `alpha`): a bare `/alpha` is not resolved by agy. With four `alpha` skills the model answered "Multiple plugins provide a skill named `alpha`" and asked which to run (`/fa:alpha` ... `/fz:alpha`). Earlier "`fx` wins" was the model's choice, not a rule. Bare `/beta` (a `disable-model-invocation` skill the model cannot see) answered "not a recognized slash command or available skill"; namespaced `/fx:beta` ran (7,848 input tokens vs about 10,000 for bare forms that the model resolved).
- OBSERVED TUI, typing then Enter: `/fx-delta` and `/beta` are completed by the picker to `/fx:fx-delta` and `/fx:beta`; `/gamma` (`disable-slash-command: true`) gives "Unknown command: /gamma"; `/fx:gamma` shows "No matches" in the picker, is sent as text, and the model reads gamma's SKILL.md and replies `GAMMA-FX`. So `disable-slash-command` removes the skill from the picker and from slash resolution while leaving it loadable by the model (the model-only intent).
- First-run onboarding (theme, Terms of Service and data-sharing consent, folder trust) blocks the TUI until completed by the user.

### Addendum: hint inside the description (agy 1.4.12, 2026-11-02)
- OBSERVED: `agy plugin validate` on a plugin whose skill description ends in `(usage: [overview|ready|blocked|priorities|epics] [--status <s>] [--priority <p>])` passes with one skill and no findings (other than the logo note). Listing it in the TUI picker needs a signed-in session and was not repeated; the picker shows the description text verbatim in every row observed so far.


<a id="opencode"></a>

## OpenCode

## OpenCode v2.2.5 findings (skills / commands / plugins)

Fixture: scratchpad/opencode-fixture/ (proj/, extra/, plug/ = copy of dist/plugins/commit-tools plus an extra `alpha` skill and clashing commands). Isolated via HOME + XDG_* env and my own `opencode serve --port 49778` (the user's background service on :49374 was never used). Listing probes: HTTP `GET /api/skill`, `GET /api/command` (basic auth `opencode:<password printed by serve>`, `location[directory]=<proj>`), the real TUI under tmux, and `opencode run --standalone -m opencode/big-pickle` (free model, 4 calls).
Doc sources: DOCUMENTED-V2 = https://opencode.ai/v2/docs/... (fetched through a summarising fetcher, so wording is paraphrase unless quoted). https://opencode.ai/docs/ is V1; the built-in `opencode` skill tells agents not to use it. The binary is V2 (`opencode serve` = "Start the v2 API and web server").

### 1. Bundle / manifest / what a plugin can carry
- DOCUMENTED (v2/docs/build/plugins/): a plugin is a package with a server part that "adds tools, hooks, integrations, commands, and agents"; the page does not mention skills. Definition `Plugin.define({ id, async setup(ctx) })`. Loaded from `.opencode/plugins/` automatically, or listed in `plugins` in opencode.json(c) (package name/version/local path, optional `options`). "A local plugin directory with a `package.json` `name` and `exports` loads its parts through them"; otherwise root files `server` (or `index`), `tui`, `rpc`. exports: "." = server, "./tui", "./rpc", "./gui-experimental".
- DOCUMENTED (v2/docs/build/plugins/server/): `ctx.skill.transform(editor)` with list/get/add/update/remove; a skill = id, name, description, path, content; update can toggle `autoinvoke`. `ctx.command.transform` editor `add({name, description?, execute(sessionID, prompt, delivery)})`. `ctx.agent.transform` list/get/default/update/remove. Each has `reload()`.
- OBSERVED: the repo's generated dist/plugins/commit-tools (index.js -> `createPlugin({id,root})`; runtime/opencode/runtime.mjs calls `ctx.skill.transform(e => e.add(skill))` and `ctx.command.transform(e => e.add({name, description, execute}))`) loaded via `"plugins":["<abs dir>"]` in opencode.json. Server log: `msg="loading plugin" id=<dir> entrypoint=file:///.../plug...`. `GET /api/skill` then listed commit-action, commit-style, review-commits, validate-commits; `GET /api/command` listed `commit`. So a plugin carries skills + commands (+ agents) through transforms, not through a directory convention.
- DOCUMENTED (v2/docs/migrate-v1/): rename `plugin` -> `plugins`; "V1 plugin implementations do not run in V2"; "Configured local paths must be directories"; `command` -> `commands`, `subtask` -> `subagent`, `permission` -> `permissions` (ordered array; `bash` -> `shell`, `task` -> `subagent`); skills dirs `.opencode/skill/` and `.opencode/skills/` both discovered.
- OBSERVED: `opencode plugin` subcommands: list, add ("Install a plugin and add it to the global configuration"), check, update, remove. Config schema (https://opencode.ai/config.json): `plugins` entries are a string or `{package, options}`; `plugin` is `deprecated: true`.
- Non-plugin route for skills: DOCUMENTED config `skills` = array of paths/URLs ("Additional paths or URLs to discover skills from"; the `{paths,urls}` object form is `deprecated` in the schema). OBSERVED: `"skills":["<abs>/extra"]` loaded `extra/alpha`; the object form `{"skills":{"paths":[..]}}` also loaded in my first run.
- Reload: DOCUMENTED (built-in skill text) "Config changes apply without a restart"; OBSERVED editing opencode.json / moving files changed `/api/skill` results within seconds.

### 2. How a user runs a skill; namespaces; collisions
- OBSERVED: skills are NOT in the `/` autocomplete. In the TUI the `/` picker lists commands only (agents, alpha, Bad Name, btw, cd, clear, commit, commit-tools, connect, continue...). `/gamm`, `/eps`, `/beta` (skill names) produced only unrelated fuzzy hits. `/skills` is a built-in command ("/skills  Skills") that opens a "Skills" dialog listing every skill (including hidden and permission-denied ones) with name + description; picking `eps` inserted the text `@eps` into the prompt (a mention, not an execution).
- DOCUMENTED (v2/docs/skills/): "Users can load a skill by mentioning `@skill-id` in a prompt. The page doesn't describe a slash-command form." The model loads by calling the `skill` tool with the ID.
- OBSERVED, direct user activation without a model: `POST /api/experimental/session/{sessionID}/skill {"id":"gamma","resume":false}` -> 204 and the session gets message `{"type":"skill","skill":"gamma","text":"gamma body\n"}`; unknown id -> 404 `SkillNotFoundError`. Worked for gamma/eps (autoinvoke false) and for beta (denied by permission).
- OBSERVED: `opencode run "/alpha hello world"` did NOT expand the command template ("Cmd alpha hello world"); the model called the `skill` tool with id alpha instead. `run` appears to send slash text as a plain prompt. NOT DETERMINABLE whether typing `/alpha x` + Enter in the TUI expands (I did not send it, to avoid model spend). The API route `POST /api/session/{id}/command {"name":"alpha","text":"zzz"}` DID expand: user message "Cmd alpha zzz".
- Namespaces: OBSERVED none. Plugin skills are listed by bare id (`commit-action`, not `commit-tools:commit-action`); the plugin command is `/commit`, not `/commit-tools:commit`. `opencode run "/commit-tools:alpha x"` just made the model load skill `alpha`. The plugin id is never used in a name.
- Skill ID = folder name (or stem of a root-level `x.md`), not the frontmatter name. DOCUMENTED ("The file path sets the skill ID, not the frontmatter `name`, which is only a display label") and OBSERVED: folder `mismatch/` with `name: other-name` -> API id `mismatch`, name `other-name`; the TUI Skills dialog shows `other-name`; the model-visible list and `skill` tool use `mismatch`.
- Skill collisions: DOCUMENTED "When two sources share an ID, the one registered later wins" (built-in, .claude/.agents, global OpenCode folder, project .opencode/skills, explicit config entries). OBSERVED, silent (the whole log has one WARN, unrelated): with `alpha` in `.claude/skills`, `.opencode/skills`, a config `skills` path, and the plugin, the winner order is config path > .opencode > .claude > plugin. (Removing one winner at a time revealed the next.) A plugin-registered `alpha` never beat any file/config source. Losers are invisible: one `alpha` entry, no warning.
- Command collisions: DOCUMENTED "Custom commands can replace built-in commands"; "later sources replace earlier ones with the same name; project overrides global; nearer overrides ancestors". OBSERVED, silent: user file `commands/review.md` + plugin `review` + builtin `review` -> one `review`, description "My review override" (file wins). File `alpha.md` vs plugin `alpha` -> file wins ("Alpha command"). With the files removed, plugin `review` ("Plugin review cmd") replaced the builtin and plugin `alpha` appeared. Order: builtin < plugin < file. No warning.

### 3. Command concept
- DOCUMENTED (v2/docs/commands/): locations `~/.config/opencode/commands/` and `.opencode/commands/`; `.md` files become commands; nested folders make slash names (`team/review.md` -> `/team/review`); also a `commands` map in config where `template` is required. Frontmatter: description, agent, model (`provider/model[#variant]`), subagent (true/false; `subtask` deprecated alias). The markdown body is the template. `$ARGUMENTS`, `$1..$n` (quotes group; highest placeholder takes the rest; missing -> empty); with no placeholder, arguments are appended after a blank line. ``!`cmd` `` shell injection. The page says nothing on name validation or skills.
- OBSERVED config schema (`Config.Command`): template, description, agent, model, subagent, subtask; `additionalProperties:false`.
- OBSERVED names, no validation: `Bad Name.md` -> `/Bad Name` (with a space), `UpperCmd.md` -> `/UpperCmd`, `team/rev.md` -> `team/rev`, `nodesc.md` with empty frontmatter -> listed with no description. Builtins seen in `/api/command`: init ("guided AGENTS.md setup"), review, goal ("keep working until an objective is met [pause|resume|clear]"); TUI-only ones in the picker: agents, btw, cd, clear, connect, continue, skills, worktrees... `Command.Info` in the OpenAPI document is `{name, description?}` only.
- A plugin registers commands with `ctx.command.transform(editor => editor.add({name, description, execute}))`; `execute` typically calls `ctx.session.prompt({...})` (the repo's runtime.mjs re-implements `$ARGUMENTS`/`$1` itself in `expandCommand`).
- Command -> skill: NOT DETERMINABLE as a built-in feature; the command schema has no field that references a skill. A template can say "use the X skill" in prose. (OpenAPI shows `session.command` request body has a `skills` attachment array of `{id, mention}`, so prompts can carry skill attachments, but no command frontmatter feeds it.)

### 4. Argument hint
- OBSERVED: no field exists. The command schema has no hint; `Command.Info` returns only name + description; the skill frontmatter parser in the binary accepts exactly `name, description, metadata, disable-model-invocation` (decompiled: `oO=i({name,description,metadata,"disable-model-invocation"})`); other keys are ignored. My `argument-hint: "<x>"` on command `alpha` and on skills `alpha`/`eps` was accepted and never surfaced (not in the API, not in the TUI). (The binary contains an `argumentHint` string in bundled Claude-plugin schema code; it is not OpenCode's loader.)
- OBSERVED TUI `/` picker: two columns, `/name` and description (truncated to width, about 55 chars, e.g. `/commit  Generate and create git commit messages with classic or`); fuzzy match on name; no hint column. Convention in the built-in `goal`: the hint is embedded in the description text (`... [pause|resume|clear]`).
- Skills dialog: name + description only.

### 5. Invocation control
- DOCUMENTED (v2/docs/skills/): `metadata.opencode/autoinvoke: false` or `disable-model-invocation: true` hides the skill from the model's list; if both are set `opencode/autoinvoke` wins; "Hidden skills stay registered and can still be loaded by ID". Permissions: action `skill`, resource = skill id, last matching rule wins; allow / ask / deny (deny = hide and block); globally under `permissions` or per agent under `agents.<id>.permissions`.
- OBSERVED (binary): `autoinvoke = metadata["opencode/autoinvoke"] ?? (disable-model-invocation ? false : undefined)`; booleans accept true/false/yes/no/on/off/1/0. `/api/skill` shows `autoinvoke:false` for `gamma` (disable-model-invocation: true) and `eps` (metadata opencode/autoinvoke: false). `user-invocable: false` is ignored (no such field).
- OBSERVED model effect (`opencode run`, "print each skill id in your skill tool list"): the list contained alpha, BadName, commit-action, commit-style, fx-delta, mismatch, opencode, report, review-commits, validate-commits. ABSENT: gamma and eps (autoinvoke false) and beta (`"permissions":[{"action":"skill","resource":"beta","effect":"deny"}]`). Built-in `browser` was also absent (not investigated).
- User-only (model cannot see, user can run): works. Autoinvoke-false and even permission-denied skills still appear in the TUI Skills dialog and can be activated through the API skill endpoint. Model-only (hidden from user): NOT DETERMINABLE, no mechanism found; every skill appears in `/skills`.
- Config key in V2 is `permissions` (ordered array of `{action, resource, effect}`; actions seen in schema: provider.use, tool.use, integration.connect, integration.use, mcp.use, skill.use, plugin.use; effects allow/deny; in config the short action `skill` is mapped to `skill.use`). The old `permission` map is `deprecated`; I only tested the V2 array form. `ask` not tested.

### 6. Name rules
- Skills: DOCUMENTED v2: "lowercase kebab-case, 1-64 characters. OpenCode doesn't currently enforce this." OBSERVED: `BadName/` with `name: BadName` loaded and listed; `mismatch/` with a different `name` loaded (id = dir). So no charset, length or dir==name check; IDs are case-sensitive. (V1 docs claimed regex `^[a-z0-9]+(-[a-z0-9]+)*$` and dir match; not enforced in 2.2.5.) DOCUMENTED: skills without a description are not advertised to the model. Code path: no frontmatter -> skipped "markdown"; schema failure -> skipped "frontmatter" (silent).
- Commands: no rules (see 3).
- Stutter: OBSERVED none added or removed; the plugin id is never part of a name. A plugin command I named `commit-tools` showed as `/commit-tools`. Repo's runtime BUILTIN_COMMANDS = ["init","review"] is the repo's own guard; OpenCode itself lets plugin commands replace builtins (observed with `review`), and the repo list omits `goal`.
- Repo claim, NOT independently tested: one invalid transform payload (empty string field) disables the entire plugin (runtime.mjs header comment).

### 7. Other effects on how the same SKILL.md appears
- Skill locations (DOCUMENTED + OBSERVED): project `.opencode/skills`, `.claude/skills`, `.agents/skills` (walked up to the project root) and the same under `~/.config/opencode`, `~/.claude`, `~/.agents`. OBSERVED `.claude/skills/alpha` loaded from the project, so a SKILL.md already in `.claude/skills` is also picked up by OpenCode (same id collapses, later source wins).
- Only `name`, `description`, `metadata`, `disable-model-invocation` are parsed. Claude fields (`argument-hint`, `allowed-tools`, `user-invocable`) have no effect.
- Skill body delivered to the model (OBSERVED tool output): `<skill_content name="alpha"># Skill: alpha ... body ...` plus "Base directory for this skill: <dir>" and a sampled `<skill_files>` list. Frontmatter is stripped. For plugin-registered skills, `content` and an absolute `path` are supplied by the plugin.
- Model list shows `id: description`; the TUI dialog shows frontmatter `name` (or id if absent) + description, so the two can differ.
- Built-in skills: opencode, report, browser.
- The user's global background service (port 49374) is shared; `opencode debug config`/`api` need `--standalone` (or your own `serve`) to see an isolated config.
- NOT DETERMINABLE: TUI Enter on `/alpha x` expansion; behaviour of `ask`; per-agent skill permissions; URL (`.well-known/skills`) catalogs; auto-discovery of generated packages from `.opencode/plugins/` (repo README also says untested).

### Addendum: skill id different from its folder (OpenCode 2.2.5, own `opencode serve` on an isolated HOME, 2026-11-02)
- OBSERVED: a copy of the built `commit-tools` plugin with `resources.json` edited so each skill `id` is `commit-tools-<name>` while `path` still points at `skills/commit-action/SKILL.md` and the other original folders. `GET /api/skill` lists `commit-tools-commit` (path ending `skills/commit-action/SKILL.md`), `commit-tools-commit-style`, `commit-tools-review-commits` and `commit-tools-validate-commits`. A command entry named `commit-tools-commit` appears in `GET /api/command`. So a plugin chooses the id; the shared folder is read in place and no copy is needed. Running a skill was not exercised.


<a id="pi"></a>

## Pi

## Pi v1.4.0 findings (skills, prompt templates, packages)

Paths. DOCS = /nix/store/3wfy0g8j2svx7h09dljlh6prygffsjr6-pi-coding-agent-1.4.0/lib/node_modules/pi-monorepo/docs ; SRC = .../pi-monorepo/dist (compiled JS of the installed package; the github repo itself was not read).
Fixture: <scratch>/pi-fixture/ (fx, fy, agent/ = isolated PI_CODING_AGENT_DIR, agent2/, proj/ = cwd).
Method: `PI_CODING_AGENT_DIR=<fixture>/agent PI_OFFLINE=1 pi install <fixture>/fx` then fy (writes only the isolated settings.json: `{"packages":["../fx","../fy"]}`), then `pi --mode rpc` + `{"type":"get_commands"}`, and the real interactive TUI under tmux (`pi --no-session --no-extensions`) typing `/al`, `/skill:`, `/fx`, `/alpha `. No model calls were made (no model/auth configured, none needed). Caveat: the user's ~/.agents/skills (microsoft-foundry, terminal-browser) are also loaded by Pi (read only) and appear in listings; ignore them.
Fixture content: fx = skills alpha (has `argument-hint`), beta (`disable-model-invocation: true`), fx-delta, Bad_Name; prompt alpha.md (`argument-hint: "<file> [mode]"`). fy = skill alpha, prompt alpha.md.

### 1. Bundle, manifest, layout
- DOCUMENTED (DOCS/packages.md): "Pi packages install and distribute extensions, skills, prompt templates, and themes as one unit." Term: "Pi package". "A package is an ordinary directory or npm package."
- DOCUMENTED (packages.md): conventional layout `package.json, extensions/, skills/, prompts/, themes/`; "Without a `pi` manifest, Pi discovers ... from those directories."
- DOCUMENTED (packages.md): manifest = `package.json` key `pi`: `{"pi":{"extensions":[...],"skills":["./resources/skills"],"prompts":["./resources/prompts/*.md"],"themes":[...]}}`; "Paths are relative to the package root. Arrays accept glob patterns and exclusions." Keyword `pi-package` makes an npm package eligible for the gallery. Optional `pi.image`, `pi.video`.
- DOCUMENTED: skill = directory containing SKILL.md, discovered recursively (skills.md). Conventional prompt dirs load direct `.md` children only; the manifest can select nested files with paths/globs (prompt-templates.md).
- OBSERVED: repo bundle dist/plugins/commit-tools/package.json has `"pi":{"skills":["./skills"],"prompts":["./prompts"],"extensions":["./runtime/pi/runtime.mjs"]}`; its prompts/commit.md has `argument-hint`. My fixture with only `pi.skills` + `pi.prompts` installed and loaded fine (`pi list` printed "User packages: ../fx ../fy").
- DOCUMENTED (packages.md): sources `npm:@x/y@1.0.0`, `git:github.com/x/y@v1`, URL, local path (not copied). `pi install <src> [-l]`; `-l` writes `.pi/settings.json`. `pi -e <src>` tries a package for one run.
- DOCUMENTED (packages.md): consumers can filter per type in settings: `{"source":..., "skills":[], "prompts":["prompts/review.md"]}` ([] = none, `!pattern`, `+path`, `-path`). Identity: npm by name, git by repo URL, local by resolved path.
- OBSERVED surprise: with `pi -e <dir>` (no install) the package's PROMPTS get `origin:"package"` but its SKILLS get `source:"cli", origin:"top-level"` (RPC get_commands: `alpha prompt ... temporary package` vs `skill:alpha skill cli temporary top-level`). With `pi install` both get `origin:"package"`, `source:"../fx"` (the string stored in settings.json), `scope:"user"`. So use `pi install`, not `-e`, when origin matters.
- The package.json `name` is NOT used anywhere in command names or display (see 2). Only the settings `source` string is used.

### 2. Invocation strings, namespace, display, collisions
- DOCUMENTED (skills.md): "use `/skill:name` when you need to force it"; "Arguments after `/skill:name` are appended to the loaded instructions as a user request: `/skill:pdf-tools extract report.pdf`". DOCUMENTED (prompt-templates.md): "The filename becomes the command name, so this template is available as `/review`."
- OBSERVED (RPC get_commands, installed fx): names `alpha` (source "prompt") and `skill:alpha`, `skill:beta`, `skill:fx-delta`, `skill:Bad_Name` (source "skill"). No package name in any command name. Skill command name = frontmatter `name`, falling back to parent dir name (SRC/core/skills.js `const name = frontmatterName || parentDirName`), as `skill:${skill.name}` (agent-session.js ~2757, interactive-mode.js ~536). Prompt name = filename minus .md (prompt-templates.js); frontmatter has no name field for prompts.
- DOCUMENTED-in-code (agent-session.js `_expandSkillCommand`): `/skill:name args` becomes `<skill name=".." location="..">\nReferences are relative to <baseDir>.\n\n<body without frontmatter>\n</skill>` then `\n\n<args>`. Unknown skill name: text passed through unchanged.
- Autocomplete prefix. DOCUMENTED-in-code (interactive-mode.js ~417-452):
  `getAutocompleteSourceTag`: undefined for builtin; scopePrefix = `u` (user) / `p` (project) / `t` (temporary); source "auto"|"local"|"cli" gives just the scopePrefix; source starting `npm:` gives `u:npm:<spec>`; a git URL gives `u:git:<host>/<path>[@ref]`; anything else gives the scopePrefix.
  `prefixAutocompleteDescription(desc, info)` = `[${tag}] ${desc}` (or `[${tag}]` if desc empty). Applied to prompt templates, extension commands and skills; NOT to built-in slash commands.
  The package NAME is never shown; only the install source spec for npm/git. For a local-path package the tag is just `[u]`/`[p]`, so it cannot distinguish packages.
- OBSERVED (tmux TUI, typed `/al`):
  ```
  → alpha                   <file> [mode] — [u] FX alpha prompt
    skill:alpha             [u] FX alpha skill. Reply with the single word FXALPHA.
    skill:terminal-browser  [u] A real browser ...
  ```
  `/skill:` showed `skill:Bad_Name  [u] invalid name chars.`, `skill:beta  [u] FX beta, model-invocation disabled.`, `skill:alpha  [u] ...`, etc. Typing `/fx` matched only `skill:fx-delta  [u] FX delta, name repeats package name.` (matching is on command name, not on package). The npm/git tag forms (`u:npm:...`, `u:git:...`) were NOT observed (offline, no remote package); they come from code only. With `-e` the tag would be `t` (source "cli", scope temporary) per code; not observed in TUI.
- OBSERVED startup header: `[Skills] alpha, Bad_Name, beta, fx-delta, ...` (bare names) and `[Prompts] /alpha` (with slash).
- Collisions between packages. DOCUMENTED (skills.md): "Name collisions keep the first discovered skill and produce a warning." OBSERVED at startup (fx listed before fy):
  ```
  [Skill conflicts]
    "alpha" collision:
      ✓ ../fx (user) .../fx/skills/alpha/SKILL.md
      ✗ .../fy/skills/alpha/SKILL.md (skipped)
  [Prompt conflicts]
    "alpha" collision:
      ✓ ../fx (user) .../fx/prompts/alpha.md
      ✗ .../fy/prompts/alpha.md (skipped)
  ```
  Prompts behave the same (resource-loader.js `dedupePrompts`: first wins, diagnostic type "collision"). RPC get_commands lists only fx's `alpha` and `skill:alpha`; fy's are dropped entirely, there is no auto-disambiguation. Only "fx earlier in settings wins" was observed; the general ordering between user dir, project dir and packages is read from loadSkills code (user dir, then project dir, then explicit paths) but not tested.
- Skill vs prompt with same name: no collision. OBSERVED: `alpha` (prompt) and `skill:alpha` coexist, no warning.
- Extension command vs prompt same name: DOCUMENTED (prompt-templates.md) "Extensions receive the raw input first through the `input` event unless an extension command with the same name handles it." Code: `_tryExecuteExtensionCommand` runs before template expansion, so the extension command wins. Extension-vs-extension duplicates get invocation names `name:2` (extensions/runner.js ~570). Extension vs built-in: warning "Extension command '/x' conflicts with built-in interactive command..." (interactive-mode.js). None of these run at runtime by me.

### 3. Prompt templates vs skills vs extension commands
- DOCUMENTED (slash-commands.md): "Each prompt template is available under its template name. Skills are available as `/skill:name` when skill commands are enabled. Extensions can register commands." (`pi.registerCommand()` is in extensions.md.)
- Locations. DOCUMENTED: skills `~/.pi/agent/skills`, `.pi/skills`, `~/.agents/skills`, `.agents/skills` (ancestors up to repo root), settings `skills`, packages; prompts `~/.pi/agent/prompts`, `.pi/prompts`, settings `prompts`, packages. Agent dir overridden by `PI_CODING_AGENT_DIR` (environment-variables.md; used here). Project-local files load only after project trust.
- OBSERVED: get_commands returns one merged list with `source` = "extension" | "prompt" | "skill" (builtin extensions `llama`, `mcp` appear as "extension"; built-in slash commands such as /model are NOT in get_commands).
- Can a skill be a top-level `/name`? NO. Only `/skill:<name>`; the prefix is hard-coded and no setting renames it. A top-level `/name` needs a prompt template (filename) or an extension command. Read from code, no counter-example found.
- `enableSkillCommands`: DOCUMENTED (settings.md) "Register skills as `/skill:name` commands." default true. OBSERVED with `{"enableSkillCommands":false}`: typing `/skill` shows no completions; `/al` shows only `alpha  <file> [mode] — [u] FX alpha prompt` (+ built-in `changelog`). Code: only interactive-mode.js:533 reads it (autocomplete list). OBSERVED: RPC get_commands with the setting false would be unaffected (code builds the list from all skills; RPC run with the setting false in agent2 still listed all `skill:*`). DOCUMENTED (skills.md) "manually entered `/skill:name` commands still work", and code confirms `_expandSkillCommand` never checks the setting (not executed, no model).

### 4. argument-hint
- Prompt templates. DOCUMENTED (prompt-templates.md): "`argument-hint` is optional. Use `<angle brackets>` for required arguments and `[square brackets]` for optional arguments." Code: frontmatter `argument-hint` (string) becomes `argumentHint`.
- OBSERVED where rendered: only in the autocomplete row, between the name and the description: `<name>  <argumentHint> — [tag] <description>`, e.g. `→ alpha                   <file> [mode] — [u] FX alpha prompt`. Not in the startup resource list and not in RPC get_commands output (fields: name, description, source, sourceInfo). After typing a space (`/alpha `) the menu closed with no hint shown.
- Skills. interactive-mode.js builds skill autocomplete items from `{name, description}` only. OBSERVED: fx `alpha` skill has `argument-hint: "[thing] [--flag]"` in SKILL.md; the row is `skill:alpha  [u] FX alpha skill. Reply with the single word FXALPHA.` The key is silently ignored (no warning, no hint). skills.js reads only `name`, `description`, `disable-model-invocation`. Extension commands also get no argumentHint in the list (only `getArgumentCompletions`).
- DOCUMENTED (skills.md): args after `/skill:name` are appended after the skill block as free text; no `$ARGUMENTS` substitution in skills. Prompt templates DO substitute `$1`, `$@`, `$ARGUMENTS`, `${1:-default}`, `${@:N}`, `${@:N:L}` (documented table; prompt-templates.js `substituteArgs`; shell-style quoting).

### 5. Invocation control
- Model-only / hide from user: only the global `enableSkillCommands: false`. It hides ALL `/skill:*` entries from interactive autocomplete; it is not per skill, and typed `/skill:x` still works. NOT DETERMINABLE: any per-skill user-hidden flag (skills.js reads only name, description, disable-model-invocation; searched docs skills.md/settings.md).
- User-only / hide from model: `disable-model-invocation: true` in SKILL.md frontmatter, strictly boolean (`frontmatter["disable-model-invocation"] === true`, so the string `"true"` would not count - from code). DOCUMENTED (skills.md): "Set `disable-model-invocation: true` in frontmatter when a skill should be available only through its explicit command."
- OBSERVED effect: ran `formatSkillsForPrompt` (SRC/core/skills.js) from node (`pi-fixture`/../sys.mjs) on fx/skills: `<name>` entries = Bad_Name, alpha, fx-delta; `beta` is omitted from the `<available_skills>` block of the system prompt. In the TUI `skill:beta` still appears in `/skill:` completions, so the user can invoke it. It is not access-protected: the model can still read the file if it knows the path.

### 6. Name rules
- DOCUMENTED (skills.md): "Names use lowercase letters, numbers, and hyphens, with no leading, trailing, or consecutive hyphens. They can contain at most 64 characters; descriptions can contain at most 1024." Code validateName: `/^[a-z0-9-]+$/`, <=64, no leading/trailing `-`, no `--`.
- OBSERVED: `name: Bad_Name` gives startup warning `name contains invalid characters (must be lowercase a-z, 0-9, hyphens only)` but the skill is STILL LOADED and usable as `skill:Bad_Name`. Only a missing/blank description or unparsable frontmatter stops loading (skills.js; skills.md "declared skills without descriptions are not loaded"). Over-long description: warning only.
- Directory match: DOCUMENTED (skills.md) "Pi neither requires nor warns when the declared name differs from the parent directory." Fallback to directory name if `name` is absent (code). A mismatch case was not run.
- Stutter: OBSERVED not applicable. fx with skill `fx-delta` appears as `skill:fx-delta  [u] FX delta...`; the package name is never prefixed, so nothing is stuttered or de-duplicated.
- Prompt names: filename stem; no charset validation in prompt-templates.js (invocation regex `^\/([^\s]+)`).

### 7. Other things that affect how the same SKILL.md appears
- Frontmatter keys Pi actually reads: `name`, `description`, `disable-model-invocation`. `license`, `compatibility`, `metadata`, `allowed-tools` are listed as portable fields (skills.md) but not used by the loader code. `argument-hint` and any other keys are ignored silently.
- The description is shown verbatim in autocomplete (full text, only clipped by terminal width) after the `[u]` tag, and in the system prompt as XML `<skill><name>..</name><description>..</description><location>..</location></skill>` (XML-escaped); the model is told to read the file at `<location>`.
- Discovery: a dir with SKILL.md is a skill root and is not recursed further; `.gitignore/.ignore/.fdignore` honoured; dot-dirs and node_modules skipped; symlink duplicates silently skipped; loose `.md` files in a skills root count as skills only if they have a `description`.
- Repo: dist/plugins/commit-tools/skills for Pi contains commit-action, commit-style, review-commits, validate-commits (OBSERVED via ls), plus prompts/commit.md; so `/commit` (prompt, with argument-hint) and `/skill:commit-action` etc. are the expected commands (inferred from code + fixture behaviour; the repo package itself was not loaded).
- `/reload` reloads skills and prompts. CLI: `--skill <path>`, `--prompt-template <path>`, `--no-skills`, `--no-prompt-templates` (pi --help).
- Not tested: real model use of any skill/prompt (0 model calls), npm/git source tags, project scope (`.pi/settings.json`, needs trust), the expanded `/skill:` text actually sent, name-vs-directory mismatch.

### Addendum: name versus folder (Pi 1.4.0, isolated agent dir, 2026-11-02)
- OBSERVED: a package with `skills/backlog/SKILL.md` (`name: craft-backlog`) and `skills/setup/SKILL.md` (`name: craft-setup`), installed with `pi install` and read with `pi --mode rpc` `get_commands`, lists `skill:craft-backlog` and `skill:craft-setup`. The folder name is not used. No warning on stderr. A prompt `craft-backlog.md` with `argument-hint` lists as `craft-backlog` (source `prompt`). No model call was made, so running the skill was not exercised.
