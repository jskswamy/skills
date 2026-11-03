# Consistent skill names and argument hints across harnesses

*   **Author:** Krishnaswamy Subramanian
*   **Status:** Draft, revised 2026-11-03 after the round-5 review
*   **Date:** 2026-11-02 (first draft)

Terms follow section 1 of [`harness_dictionary.md`](../../../harness_dictionary.md).
Harness behavior below is sourced there and in
[`docs/harness-research.md`](../../harness-research.md); repo counts are
measurements. "Step N" refers to the Detailed Implementation Plan at the end.
The dictionary and the research file are committed with this spec. Raw output
exists for the first research round only; later results are recorded in
dictionary section 8 and Appendix A, which says which rows are runs and which are
documentation.

**Governing principle.** Each harness receives each resource through its own
native mechanism: a skill as a skill, a slash entry as the prompt template or
command file where the harness has one, a picker line in the field the harness
reads. The build never emulates one harness's feature on another and never
makes one harness read another's files.

## Glossary

*   **Harness:** a coding agent this repo ships to: Claude Code, Codex,
    Antigravity, OpenCode, Pi.
*   **Plugin:** this repo's bundle of skills, hooks and agents. There are ten:
    `bivouac`, `devenv`, `commit-tools`, `jot`, `craft`, `sketch-note`,
    `typst-notes`, `codebase`, `study`, `refactor`.
*   **Harness tree:** `dist/<harness>/plugins/<plugin>/`, generated for one
    harness and read by that harness only. No tree is shared (decision 4).
*   **Owner:** the repository owner (the author above), who makes the decisions
    recorded below.
*   **Hook, agent, template, registry:** a hook is a script a harness runs on an
    event; an agent is a sub-agent prompt under `agents/`; a template is a static
    asset under `templates/`; the registry is `registry.json`, which lists each
    plugin's resources.
*   **Wrapper:** a generated entry in a harness's native slash-entry format that
    makes a skill runnable by a short name: a Pi prompt template, an OpenCode
    command. The dictionary also counts the `<plugin>-cmd-<name>` skills this
    change removes as wrappers; this document narrows the term on purpose.
*   **Model-only skill:** a skill whose frontmatter has `user-invocable: false`.
    The model may load it; a user does not run it by name.
*   **Invocation form:** the exact text a user types for a skill on one harness.
*   **Runnable skill:** any skill that is not model-only.
*   **beads:** the issue tracker the `craft` plugin drives.
*   **Picker line:** a line of at most 120 characters, with the hint condensed
    into it, that a runnable skill carries in `metadata.short-description`. The
    build puts it into the field each harness shows in its picker. The longer
    `description` stays for the model.

--------------------------------------------------------------------------------

## Overview

This repository ships the same plugins to five harnesses. A user who runs the
backlog skill sees a different invocation form and a different argument hint in
each harness. This design makes the typed name differ only in the separator and
the leading character. It carries the hint in a native field where a harness has
one and in a short picker line elsewhere. It deletes the hand-written command files and the generated
`<plugin>-cmd-<name>` skills that cause part of the difference, and it gives
every harness its own generated tree so that no harness reads another harness's
files.

## The Problem

The repo's command files are written once in Claude Code format, and each
harness adapter converts them in its own way:

*   **Invocation forms differ.** Claude Code: `/craft:backlog`. Codex:
    `$craft:backlog`. Antigravity: `/craft:backlog`. Pi: `/backlog` for a wrapper
    and `/skill:craft-backlog` for the skill. OpenCode: `/backlog` for a wrapper,
    and no slash form for a skill.
*   **The plugin name appears twice.** Skills are named `craft-backlog`,
    `study-coach` and so on, and Claude Code, Codex and Antigravity add the
    plugin name themselves, so the user sees `craft:craft-backlog`. The
    generated skills, `commit-tools-cmd-commit`, repeat it again.
*   **Argument hints are not shown everywhere.** Claude Code accepts the
    `argument-hint` field on skills and Pi on prompt templates only. Codex,
    Antigravity and OpenCode have no field for it.
*   **One tree is read by several harnesses.** Claude Code, Pi and OpenCode build
    into the same `dist/plugins/<plugin>/`, and Antigravity's discovery manifest
    is written into it too. Whatever one harness needs (a hint in the
    description, a hidden flag) lands in files the others read.

The causes lie in the harnesses (observed or documented, as marked in dictionary
sections 2 to 6 and 9; issue status is tracker state as of 2026-11-03):

