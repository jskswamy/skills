# Harness dictionary

Standing reference for how each supported harness (Claude Code, Codex,
Antigravity, OpenCode, Pi) names, shows and runs a skill, plus the vocabulary
this repo uses for it. Keep it. Edit it when a harness changes or a new one is
added; do not rely on memory or on docs alone.

omp (oh-my-pi 18.16.0, added 2026-11-10) is not yet a column in the tables
below; its evidence is the omp section of
[`docs/harness-research.md`](docs/harness-research.md#omp). In short: plugin
commands are `/<plugin>:<command>`, skills `/skill:<name>`, agents go by
frontmatter name, MCP tools are `mcp__<plugin>_<server>_<tool>`, and hooks run
only as JS extensions (`hooks.json` is never read).

How it was built: one research pass per harness against the installed binary
plus its documentation and source. The raw evidence (commands run, output,
quotes) is in [`docs/harness-research.md`](docs/harness-research.md):
one section per harness: Claude Code, Codex, Antigravity, OpenCode, Pi.

Tags: **D** = documented, **O** = observed by running the harness,
**?** = could not be determined (reason given). Versions tested: Claude Code
2.1.314, Codex 0.166.0, Antigravity (agy) 1.4.12, OpenCode 2.2.5, Pi 1.4.0, on
2026-11-02. Re-check a cell before relying on it for a newer version.

To refresh a harness: build a throwaway plugin (skills with `argument-hint`,
user-only, model-only, a name that repeats the plugin, a second plugin with the
same skill name), load it in an isolated config directory, and record the
listing, the picker and what each typed form runs. Never use the real config.

## 1. Repo vocabulary (settled)

Use these terms in docs, code comments, commit messages and reviews. The right
column says what to say instead.

| Term | Meaning | Do not say |
|---|---|---|
| Skill | The unit: one `SKILL.md`, shared by every harness. | "command" for a skill |
| Plugin | The repo's bundle of skills, hooks and agents (`registry.json`). Pi calls it a package; OpenCode's own "plugin" is a code module that registers the bundle. | "package" for the repo's bundle |
| Invocation form | The exact text a user types or picks on one harness (`/craft:backlog`, `$craft:backlog`, `/skill:backlog`). | "the command" |
| Namespace | The `plugin:` prefix a harness puts in the invocation form. Claude Code, Codex and Antigravity have it; Pi and OpenCode do not. | "prefix" for anything else |
| Bare name | An invocation form without the namespace. | |
| Argument hint | Usage text shown beside the invocation form. | |
| Picker | The list a harness shows when the user starts typing an invocation form. | "menu" |
| Picker line | The short text (at most 120 characters, hint condensed into it) a runnable skill carries in `metadata.short-description`, shown beside its invocation form in a picker. The skill's long `description` stays for the model. | "short description" for anything else |
| Runnable skill | A skill a user can run by name. The opposite of a model-only skill. | |
| User-only skill | The model does not see it; the user can run it. | "manual skill" |
| Model-only skill | The user cannot run it; the model can load it. | "background skill" |
| Command file | A hand-written `commands/<plugin>/*.md` in this repo. It forwards to a skill and holds no logic. Claude Code calls this format "older"; its commands "have been merged into skills". | "slash command" |
| Wrapper | A generated, harness-native entry whose only job is to make a skill runnable by name there: a Pi prompt, an OpenCode command, a Codex or Antigravity `<plugin>-cmd-<name>` skill. | "shim" |
| Migrated skill | A skill Codex generates by itself from a plugin's `commands/` at install (`source-command-<file>`). Not ours. | |

A harness's own feature keeps its own name when we describe that harness only:
Claude Code "command", OpenCode "command", Pi "prompt template", Codex
"custom prompt" (deprecated, inert in 0.166).

## 2. What each harness calls things

| Concept | Claude Code | Codex | Antigravity | OpenCode | Pi |
|---|---|---|---|---|---|
| Bundle | plugin (D, O) | plugin (D, O) | plugin (D, O) | "plugin" = a JS module that registers skills, commands and agents through `ctx.*.transform` (D, O) | "package" (D) |
| Manifest | `.claude-plugin/plugin.json`, optional (D) | `.codex-plugin/plugin.json`, `.claude-plugin/plugin.json` or root `plugin.json` (O) | `plugin.json` or `.antigravity-plugin/plugin.json` (D, O) | `plugins` array in `opencode.json`; module with `Plugin.define` (D, O) | `package.json` key `pi` (D, O) |
| Skill folder | `skills/<name>/SKILL.md` | `skills/` by default, or the manifest `skills` path (O) | `skills/<name>/SKILL.md` (D, O) | any skills path; skill ID is the folder name (D, O) | `skills/`, found recursively (D) |
| Separate "command" concept | commands, flat `.md` files, "merged into skills" (D) | none for plugins (D). Custom prompts are deprecated and inert (O). | none; plugins load no `commands/` (O) | yes, `commands/*.md` or `ctx.command.transform` (D, O) | prompt templates (`prompts/*.md`) and extension commands (D, O) |

## 3. How the user runs a plugin skill

| | Claude Code | Codex | Antigravity | OpenCode | Pi |
|---|---|---|---|---|---|
| Invocation form | `/plugin:skill` (D, O) | `$plugin:skill` (O) | `/plugin:skill` (O). Docs conflict: one page says `/skill`. | no slash form. `/skills` dialog inserts `@skill-id` (O). A command is `/name`. | `/skill:name args` (D, O). A prompt is `/name`. |
| Namespace | `plugin:` always (O) | `plugin:` always (O) | `plugin:` always (O) | none (O) | none (O) |
| Bare name works | `/alpha` ran a skill; which plugin wins a clash is unknown. Whether Claude Code or the model resolved it was not separated (O, one sample) | **no**: `$alpha` resolved nothing (O) | **no** in the harness. The TUI turns `/fx-delta` into the picker row `/fx:fx-delta` and says "Unknown command" for a hidden one. In print mode the text goes to the model: it ran a unique visible skill, listed the choices when four plugins had `alpha`, and refused user-only `beta` (O) | n/a | n/a |
| Picker row | `/plugin:skill` (O in init, picker ?) | `skill (plugin)  [Skill] description` (O) | `/fx:alpha   <description>`, full `plugin:skill` name (O) | `/name` + description, about 55 chars (O) | `name  <hint> — [u] description`; tag is `u`/`p`/`t`, never the package (O) |
| Two plugins, same skill | both load (O) | both listed (O) | both listed in `/skills` and the picker, no shadowing (O) | silent: config path > `.opencode` > `.claude` > plugin (O) | first in settings wins, startup warning, other dropped (O) |
| Name repeats the plugin | stutters: `fx:fx-delta` (O) | stutters: `commit-tools:commit-tools-cmd-commit` (O) | stutters: `/fx:fx-delta` (O) | not applicable | not applicable |

## 4. Argument hint

| | Claude Code | Codex | Antigravity | OpenCode | Pi |
|---|---|---|---|---|---|
| Field | `argument-hint` on skills and commands (D) | none; ignored in SKILL.md (O) | none; ignored; picker shows no hint (O) | none; ignored (O) | `argument-hint` on prompt templates only; ignored in SKILL.md (O) |
| Where shown | autocomplete (D); headless ? | nowhere | nowhere | nowhere (O in the picker); built-in `/goal` writes it into the description (O) | autocomplete row only, between name and description (O) |
| Picker description column | the description | `agents/openai.yaml` `interface.short_description`, then `metadata.short-description`, then `description` (O) | ? | description only | description |

## 5. Invocation control

| Want | Claude Code | Codex | Antigravity | OpenCode | Pi |
|---|---|---|---|---|---|
| User-only (model cannot see) | `disable-model-invocation: true` (D, O) | `agents/openai.yaml` `policy.allow_implicit_invocation: false` (O) | `disable-model-invocation: true` (D) | `disable-model-invocation: true` or `metadata.opencode/autoinvoke: false` (D, O) | `disable-model-invocation: true` (D, O) |
| Model-only (user cannot run) | `user-invocable: false` (D, O) | none found (?) | `disable-slash-command: true`: gone from `/skills` and the picker; the harness does not run it as a slash command (`/gamma` gives "Unknown command"), but the model can still load it, so typing `/fx:gamma` ends with the model reading the skill and replying (O) | none found (?) | global `enableSkillCommands: false` only; typing still works (O) |

## 6. Name rules

| | Claude Code | Codex | Antigravity | OpenCode | Pi |
|---|---|---|---|---|---|
| Stated rule | none found for skills (D) | name 64 chars max; `SKILL.md` description unlimited in tests (1025 loads); `short_description` 1024 max, over-length dropped for that field only (D, O) | 1–64, kebab-case, matches folder (D) | lowercase kebab, "not enforced" (D) | lowercase, digits, hyphens, 64 max (D) |
| Enforced | no (O) | length and empty description only (O) | folder match and duplicates only (O) | no (O) | warns only; skill still loads (O) |
| Frontmatter `name` vs folder | init id came from the folder (O) | frontmatter name wins (O) | validate warns on mismatch (O) | the id is what the plugin registers: a plugin can register `commit-tools-commit` for a skill in folder `commit-action` (O); for a file-discovered skill the folder is the id (D, O) | frontmatter name, folder as fallback; a folder `backlog` with `name: craft-backlog` lists as `skill:craft-backlog` with no warning (O) |

## 7. Findings that bear on this repo

1.  **Codex converted our commands a second time (fixed).** At install, Codex
    turns a plugin's `commands/*.md` into a skill named
    `<plugin>:source-command-<file>`. It drops `argument-hint` and skips any
    command whose body has `$ARGUMENTS` or `$1`. With `commands/` in the shared
    bundle, `commit-tools` listed both `commit-tools:commit-tools-cmd-commit`
    (ours) and `commit-tools:source-command-commit` (Codex's). (O) Fixed by a
    Codex-only bundle at `dist/codex/plugins/<plugin>/` with no `commands/`;
    checked on Codex 0.166: 10 plugins, 59 skills, 23 `-cmd-` skills, no
    `source-command-*`.
2.  **What stops Codex's conversion.** A root `plugin.json` whose `$schema` is
    `https://agent-plugins.org/schemas/1.0.0/plugin.schema.json` makes Codex skip
    it (alone or beside `.codex-plugin`); a plugin with only
    `.codex-plugin/plugin.json` is converted. The repo's root `plugin.json`
    carries Antigravity's schema, which Codex treats as unrelated. (O, see
    `docs/harness-research.md`)
3.  **A bare name cannot work on Codex.** `$alpha` resolved nothing; only
    `$plugin:skill` does. One identical bare name everywhere is not reachable.
    (O)
4.  **Claude Code: a plugin's command beat its same-named skill.** The docs say
    the skill wins, but that table covers non-plugin locations. (O, one sample)
5.  **Antigravity is namespaced, and only the namespaced form is a slash
    command.** With a logged-in session, `/skills` and the picker show
    `fx:alpha`, and `/fx:alpha` runs it in the harness. A bare `/alpha` is
    not resolved by the harness: in print mode it is plain text for the model,
    which asked which of four `alpha` skills to run, so there is no
    "first plugin wins" rule. (O)
6.  **Antigravity plugins load no `commands/`.** `agy plugin validate` warns
    "plugins have no commands". `agy plugin install` says "1 installed
    (converted to skills)" but no skill appeared. The generated `-cmd-` skills
    are the only route confirmed to work. (O)
7.  **OpenCode runs commands, not skills, from a slash.** `opencode run "/alpha x"`
    did not expand the command; the model loaded the skill. Whether the TUI
    expands it was not tested. (O)
8.  **Pi `-e` vs `pi install`:** with `-e`, a package's skills report
    `origin: top-level` while its prompts report `package`. (O)
9.  Frontmatter keys one harness reads are silently ignored by the others, so a
    single `SKILL.md` can carry all of them. (O in all five)
10. **Skillshare discovers per-harness trees only through root catalogs and
    requires unscoped `package.json` names.** Skillshare (0.28.2) does not walk
    `dist/`; it reads `.agents/plugins/marketplace.json` (Codex),
    `.claude-plugin/marketplace.json` (Claude Code), `.plugin/marketplace.json`
    (OpenCode), and `marketplace.json` (Pi) in order and merges entries whose
    plugin `name` matches. If `dist/pi/plugins/<name>/package.json` or
    `dist/opencode/plugins/<name>/package.json` uses a scoped `"name":
    "@jskswamy/<name>"`, Skillshare normalizes it to `jskswamy-<name>`, flags
    `catalogNameDiffers`, and silently drops the Pi and OpenCode targets on
    merge. Keep per-plugin `package.json` `"name"` equal to `"<name>"`. (O)

## 8. Verified during the design review (2026-11-02)

Checks run against the real harnesses in isolated configs, to settle findings
from the review of `docs/superpowers/specs/2026-11-02-consistent-skill-invocation-design.md`.
Raw evidence is in the addenda of the files under `docs/harness-research.md`.

| Question | Harness | Result |
|---|---|---|
| Does a skill whose frontmatter `name` differs from its folder load? | Pi 1.4.0 | Yes. Folder `backlog` with `name: craft-backlog` lists as `skill:craft-backlog`; no warning. The folder name is not used. (O) |
| Can a plugin register a skill id that differs from its folder, with the file read in place? | OpenCode 2.2.5 | Yes. A plugin entry with id `commit-tools-commit` and path `skills/commit-action/SKILL.md` appears in `GET /api/skill`; a command `commit-tools-commit` appears in `GET /api/command`. Running the skill was not exercised. (O) |
| What happens at the length cap of the Codex picker text? | Codex 0.166.0 | `agents/openai.yaml` `interface.short_description` of 1024 characters is kept; 1025 is dropped for that field only, and `display_name` in the same file survives. A `SKILL.md` description of 1025 characters still loads. (O) |
| Does a hint written into a skill description pass validation? | Antigravity 1.4.12 | `agy plugin validate` passes with no findings. The picker was not re-checked (needs a login); every row seen so far shows the description verbatim. (O) |
| How long is a real description plus hint in this repo? | n/a | Longest skill description 375 characters, longest command hint 140, so at most about 525, far below every limit above. (O, repo) |

### Round 2 (2026-11-03): run end to end

| Question | Harness | Result |
|---|---|---|
| Does a skill under a different `name` than its folder run? | Pi 1.4.0 | Yes. `/skill:craft-backlog show ready` sent the model the file's body (frontmatter stripped), then `show ready`. A mock model server logged the request. (O) |
| Does an explicit `pi.skills` list also load a sibling `skills/`? | Pi 1.4.0 | No. Only the listed folder is registered, by `pi install` and by `pi -e`. (O) |
| Does a prompt template with no placeholder keep its arguments? | Pi 1.4.0 | No. `/craft-backlog some args` reached the model without `some args`. The prompt does not load the skill either. A prompt and a skill of the same name coexist as `craft-backlog` and `skill:craft-backlog`. `argument-hint` is absent from `get_commands`. (O) |
| Does a plugin command expand on a slash? | OpenCode 2.2.5 | In the TUI and through `POST /api/session/{id}/command`, yes (`$ARGUMENTS` and `$1` expand). `opencode run "/craft-backlog x y"` does not: the model gets the literal text. `opencode run` has no `--command` flag. (O) |
| Does a skill registered under an id different from its folder run? | OpenCode 2.2.5 | Yes. `POST /api/experimental/session/{id}/skill` and the model's skill tool both return the body for `commit-tools-commit` from `skills/commit-action/`. (O) |
| Which wins when a user skill has the plugin skill's id? | OpenCode 2.2.5 | The user file, from `.opencode/skills` and from `.claude/skills`. `/api/skill` shows one entry and nothing is logged. (O) |
| Which skills does an installed plugin load when it has `skills/` and `skills.json`? | Antigravity 1.4.12 | The union of both. A shared root with only `.claude-plugin/plugin.json` fails `agy plugin validate`; `.antigravity-plugin/plugin.json` is needed and `.claude-plugin` is ignored. (O) |
| What happens when both define the same skill name? | Antigravity 1.4.12 | One listing: the skill declared by `skills.json`, named with its path (`s1:..:other:dup`). `/s1:dup` ran the declared copy. The `skills/` copy never appears. (O) |
| Does `disable-slash-command: true` hide a skill? | Antigravity 1.4.12 | TUI: absent from the picker, `/hidden` gives "Unknown command", `/s1:hidden` goes to the model as text. Print mode runs both forms. (O) |
| How does the picker show a long description with a hint at the end? | Antigravity 1.4.12 | One line per skill. A 505-character description was cut near 140 characters at 140 columns, so the hint was lost; `/skills` in print mode shows the full text. Short descriptions, hint included, show in full. Other widths were not tested. (O) |
| What does Codex show in its skill popup? | Codex (docs) | `interface.short_description`, falling back to the description. The runtime cap is 1024 characters; the skill-creator docs recommend 25 to 64. (D) |

### Round 3 (2026-11-03): the proposed per-harness trees, hand-built for a demo plugin

| Question | Harness | Result |
|---|---|---|
| Does `plugin validate` accept a quoted hint with `\|`, `[`, `<`, `>` and `user-invocable: false`, and what does the listing show? | Claude Code 2.1.314 | Passes (only a missing-`author` warning). The init listing shows `demo:backlog` and `demo:commit` and omits the model-only skill; it carries no hint. (O) |
| Does the new tree (name differs from folder, explicit `pi.skills`) start cleanly and keep prompt arguments? | Pi 1.4.0 | No diagnostic at startup; `Arguments: $ARGUMENTS` in the prompt delivers the arguments; `/skill:name` injects the body without rewriting references; the model-only skill is listed as a skill with no prompt. (O) |
| Does the new tree start cleanly, and does a command, a skill-by-id load and a cross-reference work end to end? | OpenCode 2.2.5 | Yes, with no warning. Built-in commands are `init`, `review`, `goal`; the runtime's `BUILTIN_COMMANDS` lists only the first two. Loading is lazy: the first skills call after boot was empty. (O) |
| What does `skills/list` return for a short description and a long one? | Codex 0.166.0 | `shortDescription` is the `agents/openai.yaml` text verbatim and `description` stays plain. 1000 characters kept, 1100 dropped (the skill still lists); the model-only skill is listed and enabled. (O) |
| Does Codex read `metadata.short-description` from `SKILL.md` without an `agents/openai.yaml`? | Codex 0.166.0 | Yes. `skills/list` returns the nested value verbatim as `shortDescription`; a skill with neither field returns null; a skill with both keeps both (`shortDescription` from the metadata, `interface.shortDescription` from the yaml). Which one the TUI picker shows when both exist was not run; the first round saw the picker prefer the yaml. (O) |
| Does the standalone tree validate, install, list and show the hint? | Antigravity 1.4.12 | Yes. Offline: 3 skills, bare names, no path prefix, no duplicates. Live: `/skills` shows the hint verbatim and omits the `disable-slash-command` skill. The TUI picker shows about 120 characters of description at 140 columns: a 60-character description plus hint showed in full, a 400-character one was cut and lost the hint. `/demo:task-commit` in print mode still ran the hidden skill. (O) |

### Round 4 (2026-11-03): the latest design (picker lines, a user-only forwarding skill)

| Question | Harness | Result |
|---|---|---|
| Do `metadata.short-description`, `disable-model-invocation` and `user-invocable: false` validate and list? | Claude Code 2.1.314 | Yes. `plugin validate` is clean; the init listing shows the user-only skill and omits the `user-invocable: false` one. Whether the model sees the user-only skill needs a model call. (O) |
| Is `shortDescription` the picker line with no `agents/openai.yaml`; are the flags visible? | Codex 0.166.0 | `shortDescription` equals the line exactly. `user-invocable` and `disable-model-invocation` are not visible in `skills/list`; both skills are listed and enabled; no stderr diagnostics. (O) |
| Does `disable-model-invocation` hide a skill from the model, and does its prompt wrapper work? | Pi 1.4.0 | It removes the skill from the system prompt's available skills; `/skill:name` still injects the body. The prompt that says "invoke the skill" cannot work for it (no skill tool, no location), so such a skill's wrapper must carry its own body. (O) |
| Same, for `autoinvoke:false` | OpenCode 2.2.5 | The model's available-skills list omits the skill; the skill tool and the API still load it by id; a command that says "invoke the skill" worked after one wasted file search. (O) |
| Do five skills with nested `metadata:`, `disable-model-invocation` and a picker-line-first description validate, install and list? | Antigravity 1.4.12 | Yes, offline: 5 skills, bare names, no findings beyond the no-logo note. The live picker was not rerun this round. (O) |

## 9. Upstream status and known risks

Open requests and reports that bear on this repo's naming choices, as found on
the trackers. Re-check them before relying on any of this.

| Harness | Item | Status | Why it matters |
|---|---|---|---|
| Pi | [#7073](https://github.com/earendil-works/pi/issues/7073) Support Claude Code skill namespaces | Closed as not planned on 2026-07-24 by a new-contributor gate, not on its merits. An earlier PR (#6683) closed the same way. | Pi has no namespace and no decision either way. |
| OpenCode | [#49108](https://github.com/anomalyco/opencode/issues/49108) Explicit skill sources and source-qualified duplicates | Open since 2026-09-15; the comments are a bot and contributors, no maintainer answer. It links #31977, #32202, #7575, #25119, #41288, which were not read. | OpenCode has no namespace either. The report also describes a failure building the system prompt when two roots hold a same-named skill (on the `dev` branch). |
| OpenCode | [#61198](https://github.com/anomalyco/opencode/issues/61198) The skill tool loops on an invalid id instead of falling back | Open | A skill that tells the model to load `plugin:skill` when the registered id is `plugin-skill` can send the model into this loop. |
| Codex | Custom prompts | Documented as deprecated; `/prompts:name` gives "Unrecognized command" in 0.166 | Codex has no command concept for plugins; only skills. |
| Claude Code | `commands/` | "Merged into skills"; still works | A command file and a same-named skill in a plugin: the command ran (one observation). |

Behavior on a clash with a skill the repo does not control (third-party or the
user's own), as observed:

*   Pi keeps the first skill found, drops the rest and prints a startup warning.
*   OpenCode settles it silently. A skill file in a project or user folder beats
    a plugin's skill, so the plugin's skill does not run.
*   Claude Code, Codex and Antigravity keep both, because the plugin name is part
    of the skill name.

### Round 5 (2026-11-03): `when_to_use` and an in-place marketplace update

| Question | Harness | Result |
|---|---|---|
| Does a short `description` plus `when_to_use`, a quoted `argument-hint` and nested `metadata` validate and list? | Claude Code 2.1.314 | Yes. `plugin validate` passes with README, LICENSE and icon notes only; the skill lists as `craft:backlog` (about 70 tokens for description plus when_to_use). Which text the `/` menu renders was not observed (tmux was unavailable in the sandbox). (O) |
| Does an installed plugin follow a marketplace `source` that moves and a renamed skill? | Claude Code 2.1.314, directory marketplace, isolated config | Yes. `marketplace update` then `plugin update` moved the install from `dist/plugins/craft` (skill `craft-backlog`, 1.0.0) to `dist/claude-code/plugins/craft` (skill `backlog`, 2.0.0); the version bump was needed to trigger the update. A git-sourced marketplace was not run: Claude Code rejects a `file://` source (it accepts `owner/repo`, an `https://` URL or a path), so that case needs a pushed branch. (O) |

## 10. Still unknown

*   Claude Code: where `argument-hint` and `when_to_use` render in the `/` menu
    (headless only), and whether Claude Code or the model resolves a bare `/alpha`.
*   OpenCode: a clash between two plugins that register the same id.
*   Pi: npm and git source tags; project-scope behavior. (The prompt's
    `argument-hint` was observed in the interactive autocomplete row in the first
    round, `docs/harness-research.md` section 4; `get_commands` omits it.)
*   Codex: no model reply was ever obtained (usage limit); explicit resolution
    was read from the session rollout instead.
*   Antigravity: the picker at other terminal widths.