*   Claude Code, Codex and Antigravity namespace plugin skills as `plugin:skill`.
    Pi and OpenCode do not namespace. Pi's request
    ([#7073](https://github.com/earendil-works/pi/issues/7073)) was closed
    automatically by a new-contributor gate, and OpenCode's
    ([#49108](https://github.com/anomalyco/opencode/issues/49108)) is open with
    no maintainer comment.
*   Only the namespaced form runs on Codex (as `$plugin:skill`) and Antigravity
    (as `/plugin:skill`).
    Codex does not resolve a bare name; Antigravity sends it to the model as
    text. On Claude Code a bare `/alpha` ran a plugin skill once (one sample, not
    relied on; dictionary section 3).
*   Only Claude Code and Pi have an argument-hint field (Pi only on prompt
    templates). Pi was observed showing it in the interactive autocomplete row
    (not in `get_commands`); Claude Code is documented to show it, and its init
    listing carries no hint, so that was not observed.
*   Only Claude Code reads the command files natively, beside the skills. Codex and
    Antigravity have only skills (today the adapters turn each command file into a
    `<plugin>-cmd-<name>` skill); Pi has skills and prompt templates (the adapter
    turns each command file into a prompt); OpenCode has skills and command files
    (the adapter writes one command per command file). Antigravity lists an
    installed skill as the slash entry `/plugin:skill` and runs it (observed);
    `disable-slash-command: true` removes it from the picker, and a typed
    `/plugin:skill` for such a skill then reaches the model as text. A skill has no slash form on OpenCode (its `/skills` dialog inserts
    `@skill-id`) and only `/skill:<name>` on Pi. The native prompt template and
    command file are how those two harnesses give a skill a short name.
*   On Pi and OpenCode a clash between same-named skills is settled by the
    harness: Pi keeps the first and warns; OpenCode settles it silently, and a
    skill file in the user's own folder beats a plugin's skill (verified). The
    repo controls its own plugins only.

## Goals

*   A skill's name does not repeat its plugin. The invocation form is
    `plugin:skill` where the harness namespaces (`/craft:backlog` on Claude Code
    and Antigravity, `$craft:backlog` on Codex) and `plugin-skill` where it cannot
    (`/craft-backlog` on Pi and OpenCode). The separator and the leading character
    (`/` or `$`) are the only difference.
*   Every runnable skill has a picker line of at most 120 characters, hint
    included, and the build puts it into the field each harness reads for its
    picker: the Claude Code `description` (the trigger text moves to
    `when_to_use`), the Codex `shortDescription`, the start of the Antigravity
    description, and the Pi prompt and OpenCode command description. The full
    `argument-hint` stays a native field on Claude Code (skills) and Pi (prompt
    templates). What each picker renders is observed for some harnesses; Open
    Questions lists the rest.
*   Codex and Antigravity receive no generated `<plugin>-cmd-<name>` skill.
*   Each harness reads only its own generated tree.
*   Adding a plugin whose skill shares a name with another plugin's skill needs no
    special handling.

## Non-Goals

*   One identical string on every harness. The separator and the leading `/` or
    `$` differ by harness.
*   Controlling name clashes with third-party plugins or a user's own skills on
    Pi and OpenCode. The prefix makes a clash less likely, not impossible.
*   Renaming skills that are not meant to be run by name, such as `commit-style`,
    unless their name repeats the plugin.
*   Changing what any skill does.
*   Adding a wrapper to a harness that runs the skill itself (Claude Code, Codex,
    Antigravity). Pi prompt templates and OpenCode command files are those two
    harnesses' native slash entries, so they stay, now generated. Three skills
    gain one (see Model-only skills).

## Decisions Taken

Alternatives A to R, further down, show what each decision was chosen over. Index:
1 is A, B, C; 2 is D, E; 3 is H; 4 is I, K; 5 is F, G, R; 6 is N; 7 is L; 8 is H;
9 is M, P; 10 is J; 11 is O; 12 is Q. The owner decided in this order:

1.  **Skills only.** The skill is the only authored file per capability. The
    hand-written `commands/<plugin>/*.md` files are deleted. See Alternatives A,
    B and C.
2.  **Rename at the source.** Skills drop the plugin name (`craft-backlog`
    becomes `backlog`) in the source tree. See Alternatives D and E.
3.  **Model-only skills say so; everything else is runnable.** A skill is
    runnable by name unless its frontmatter has `user-invocable: false`, a field
    Claude Code already defines. See Alternative H.
4.  **Every harness gets its own generated tree.**
    `dist/claude-code/plugins/<plugin>/`, `dist/codex/plugins/<plugin>/`,
    `dist/antigravity/plugins/<plugin>/`, `dist/opencode/plugins/<plugin>/` and
    `dist/pi/plugins/<plugin>/`. Nothing is written into another harness's tree
    and no adapter checks whether another one ran first. This replaces the shared
    `dist/plugins/` tree, the Antigravity discovery manifest inside it, the
    `flat-skills/` copy and the earlier Codex-only bundle (which becomes one tree
    of five). The Codex adapter change is committed (`4803539`); its output
    reaches `dist/` at the next release. See Alternatives I and K.
5.  **Always prefix on harnesses that cannot namespace.** Pi and OpenCode use
    `plugin-skill` for every skill, the same shape as `plugin:skill` with a
    hyphen. See Alternatives F and G.
6.  **Skill names for `bivouac` and `devenv` match the action.** `bivouac`
    manages remote coding-agent sessions and cloud images, so its skill is
    `session`; `devenv` sets up and changes a Nix flake environment, so its skill
    is `manage`. They are `bivouac:session` and `devenv:manage`, and
    `bivouac-session` and `devenv-manage` on Pi and OpenCode. The rule (the name
    matches the action) is the owner's; the owner confirmed `session` and chose
    `manage` on 2026-11-03. The skill initializes a `flake.nix` when none exists
    and otherwise opens a menu (add, upgrade or remove packages, security tools,
    direnv mode, welcome style). Its `argument-hint` is declared but the skill
    never reads an argument; that is unchanged by this design. Its picker line
    therefore names the menu's actions in plain words and has no bracketed
    argument.
7.  **One release, no aliases.** The renames and the deletion of `commands/` ship
    together. Old names stop working in that release. The breaking change is
    called out in the release notes and in `MIGRATION-v3.md` (owner, 2026-11-03).
    See Alternative L for the staged rollout with aliases that was not chosen.
8.  **Runnable and model-only skills.** A skill with a command file or an
    `argument-hint` today is runnable; the others are model-only. That gives the
    ten model-only skills listed below. `understand` and `explore` stay
    model-only, since they never had commands. See Alternative H.
9.  **Each runnable skill carries a picker line of at most 120 characters.** The
    long `description` is written for the model ("Use when ..."; median 298
    characters, longest 375), so it cannot be a picker line. The owner chose a
    separate short line per runnable skill, with the hint condensed into it (26
    lines, final as listed in Step 1, 2026-11-03), over shortening every
    description (Alternative M).
    The short descriptions in the command files go away with the files. Claude Code
    has a second field, `when_to_use`, which it appends to `description` for the
    model, so its tree carries the picker line in `description` and the original
    trigger text in `when_to_use` (adopted by the owner, 2026-11-03; Alternative
    P is the rejected alternative of leaving the long description in place).
10. **Cross-references are rewritten per harness, slash forms included.**
    `plugin:skill` and `/plugin:skill` become `plugin-skill` and `/plugin-skill`
    on Pi and OpenCode, and the leading `/` becomes `$` on Codex (`$plugin:skill`),
    in skills, templates and, where a tree has them, agents (see
    Cross-references). Hook messages name a skill without a leading character, so
    the source string is right on every harness (the Pi and OpenCode copies carry
    the rewritten form). Alternative J is the rejected neutral-prose option.
11. **`devenv:manage` is found by "setup".** Its picker line and its description
    both contain the word "setup", so a user who types "setup" in a picker finds
    it. A second `devenv:setup` entry was rejected (Alternative O).
12. **Native construct per harness.** The governing principle above. Pi gets prompt
    templates and OpenCode gets command files as wrappers because those are their
    native slash entries; documenting `/skill:name` (Pi) or `@skill-id` (OpenCode)
    instead was rejected (Alternative Q).

## Open Questions

Each item is unobserved. Step 9 names the check, what passes, and which checks
block the release. None changes decisions 1 to 8.

1.  **Claude Code picker with `when_to_use`.** `claude plugin validate` accepts the
    field and the skill lists as `craft:backlog` (Appendix A), but which text the
    `/` picker renders, and whether it shows `when_to_use` or `argument-hint`, was not
    observed. If the picker appends `when_to_use`, decision 9 gains nothing on Claude
    Code and the spec records that.
2.  **Model loading under the split.** The model sees `description` plus
    `when_to_use`. Whether it loads skills as often as before is unmeasured; Step 9
    runs the commit-tools eval.
3.  **Codex TUI picker text** for a skill with only `metadata.short-description`;
    the fallback is a generated `agents/openai.yaml`.
4.  **Antigravity picker** with the skill name present and at 80, 100 and 140
    columns, for the line-first description (never run live).
5.  **A real model on Pi and OpenCode.** A wrapper asks the model to load the skill.
    Pi was run against a mock model server and OpenCode with one wasted file search.
6.  **Upgrade without reinstall.** Observed only for Claude Code with a directory
    marketplace (Appendix A). Claude Code rejects a `file://` marketplace source
    (it accepts `owner/repo`, an `https://` URL or a path), so a git-sourced case
    cannot be built offline; Step 9 runs it against a pushed branch of the real
    repository before the release. Antigravity, Codex, Pi and OpenCode were not
    run.

## Proposed Architecture

**One source, one tree per harness.** Each skill is authored once. The build
derives a separate tree for each harness from it.

```text
skills/<plugin>/<skill>/SKILL.md      name, description, argument-hint,
        |                             user-invocable (false = model-only)
        v
   loadPluginModel (skill = last segment of its registry entry)
        |
        +-- dist/claude-code/plugins/<plugin>/
        |       skills/<skill>; description = picker line, when_to_use = the
        |       trigger text; /plugin:skill; hint and user-invocable native
        +-- dist/codex/plugins/<plugin>/
        |       codex-skills/<skill>; /plugin:skill in text becomes $plugin:skill;
        |       no commands/; Codex reads the picker line from the skill's
        |       metadata.short-description
        +-- dist/antigravity/plugins/<plugin>/
        |       skills/<skill>; description starts with the picker line;
        |       model-only skill gets disable-slash-command: true
        +-- dist/opencode/plugins/<plugin>/
        |       skills/<skill> (text rewritten), registered with id plugin-skill;
        |       one command per runnable skill
        +-- dist/pi/plugins/<plugin>/
                skills/<skill> (text rewritten, frontmatter name plugin-skill);
                one prompt per runnable skill, native argument-hint
```

### Source layout and registry

*   Skills move from the flat `skills/<name>/` to `skills/<plugin>/<skill>/`.
*   A directory containing `SKILL.md` is a skill; a directory without one is a
    plugin folder. `skills/release/` is a repo-local skill in no plugin. It stays
    where it is, and since no plugin lists it, no harness tree carries it and it
    has no derived id.
*   Registry skill entries become `"craft/backlog"`, the way command entries are
    written today (`"craft/backlog.md"`). The skill's name is the last segment.
*   `resources.commands` is removed from every plugin and from the registry's list
    of resource keys.
*   Validation, source tree: the folder name equals the frontmatter `name`; the
    name is lowercase-hyphen; it does not start with `<plugin>-`; `user-invocable`,
    when present, is the string `true` or `false`; the registry plugin equals the
    parent folder; every runnable skill has `metadata.short-description` of at most
    120 characters, and a model-only skill needs none; a runnable skill's picker line
    plus its description is at most 1,024 characters (this repo's bound for
    Antigravity, which is tighter than Claude Code's 1,536 for `description` plus
    `when_to_use`); every `description` is a single line (plain or quoted scalar),
    which the line-level edits below rely on; the derived id is at most 64
    characters (Pi, Codex and Antigravity cap names). The Pi and OpenCode trees
    deliberately differ: their frontmatter `name` is `plugin-skill` (verified to
    load).
*   Validation, registry: the derived id `plugin-skill` is unique across all
    plugins. This catches a plugin `a-b` with skill `c` against plugin `a` with
    skill `b-c`, which would both give `a-b-c`.

### Naming on each harness

| Harness | Skill's declared name | Entry a user runs |
|---|---|---|
| Claude Code | `<skill>` (plugin added by the harness) | `/craft:backlog` |
| Codex | `<skill>` | `$craft:backlog` |
| Antigravity | `<skill>` | `/craft:backlog` |
| OpenCode | id and name `craft-backlog`, registered by the plugin | command `/craft-backlog` in the TUI; the skill is `@craft-backlog` |
| Pi | frontmatter name `craft-backlog` | prompt `/craft-backlog`; skill `/skill:craft-backlog` |

The output folder is `<skill>` in every tree, so relative paths between sibling
skills keep working: `review-commits` runs `../../commit-action/lib/commit.sh`
today and would run `../../commit/lib/...`. Pi takes the skill name from the
frontmatter and OpenCode takes the id from the plugin, so neither needs a
renamed folder.

### Cross-references

In source, a reference from one skill to another is written fully qualified as
`plugin:skill`, or `/plugin:skill` where it tells the user to run the skill,
including within the same plugin. Claude Code and Antigravity read those forms.
On Pi and OpenCode the registered name is `plugin-skill`, and on Codex a user
runs `$plugin:skill`, so the build rewrites the references in those three trees
(decision 10). On Pi and OpenCode a qualified token would name no registered
skill. OpenCode's skill tool can also loop on an invalid id
([#61198](https://github.com/anomalyco/opencode/issues/61198)).

*   **What is rewritten.** A pair that the registry lists (a skill or an
    agent), written `<plugin>:<name>` with at most one `/` before it. The left boundary is the
    first character of the reference (the `/`, or the plugin name when there is no
    `/`): it must not follow a letter, digit, `-`, `_`, `.`, `/` or `:`. The right
    boundary: not followed by a letter, digit, `-` or `_`. When two pairs share a prefix
    the longer one wins, which the right boundary already guarantees. So
    `/jot:capture`, `(/jot:capture)` and `` `jot:capture` `` are rewritten, while
    `docs/jot:capture`, `https://x/jot:capture`, `my-jot:capture` and
    `jot:capture_x` are not. Other
    text with a colon, URLs, and tokens for skills that do not exist are left
    alone. Prose and code blocks are treated alike.
*   **Per tree.** Pi and OpenCode: `<plugin>:<skill>` becomes `<plugin>-<skill>`,
    a leading `/` is kept. Codex: the name keeps its colon and a leading `/`
    becomes `$`. Claude Code and Antigravity: no rewrite. One function does all
    three: `rewriteReferences(text, pairs, { join, sigil })` with `join` `"-"` or
    `":"` and `sigil` `"$"` or unset. A shared `rewriteTree(dir, { pairs, join,
    sigil, exts })` in `layout.mjs` walks a directory and applies it to the files
    with the given extensions.
*   **Where.**
    *   Pi and OpenCode: every `.md` and `.yaml` file under `skills/`, `agents/` and
        `templates/`; every `.sh` file under `skills/` and `hooks/`; and OpenCode's
        mapped agent files in `opencode-agents/` together with the `system` text
        registered from them. In each `SKILL.md` the frontmatter `name` becomes
        `plugin-skill`.
    *   Codex: every `.md` and `.yaml` file under `codex-skills/` and `templates/`.
        The Codex tree has no `agents/`. Shell scripts are not rewritten there,
        because a leading `$` inside a shell message would be expanded, so a script
        message names a skill without a leading character.
    *   Claude Code and Antigravity: none.
    Other files, JSON included, are copied unchanged. A skill's `tests/` folder is
    not copied, as in every tree. The checks below scan these same sets.
*   **Hook messages.** A hook script names a skill without a leading character
    (`commit-tools:commit`), so the Pi and OpenCode copies carry
    `commit-tools-commit` and the source string is right on Claude Code, Codex and
    Antigravity. A leading `$` would be expanded by the shell inside the
    double-quoted message. The same holds for the two review-commits scripts that
    say "Load commit-action" (`lib/apply-split.sh`, `lib/revalidate.sh`): Step 6
    writes `commit-tools:commit` there and the Pi and OpenCode rewrite covers
    `.sh` under `skills/`.
*   **Which pairs.** The set of all `plugin:skill` and `plugin:agent` pairs in the
    registry, including plugins not enabled for that harness, so a reference never
    depends on enablement. OpenCode registers an agent as `plugin-agent`
    (`jot-content-extractor`), so `jot:content-extractor` is rewritten there like a
    skill; the Pi and Codex trees carry no agents and the pair is harmless. The
    registered agent name on Antigravity is read from its adapter output in Step 6
    and recorded in the harness README. `generateRoot` of the Pi, OpenCode and
    Codex adapters builds the set once with `referencePairs(registry)` and returns
    it as `state.pairs`.
*   **Measured on the current sources (2026-11-03).** With the new names and the
    boundary rule, the rule finds 74 slash-form references in 17 files under
    `skills/`, `agents/`, `templates/` and `hooks/`, no bare `plugin:skill` form
    and none in a hook script (the hook message still names the old
    `commit-action`, fixed in Step 6). The measurement predates the `.sh`-under-
    `skills/` extension; Step 6 repeats it. It leaves the `jot:inbox/...` and
    `jot:notes/...` source paths alone because they are not skills or agents; the
    subagent name `jot:content-extractor` is an agent pair.
*   **Checks.** A test (Step 7) fails when a `plugin:skill` or `/plugin:skill`
    token in a source file names a skill that does not exist; another checks that
    no rewritable token is left in the Pi and OpenCode trees (`plugin:skill`) or
    in the Codex tree (`/plugin:skill`), over the sets listed under Where.

### Model-only skills

Ten skills get `user-invocable: false`, because they have no command file today
and no `argument-hint`: `commit-style`, `sketch-from-capture`, `task-commit`,
`understand` (was `craft-understand`), `capture-for-sketch`, `excalidraw-format`,
`infographics`, `jot-to-publish`, `typst-format`, `explore` (was
`codebase-explore`). Three runnable skills have no wrapper today and gain one:
`devenv`, `review-commits` and `validate-commits`.

Only Claude Code enforces the flag natively. What a user sees for a model-only skill:

| Harness | Effect of `user-invocable: false` |
|---|---|
| Claude Code | Hidden from the user; the model can load it |
| Antigravity | `disable-slash-command: true` hides it in the TUI picker; typing `/plugin:skill` still reaches the model, and print mode runs it |
| Codex | Listed; cannot be hidden |
| OpenCode | Listed in `/skills`; no wrapper is generated |
| Pi | Listed in `/skill:` autocomplete; no prompt is generated |

### What each adapter emits

| Harness | Skill | Entry for a runnable skill | Picker text | Model-only skill |
|---|---|---|---|---|
| Claude Code | copied; for a runnable skill `description` becomes the picker line and `when_to_use` the original description | the skill is the entry | the picker line in `description` (rendering not observed, Open Question 1); native `argument-hint` | native `user-invocable: false` |
| Codex | copied to `codex-skills/<skill>`; `/plugin:skill` in text becomes `$plugin:skill` | the skill is the entry; no wrapper | `metadata.short-description`, read by Codex itself | listed; cannot be hidden |
| Antigravity | copied; `description` becomes `<picker line> <description>` | the skill is the entry; no wrapper | the start of the description; the visible budget is estimated at about 100 to 105 characters with the skill name (decision 9, Open Question 4) | `disable-slash-command: true` added to the copied frontmatter |
| OpenCode | `skills/<skill>` rewritten, id `plugin-skill` | a command `plugin-skill` | the command description, the picker line | no command |
| Pi | `skills/<skill>` rewritten | a prompt `plugin-skill` | the prompt description, the picker line; native `argument-hint` beside it | no prompt |

### Picker lines

*   Every runnable skill has `metadata:` with `short-description: "<line>"` in its
    `SKILL.md`: a complete line of at most 120 characters, with a condensed hint
    inside it when the skill has one. The 26 lines are in Step 1. The full
    `argument-hint` stays in its own field. A model-only skill has no line.
*   `devenv:manage`'s line and its description both contain the word "setup"
    (decision 11).
*   Codex: nothing is generated. `skills/list` returns the line as
    `shortDescription` (observed). Which text the TUI picker shows was not
    observed; if Step 9 finds the picker ignores the field, the adapter writes
    `agents/openai.yaml` with `interface.short_description` set to the line.
*   Antigravity: the adapter edits the copied `SKILL.md` line by line (see
    `restatePicker`, Step 3.7): the `description` line becomes the line, a space,
    then the original description, as one double-quoted scalar. Every other line,
    quoting and comments included, is left as written. The build fails if the
    combined description is over 1024 characters (an arbitrary safe bound of this
    repo; Antigravity documents none). The picker shows the line; the model still
    reads the whole description. The tree is Antigravity's alone, so Claude Code
    never sees the change. Observed: a 60-character description plus hint showed in
    full at 140 columns and a 400-character one was cut. If the row also carries
    `/plugin:skill`, the budget for the line is about 100 to 105 characters
    (estimated, Open Question 4); the longest draft line is 104.
*   Pi: the prompt description is the line; Pi shows the native `argument-hint`
    before it, so a hint appears twice in that row. Accepted.
*   OpenCode: the command description is the line.
*   Claude Code: the same `restatePicker` with a different target: the
    `description` line becomes the line and the original text moves, verbatim, to a
    new `when_to_use` line after it. The model reads both; the picker is expected
    to show `description` (Open Question 1). A model-only skill keeps its
    description and gets no `when_to_use`. If Step 9 shows the picker appends
    `when_to_use`, Claude Code reverts to a plain `description` (stop calling
    `restatePicker`); this is the Claude Code fallback and is a release gate
    outcome (Step 9).
*   Line-level edits are used everywhere frontmatter changes (`name:` on Pi and
    OpenCode, the picker line, `disable-slash-command`), because the repo's
    `writeDocument` re-serializes the whole block: it drops comments and quote
    style, and writes a value starting with `<`, such as `<question>`, unquoted,
    which breaks YAML. The source rule that every `description` is a single line
    keeps the edits well defined.

### Wrapper templates (Pi and OpenCode)

Both use this body, with the skill name filled in and the arguments placed
explicitly. Pi drops arguments from a
prompt that has no placeholder (verified), so the placeholder is written in the
template and not left to the adapter:

```text
Invoke the `<plugin>-<skill>` skill with this command request.
Forward all arguments exactly as provided.

Arguments: $ARGUMENTS
```

*   No skill uses `disable-model-invocation`. If one ever does, a wrapper that
    says "invoke the skill" fails on Pi (no skill tool, no location for a hidden
    skill) and needs the skill's own body instead (Appendix A).
*   Pi: `prompts/<plugin>-<skill>.md`, frontmatter `description` (the picker line)
    and `argument-hint` from the skill.
*   OpenCode: `runtime/opencode/commands/<plugin>-<skill>.md`, listed in
    `resources.json` as `{ name, description, path }` with the picker line as
    `description`. The OpenCode runtime loader reads each command's `path` from
    `resources.json`, so the new folder needs no runtime change. The command
    expands in the TUI and the API but not for `opencode run "/name"` (verified);
    the OpenCode README says so.
*   The wrapper thinness test reads the built output of both adapters and checks
    the skill name, the phrase "Forward all arguments", the `$ARGUMENTS`
    placeholder and at most five non-blank body lines.

### Removed and simplified

*   `commandToSkill` and the `<plugin>-cmd-<command>` skills are removed from the
    Codex and Antigravity adapters.
*   The Antigravity adapter no longer writes into the Claude Code tree: the block
    that creates a root `plugin.json`, `agy-skills/`, `skills.json`,
    `agy-agents/`, `agents.json`, `hooks.json` and `runtime/antigravity/` there
    (`harnesses/antigravity/adapter.mjs`: the `if (existsSync(sharedRoot))` block
    after `generateHooks`, which ends the function) is deleted. The install command stays
    `agy plugin install <checkout>/dist/antigravity`.
*   The Pi and OpenCode adapters stop checking whether `.claude-plugin/plugin.json`
    exists and always write their own layout. Claude Code, Pi and OpenCode move out
    of `dist/plugins/`, which is no longer written; Codex already builds to
    `dist/codex/plugins/` and Antigravity keeps `dist/antigravity/plugins/`.
*   `commandNames` (collision-only prefixing, built-in command avoidance) becomes
    `derivedId(plugin, skill)`, which returns `plugin-skill`. The OpenCode
    `BUILTIN_COMMANDS` export has no use left and is deleted (Step 4.5): a
    `plugin-skill` name has a hyphen and the built-in commands are single words.
*   The `capabilities.commands` entry is removed from all five adapters, since no
    canonical command resource remains.
*   `command-to-skill.mjs` is deleted (Step 3.6). The picker line replaces
    folding a hint into a description.
*   No `agents/openai.yaml` is generated for Codex unless the Step 9 picker check
    fails (see Picker lines).
*   The `validate` guard that rejects a `commands/` folder in the Codex tree stays
    as a guard against it returning.

### Release impact

Skill names change, so `/craft:craft-backlog` stops existing and
`/craft:backlog` replaces it. Pi and OpenCode entries change for every plugin:
`/bivouac` becomes `/bivouac-session`, and `devenv` becomes `devenv-manage` and
gains a wrapper. All ten plugins rename at least one skill: 26 of the 36 plugin
skills in all (the table in Step 1).

Where each harness installs from:

| Harness | Last release | After this change | Reinstall needed |
|---|---|---|---|
| Claude Code | `dist/plugins/<plugin>` (marketplace `source`) | `dist/claude-code/plugins/<plugin>` | no for a directory marketplace (observed: `marketplace update` then `plugin update` moved the install to the new `source` and the renamed skill; the version must change); a git-sourced marketplace was not run |
| Codex | `dist/plugins/<plugin>` | `dist/codex/plugins/<plugin>` (marketplace regenerated) | yes, from the new path (expected, not run) |
| Antigravity | `dist/antigravity/plugins/<plugin>` | same path | not run |
| OpenCode | `dist/plugins/<plugin>` | `dist/opencode/plugins/<plugin>` | yes (expected, not run) |
| Pi | `dist/plugins/<plugin>` | `dist/pi/plugins/<plugin>` | yes (expected, not run) |

What a user installs, per harness, after this change:

*   Antigravity: `dist/antigravity/` is a folder of plugin folders, not a plugin.
    Each `dist/antigravity/plugins/<plugin>/` carries its own
    `.antigravity-plugin/plugin.json`; `agy plugin install <checkout>/dist/antigravity`
    installs them all, and `agy plugin install <checkout>/dist/antigravity/plugins/<plugin>`
    installs one. The shared-root block that wrote a `plugin.json` into the Claude
    Code tree is gone. The README mentions of `dist/plugins/<plugin>` for agy become
    this path.
*   Codex: the last release (v2.4.1) shipped Codex from `dist/plugins/<plugin>`.
    Commit `4803539` makes the adapter build `dist/codex/plugins/<plugin>`, and
    the marketplace file `.agents/plugins/marketplace.json` points there; both
    reach `dist/` and the marketplace only at the next release, which is this one.
*   Step 9 validates each of these paths.

The release does not keep the old names (decision 7). The release notes state the
break: each renaming plugin gets a major version from the release skill, the
changelog entry is marked breaking, and `MIGRATION-v3.md` lists every old and new
name and the new install paths. This change does not touch the committed `dist/`
or `.claude-plugin/`: `npm run build` and the tests write into a temp dir, and the
release alone commits `dist/`, the marketplace files and the removal of
`dist/plugins/` together (Step 4.8), so `main` installs the last release until
then.
`MIGRATION-v3.md` follows `MIGRATION-v2.md`, which holds repo-level migration
notes.

## Risks & Mitigations

| Risk | Mitigation | Remaining risk |
|---|---|---|
| A missed reference leaves a dangling name at runtime | The old-name check and the reference check (Step 7) fail `npm test`; the rewrite covers slash forms, hook scripts and OpenCode's mapped agents | A skill name built by joining strings inside a script is neither found nor rewritten |
| Script rewriting or forwarded arguments open a security hole | The rewrite touches only registry-listed pairs, with a test that every other byte of a shell script is unchanged; a script message names a skill without a leading `$`, so the shell cannot expand it; wrappers forward `$ARGUMENTS` as the harness does for any prompt template | None identified beyond what that test covers; five trees per plugin cost build time and disk, not safety |
| A rewrite changes text it should not | The rewrite matches only registry pairs with the boundary rule; tests cover URLs, paths, unknown tokens and code blocks | A literal `plugin:skill` meant to stay is rewritten on Pi, OpenCode and Codex |
| Hints or picker lines are lost when `commands/` is deleted | Step 1 copies each hint and adds the 26 lines; tests assert both are present, each line is at most 120 characters and each flag in a line appears in `argument-hint` | None identified beyond what those tests cover |
| Antigravity truncates the picker row, so the hint at the end of a line may not show | Accepted (owner, 2026-11-03). The line comes first and `/skills` in print mode shows the full text; the picker was observed at one width (140 columns) with a 60-character description, and the row also carries the skill name (Open Question 4) | On a narrow terminal, or with a long skill name, the hint at the end is the part most likely cut (not observed at other widths) |
| Claude Code's picker may still show the long trigger text, or the model may load skills less often after the split | The line is in `description` and the trigger text in `when_to_use` (decision 9); Step 9 opens the picker and runs the commit-tools eval (Open Questions 1 and 2) | If the picker appends `when_to_use`, Claude Code users see long text as before |
| A Pi or OpenCode wrapper asks the model to load the skill, so a model may not | The wrapper text is explicit and forwards the arguments; Step 9 runs a real model on both (Open Question 5) | Unlike Claude Code, Codex and Antigravity, those two harnesses depend on the model following the wrapper |
| The Codex TUI picker may not use `metadata.short-description` | `skills/list` returns it (observed); Step 9 checks the picker; the fallback is a generated `agents/openai.yaml` | Until Step 9 runs, the Codex popup text is unobserved |
| `user-invocable: false` hides a skill on Claude Code only | The Model-only skills table states the effect per harness; the harness READMEs repeat it | Users see model-only skills listed on Codex, OpenCode and Pi, and can run them on Antigravity |
| A user's own skill file hides a plugin skill on OpenCode, or a third-party skill clashes on Pi | The `plugin-skill` prefix makes a clash unlikely; Pi prints a warning | OpenCode hides the plugin skill without a message (shadowing), and `/craft-backlog` then loads the user's skill; documented, not preventable here |
| Pi and OpenCode accept a frontmatter `name` that differs from the folder only by loader tolerance | Verified on Pi 1.4.0 and OpenCode 2.2.5 with no diagnostic; Step 9 records both versions and fails on any loader warning | A later release of either harness could reject the mismatch and break the whole tree |
| The OpenCode command does not expand under `opencode run "/name"` | Documented in the OpenCode README; the TUI and the API expand it | Scripted use of `opencode run` with a slash command gets the literal text |
| A Pi prompt loses its arguments | The template places `$ARGUMENTS`; the thinness test asserts it | None identified beyond that test |
| The Pi, OpenCode and Codex trees drift from the source | They are generated on every build; a test asserts every file equals the source except the rewritten tokens and the frontmatter `name` | None identified beyond that test |
| Old install paths keep resolving to stale trees | The release removes `dist/plugins/` (Step 4.8); `MIGRATION-v3.md` lists the new paths | A user who installed from the old path must reinstall; the cells marked "not run" under Release impact are unverified (Open Question 6) |
| A breaking rename with no alias | The release notes and `MIGRATION-v3.md` call it out; the release skill bumps each renamed plugin | Saved prompts and scripts break; no way back once released (decision 7) |
| A defect in one plugin's rename blocks the whole release | One change set (decision 7): the old-name and reference checks name the file and plugin, and Step 9 runs every check, including a run on each real harness, before the release | A behavior the checks do not cover shows up in the field and cannot be rolled back |

## Alternatives Considered

### Alternative A: Document the differences and change nothing

*   **Pros**: No code or rename work.
*   **Cons**: The user still sees a different name and hint per harness. The
    dictionary documents the cause and does not change behavior.
*   **Reason for Rejection**: A user would still see five different names and hints.

### Alternative B: Keep the command files and rename the skills

*   **Pros**: Smallest build change; Pi and OpenCode keep reading the files they
    read today.
*   **Cons**: Two authored files per capability, 23 pairs today, with no mechanism
    to keep them in step. Their descriptions already differ: the `commit`
    command says "Generate and create git commit messages" and its skill says
    "Use when any agent is about to create or amend a Git commit". On Claude Code, observed once, a plugin's command file beat
    its same-named skill, so Claude could run the wrapper while Codex runs the
    skill directly.
*   **Reason for Rejection**: Two authored files per capability with no sync
    mechanism. The Claude Code observation is a single sample and is not relied
    on.

### Alternative C: Keep the command files and hide the skills on Claude Code

*   **Pros**: One entry per capability in the Claude Code picker; the hint stays in
    one place.
*   **Cons**: Only Claude Code reads the field that hides a skill. Claude runs the
    wrapper and then the skill, while Codex and Antigravity run the skill directly.
*   **Reason for Rejection**: Still two paths, and they differ per harness.

### Alternative D: Keep the long skill names and add a short name only for Pi and OpenCode

*   **Pros**: No renames, no rewriting.
*   **Cons**: Claude Code, Codex and Antigravity keep showing
    `craft:craft-backlog`, while Pi and OpenCode show `/backlog`. The typed name
    still differs and the repeated plugin name stays.
*   **Reason for Rejection**: Claude Code, Codex and Antigravity would keep the
    repeated plugin name and the other two would differ in form.

### Alternative E: Keep the source names and let the build strip the plugin name

*   **Pros**: No source rename.
*   **Cons**: The build must rewrite every form of a reference: bare name,
    `skills/<old>` path, `plugin:skill`, `/skill:`, mentions in hooks and
    templates. A missed form is not caught at build time. Source and output show
    different names for the same skill.
*   **Reason for Rejection**: A missed form is not caught at build time, and source and output would disagree on a skill's name. Renaming at the source keeps one name in source, output and docs.

### Alternative F: Short bare names on Pi and OpenCode

*   **Pros**: Shortest names (`/backlog`).
*   **Cons**: Names are global there, so a repeated name needs a collision rule
    (prefix only on a clash). Then a name depends on which plugins exist and the
    rule cannot see third-party skills. Pi keeps the first duplicate and drops the
    rest; OpenCode settles it silently.
*   **Reason for Rejection**: A collision rule makes a name depend on which plugins exist and cannot see third-party skills. Always prefixing gives one rule and the same shape as `plugin:skill`.

### Alternative G: Short names plus an OpenCode self-check

*   **Pros**: Keeps short names; the OpenCode runtime could check whether an id is
    taken (its plugin API has a `list` call) and prefix on a clash.
*   **Cons**: More runtime code, only for OpenCode (Pi's loader decides before our
    code runs), and an id taken by something loaded later still slips through.
*   **Reason for Rejection**: Always prefixing is simpler and does not depend on
    load order.

### Alternative H: List runnable skills in `registry.json`, or infer them from `argument-hint`

*   **Pros**: A registry list needs no new frontmatter; inference needs no new
    field.
*   **Cons**: A registry list is a second place to edit, and a forgotten entry
    drops a wrapper without a message. Inference drops the three skills with no
    hint (`typst-publish`, `study-setup`, and `jot-setup`, whose hint is empty),
    cannot opt a hint-less skill in, and gives a model-only skill a wrapper the
    moment it gains a hint. A new `runnable: true` field is a field no harness
    reads.
*   **Reason for Rejection**: `user-invocable: false` is a field Claude Code
    already defines, and nothing else needs editing. The list of model-only skills
    is itself inferred from "no command file and no hint" (decision 8). Step 7
    adds a test that every model-only skill has no hint and every runnable skill
    has a hint or is one of the three hint-less skills named here.

### Alternative I: Other ways to keep Codex from converting `commands/`

Considered while the command files still existed. The Codex tree is now one of
five (decision 4). Four options, each with its pro and con:

1.  `$ARGUMENTS` in every command file so Codex skips it. Pro: no extra tree.
    Con: relies on an undocumented skip rule seen only on Codex 0.166.
2.  A root `plugin.json` with Codex's own schema. Pro: one tree. Con: it conflicts
    with the Antigravity manifest at the same path, and moving the skills path and
    hooks into that manifest was not tested.
3.  Codex's own `source-command-*` skills, dropping ours. Pro: nothing generated.
    Con: they lose the hint and have names like
    `commit-tools:source-command-commit`.
4.  Ship Codex from the shared tree once `commands/` is deleted. Pro: no extra tree
    and no extra build. Con: one tree stays read by several harnesses, which is the
    cause decision 4 removes.

*   **Reason for Rejection**: Each harness reads only its own tree (decision 4);
    options 1 to 3 also depend on Codex behavior this repo does not control.

### Alternative J: Neutral prose references instead of a rewrite

*   **Pros**: No rewrite step and no rewriter to test: skills say "the backlog
    skill in craft" and the model resolves it.
*   **Cons**: A reference stops being a checkable token, so the reference check
    (Step 7) cannot find a dangling one. On Pi and OpenCode the model must guess
    the registered id, and #61198 shows OpenCode's skill tool can loop on an
    invalid one.
*   **Reason for Rejection**: Qualified tokens can be checked at build time and rewritten mechanically; prose cannot be checked.

### Alternative K: Keep the shared tree and declare Antigravity's skills with `skills.json`

*   **Pros**: One tree per plugin for Claude Code, Pi, OpenCode and Antigravity.
*   **Cons**: Antigravity loads `skills/` and the declared folder together. Same
    names collide, the declared copy wins, and its name carries the path
    (`s1:..:other:dup`). Putting the hint and the hidden flag into the shared
    `skills/` copy changes the files Claude Code reads.
*   **Reason for Rejection**: Putting the hint and the hidden flag into the shared
    `skills/` copy changes files Claude Code reads, and the declared copy gets a
    path-prefixed name.

### Alternative L: Two releases, the first keeping the old names as aliases

*   **Pros**: Saved prompts and scripts keep working for one release; a failed
    harness check can be fixed before the old names go.
*   **Cons**: About 26 forwarding entries per harness for one release, a second
    release to cut, and the old names stay visible next to the new ones.
*   **Reason for Rejection**: Aliases add about 26 forwarding entries per harness for one release, and the release notes can state the break instead (decision 7).

### Alternative M: Shorten every description to fit the picker

*   **Pros**: No new field; one text per skill.
*   **Cons**: Descriptions are what the model reads to decide when to load a skill
    (median 298 characters). Cutting all 36 to 120 characters loses the trigger
    phrases and weakens loading on every harness.
*   **Reason for Rejection**: A separate picker line keeps both (decision 9).

### Alternative N: Keep the skill names `bivouac` and `devenv`

*   **Pros**: No rename for these two.
*   **Cons**: The invocation forms stutter (`/bivouac:bivouac`, `/devenv:devenv`),
    and the rule that a name does not start with its plugin's name would need an
    exemption.
*   **Reason for Rejection**: A name that matches the action reads better than a stutter, and the exemption in the validation rule is avoided (decision 6).

### Alternative O: A second skill, `devenv:setup`, forwarding to `manage`

*   **Pros**: A user who types "setup" finds an entry of that name.
*   **Cons**: A forwarding skill needs `disable-model-invocation: true` to keep the
    model from seeing two skills with overlapping triggers. Codex ignores that
    flag, so the model sees both there. On Pi and OpenCode the usual wrapper
    ("invoke the skill") fails for a skill hidden from the model, so such a skill
    needs a different wrapper body, a thinness-test branch and an allow-list
    entry. It adds a skill id, `devenv-setup`, next to `jot-setup` and
    `study-setup`.
*   **Reason for Rejection**: One word of discoverability does not justify a
    special wrapper path; the word "setup" in the picker line and description
    gives the same discovery (decision 11).

### Alternative P: Leave the long description in place on Claude Code

*   **Pros**: Claude Code's skill file is copied unchanged; no transform.
*   **Cons**: Its `/` picker would keep the 300-character "Use when ..." text that the
    command files' short descriptions replaced, which is a regression on the
    primary harness.
*   **Reason for Rejection**: `when_to_use` is a native field that the model reads
    appended to `description`, so the line and the trigger text can both be kept
    (decision 9). What the picker renders is Open Question 1.

### Alternative R: Use `plugin-skill` as the folder name on Pi and OpenCode

*   **Pros**: The folder, the frontmatter name and the id agree, so no loader
    tolerance is needed.
*   **Cons**: Sibling skills reach each other by a relative path
    (`../../commit/lib/...`); renaming the folder per tree breaks those paths and
    needs another rewrite. Pi and OpenCode take the name from the frontmatter and
    the plugin, so the folder name is not what they read.
*   **Reason for Rejection**: Both harnesses accepted the mismatch with no
    diagnostic (Appendix A). The remaining risk is a later version rejecting it,
    which a follow-up release fixes (Risks).

### Alternative Q: No Pi prompt or OpenCode command; document `/skill:name` and `@skill-id`

*   **Pros**: No wrapper to generate, test or keep model-dependent. On Pi,
    `/skill:name` injects the skill body without asking the model.
*   **Cons**: Pi prints the skill as `skill:craft-backlog` with no argument hint
    (a hint is a prompt-template field); OpenCode has no slash form for a skill, so
    its user would type `@craft-backlog` and depend on the model to load it. The
    typed name would differ from the other three harnesses by more than the
    separator.
*   **Reason for Rejection**: Prompt templates and command files are those
    harnesses' native slash entries (decision 12).

## Detailed Implementation Plan

### Delivery shape

One release (decision 7), committed in three phases. Each phase builds and passes
its tests, so any phase can be stopped or reverted on its own. `npm run build` and
the tests write to a temp dir and never read or write the committed `dist/`; the
`dist/<harness>/plugins/` paths below are paths inside the build output.

1.  **Rename and rebuild** (Steps 1 to 7 except the items tagged phase 2 or
    phase 3): move and rename the skills, create `MIGRATION-v3.md`, edit the
    registry, the build code and the adapters, delete `commands/`, update the
    references (including `docs/command-skill-map.md` and the contract test) and
    convert the tests. The skill moves and the registry change land together in
    this phase, so the build is never run between them. Pi and OpenCode wrappers
    use the skill's `description`. End state: `npm run build` prints no error,
    `npm run validate` passes, `npm test` fails only the 14 baseline tests, and the
    Claude snapshot is regenerated.
2.  **Docs and the old-name check** (Step 8 and the old-name test of Step 7): the
    doc edits remove the old names, then the old-name test is added. End state:
    the same as phase 1, now including the old-name test.
3.  **Picker lines** (every item tagged phase 3): the 26 lines in
    `metadata.short-description`, the validation rules for them, `restatePicker`
    on Claude Code and Antigravity, the wrapper descriptions switching from the
    skill `description` to the line, and their tests. This phase is last and
    separate on purpose: if Step 9 shows a harness does not use the line, it is
    reverted for that harness (Claude Code: stop calling `restatePicker`) without
    touching the rename. End state: the same as phase 2, with the Claude snapshot
    regenerated again.

Step 9 runs after phase 3 and before the release.

The change set is done when all of these hold; the step that verifies each is in
brackets:

1.  The skills are moved and edited; `git status` shows no `skills/.tmp-*` and no
    `skills/<plugin>/<plugin>/` [Step 1].
2.  `registry.json` parses and lists the nested entries [Step 2].
3.  The new helpers exist and their unit tests pass [Steps 3 and 7].
4.  `npm run build` prints no error for any harness, and `npm run validate`
    passes [Step 4].
5.  `commands/` does not exist [Step 5].
6.  The reference check (phase 1) and the old-name check (phase 2) find no hit
    outside their exclusions [Step 7].
7.  `npm test` fails only the 14 baseline tests [Step 9].
8.  The docs link to files that exist [Step 8]. They describe the state after the
    release, when `dist/<harness>/plugins/` exists.
9.  Every release-gate check in Step 9 meets its pass criterion [Step 9].

The baseline for "failures that already exist" is the working tree before this
change, measured on this machine only: `npm test` on 2026-11-03 ran 143 tests, 129
passed and 14 failed (named in Step 9). Names are matched by test title; a title
that names a renamed skill is updated in Step 7 and listed with the change. The
pass rule is that no test outside the 14 fails; a baseline test that starts to
pass is recorded, not an error. A failure outside the 14 on another machine is
triaged by rerunning it on the pre-change tree. Twelve of the 14 (all except the two named next) are
commit-tools tests, so the baseline cannot show that the `commit-action` to
`commit` rename kept them working; Step 9 adds a smoke run for that. Two others
(`agy plugin validate accepts the generated plugins with the expected counts` and
`validate checks the current sources, not committed dist`) cover this change's area; the
positive gates for it are `npm run validate` and the Step 9 Antigravity
validation.

### Step 1: move and edit the skills (36 plugin skills)

1.  Move three skills first, because their name equals their plugin's: run
    `git mv skills/bivouac skills/.tmp-bivouac`, and the same for `devenv` and
    `sketch-note`. Run `mkdir -p skills/<plugin>` for each plugin (`git mv` does not
    create parents), then `git mv skills/<old> skills/<plugin>/<new>` for every
    other skill, and
    last `git mv skills/.tmp-<old> skills/<plugin>/<new>` for the three. Keep each
    skill's `lib/`, `references/`, `styles/` and `tests/` subfolders.
    `skills/release` is not moved. At the end `skills/.tmp-*` and
    `skills/<plugin>/<plugin>/` must not exist.
2.  In each of the 26 renamed `SKILL.md`, set `name:` to the new name.
3.  Copy each command's `argument-hint` into the matching skill (table below),
    as a double-quoted string, verbatim from the command file, on the line after
    `description`. Quoting is required: hints with `|`, `[` or `<` break unquoted
    YAML. The command description is dropped with the file (decision 9).
4.  Add `user-invocable: false`, on the line after `description`, to the ten
    model-only skills.
5.  Phase 3 only: add the picker line to each of the 26 runnable skills (table
    after the hints):
    a `metadata:` block with one nested line, `  short-description: "<line>"`,
    double-quoted. Only the three model-only skills `capture-for-sketch`,
    `excalidraw-format` and `sketch-from-capture` have a `metadata:` block today,
    so nothing merges.
6.  In `skills/devenv/manage/SKILL.md`, add `'devenv setup'` to the trigger phrases
    in `description` (decision 11).
7.  Create `MIGRATION-v3.md` with the table `| old skill name | new path | plugin |`
    holding the 26 renamed skills (rows from the table below), plus the Pi and
    OpenCode entry changes and the new install paths. Take the old Pi prompt and
    OpenCode command names from the last release (v2.4.1): the files under
    `dist/plugins/<plugin>/prompts/` and `runtime/opencode/commands/` there. The old-name check (Step 7)
    reads its old names from this table. "v3" names this migration note; it follows
    `MIGRATION-v2.md`, and each renamed plugin takes its own major version from the
    release skill (see Release impact).

All 36 rows move; 26 of them rename the skill.

| Old path | New path | Claude Code, Codex, Antigravity | Pi and OpenCode id | Kind |
|---|---|---|---|---|
| `skills/bivouac` | `skills/bivouac/session` | `bivouac:session` | `bivouac-session` | runnable |
| `skills/devenv` | `skills/devenv/manage` | `devenv:manage` | `devenv-manage` | runnable |
| `skills/commit-action` | `skills/commit-tools/commit` | `commit-tools:commit` | `commit-tools-commit` | runnable |
| `skills/commit-style` | `skills/commit-tools/commit-style` | `commit-tools:commit-style` | `commit-tools-commit-style` | model-only |
| `skills/review-commits` | `skills/commit-tools/review-commits` | `commit-tools:review-commits` | `commit-tools-review-commits` | runnable |
| `skills/validate-commits` | `skills/commit-tools/validate-commits` | `commit-tools:validate-commits` | `commit-tools-validate-commits` | runnable |
| `skills/sketch-from-capture` | `skills/jot/sketch-from-capture` | `jot:sketch-from-capture` | `jot-sketch-from-capture` | model-only |
| `skills/jot-capture` | `skills/jot/capture` | `jot:capture` | `jot-capture` | runnable |
| `skills/jot-configure` | `skills/jot/configure` | `jot:configure` | `jot-configure` | runnable |
| `skills/jot-setup` | `skills/jot/setup` | `jot:setup` | `jot-setup` | runnable |
| `skills/craft-decompose` | `skills/craft/decompose` | `craft:decompose` | `craft-decompose` | runnable |
| `skills/execute-tasks` | `skills/craft/execute` | `craft:execute` | `craft-execute` | runnable |
| `skills/park-idea` | `skills/craft/park` | `craft:park` | `craft-park` | runnable |
| `skills/review-parked` | `skills/craft/parked` | `craft:parked` | `craft-parked` | runnable |
| `skills/task-commit` | `skills/craft/task-commit` | `craft:task-commit` | `craft-task-commit` | model-only |
| `skills/craft-understand` | `skills/craft/understand` | `craft:understand` | `craft-understand` | model-only |
| `skills/craft-backlog` | `skills/craft/backlog` | `craft:backlog` | `craft-backlog` | runnable |
| `skills/craft-deps` | `skills/craft/deps` | `craft:deps` | `craft-deps` | runnable |
| `skills/craft-epic` | `skills/craft/epic` | `craft:epic` | `craft-epic` | runnable |
| `skills/craft-task` | `skills/craft/task` | `craft:task` | `craft-task` | runnable |
| `skills/capture-for-sketch` | `skills/sketch-note/capture-for-sketch` | `sketch-note:capture-for-sketch` | `sketch-note-capture-for-sketch` | model-only |
| `skills/excalidraw-format` | `skills/sketch-note/excalidraw-format` | `sketch-note:excalidraw-format` | `sketch-note-excalidraw-format` | model-only |
| `skills/sketch-note` | `skills/sketch-note/sketch` | `sketch-note:sketch` | `sketch-note-sketch` | runnable |
| `skills/infographics` | `skills/typst-notes/infographics` | `typst-notes:infographics` | `typst-notes-infographics` | model-only |
| `skills/jot-to-publish` | `skills/typst-notes/jot-to-publish` | `typst-notes:jot-to-publish` | `typst-notes-jot-to-publish` | model-only |
| `skills/typst-format` | `skills/typst-notes/typst-format` | `typst-notes:typst-format` | `typst-notes-typst-format` | model-only |
| `skills/typst-publish` | `skills/typst-notes/publish` | `typst-notes:publish` | `typst-notes-publish` | runnable |
| `skills/codebase-explore` | `skills/codebase/explore` | `codebase:explore` | `codebase-explore` | model-only |
| `skills/codebase-ask` | `skills/codebase/ask` | `codebase:ask` | `codebase-ask` | runnable |
| `skills/codebase-index` | `skills/codebase/index` | `codebase:index` | `codebase-index` | runnable |
| `skills/codebase-impact` | `skills/codebase/impact` | `codebase:impact` | `codebase-impact` | runnable |
| `skills/codebase-graph` | `skills/codebase/graph` | `codebase:graph` | `codebase-graph` | runnable |
| `skills/study-coach` | `skills/study/coach` | `study:coach` | `study-coach` | runnable |
| `skills/study-recall` | `skills/study/recall` | `study:recall` | `study-recall` | runnable |
| `skills/study-setup` | `skills/study/setup` | `study:setup` | `study-setup` | runnable |
| `skills/refactor-scan` | `skills/refactor/scan` | `refactor:scan` | `refactor-scan` | runnable |

Kind: runnable means a wrapper or direct entry is generated; model-only means
`user-invocable: false`.

Hint migration: the hint to copy into each skill. Three skills get none:
`jot/setup` (its command file has an empty `argument-hint`), `typst-notes/publish`
and `study/setup`. `devenv/manage`, `commit-tools/review-commits` and
`commit-tools/validate-commits` already carry theirs.

| Skill | Hint |
|---|---|
| `bivouac/session` | `[start\|status\|issues\|pull\|merge\|delete\|ssh\|connect\|serve\|unserve\|sync\|download\|provision\|down\|image] [request...]` |
| `commit-tools/commit` | `[--style classic\|conventional] [--amend] [--pair] [--no-atomic-check] [context...]` |
| `jot/capture` | `[type?] <content, URL, or leave empty to capture from conversation>` |
| `jot/configure` | `[type label, optional]` |
| `craft/backlog` | `[overview\|ready\|blocked\|priorities\|epics] [--status <status>] [--priority\|-p <0-4>] [--epic\|-e <id>] [--format\|-f <format>] [--limit\|-l <n>]` |
| `craft/decompose` | `[task-description] [--epic\|-e <title>] [--priority\|-p 0-4] [--skip-questions\|-q] [--dry-run\|-d] [--quick] [--framework <name>]` |
| `craft/deps` | `<subcommand> [args] [--flags]` |
| `craft/epic` | `<subcommand> [args] [--flags]` |
| `craft/execute` | `[--batch-size N] [--auto] [--no-commit] [--no-review] [--epic <id>] [--task <id>]` |
| `craft/park` | `<idea> [--task\|-t <id>] [--priority\|-p 0-4] [--tags <tags>] [--quick\|-q]` |
| `craft/parked` | `[list\|from\|promote\|discard\|review] [args] [--flags]` |
| `craft/task` | `<subcommand> [args] [--flags]` |
| `sketch-note/sketch` | `[--mode conversation\|code\|custom] [--format excalidraw\|png\|both] [--output <name>] [description...]` |
| `codebase/ask` | `<question>` |
| `codebase/graph` | `<symbol> [--depth 1-5] [--direction inbound\|outbound\|both]` |
| `codebase/impact` | `[--base <sha>]` |
| `codebase/index` | `[--mode full\|moderate\|fast]` |
| `study/coach` | `<topic\|url\|path> [--depth shallow\|standard\|deep] [--no-recall]` |
| `study/recall` | `<topic\|url> [--depth shallow\|standard\|deep]` |
| `refactor/scan` | `[--scope diff\|package\|all] [<package-path>] [--base <sha>] [--limit N] [--fresh] [--clean]` |

The `\|` is the table's escape; the hint itself contains `|`.

Picker lines (final, approved by the owner on 2026-11-03; each is a complete line
of at most 120 characters, hint condensed into it, written with a plain `|`, not
the table's `\|` escape; `npm run validate` re-checks every length). They are added in
phase 3:

| Skill | Picker line | Length |
|---|---|---|
| `bivouac/session` | Manage remote agent sessions and cloud images. [start\|status\|ssh\|sync\|image\|down] [request] | 91 |
| `devenv/manage` | Nix flake dev environment setup and changes: add, upgrade, remove, security. | 76 |
| `commit-tools/commit` | Create a validated git commit. [--style classic\|conventional] [--amend] [--pair] [context] | 90 |
| `commit-tools/review-commits` | Review and clean up commits before pushing. [--base <ref>] [--unattended] [--style classic\|conventional] | 104 |
| `commit-tools/validate-commits` | Check commit style and hygiene before pushing. [--base <ref>] [--unattended] [--result <path>] | 94 |
| `jot/capture` | Capture an article, video, idea or this chat to your notes. [type] [content or URL] | 83 |
| `jot/configure` | Edit a jot type: its questions, template or triggers. [type] | 60 |
| `jot/setup` | Choose where jot saves captures: workbench or Capacities. | 57 |
| `craft/backlog` | Dashboard of all beads work. [overview\|ready\|blocked\|priorities\|epics] [--status] [--epic] | 90 |
| `craft/decompose` | Break a task into beads issues with dependencies. [task] [--epic] [--dry-run] [--quick] | 87 |
| `craft/deps` | Manage and show task dependencies. <subcommand> [args] | 54 |
| `craft/epic` | Create, track and close epics. <subcommand> [args] | 50 |
| `craft/execute` | Run decomposed tasks with subagents, review and commits. [--batch-size N] [--epic id] [--task id] | 97 |
| `craft/park` | Park an idea for later without losing focus. <idea> [--priority 0-4] [--tags] | 77 |
| `craft/parked` | List and triage parked ideas. [list\|from\|promote\|discard\|review] | 64 |
| `craft/task` | Create, start, finish or show one task. <subcommand> [args] | 59 |
| `sketch-note/sketch` | Draw an Excalidraw sketch note. [--mode conversation\|code\|custom] [description] | 79 |
| `typst-notes/publish` | Publish notes as a PDF or HTML with Typst templates. | 52 |
| `codebase/ask` | Ask a question about the codebase. <question> | 45 |
| `codebase/graph` | Show a symbol's callers and callees. <symbol> [--depth 1-5] [--direction inbound\|outbound\|both] | 95 |
| `codebase/impact` | Show what your recent changes affect. [--base <sha>] | 52 |
| `codebase/index` | Build or refresh the codebase index. [--mode full\|moderate\|fast] | 64 |
| `study/coach` | Coach me on a topic, URL or file. <topic\|url\|path> [--depth shallow\|standard\|deep] [--no-recall] | 96 |
| `study/recall` | Re-test a coached topic, Feynman style. <topic\|url> [--depth shallow\|standard\|deep] | 83 |
| `study/setup` | Set the study notes folder and vault paths. | 43 |
| `refactor/scan` | Scan code for refactoring opportunities. [--scope diff\|package\|all] [--base <sha>] [--fresh] | 92 |

### Step 2: registry

1.  `registry.json`: every `resources.skills` entry becomes `"<plugin>/<skill>"`;
    every `resources.commands` list is removed; the `commit-tools` extra
    `"from": "skills/commit-action/styles"` becomes
    `"skills/commit-tools/commit/styles"`. Its `"to": "styles"` is unchanged, so only `from` changes. Only the
    commit tests read the output `styles/` path; `routing-reminder.sh` reads
    `SKILL.md`, not `styles/`.

### Step 3: build code

1.  `scripts/lib/registry.mjs`: remove `commands` from `RESOURCE_KEYS` (line 5) and
    its path check (line 16); the skill existence check already builds
    `skills/<entry>/SKILL.md`. Add the derived-id uniqueness check.
2.  `scripts/lib/model.mjs`: a skill's name is the last segment of its entry; path
    is `skills/<entry>`; each `model.skills[i]` gets `.plugin`, `.userInvocable`
    (false only when the frontmatter value is the string `"false"`, since
    `parseFrontmatter` returns strings) and `.pickerLine` (the value of
    `pickerLine(frontmatter)`, Step 3.6); remove `commands`.
3.  `scripts/lib/layout.mjs`: drop `"commands"` from the kind list of
    `wrapperLayout` (line 10); `skills/${name}` (line 9) is already right. Add
    `rewriteTree(dir, { pairs, join, sigil, exts })` (read, rewrite, write every
    file with a listed extension under `dir`; a missing `dir` is skipped) and
    `copyRewrittenSkills({ repoRoot, model, to, pairs })` for Pi and OpenCode, built
    on it. The
    adapters first call `copyLayout` with the layout minus its `skills` entries
    (and keep the full layout for hook-path validation, as Pi already does).
    `copyRewrittenSkills` then writes the skills itself: it copies each skill with
    the `tests/` filter that `copyLayout` applies to `kind === "skills"` (extract
    it into a shared function), calls `rewriteTree` with `join: "-"` over the Pi and
    OpenCode set in Cross-references (`.md` and `.yaml` under `skills/`, `agents/`
    and `templates/`; `.sh` under `skills/` and `hooks/`), and replaces
    the `name:` line of each `SKILL.md` with `derivedId(plugin, skill)` by a
    line-level edit, because `writeDocument` re-serializes the whole frontmatter
    (quoting, `>` blocks, blank lines in nested blocks). A missing directory is
    skipped; Pi's layout has no `agents/`. Return value: none.
4.  `scripts/lib/skills.mjs`: `validateSkills` becomes `validateSkills({ repoRoot,
    registry })`, because the plugin rules need the registry. Its callers change:
    `scripts/validate.mjs` (line 15, which must now call `validateRegistryShape`
    first so a malformed registry cannot throw inside `validateSkills`) and
    `tests/build/skills.test.mjs` (lines 36 to 74), whose flat fixtures become
    nested. It walks `skills/`; a directory
    with `SKILL.md` is a skill (depth one or two), a directory without is a
    plugin folder; a plugin folder with no skill below it is an error; a depth-one
    skill that no registry plugin lists (`skills/release`) is allowed and exempt
    from the plugin-folder, `<plugin>-`, picker-line and derived-id rules; apply the source-tree rules
    in Source layout and registry, except the picker-line rules (presence, at most
    120 characters, the 1,024 combined bound, the flag test), which are phase 3 and
    are skipped until the first picker line exists in the repo;
    `validateReferences` and the label use the nested path and keep
    skipping each skill's `tests/`.
5.  `scripts/lib/transforms/names.mjs`:
    *   replace `commandNames` with `derivedId(plugin, skill)`, which returns
        `plugin-skill`;
    *   add `referencePairs(registry)`: the set of `plugin:skill` strings for every
        plugin, enabled or not, plus a `plugin:agent` string for every registry agent
        entry, where `agent` is the file stem (`jot/content-extractor.md` gives
        `jot:content-extractor`). When the same `plugin:name` is both a skill and an
        agent (`jot:capture`, `sketch-note:sketch`) the skill wins and no agent pair
        is added. `derivedId(plugin, name)` returns `name` unchanged when it already
        starts with `plugin-` (the `refactor` agents) and `plugin-name` otherwise,
        matching the OpenCode agent id logic (`harnesses/opencode/adapter.mjs`
        lines 87 to 88); drop the `basename` import, which `commandNames`
        was the only user of;
    *   add `rewriteReferences(text, pairs, { join, sigil })`, the boundary rule in
        Cross-references;
    *   add `wrapperText(id)`, the template under "Wrapper templates", so both
        adapters share one copy.
    A skill is runnable when `userInvocable` is true (Step 3.2).
6.  `scripts/lib/skills.mjs` (next to `parseFrontmatter`, so `validateSkills` can use
    it without an import cycle): add `pickerLine(frontmatter)`. `parseFrontmatter`
    returns a nested block such as `metadata:` as its raw lines, so the helper
    finds the line `short-description:` in `frontmatter.metadata` and returns its
    value (JSON-parsed when double-quoted), or `undefined`. Delete
    `scripts/lib/transforms/command-to-skill.mjs`, with `commandToSkill`, and its
    import sites and tests.
7.  Phase 3. `scripts/lib/layout.mjs`: add `restatePicker(skillMdPath, line,
    target)`, a line-level edit of the copied `SKILL.md`; it does not use
    `parseDocument` or `writeDocument`. It finds the single `description:` line
    (the source rule guarantees one), takes the original value with
    `parseFrontmatter`, and then:
    *   `target: "when_to_use"` (Claude Code) rewrites the `description:` line to
        the line as a double-quoted scalar and inserts a `when_to_use:` line after
        it holding the original value as a double-quoted scalar. If the source
        already has a `when_to_use:` line, the build fails.
    *   `target: "prefix"` (Antigravity) rewrites the `description:` line to the
        line, a space and the original value as one double-quoted scalar, and fails
        the build when it is over 1,024 characters.
    `line` is the `.pickerLine` of the model skill. Scalars are written with
    `JSON.stringify`, the encoder `parseFrontmatter` already reads back. The search
    covers the frontmatter block only, so a body line starting `description:` is
    never touched, and a missing `description:` line fails the build with
    `<path>: no description line`. Every other line is untouched, so a quoted
    `argument-hint` stays quoted. The 1,024 bound is `line.length + 1 +
    description.length`; the validation rule uses the same sum. The helpers
    `insertAfterDescription(text, line)` (used for `when_to_use` and for
    `disable-slash-command: true`) and `setNameLine(text, name)` (Pi and OpenCode)
    sit beside `restatePicker` in `layout.mjs`; `setNameLine` fails the build when
    there is no top-level `name:` line. The callers decide which skills are
    runnable. A test over all 36 real skills asserts the restated file equals the
    source except for the changed lines (Step 7).
8.  `scripts/lib/transforms/paths.mjs` and `policy.mjs`: their mentions of
    "commands" are hook commands; no edit.

### Step 4: adapters

1.  `harnesses/claude-code/adapter.mjs`: `pluginsDir` becomes
    `dist/claude-code/plugins`; the marketplace `source` follows (it already uses
    `pluginsDir`); in phase 3, for each runnable skill (`model.skills[i].userInvocable`)
    call `restatePicker(join(pluginRoot, "skills", skill.name, "SKILL.md"), skill.pickerLine,
    "when_to_use")`; remove `capabilities.commands`. `generateRoot` already
    removes `dist/claude-code`.
2.  `harnesses/codex/adapter.mjs`: remove the wrapper-skill loop. Drop the imports of
    `commandSkillName`, `commandToSkill`, `readFile`, `writeFile` and `ensureDir`;
    the rewrite goes through `rewriteTree`, so the adapter needs no file
    functions of its own. `generateRoot({ outRoot, registry, plugins })` also
    returns `{ pairs: referencePairs(registry) }`, and `generate` gains `state` to read
    it (`runAdapters` already passes `state`). After `copyLayout`, call
    `rewriteTree` with `{ join: ":", sigil: "$", exts: [".md", ".yaml"] }` over
    `codex-skills/` and `templates/` (the scope in Cross-references), so a
    `/plugin:skill` becomes `$plugin:skill`. No `agents/openai.yaml` is written (the
    fallback is in Picker lines). Make `validate` use the last segment of each
    registry entry (`codex-skills/<skill>/SKILL.md`); keep the `commands/` guard;
    remove `capabilities.commands`.
3.  `harnesses/antigravity/adapter.mjs`: remove wrapper generation, the exported
    `commandSkillName`, the `commandToSkill` import, the `copyResourceTree` import
    (its only uses were in the shared-root block) and the shared-root block (see
    Removed and simplified); `ensureDir` stays, since the agents loop uses it.
    After the copy, in phase 3, for a runnable skill call
    `restatePicker(join(pluginRoot, "skills", skill.name, "SKILL.md"), skill.pickerLine, "prefix")`;
    for a model-only skill insert the line `disable-slash-command: true` after the
    `description:` line (a line edit; phase 1). `validate` receives
    `{ repoRoot, outRoot, plugin }` and no model, so it expects
    `plugin.resources.skills.length` skills (today it counts the output
    directory, which checks nothing) and no wrapper skills. Remove
    `capabilities.commands`.
4.  `harnesses/opencode/adapter.mjs`: `pluginsDir` becomes `dist/opencode/plugins`;
    delete the `.claude-plugin/plugin.json` guard so `copyLayout` always runs
    (keep the full `layout` for the hook-path check), then call
    `copyRewrittenSkills`; `generateRoot({ outRoot, registry })` returns
    `{ pairs: referencePairs(registry) }` in place of `commandName`; register each
    skill as `{ id, name, description, path: "skills/<skill>/SKILL.md" }` with
    `id` and `name` both `derivedId(model.name, skill.name)` (today `name` is
    `skill.frontmatter.name`, which is now the short name); write each runnable
    skill's `wrapperText(id)` to `runtime/opencode/commands/<id>.md` (body only,
    no frontmatter) and list it as `{ name: id, description, path }`, where
    `description` is `skill.frontmatter.description` in phase 1 and
    `skill.pickerLine` from phase 3;
    read `pairs` from `state.pairs` (`state` is already a parameter of `generate`);
    remove the now-unused imports `commandNames` and `basename`;
    run `rewriteReferences(text, pairs, { join: "-" })` over each mapped agent's
    text before it is written to `opencode-agents/` and before it is registered as
    `system`; remove `capabilities.commands`. `validate` reads `entry.path` and
    needs no change.
5.  `harnesses/opencode/runtime.mjs`: remove the `BUILTIN_COMMANDS` export and its
    import at line 3 of `harnesses/opencode/adapter.mjs`; the
    loader reads each command's `path`, so the new folder needs no edit.
6.  `harnesses/pi/adapter.mjs`: read `pairs` from `state.pairs`; remove the unused
    imports `commandNames`, `parseDocument` and, if nothing else uses it,
    `readFile` (`ensureDir` stays for `prompts/`); `pluginsDir` becomes
    `dist/pi/plugins`; delete the
    guard so the layout (without `commands`, `agents` or the Claude `hooks.json`)
    is always written, then call `copyRewrittenSkills`; `generateRoot({ outRoot,
    registry })` returns `{ pairs }` in place of `promptName`; write one prompt per
    runnable skill at `prompts/<id>.md` from `wrapperText(id)`, with `description`
    set to `skill.frontmatter.description` in phase 1 and `skill.pickerLine` from
    phase 3, and `argument-hint` from the skill, omitting the key when
    the skill has none (`writeDocument` throws on `undefined`; three runnable
    skills have no hint); the prompts loop and the `pi.prompts` condition (today
    `model.commands.length > 0`) switch to "any runnable skill"; `pi.skills` stays
    `["./skills"]`; update the comments that say `dist/pi/<name>` and
    `dist/plugins/<plugin>`, the one at the top of `harnesses/pi/runtime.mjs`
    (`dist/pi/runtime/pi/runtime.mjs`) and the one at the top of
    `harnesses/opencode/runtime.mjs` (`dist/opencode/<name>/runtime/`); remove
    `capabilities.commands`.
7.  `scripts/lib/pi-package.mjs` checks that each `pi.skills` path exists and
    needs no edit. `scripts/changed-plugins.mjs`, `scripts/eval.mjs` and
    `runAdapters` read each adapter's `pluginsDir`, so the new folders are
    picked up without edits.
8.  Stale output: `dist/plugins/` is committed (ten plugin trees) and no adapter
    owns that directory any more, so `runAdapters` will not remove it. This change
    set does not touch `dist/` or the marketplace files; the release commit does,
    in one commit: `git rm -r dist/plugins`, the new trees and both marketplace
    files (`.claude-plugin/marketplace.json` and `.agents/plugins/marketplace.json`).
    `docs/releasing.md` gets that step. `dist/antigravity/plugins/` keeps its path
    and is rebuilt in place. Until the release, `main` still installs the last
    release from the old paths.

### Step 5: delete the command files

Delete all 23 files under `commands/` (`commands/<plugin>/<command>.md` for
bivouac/bivouac, commit-tools/commit, jot/{capture,configure,setup},
craft/{backlog,decompose,deps,epic,execute,park,parked,task}, sketch-note/sketch,
typst-notes/publish, codebase/{ask,graph,impact,index}, study/{coach,recall,setup}
and refactor/scan) and the empty `commands/` directory.

### Step 6: update references

The list below is the starting set found by search on 2026-11-02. The old-name
check in Step 7 is the completeness test; a file that check reports is also in
scope.

*   Repeat the measurement of Cross-references over `.sh` files under `skills/`
    and `hooks/`, and fix any message that names a skill with a leading character
    that a shell would expand. `skills/commit-tools/review-commits/lib/apply-split.sh`
    (line 8) and `lib/revalidate.sh` (line 27) say "Load commit-action"; they
    become `commit-tools:commit`.
*   Replacement rule. A mention of a skill or command by its old short name is
    replaced from the Step 1 table: where it tells the user what to type, with
    `/plugin:skill`; where it names the skill for the model to load, with
    `plugin:skill`. To find old command mentions, run once over `skills/`,
    `agents/`, `templates/` and `hooks/` a search for `/<command>` for the 23
    command names (`bivouac`, `commit`, `capture`, `configure`, `setup`,
    `backlog`, `decompose`, `deps`, `epic`, `execute`, `park`, `parked`, `task`,
    `sketch`, `publish`, `ask`, `graph`, `impact`, `index`, `coach`, `recall`,
    `scan`; `setup` and `task` occur in more than one plugin) and resolve each hit
    by this rule. This step is a manual review: it is done when every hit is
    classified as typed-by-the-user, loaded-by-the-model or unrelated, with none
    left unclassified. The search is an aid for this change, not a permanent test.
*   Agent names: read the registered agent name on Antigravity from the built
    `dist/antigravity/plugins/jot` output and record it in
    `harnesses/antigravity/README.md`. The expected value is the source token
    unchanged (`jot:content-extractor`); if the built name differs, change the
    source token when Claude Code accepts the new name too, and otherwise add an
    Antigravity rewrite. OpenCode registers `jot-content-extractor`. The reference
    check treats a `plugin:agent` token like a skill token (agents by file stem,
    the skill winning a shared name).
*   Skills' own text: qualify every cross-reference as `plugin:skill` and fix
    `skills/<old>` paths in the `SKILL.md` of `codebase/ask`, `codebase/explore`,
    `codebase/graph`, `codebase/impact`, `codebase/index`, `commit-tools/commit`
    (and `lib/commit.sh`), `commit-tools/commit-style`, `craft/backlog`,
    `craft/decompose`, `craft/deps`, `craft/epic`, `craft/task`,
    `craft/understand`, `craft/execute`, `craft/park`, `craft/parked`,
    `craft/task-commit`, `jot/capture`, `jot/configure`, `jot/setup`,
    `refactor/scan`, `study/coach`, `study/recall`, `study/setup`,
    `typst-notes/publish`, `commit-tools/validate-commits`; and in
    `commit-tools/review-commits`: `SKILL.md`, `lib/apply-split.sh`,
    `lib/build-todo.sh`, `lib/detect-tracker-leaks.sh`, `lib/plan-schema.md`,
    `lib/revalidate.sh`, `lib/style-check.sh`, `lib/synthesizer-prompt.md`,
    `references/branch-flow.md`, `references/codebase-index-resolution.md`,
    `references/integration.md`. Four scripts in `review-commits/lib/`
    (`build-todo.sh`, `apply-split.sh`, `revalidate.sh`, `style-check.sh`) reach
    the sibling `commit-action/lib` folder by relative path and take the new
    sibling name `commit`. `typst-notes/jot-to-publish` and
    `commit-tools/review-commits/references/hygiene-layers.md` matched the search
    in a generic way; no edit is expected, and the Step 7 check will flag any.
*   `skills/commit-tools/review-commits/tests/test-unattended-contract.sh`: it runs
    from the skill folder (`cd "$(dirname "$0")/.."`), so its path to the command
    map goes from `../../docs/` to `../../../docs/`, and the lines it greps for in
    that document change to `/skill:commit-tools-review-commits --unattended --base <ref>`
    and `/skill:commit-tools-validate-commits --unattended --base <ref>`. The same
    lines appear in `handoff-review-commits-unattended.md` (line 117).
*   Agents: `agents/jot/capture.md`, `agents/refactor/synthesizer.md`,
    `agents/refactor/validator.md`; `agents/sketch-note/sketch.md` and
    `agents/refactor/scanner.md` matched generically and need no edit unless the
    Step 7 check flags them.
*   Hooks: `hooks/codebase/session-reminder.sh`; in
    `hooks/commit-tools/scripts/routing-reminder.sh` three fallback paths, the
    first two flat in an installed tree (`skills/commit-action`,
    `codex-skills/commit-action`, both becoming `commit`) and the third in the
    source layout (`$here/../../../skills/commit-action/SKILL.md`, becoming
    `skills/commit-tools/commit/SKILL.md`); the line 2 comments of
    `routing-reminder.sh` and `intercept-git-commit.sh` that say `commit-action`
    become `commit-tools:commit`; and the message in
    `hooks/commit-tools/scripts/intercept-git-commit.sh` line 12 becomes
    `COMMIT_REQUIRED="Direct commit blocked. Load the commit-tools:commit skill,
    validate the message and get explicit confirmation before retrying. Leave
    commits local; do not push or sync."` (one line in the file). The name has no
    leading character, so it is right on every harness and the Pi and OpenCode
    copies carry `commit-tools-commit` through the rewrite.
*   Templates: `templates/codebase/README.md`, `templates/commit-tools/README.md`,
    `templates/craft/README.md`, `templates/refactor/README.md`,
    `templates/refactor/fixtures/candidate-example.yaml`,
    `templates/study/README.md`; `templates/typst-notes/README.md` matched
    generically. The dated plans and specs under `templates/commit-tools/docs/`
    are records and are left alone.
*   Evals: the `skill-fired.md` and `workflow.md` graders under
    `evals/commit-tools/automatic-completion/`, `clean-index-amend/`,
    `commit-trigger/` and `task-context/` reference the skill by its old name; their `input_match` value becomes
    `commit-tools:commit` (the value the Claude Code `Skill` tool receives).
*   Repo files: `.skillshare/audit-rules.yaml` (a comment naming the old sibling
    skill), `handoff-review-commits-unattended.md`, `README.md`.
    `CHANGELOG.md` is generated, and `MIGRATION-v2.md` is a record; neither is
    edited. `.gitignore` is not edited: `.refactor-scan/` is the scan's working
    folder, not a skill name.

### Step 7: tests

*   Update these test files for the new layout, names and paths (found by search
    on 2026-11-03):
    *   Files that name an old skill (15 under `tests/build`, each with the suffix
        `.test.mjs`): `adapters`, `antigravity-adapter`, `claude-code`,
        `codebase-transport`, `codex-adapter`, `commit-action`, `commit-guard`,
        `opencode-adapter`, `pi-commit-tools`, `registry`, `style-check`,
        `tracker-leaks`, `transforms`, `typst-publish`, `wrapper-thinness`.
    *   Files that read old skill paths or flat fixtures: `bivouac` (line 5),
        `skillshare-analysis` (lines 7, 14, 17), `skillshare-audit` (lines 15, 16,
        25, 33), `skills` (the flat fixtures and the `validateSkills` calls),
        `changed-plugins` (the flat fixture at line 47). `removed-skills` only
        asserts old paths are absent and needs no edit.
    *   Files that read the shared `dist/plugins` path: `adapters`,
        `changed-plugins`, `claude-code`, `opencode-adapter`, `pi-adapter` and
        `pi-commit-tools` (which hardcodes `dist/plugins/commit-tools` and moves to
        `dist/pi/plugins`).
    *   Per-file actions for tests whose behavior disappears:
        *   `adapters.test.mjs`: convert the `commands` fixtures (lines 24, 48,
            98-99, 201, 242) to nested skills; assert at line 59 that no `commands`
            capability exists.
        *   `registry.test.mjs`: rewrite lines 26, 71-73 and 94 for nested skill
            entries; drop `resources.commands`; add the derived-id uniqueness case.
        *   `opencode-adapter.test.mjs`: delete the collision-prefix and
            built-in-avoidance tests (lines 51, 189) and the `BUILTIN_COMMANDS`
            test; assert command ids equal `plugin-skill`.
        *   `pi-adapter.test.mjs`: delete the `commandNames` test and rewrite the
            prompt-name assertions (lines 32, 42, 44, 59, 67, 70-76) to
            `plugin-skill` ids under `dist/pi/plugins`.
        *   `antigravity-adapter.test.mjs` (lines 40, 56) and
            `codex-adapter.test.mjs` (line 27): delete the wrapper-skill
            assertions; assert no `-cmd-` skill exists.
        *   `transforms.test.mjs`: delete the `commandToSkill` import (line 7) and
            its test (lines 49 to 56), with `command-to-skill.mjs`.
        *   `claude-code.test.mjs` (line 40): drop the `commands` fixture; assert a
            runnable skill has `description` equal to its picker line and
            `when_to_use` equal to the original description, and a model-only skill
            has neither change.
    *   If `npm test` reports another file after these edits, treat that as a gap in
        this list and add the file here, with its action, in the same change.
*   `tests/fixtures/claude-snapshot.json`: regenerate with
    `tests/fixtures/update-claude-snapshot.mjs` at the end of phase 1 and again at
    the end of phase 3, and before the old-name check runs (it holds old names and
    paths, and `restatePicker` changes every runnable `SKILL.md`).
*   `tests/build/wrapper-thinness.test.mjs`: change from reading `commands/*.md`
    to reading the built Pi prompts and OpenCode command templates.
*   New cases, in the existing files:
    *   Validation of the folder rules, the plugin-folder discriminator and the
        derived-id uniqueness (a fixture with plugin `a-b` skill `c` against
        plugin `a` skill `b-c` fails).
    *   Every hint in the migration table is present in its skill, double-quoted.
    *   Every model-only skill has no hint; every runnable skill has a hint or is
        one of `jot/setup`, `typst-notes/publish`, `study/setup`.
    *   A model-only skill gets no wrapper and, on Antigravity,
        `disable-slash-command: true`.
    *   The Pi and OpenCode trees equal the source except the rewritten tokens and
        the frontmatter `name`; the rewrite leaves URLs, unknown `x:y` text and
        unlisted tokens alone and rewrites listed pairs inside code blocks.
    *   The generated Pi prompt and OpenCode template contain `$ARGUMENTS`; a Pi
        prompt for a skill with no hint has no `argument-hint` key.
    *   Every flag token in a picker line (`--style`, `--epic`, ...) appears in the
        skill's `argument-hint`.
    *   The ten model-only skills are exactly the ones listed under Model-only
        skills.
    *   The Codex rewrite changes `/jot:capture` to `$jot:capture` and leaves
        `docs/jot:capture` and `jot:capture_x` alone; it does not rewrite a `.sh`.
    *   Claude Code: a runnable skill's `description` equals its picker line and
        `when_to_use` holds the original text, together at most 1,536 characters.
    *   Every runnable skill has a picker line of at most 120 characters, and a
        121-character line fails validation.
    *   `pickerLine` reads a `metadata:` block of raw lines, with and without other
        keys in it.
    *   The Antigravity `description` starts with the picker line and still holds
        the original description after it.
    *   The Pi prompt and OpenCode command descriptions equal the picker line; no
        `agents/openai.yaml` is written for Codex.
    *   The rewrite changes `/jot:capture`, `(/jot:capture)` and `jot:capture` and
        leaves `docs/jot:capture`, `https://x/jot:capture` and `my-jot:capture`
        alone; it also rewrites a hook script string and a mapped OpenCode agent.
    *   No adapter writes a file outside its own `dist/<harness>/` tree, except the
        two marketplace files `.claude-plugin/marketplace.json` (Claude Code) and
        `.agents/plugins/marketplace.json` (Codex), which the test allows by name.
    *   Phase 3: over all 36 real skills, the file `restatePicker` writes equals
        the source except for the `description:` and `when_to_use:` lines, and a
        hint beginning with `<` stays quoted.
*   Phase 2. The old-name check: a test scans every file listed by `git ls-files` (so a new
    file counts once it is staged) and fails on a hit
    outside the exclusions. It reads the old names from the `old skill name` column
    of the table in `MIGRATION-v3.md` (the 26 renamed skills; the ten skills whose
    name is unchanged are not in scope). It cannot pass until Step 8 has edited the
    docs.
    *   Exclusions follow one rule, records and generated output: `CHANGELOG.md`,
        `MIGRATION-v2.md`, `MIGRATION-v3.md`, `docs/specs/**`, `docs/superpowers/**`,
        `docs/harness-research.md`, `harness_dictionary.md`,
        `templates/commit-tools/docs/**`, `tests/build/removed-skills.test.mjs`,
        `dist/**`, `.claude-plugin/**`, `.agents/**`. Other tests, `.skillshare/**`
        and `evals/**` are in scope.
    *   It computes the bare-token set itself (today `commit-action`,
        `execute-tasks`, `park-idea`, `review-parked` and `typst-publish`).
        `.skillshare/logs/` is excluded if tracked.
    *   The check is a one-release guard; remove it in the release after this one.
    *   Before the eval graders change, check how the eval runner matches
        `input_match`; if it is a substring match, `commit-tools:commit` also
        matches `commit-tools:commit-style`, so set the grader to an exact match.
    *   For every old name it checks three forms: `skills/<old>`,
        `codex-skills/<old>` and `<plugin>:<old>`.
    *   For `bivouac`, `devenv` and `sketch-note`, which are also plugin names
        and prefix the new paths, it checks only `skills/<old>/SKILL.md`,
        `bivouac:bivouac`, `devenv:devenv` and `sketch-note:sketch-note`.
    *   It checks the bare token (not preceded or followed by a letter, digit or
        `-`) only for an old name that equals no new skill name, no derived
        `plugin-skill` id and no plugin name; most old names equal a new Pi and
        OpenCode id and are valid text there.
    *   `tests/fixtures/claude-snapshot.json` is regenerated before this check
        runs (it needs Step 4.1).
*   The reference check: every token of the form `<plugin>:<skill>` or
    `/<plugin>:<skill>`, where `<plugin>` is a registry plugin name, in a tracked
    skill, agent, hook or template file (the same exclusions apply) must name a
    skill that exists in that plugin.

### Step 8: docs

*   `README.md` and `templates/readme-plugins.md.tmpl`, which renders into
    `README.md` through `scripts/update-readme.sh`: edit the template and run the
    script; `CLAUDE.md`: structure (no `commands/`; `skills/<plugin>/<skill>/`;
    the per-harness `dist/<harness>/plugins/`) and the invocation forms.
*   `CONTRIBUTING.md` (lines 46 and 113, which describe command wrappers and a
    `"commands": [...]` registry example) and `docs/authoring-skills.md` (how to
    write a skill, `user-invocable`, the 120-character picker line, qualified references, the capabilities modes
    at lines 191 to 192, how to add a harness; remove the command-file section).
*   `docs/command-skill-map.md` (phase 1, done with Step 6 because the contract test
    greps it): keep the filename, replace its content with the
    invocation forms per harness. It has only the `review-commits` line today
    (line 44); add the `validate-commits` line too, so both lines
    `test-unattended-contract.sh` greps for,
    `/skill:commit-tools-review-commits --unattended --base <ref>` and
    `/skill:commit-tools-validate-commits --unattended --base <ref>`, are in it,
    since eight files link to it (`README.md`,
    `CONTRIBUTING.md`, `docs/authoring-skills.md` twice, the Antigravity and
    OpenCode READMEs, `templates/readme-plugins.md.tmpl`,
    `handoff-review-commits-unattended.md` and the contract test).
*   `docs/releasing.md`: the new output paths, the breaking-rename note and the
    `git rm -r dist/plugins` step (Step 4.8). `skills/release/SKILL.md` (line 319
    describes `dist/plugins/<plugin>/` as the unified bundle) and
    `scripts/README.md` (line 8 names `dist/plugins`) get the same update.
*   `harnesses/README.md`, `harnesses/lib/README.md`, and each harness README
    (`antigravity`, `claude-code`, `codex`, `opencode`, `pi`): what the adapter now
    does and where it installs from; the OpenCode README says `opencode run
    "/name"` does not expand a command; the Antigravity README drops
    `commandSkillName` and the shared-root text. `scripts/lib/README.md`,
    `scripts/lib/adapters/README.md`, `scripts/lib/transforms/README.md`: the
    removed `commandToSkill` and `commandNames`, and the new helpers.
    `scripts/lib/README.md` (lines 22 and 30) documents `validateSkills({ repoRoot })`
    and the rule that `name` equals the directory; change both to
    `validateSkills({ repoRoot, registry })` and `name` equals the last segment of
    the folder. The harness READMEs that still say "legacy `dist/pi`" are
    corrected.
*   `MIGRATION-v3.md` (created in Step 1): confirm it lists the new install paths
    and the Pi and OpenCode entry changes for every plugin.
*   `harness_dictionary.md`: change the sections that describe the repo's naming
    from "planned" to "implemented"; commit it and `docs/harness-research.md`
    with this spec.

### Step 9: verification

Each check has a pass criterion. A check marked "gate" blocks the release when it
fails. A check marked "records" never blocks; it feeds an Open Question or a Risks
row.

*   **Build** (gate): `npm run build -- --out <dir>` into a scratch directory
    `<dir>`. Pass: it prints no error for any harness. Every real-harness check
    below installs from `<dir>/dist/<harness>/plugins/<plugin>` or
    `<dir>/.agents/plugins/marketplace.json`, never from the committed `dist/`
    (`--release` would overwrite it).
*   **Validate** (gate): `npm run validate`. Pass: no error other than the two the agy validator reports before this change on this machine (a `no logo` note per plugin and the `devenv` `.mcp.json` never-loaded warning); `agy` must be installed or its checks are skipped.
*   **Tests** (gate): `npm test`. Pass: no test fails except these fourteen titles
    (a title that starts to pass is recorded, not an error):
    *   a style override cannot bypass a missing bundled validator resource
    *   `agy plugin validate` accepts the generated plugins with the expected
        counts
    *   amend refuses a different author and a commit on a known remote branch
    *   approved split replay finishes without pausing before its commit calls
    *   body width counts characters, not bytes
    *   conventional style works from a standalone skill copy
    *   executor rejects missing approval and invalid messages before writing
        commits
    *   history replay uses the commit skill and requires approval before
        amendments
    *   message-only amend keeps the tree and leaves unrelated unstaged files alone
    *   split refuses missing approval before changing HEAD or the index
    *   split rejects a missing plan before resetting HEAD
    *   standalone commit skill creates a validated local commit without project
        configuration
    *   the executor runs without node on PATH
    *   validate checks the current sources, not committed dist
*   **Commit-tools smoke** (gate): the baseline hides this area, so run the
    commit-tools tests on a machine or sandbox where they pass before the change,
    and run `skills/commit-tools/review-commits/tests/test-unattended-contract.sh`.
    Pass: every test that passed before the change passes after it.
*   **Real harnesses, in isolated configs** (a run means one real invocation):
    *   Codex (gate): `codex plugin add` for every plugin, then `skills/list` over
        `codex app-server`. Pass: `plugin:skill` names, no `-cmd-`, no
        `source-command-*`, and `shortDescription` equal to each runnable skill's
        picker line. Records (Open Question 3): open the TUI picker and note the
        text; if it ignores `shortDescription`, add the `agents/openai.yaml`
        fallback in the same change.
    *   Antigravity (gate): confirm `agy` is installed first (the adapter's
        `validate` returns nothing without it). `agy plugin validate` on every
        tree and `agy plugin install <checkout>/dist/antigravity` into an isolated
        home. Pass: no error and ten plugins installed. Then, signed in,
        `/skills` and a `/plugin:skill` run. Pass: each row starts with the picker
        line and the run reaches the skill. Records (Open Question 4): the
        longest `/plugin:skill` name plus its picker line at 80, 100 and 140
        columns, and what is cut.
    *   OpenCode (gate): `GET /api/skill` and `GET /api/command`. Pass: both list
        `plugin-skill`, and the command description equals the picker line. Then
        run one command with a real model (Open Question 5). Pass: the model loads
        the skill and the arguments reach it.
    *   Pi (gate): `pi --mode rpc` `get_commands`. Pass: `skill:plugin-skill` and
        the prompts are listed and Pi prints no startup diagnostic. Then run one
        prompt with a real model and arguments (Open Question 5). Pass: the model
        loads the skill and the arguments reach it. `get_commands` omits the hint,
        so check it in the interactive autocomplete row (records).
    *   Claude Code (gate): `claude plugin validate`. Pass: no error; the init
        listing shows `plugin:skill`. Records (Open Question 1): open the `/` picker
        and note whether it shows the picker line, `when_to_use` or the hint. If it
        appends `when_to_use`, apply the fallback (revert to a plain `description`).
    *   Upgrade (gate, Open Question 6): in an isolated config, add the real
        repository's pushed release branch as a marketplace, install a plugin from
        the last release, then `marketplace update` and `plugin update`. Pass: the
        plugin moves to the new `source` with the renamed skills. The owner pushes
        the branch (pushing is the owner's).
*   **After a fallback**: when a Records outcome applies a fallback (Claude Code:
    revert to a plain `description`; Codex: write `agents/openai.yaml` with
    `interface.short_description` set to the picker line into each Codex skill
    folder), rerun Build, Validate, Tests and the Claude snapshot regeneration. The
    Step 7 assertions change with it: Claude Code asserts `description` is
    unchanged; Codex asserts `short_description` equals the line instead of "no
    `openai.yaml` written".
*   **Versions**: record the version of every harness CLI used above in the
    release notes (the Risks table refers to them), and keep the command output of
    each run with the change (rounds 2 to 5 have none).
*   **Evals** (gate): `npm run eval commit-tools` once before the change and once
    after, because its graders name the fired skill. Pass (Open Question 2): no
    case that passed before fails after; the full set is documented in
    `CLAUDE.md`.

## Appendix A: Verified behavior

Checked on 2026-11-02 and 2026-11-03 against the real harnesses in isolated
configs (dictionary section 8). The design relies on these. Raw output exists for
the first round (`docs/harness-research.md`); the later rounds are recorded as
results only and their raw logs were not kept. Where a cell is documentation and
not a run, it says so.

| Behavior | Result |
|---|---|
| Pi runs a skill whose frontmatter `name` differs from its folder | Yes; folder `backlog` with `name: craft-backlog` lists as `skill:craft-backlog` with no warning, and `/skill:craft-backlog args` sends that file's body, then the arguments |
| Pi with `pi.skills` set to an explicit folder also loads a sibling `skills/` | No; only the listed folder is registered, by `pi install` and by `pi -e` |
| A Pi prompt with no placeholder keeps the arguments | No; the arguments are dropped. The prompt also does not load the skill; the model does that. A prompt and a skill of the same name coexist (`craft-backlog` and `skill:craft-backlog`) |
| OpenCode registers a skill id different from its folder and runs it | Yes; id `commit-tools-commit` for `skills/commit-action/SKILL.md`; the API and the model's skill tool return that file's body |
| OpenCode expands a plugin command on a slash | In the TUI and through the API, yes (`$ARGUMENTS` and `$1` expand). `opencode run "/craft-backlog x"` does not expand: the model gets the literal text |
| A user skill with the same id as a plugin skill on OpenCode | The user file wins, from `.opencode/skills` or `.claude/skills`, and nothing is logged or listed |
| Codex keeps `short_description` up to 1024 characters | Yes; 1025 is dropped for that field only; `display_name` survives; a 1025-character `SKILL.md` description still loads. Documented (not run): Codex's skill popup shows `short_description`, falling back to the description |
| Antigravity lists a plugin's real skills as `plugin:skill` and runs them | Yes, observed with a signed-in session |
| Antigravity loads `skills/` and a `skills.json` folder together | Yes, the union. A shared root with only `.claude-plugin/plugin.json` fails `agy plugin validate`; it needs `.antigravity-plugin/plugin.json`. A skill declared by `skills.json` is named with its path (`s1:..:other:dup`) and wins over the same name in `skills/` |
| Antigravity accepts a hint inside the description | `agy plugin validate` passes; `/skills` shows it verbatim. The TUI picker keeps one line per skill and shows about 120 characters of description at 140 columns, so a hint at the end of a long description is lost and a short line shows in full (decision 9) |
| Antigravity `disable-slash-command: true` | The TUI picker omits the skill, `/name` is "Unknown command" and `/plugin:name` goes to the model as text. Print mode runs both forms |
| Claude Code loads a skill with a quoted hint containing `\|`, `[`, `]`, `<`, `>` and `user-invocable: false` | Yes; `claude plugin validate` passes (only a missing-`author` warning), the init listing shows `demo:backlog` and `demo:commit` and omits the model-only skill. The hint is not in the init message, so its rendering in the picker was not observed |
| Pi loads the new tree (frontmatter `name` `demo-backlog` in folder `backlog`, explicit `pi.skills`) without a diagnostic | Yes; no warning on stderr or stdout; a prompt with `Arguments: $ARGUMENTS` delivers the arguments; `/skill:name` injects the body with the references unrewritten (Pi rewrites nothing). `argument-hint` on a prompt is not in `get_commands`; it was observed in the interactive autocomplete row in the first round |
| OpenCode loads the new tree (folder `backlog`, id and frontmatter name `demo-backlog`, a command template under `runtime/opencode/commands/`) | Yes; no warning at load. `/api/skill` lists the three skills with id equal to name; `/api/command` lists the command with the hint in its description and no command for the model-only skill. The command delivers `Arguments: foo bar`, the model called the skill tool with the id, followed the cross-reference to a second skill and read a sibling file by relative path, with no loop. The first skills call right after boot returned an empty list (loading is lazy) |
| Antigravity accepts the standalone tree (hint in a double-quoted description of 400 characters, `disable-slash-command: true` on the model-only skill) | `agy plugin validate --json --strict` passes with 3 skills (only the no-logo note); `plugin install` and `plugin list` show the bare names with no path prefix and no duplicates. Live: `/skills` shows `demo:backlog`, `demo:commit` and `demo:short`, the hint verbatim at the end of the full description, and omits the model-only skill. The TUI picker shows one row per skill; at 140 columns about 120 characters of description are visible, so the hint shows only when description plus hint fit (a 60-character description did; the 400-character one was cut with `...` and the hint was lost). Typing `/demo:task-commit` in print mode still ran the model-only skill |
| The latest design's trees (picker lines in `metadata.short-description`) load on each harness | Claude Code: `plugin validate` clean, `user-invocable: false` skill omitted from the listing. Codex: `shortDescription` equals the line exactly with no `openai.yaml`; no stderr diagnostics. Pi and OpenCode: no diagnostic or warning at load; that the prompt or command description equals the line holds by construction in the fixtures and was not read back from a live listing. Antigravity: validate, install and list pass offline; the live picker was not rerun |
| Codex reads `metadata.short-description` from `SKILL.md` | Yes; with no `agents/openai.yaml`, `skills/list` returns the nested value verbatim as `shortDescription`; with neither it returns null; with both, both fields are kept (which one the TUI shows was not run; the first round saw the picker prefer the yaml). A yaml text of 1000 characters is kept and 1100 dropped entirely (the skill still lists). The model-only skill is listed and enabled |
| Claude Code accepts `when_to_use` beside a short `description`, a quoted `argument-hint` and nested `metadata` (2026-11-03, Claude Code 2.1.314) | `claude plugin validate` passes (README, LICENSE and icon notes only); the init skill list shows `craft:backlog`. Not observed: which text the `/` picker renders |
| Claude Code updates an installed plugin in place when the marketplace `source` moves and the version changes (2026-11-03, Claude Code 2.1.314, directory marketplace in an isolated config) | Yes; `marketplace update` then `plugin update` moved the install from `dist/plugins/craft` (skill `craft-backlog`, 1.0.0) to `dist/claude-code/plugins/craft` (skill `backlog`, 2.0.0) and the cache holds both versions. A git-sourced marketplace was not run (Claude Code rejects a `file://` source, so it needs a pushed branch) |
| Description and hint lengths in this repo | Every one of the 36 descriptions is over 120 characters (median 298, longest 375); the longest hint is 140, so neither fits a 120-character picker row (decision 9) |

Behavior of a user-only flag (dictionary section 8) (`disable-model-invocation`): Pi removes the skill from the model's skill list and `/skill:name` still injects its body; OpenCode `autoinvoke:false` hides it from the list but the skill tool still loads it by id; Codex does not expose the flag in `skills/list`; Claude Code lists it for the user. No skill in this design uses it.

<!-- Provenance: drafted with EGM; revised after five review rounds and the harness spikes. -->
