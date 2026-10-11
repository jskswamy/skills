# Changelog

All notable changes to this skills/plugins collection will be documented in this file.

## [2.1.15] - 2026-10-11

### Added

- Add bivouac workflow skill

Introduce a canonical bivouac skill and thin Claude command for safe
remote agent session workflows.

Package the workflow for Pi and Claude Code, document the command mapping,
and cover the registry and wrapper packaging with tests.

### Other

- Rewrite docs around skill workflows

Lead the README with a capability map and task guide so users can see
what the skills do before reading install or generated reference
material.

Align the authoring, contributing, release, and Pi docs with the
canonical skill source model and generated Claude wrapper workflow.
- Make release skill harness-neutral

The release workflow still assumed marketplace.json carried a
metadata.version field and lived only under .claude/commands/,
making it Claude Code only. Both assumptions broke after the
registry.json-driven, generated-wrapper refactor: there's no
marketplace-wide version field anymore, and other harnesses like
Pi can't see .claude/commands/.

Move the full instructions to skills/release/SKILL.md, the shared
canonical location Pi already loads directly. registry.json is now
read as the source of truth for per-plugin versions, with
marketplace.json and plugin.json treated as npm run build output
that is never hand-edited.

Also fix the changed-plugin detection: it previously flagged every
plugin whenever registry.json changed at all, since the file is
shared across plugins. It now diffs each plugin's own block plus
its actual resource files.

.claude/commands/release.md is now a thin pointer to the canonical
skill so Claude Code and Pi follow the same instructions. Reword
cliff.toml's header to drop the "Claude Code Plugin Marketplace"
naming, since this repo is no longer Claude-specific.
- Exclude new plugins from release version bump

Running the release workflow for real surfaced a bug: a brand-new
plugin (absent from the registry at the last tag) was flagged the
same as a changed existing plugin, which would bump its
already-correct introduction version.

Checked precedent: the study plugin was introduced at 1.0.0 and
was untouched by the very next release commit. New plugins keep
their introduction version as the first release; only existing
plugins with real changes get bumped.

### Removed

- Remove IDE handoff skill

Drop the guardrails package and retired handoff workflow from the
canonical skill sources, generated Claude plugin output, registry, and
user documentation.

Add a regression test to ensure the removed skill is not packaged again.
## [2.1.14] - 2026-10-09

### Changed

- Update CHANGELOG and README for v2.1.14

Document all changes included in the v2.1.14 release.
Regenerate plugins section in README from marketplace.json. by @jskswamy

### Fixed

- Handle nix fallback for Typst publishing

Accept the nix command in typst-publish preflight when typst and
nix-shell are absent. The compile script now invokes Typst through
`nix shell nixpkgs#typst -c typst` so Nix users do not need a global
Typst install.

Add coverage for the skill text, generated plugin copy, and compile
script fallback path. by @jskswamy

### Other

- Fail fast in typst-publish when typst is missing

Add a mandatory preflight step that stops before any work if neither
typst nor nix-shell is available.

Print install steps and offer to install typst for the user. by @beingakshar
- Forbid classic subject label prefixes

Reject multi-word colon labels and bracketed scopes in classic commit
subjects so scope-like prefixes cannot masquerade as imperative
sentences.

Clarify the classic style guide with examples for conventional,
area-style, and bracketed prefixes. by @jskswamy
- Detect tracker leaks in commit messages

Add a deterministic tracker leak detector for review-commits and
validate-commits. The detector classifies subject prefixes, trailers,
parenthetical references, and narrative references across the commit
range.

Document project-local configuration for extra tracker patterns and
trailer keys, and keep generated commit-tools plugin resources in sync. by @jskswamy
- Release v2.1.14

Bump commit-tools from 1.0.2 to 1.0.3.
Bump typst-notes from 1.0.3 to 1.0.4. by @jskswamy
## [2.1.13] - 2026-09-30

### Added

- Add registry-driven plugin generation

Move reusable plugin resources into canonical root directories and
generate Claude Code marketplace wrappers from registry metadata.

This keeps Claude installs git-tree compatible while exposing root
skills and Pi package metadata for other harnesses. by @jskswamy

### Changed

- Rename marketplace for skills repo

Update install commands, package metadata, release links, and generated
marketplace output after renaming the repository to jskswamy/skills. by @jskswamy
- Migrate command workflows into skills

Extract remaining command workflows into canonical skills.

Keep Claude commands as thin wrappers that forward arguments.

Document the command-to-skill mapping for Pi users. by @jskswamy

### Documentation

- Document multi-harness authoring flow

Describe canonical resource directories, generated Claude wrappers,
Pi package installation, and release checks for committed install trees. by @jskswamy
- Document cross-harness skill usage

Update the generated README section to show Pi skills alongside Claude
Code plugin commands.

Switch the generator to registry.json so the skill lists stay in sync. by @jskswamy
- Document unattended commit review mode by @jskswamy

### Fixed

- Fix migrated skill descriptions

Replace empty block-scalar descriptions with valid skill descriptions.

Tighten registry validation so empty YAML block descriptions fail. by @jskswamy

### Other

- Design multi-harness capabilities layout

Capture the target repository structure and release model for sharing
agent skills across Claude Code, Pi, and future harness adapters. by @jskswamy
- Plan multi-harness capabilities refactor

Break the approved design into implementation tasks for registry-driven
wrapper generation, canonical resource directories, validation, and
multi-harness documentation. by @jskswamy
- Design command wrappers over skills

Define the migration from Claude command workflows to canonical skills
with thin command wrappers.

This preserves Claude UX while exposing the same workflows through Pi
skill invocation. by @jskswamy
- Plan command wrappers over skills

Break the wrapper-command design into Codebase migration tasks.

The plan covers thin wrapper tests, canonical skill extraction, registry
updates, and documentation. by @jskswamy
- Extract Codebase commands into skills

Move Codebase command workflows into canonical skills and keep Claude
Code commands as thin wrappers that forward arguments to those skills.

This exposes the same workflows to Pi through direct skill invocation. by @jskswamy
## [2.1.12] - 2026-08-03

### Changed

- Update CHANGELOG and README for v2.1.12

Document all changes included in the v2.1.12 release.
Regenerate plugins section in README from marketplace.json. by @jskswamy

### Other

- Derive project name and auto-reindex stale indexes

Step 0 now derives the project name from `git rev-parse
--show-toplevel` by stripping the leading `/` and replacing
remaining `/` with `-`, then calls `index_status` directly
with that name. This gives two distinct failure modes:
MCP unreachable vs project not indexed.

Step 0b is rewritten as a decision table. Stale indexes
(>24 h) are now auto-reindexed when `auto_index` is not
`never`, replacing the old warn-and-proceed behaviour.

Step 1 is simplified to reference the name already derived
in Step 0 instead of calling `list_projects` again. by @jskswamy
- Release v2.1.12

Bump marketplace version from 2.1.11 to 2.1.12.
Bump plugin versions: codebase 0.1.3 → 0.1.4. by @jskswamy
## [2.1.11] - 2026-08-03

### Added

- Add PreToolUse grep hook to codebase plugin

Intercepts Bash grep/rg calls and injects matching codebase-memory
graph symbols as context before the grep runs. Claude sees the graph
results first and typically skips acting on the grep output.

The hook calls codebase-memory-mcp via its cli subcommand, derives
the project name from the git root path, and is fail-open: any error
or zero results exits 0 with no output.

hooks.json wires it via ${CLAUDE_PLUGIN_ROOT} so the path resolves
correctly regardless of where the plugin is installed. by @jskswamy

### Changed

- Update CHANGELOG and README for v2.1.11

Document all changes included in the v2.1.11 release.
Regenerate plugins section in README from marketplace.json. by @jskswamy

### Other

- Release v2.1.11

Bump marketplace version from 2.1.10 to 2.1.11.
Bump plugin versions: codebase 0.1.2 → 0.1.3. by @jskswamy
## [2.1.10] - 2026-08-03

### Changed

- Convert jot capture to inline command pattern

Replace the spawned-subagent delegation with an inline orchestration
pattern (study:coach style). AskUserQuestion is filtered out of
subagent tool access in Claude Code, so the old pattern terminated
the agentic loop after every exchange.

commands/capture.md is now an orchestrator: resolves config, delegates
URL extraction to jot:content-extractor (one-shot), then reads and
runs agents/capture.md directly in the command's conversation context.

agents/capture.md becomes a spec document: frontmatter removed, Phase
1a updated to treat config as pre-loaded, Phase 3b residency guard
removed. All 6 phases and all AskUserQuestion calls are unchanged —
they now work natively in the inline context.

Also fixes from final review: CONTENT schema (title/description/body/
raw_source), jot.local.md absolute path, stale Phase 5a variable ref. by @jskswamy
- Update CHANGELOG and README for v2.1.10

Document all changes included in the v2.1.10 release.
Regenerate plugins section in README from marketplace.json. by @jskswamy

### Other

- Replace jot capture with 6-phase workflow

Rewrote the capture agent from a monolith into an explicit
6-phase structure: classify → extract → study → draft →
review → save.

The old agent embedded routing, URL extraction, and save in a
single flat flow that was hard to follow reliably, causing blank
titles, duplicate tags, and missed fields when using Capacities.

Key changes:
- Classify detects Mode A (synthesise from conversation) or
  Mode B (guided fresh session), eliminating the need to invoke
  a separate capture command with structured arguments
- Study phase added between extract and draft — skippable gear
  system lets users learn the concept before committing to a draft
- Draft writes to a pivot file on disk before the review loop,
  preventing loss during long sessions
- All Capacities operations route through the cap CLI; the MCP
  capacities tools are banned to avoid schema bypass bugs that
  wiped fields and produced blank titles
- Backend guards prevent cap calls on workbench-only installs
- commands/capture.md reduced to a thin mandatory delegate
- Study and review edit interactions use AskUserQuestion in a
  loop so the agent stays resident; each exchange no longer
  spawns a fresh instance with a full context reload by @jskswamy
- Make study auto-skip content-aware

The word-count-only gate in Phase 3 didn't distinguish between
reference material (feature lists, install guides) and conceptual
content (arguments, design rationale, failure analysis). Tool
READMEs easily exceeded 50 words while offering nothing to reason
through.

The new logic assesses content nature before showing the gear
check. Reference and factual content auto-skips with a brief
announcement so users can push back. When ambiguous, defaults to
showing the gear check — a false negative (silently skipping a
valuable session) is worse than a false positive (one extra click). by @jskswamy
- Release v2.1.10

Bump marketplace version from 2.1.9 to 2.1.10.
Bump plugin versions: jot 2.0.0 → 2.0.1 (sync from 1.6.8 in marketplace). by @jskswamy

### Removed

- Delete deprecated quick-capture, bump to v2.0.0

The quick-capture agent had been superseded by the routing agent
and marked deprecated. Removing it eliminates the stale routing
entry. Version bump reflects the breaking architecture change. by @jskswamy
## [2.1.9] - 2026-07-23

### Added

- Add smart amend detection to commit-tools

Auto-detects whether staged changes should amend the previous
commit rather than always creating a new one, eliminating the
manual review-commits fold step after each session.

Step 3b (new): run a Jaccard file-overlap heuristic against the
last commit. Overlap > 0.5 → amend; zero overlap with different
top-level dirs → new commit; ambiguous → LLM judgment. Skips
when --amend is explicit, commit is pushed, or authored by
someone else. Handles branches with no upstream (treats as
unpushed).

When AMEND_MODE=true: Step 7 synthesises a single fresh message
from both diffs; Step 8 shows an amend-specific confirm dialog
with a "New commit instead" escape hatch that resets AMEND_MODE
and regenerates from staged diff alone; Step 9 runs
git commit --amend. by @jskswamy

### Changed

- Update CHANGELOG for v2.1.8 by @jskswamy
- Update CHANGELOG and README for v2.1.9

Document all changes included in the v2.1.9 release.
Regenerate plugins section in README from marketplace.json. by @jskswamy

### Fixed

- Fix jot capture delegation and add review gate

Three fixes to the jot capture plugin:

- commands/capture.md: add MANDATORY block that forces Agent tool
  delegation. Claude was treating the delegation description as
  documentation and handling captures inline.

- agents/capture.md: move MCP ban to the top of the agent and
  strengthen it in the Step 5h generated-agent template. MCP
  Capacities tools produce blank titles, duplicate tags, and wiped
  fields — the cap CLI is the only safe path.

- agents/capture.md: add Step 4.5 Review Gate. After content is
  assembled the agent shows the draft (frontmatter + body) and asks
  Save / Edit / Cancel. Edit loop runs in-context with no sub-agents.
  Configurable via review: key in jot.md (default: both). by @jskswamy

### Other

- Ignore .beads directory and untrack it from git

Beads data is local-only (issues, hooks, credentials, config).
Replace narrow export-state.json exclusion with full .beads/ rule. by @jskswamy
- Release v2.1.9

Bump marketplace version from 2.1.8 to 2.1.9.
Bump plugin versions: commit-tools 1.0.1 → 1.0.2, jot 1.6.7 → 1.6.8. by @jskswamy
## [2.1.8] - 2026-07-22

### Fixed

- Fix study plugin inline sessions and vault recall

SendMessage is unavailable in Claude Code CLI so the previous
spawn-once + SendMessage pattern fell back to re-spawning a new
agent each turn (~20k tokens replayed per reply).

coach.md and recall.md now read the agent file via CLAUDE_PLUGIN_ROOT
and run the session directly in the main conversation thread. The
agent files remain the single source of truth for session logic.

Also extends /study:recall to search content_vaults when no coaching
note exists in notes_path, so pre-existing vault notes can be used
as recall targets. by @jskswamy

### Other

- Respect CLAUDE_CONFIG_DIR in plugin config paths

Plugins hardcoded ~/.claude for reading and writing config files
(jot.md, study.md, installed_plugins.json). When CLAUDE_CONFIG_DIR
is set to a non-default location the plugins broke silently.

Replace all ~/.claude references with ${CLAUDE_CONFIG_DIR:-$HOME/.claude}
across jot, study, and craft plugins. Behavior is unchanged when the
env var is unset — the fallback resolves to the same default path. by @jskswamy
- Release v2.1.8

Bump marketplace to 2.1.8. Plugin versions: craft 1.0.1,
jot 1.6.7, study 1.0.3. by @jskswamy
## [2.1.6] - 2026-07-20

### Added

- Add multi-agent research and multi-object capture

Adds Step 2a (Complexity Check) and Step 6 (Multi-Object Continuation)
to the routing agent.

Step 2a detects two things:
- Multiple capture intents in one input ("organisation … along with …
  milestone") → builds a CAPTURE_QUEUE, confirms with AskUserQuestion
- Research signals ("need to research", embedded questions, extra URLs)
  with ≥2 tasks → fans out parallel Agents (one per URL, one per topic)
  and merges results into RESEARCH_CONTEXT before any saving begins.
  Single-task inputs stay inline with no agent overhead.

Step 6 drains CAPTURE_QUEUE after each save: picks the next object,
pulls relevant RESEARCH_CONTEXT, and loops through Step 4/5 until all
objects are captured, then links related objects via cap link.

Also adds the Agent tool to the routing agent's tool list. by @jskswamy
- Add jot configure command for managing type agents

Users had no way to reconfigure a type after initial setup or edit
the questions and output template for an existing type agent.

The new /jot:configure command lets users pick a configured type
and choose from four actions: edit capture questions, edit the
output template body structure, update trigger phrases and URL
patterns, or reset the type entirely so the next capture re-runs
full First-Encounter Setup from scratch. by @jskswamy

### Changed

- Update CHANGELOG and README for v2.1.6

Document all changes included in the v2.1.6 release. by @jskswamy

### Fixed

- Fix capture agent setup gates and URL extraction

First-encounter setup (Step 5) had three interactive gates written as
prose quote blocks. The model would infer answers from context and skip
AskUserQuestion entirely. Replaced Step 5a (type mapping confirm),
Step 5e (trigger phrase confirm + URL patterns), and Step 5f (reference
object) with explicit AskUserQuestion calls so they always pause.

URL content extraction was noted in Step 2 Priority 3 as "for later"
but Steps 3 and 4 never followed up. Added yt-dlp transcript extraction
for YouTube URLs and WebFetch for articles, executed immediately at
detection time and stored as URL_CONTENT. Step 5g now seeds the
generated template from URL_CONTENT when available. by @jskswamy
- Fix untitled tags and missing fields in jot capture

Root causes found via systematic debugging:

1. `cap create -t RootTag --title "..."` silently ignores --title,
   creating every tag as "Untitled". The pre-creation step was the
   bug — tags included in the frontmatter tags: field are correctly
   named by the CLI automatically.

2. `cap search --type Tag` always returns empty even when tags exist,
   so the dedup check never worked and always triggered a create call,
   compounding the Untitled problem.

3. The frontmatter assembly template didn't make it explicit that date
   and status must always be included — fields with defaults were
   being silently dropped.

Fix: remove the separate tag pre-creation step entirely from the Save
Instructions template (and both existing type agents). Tags go
directly into the frontmatter tags: field; CLI handles dedup and
creation. Also added an explicit note that all schema fields must be
included in assembled frontmatter, with clear note on CLI-only rule. by @jskswamy
- Fix schema discovery to use cap types instead of cap validate probing

Root cause: cap validate accepts any field name regardless of whether
it exists on the type, producing phantom schemas. Organisation ended
up with date/status/link fields that Capacities silently drops on
create — none of those fields exist on the Organization type.

Fix Step 5b to use `cap types "<TYPE>" --json` which returns the
authoritative field list. cap validate probing is explicitly
prohibited for field existence checks.

Also update organisation.md to reflect the real Organization schema:
- Remove phantom date, status, link fields
- Add `contact information` (richText) for website/contact details
- Document that entity links use `people` and `personalities` keys

Verified: contact information field persists correctly; Title Case
tags with spaces store and search correctly (cap get display strips
spaces but actual titles are intact). by @jskswamy
- Fix per-turn agent re-spawns in study commands

coach.md and recall.md both said "delegate" to an agent with
no guidance for follow-up turns. Without a SendMessage
instruction, the orchestrator defaults to spawning a fresh
agent per user response, re-paying ~15k tokens of context
on every turn.

Both commands now: spawn the agent once, store agentId,
and route all subsequent user responses through SendMessage.
The same fix covers the coach Explain gear and the recall
session's Feynman explanation loop. by @jskswamy

### Other

- Use Title Case for tags in jot capture

Tags like "Aerospace" and "Private Space" instead of "aerospace"
and "private-space". Applied to the Save Instructions template
in capture.md and both existing type agents. by @jskswamy
- Bake CLI-only guard into generated type agent template

The MCP guard was only in the routing agent (capture.md). Generated
type agents had no such guard and kept reaching for mcp__capacities__*
tools. Fix: add the CLI-only prohibition at the top of the type agent
template in Step 5h so every generated agent carries it.

Also remove the phantom date field from the schema table template —
it was misleading agents into including date on types that don't
have it (e.g. Organization). by @jskswamy
- Release v2.1.6

Bump marketplace version from 2.1.5 to 2.1.6.
Bump plugin versions: jot 1.6.5 → 1.6.6, study 1.0.0 → 1.0.1. by @jskswamy
## [2.1.5] - 2026-07-19

### Changed

- Update CHANGELOG and README for v2.1.5

Document all changes included in the v2.1.5 release.
Regenerate plugins section in README from marketplace.json. by @jskswamy

### Other

- Strip jot setup to backend selection only

The previous setup mapped 12+ Capacities types upfront via cap search
loops. This was brittle — types vary per user space — and required
significant configuration before any captures could happen.

Replace with a three-step flow: pick backend, verify cap connectivity
(Capacities path only), write minimal config. Type agents are now
generated automatically on first capture via the routing agent.

New config format writes: capture_backend, agents_dir, routing: []. by @jskswamy
- Rewrite capture agent as universal routing agent

Replaces the URL-specific capture agent with a dynamic routing agent
that handles any input: natural language, URLs, explicit type labels,
and inline "jot" sentences.

Routing uses five priority levels: explicit label > trigger phrase >
URL pattern > inline "jot" verb > ambiguous (ask user). Each routing
entry lives in ~/.claude/jot.md, populated on first capture.

Adds first-encounter setup (Steps 5a-5j) that runs inline when a type
is captured for the first time: probes Capacities schema via cap
validate, discovers enum values, collects trigger phrases, optionally
reads a reference object for template generation, writes a self-
contained type agent to ~/.claude/jot/agents/<id>.md, and updates the
routing table — all without leaving the capture conversation. by @jskswamy
- Thin capture command delegates to routing agent

Remove the 354-line type-parsing command that hardcoded task/note/idea/
session/blip types and delegated to quick-capture. Replace with a 45-
line entry point that passes all input to the routing agent.

The routing agent (agents/capture.md) now handles type detection,
confirmation, and delegation — the command just provides examples and
documentation. by @jskswamy
- Mark quick-capture agent as deprecated

Add HTML comment at top of agents/quick-capture.md noting that its
functionality is now handled by the routing agent (agents/capture.md).
File is kept intact for reference; comment directs readers to the new
routing agent and notes this file will be removed in a future cleanup. by @jskswamy
- Release v2.1.5

Bump marketplace version from 2.1.4 to 2.1.5.
Bump jot plugin from 1.6.4 to 1.6.5. by @jskswamy
## [2.1.4] - 2026-07-17

### Changed

- Update CHANGELOG and README for v2.1.4

Document all changes included in the v2.1.4 release.
Regenerate plugins section in README from marketplace.json. by @jskswamy

### Other

- Release v2.1.4

Bump marketplace to 2.1.4, jot plugin to 1.6.4.

Complete the Capacities CLI migration in the jot plugin. All three
capture entry points now use the cap CLI exclusively — no MCP calls
remain.

commands/capture.md replaces getObjectTypeShape, saveToDailyNote, and
createObjectViaMD with cap types, cap daily-note, cap validate, and
cap create. agents/quick-capture.md uses cap types --name to resolve
structureIds dynamically rather than hardcoding space-specific UUIDs. by @jskswamy
## [2.1.3] - 2026-07-17

### Changed

- Update CHANGELOG and README for v2.1.3

Document all changes included in the v2.1.3 release.
Regenerate plugins section in README from marketplace.json. by @jskswamy

### Other

- Replace jot Capacities backend with cap CLI

MCP calls (createObjectViaMD, updateObjectViaMD, getObjectTypeShape,
saveToDailyNote, search) were producing blank titles, rejecting
Weblink objects, duplicating tags, and silently dropping entity
links due to API inconsistencies and full-replace semantics.

Replace with cap CLI Bash calls throughout:
- cap validate: normalizes ring/quadrant case, infers iframeUrl from
  link on Weblinks, infers category from URL host, exits 1 with
  structured JSON errors on missing required fields
- cap create --markdown -: creates objects from validated frontmatter
- cap search --type Tag: deduplicates tags before creating new ones
- cap link: sets entity relationships via typed API, not wikilinks
- cap daily-note: handles session captures
- cap update: non-destructive per-field updates

Also adds docs/specs/capacities-cli-extensions.md with the handoff
spec for the three CLI additions built to support this migration. by @jskswamy
- Release v2.1.3

Bump marketplace version from 2.1.2 to 2.1.3.
Bump plugin versions: jot 1.6.2 → 1.6.3. by @jskswamy
## [2.1.2] - 2026-07-17

### Added

- Add study plugin and remove teach from jot

Introduce the study plugin: an adaptive learning coach with multi-gear
coaching sessions (Socratic, Explain, Guide, Check, Help) and spaced
Feynman-style recall tracking.

Commands:
- study:setup  - interactive wizard writing ~/.claude/study.md with
                 notes_path and content_vaults (array of local dirs)
- study:coach  - coaching session on any topic, URL, or local file;
                 auto-flows into recall at session end
- study:recall - standalone Feynman recall targeting known gaps

Each coaching session saves a note with identified gaps and a Recall
Log table that tracks improvement over successive recall sessions.
Config is global (~/.claude/study.md) since learning persists across
projects.

Remove teach command and learning-tutor agent from jot - that
functionality now lives in study:coach → study:recall. Update jot
description and tags to reflect the narrowed scope (capture only). by @jskswamy

### Changed

- Update CHANGELOG and README for v2.1.2

Document all changes included in the v2.1.2 release.
Regenerate plugins section in README from marketplace.json. by @jskswamy

### Other

- Release v2.1.2

Bump marketplace version from 2.1.1 to 2.1.2.
Bump plugin versions: jot 1.6.1 → 1.6.2.
Introduce study 1.0.0 (new plugin). by @jskswamy
## [2.1.1] - 2026-07-13

### Changed

- Update CHANGELOG and README for v2.1.1

Document all changes included in the v2.1.1 release.
Regenerate plugins section in README from marketplace.json. by @jskswamy

### Fixed

- Fix jot capture: enforce 1-2 thematic tags only

Templates previously instructed agents to generate 5-7 descriptive
tags per capture, polluting Capacities with object-specific tags
(e.g. `command-runner`, `justfile`) instead of thematic categories
(e.g. `Dev Tools`, `Agentic AI`).

- Remove standalone Tags section from all capture templates;
  move to a single `**Tags:**` line in the header metadata block
- Update tag rules to require 1-2 thematic/domain tags only, never
  the object's own name; reuse existing Capacities tags first
- Add tag instructions to research.md (previously had none)
- Update capture agent Step 7 and Quality Standards to match;
  clarify Capacities sets tags via frontmatter, not body content by @jskswamy
- Fix release skill: auto-bump changed plugin.json on release

Previously the release skill only synced plugin versions FROM plugin.json
INTO marketplace.json, but nothing ever bumped plugin.json itself.

Added Step 2.3-2.4: detect which plugins changed since the last tag via
git diff, then apply the same semver bump type to each changed plugin's
plugin.json before syncing into marketplace.json. by @jskswamy

### Other

- Release v2.1.1

Bump marketplace version from 2.1.0 to 2.1.1. by @jskswamy
- Bump jot plugin.json to 1.6.1

Sync jot version in marketplace.json to match. by @jskswamy
## [2.1.0] - 2026-07-11

### Changed

- Improve jot Capacities backend v1.6.0

Fix quality issues from a multi-object capture session and extend
the Capacities path with richer field population, entity linking,
and tag validation.

capture.md:
- Add thematic tagging guidance: tags must be domain categories,
  not the captured object's own name (e.g. Knowledge Graph, not
  graphiti)
- Add Step 9a: call getObjectTypeShape at capture time for live
  field discovery, replacing static fields arrays in jot.md
- Always write both title: and entityTitleName: in frontmatter to
  prevent Capacities from creating objects as Untitled
- Populate iframeUrl from the source URL for Weblink objects; this
  field is required — omitting it caused createObjectViaMD to
  reject the Weblink type entirely
- Scan discovery context for entity mentions, search Capacities,
  and link confirmed matches as [[type/Title]] in body and
  [[Title]] in entity frontmatter fields
- Validate candidate tags via search before saving; create new tags
  in Title Case with a domain-appropriate emoji icon

setup.md:
- Probe all non-session types in parallel via getObjectTypeShape
  to surface relationship topology before confirming mappings
- Write type-only config (no fields arrays); live shape lookup at
  capture time replaces the static field lists
- Correct default mappings: blip=Blip, video=Weblink,
  organisation=Organization, trove=Trove, research=Research

.gitignore:
- Ignore docs/superpowers/ and .superpowers/ (session artifacts)
- Ignore jot-capture-plugin-improvements.md (working notes) by @jskswamy
- Update CHANGELOG and README for v2.1.0

Document all changes included in the v2.1.0 release. by @jskswamy

### Other

- Release v2.1.0

Bump marketplace version from 2.0.2 to 2.1.0.
Sync jot plugin version from 1.5.0 to 1.6.0. by @jskswamy
## [2.0.2] - 2026-07-08

### Added

- Add Capacities backend to jot v1.5.0

Users can now choose where jot saves captures: to the
local workbench folder or to their Capacities knowledge
space via MCP. Backend is configured once with a new
/jot:setup command and stored in ~/.claude/jot.md.

Setup discovers Capacities object types at runtime,
builds a jot-type to Capacities-type mapping with field
schemas, and handles reconfiguration. All three capture
surfaces (commands/capture, agents/quick-capture,
agents/capture) route saves based on the stored
capture_backend value. by @jskswamy

### Changed

- Update CHANGELOG and README for v2.0.2

Document all changes included in the v2.0.2 release. by @jskswamy

### Other

- Release v2.0.2

Bump marketplace version from 2.0.1 to 2.0.2.
Sync jot plugin version from 1.4.2 to 1.5.0. by @jskswamy
## [2.0.1] - 2026-05-16

### Changed

- Update CHANGELOG and README for v2.0.1

Document the commit-tools classic style enforcement fix in CHANGELOG.
Regenerate the plugins section in README from marketplace.json. by @jskswamy

### Other

- Enforce classic style rules in commit-tools

The classic style guide forbids type prefixes, requires imperative
mood, and caps subjects at 50 characters, but none of the commit-tools
skills enforced those rules. A subject like "Spec: declarative agent
provisioning" passed every check despite violating two rules.

The shared style-check.sh script (used by /review-commits) only
checked length, capitalization, and trailing period, and its length
limit was 72 rather than 50.

Changes:
- Fix classic length limit to 50 chars per the style guide
- Reject leading "word:" type prefixes (feat:, Spec:, fix:, etc.)
- Reject common non-imperative first words via an explicit denylist,
  avoiding false positives on imperative roots like Bring or Process
- Add Check 6 to /validate-commits that runs style-check.sh against
  every subject in base..HEAD, keeping all checks deterministic
- Split /commit Step 7b into a deterministic style check followed by
  the existing content-leak judge, and re-run both after the user
  edits a message in Step 8 so manually-typed subjects cannot bypass
  the rules
- Extend test-style-check.sh with cases for the new behaviors,
  including 50-char boundary, type-prefix rejection, and imperative
  root positives

Fixes #3 by @jskswamy
- Release v2.0.1

Bump marketplace version from 2.0.0 to 2.0.1.
Sync commit-tools plugin to 1.0.1 for the classic style-rule fix. by @jskswamy
## [2.0.0] - 2026-05-07

### Added

- Add v2.0.0 plugin reorganization design spec

Five plugins in the marketplace have boundaries and names that don't
match how a developer uses them. clean-merge is named for the
outcome (a clean merge) but its primary command is /review-commits;
task-decomposer and task-executor are split halves of one continuous
beads-backed pipeline; both task plugin names tie to today's
implementation backend rather than the user-facing capability.

This spec captures the agreed reorganization: collapse to three
capability-named plugins (commit-tools = git-commit + clean-merge,
craft = task-decomposer + task-executor, refactor unchanged),
preserve every command name unchanged so day-to-day muscle memory
keeps working, and ship as marketplace v2.0.0 with a clean break.
A migration document at the repo root walks users through the
uninstall/install steps.

The other six plugins are out of scope. by @jskswamy

### Changed

- Update marketplace and add migration guide for v2.0.0

Reflects the plugin consolidation in earlier commits:
- Removes the git-commit, clean-merge, task-decomposer, and
  task-executor entries from .claude-plugin/marketplace.json
- Adds commit-tools and craft entries (both at version 1.0.0)
- Bumps metadata.version from 1.10.0 to 2.0.0 (breaking change)
- Regenerates the plugins section in README.md from the new
  marketplace.json
- Prepends a v2.0.0 section to CHANGELOG.md with a hand-written
  Breaking changes block pointing readers to the migration guide
- Adds MIGRATION-v2.md at the repo root with the full
  uninstall/install steps and the old-namespace to new-namespace
  mapping for any settings.json or script that hard-codes
  plugin:command references

Bare command invocations (/commit, /review-commits, /decompose,
etc.) continue to work after the reinstallation. Skill behavior,
hooks, style files, and local settings are all unchanged.

Part of the v2.0.0 marketplace reorganization. See
docs/superpowers/specs/2026-05-07-plugin-reorg-v2-design.md. by @jskswamy

### Other

- Merge git-commit and clean-merge into commit-tools (v2.0.0 reorg)

The two plugins covered halves of one workflow: writing atomic
styled commits (git-commit) and reviewing/consolidating them before
push (clean-merge). Splitting them across two installs hid that they
share style files, share commit philosophy, and naturally chain.
clean-merge's name also obscured what its primary command actually
does (/review-commits).

Consolidates both plugins into commit-tools at version 1.0.0:
- /commit, /commit-style, /commit-action, /review-commits, and
  /validate-commits all ship from the same plugin
- The shared style files (classic.md, conventional.md) live at
  plugins/commit-tools/styles/ and are read by both /commit and
  /review-commits without crossing plugin boundaries
- The PreToolUse hook that intercepts direct git commit calls
  follows commit-tools to its new location; the
  \${CLAUDE_PLUGIN_ROOT} placeholder auto-rebases
- All internal absolute path references in moved skill files are
  updated in this same commit so the tree is never broken

git mv was used throughout to preserve file history. Tests pass
unchanged at the new path (7 tests in
plugins/commit-tools/skills/review-commits/tests/).

Part of the v2.0.0 marketplace reorganization. See
docs/superpowers/specs/2026-05-07-plugin-reorg-v2-design.md. by @jskswamy
- Merge task-decomposer and task-executor into craft (v2.0.0 reorg)

The two plugins were halves of one continuous workflow: decompose
work into structured units (task-decomposer), then dispatch subagents
to execute those units (task-executor). The split exposed an
implementation seam to users when from a creator's perspective they
are one continuous flow. Both names also tied to today's beads
backend rather than the user-facing capability.

Consolidates both plugins into craft at version 1.0.0:
- The full pipeline ships from one plugin: /park, /parked,
  /review-parked, /understand, /decompose, /epic, /task, /deps,
  /backlog, /execute, /task-commit
- The Stop hook that nudges parked-idea triage follows craft to its
  new location; ${CLAUDE_PLUGIN_ROOT} auto-rebases
- The agents (issue-writer, quality-reviewer, spec-reviewer) all
  live under plugins/craft/agents/
- No internal absolute path references existed between the two
  plugins, so no path edits were needed in moved files

The name craft was chosen to capture what the user is actually doing
(making something, with care) rather than the bookkeeping mechanism
(tasks, work items). It survives any backend swap because nothing
about "craft" implies beads.

git mv preserved file history throughout.

Part of the v2.0.0 marketplace reorganization. See
docs/superpowers/specs/2026-05-07-plugin-reorg-v2-design.md. by @jskswamy
## [1.10.0] - 2026-05-07

### Added

- Add design spec for preserving commit bodies in review-commits

The review-commits skill currently drops commit message bodies during
squash and amend operations. The synthesizer reads commits via
git log --oneline (subject only), and the plan review shows only
subjects, so users cannot see what context is about to be lost.

This spec captures the four root causes from the bug report and the
agreed fix: synthesizer reads full bodies via git log --format=%H%s%b,
authors fresh subject + body in the saved style informed by the
originals, and the plan review previews bodies before the user
confirms. No schema or executor change is needed — new_message is
already a multi-line block; the bug is what the synthesizer writes
into it. by @jskswamy
- Add design spec for branch-cluster + path-heuristic in review-commits

The path-prefix heuristic in detect-clusters.sh missed a 4-commit
logical cluster on the process-compose-script-extraction branch
because each commit touched a different dev/<service>/ subdirectory.
The heuristic also has a latent depth-3 correctness bug — it returns
the filename as the prefix instead of the parent directory.

This spec captures the agreed design: introduce a new
detect-branch-cluster.sh that proposes the whole branch as a
medium-confidence cluster on any non-main branch with two or more
commits, while keeping the existing path-prefix heuristic (with the
depth-3 bug fixed) as a high-confidence sub-cluster refinement. The
plan-review user gate presents both options when they fire and
surfaces the reasoning when neither does. by @jskswamy

### Changed

- Update CHANGELOG and README for v1.10.0

Document the v1.10.0 release. The new section captures the design
specs and code commits for two review-commits features: preserving
commit message bodies through squash and amend operations, and
detecting the whole feature branch as a medium-confidence cluster
with a path-prefix sub-cluster refinement. Also regenerate the
plugins section in README from the synced marketplace.json. by @jskswamy

### Other

- Lock in full-body preservation in build-todo test

Strengthens the reword fixture assertion: the saved message file
must contain the full subject + blank line + body, not just the
subject. This is regression protection ahead of the synthesizer
change that will start authoring real bodies into new_message.

build-todo.sh itself is unchanged; it already preserves multi-line
literal blocks via parse_literal_block + rstrip. The test was
under-asserting. by @jskswamy
- Show body previews in review-commits plan review

Step 4 now points at the git log --format command that includes
commit bodies, aligning the SKILL narrative with the synthesizer
prompt. Step 5's plan-review render shows the first 2 wrapped lines
of any pick or reword commit's authored body indented under its
subject, so users can see what context is about to be committed
before they accept the rebase plan. Subject-only entries render as
before; fixup, drop, and edit entries do not get a preview line.

This is the human gate that lets reviewers catch missing or wrong
bodies before the rebase runs. Drift recovery and the executor
need no change — they already write whatever the plan provides. by @jskswamy
- Preserve commit bodies in review-commits

The review-commits skill silently dropped commit message bodies
during squash and amend operations. The synthesizer read commits
via git log --oneline (subject only) and wrote only subjects into
new_message and fixup_target_message, so any body text on the
original commits was lost when the rebase folded them. This
affected the most common case: TDD branches whose individual
commits carried explanations of why a particular API shape was
needed or why a test was deleted.

Three coordinated changes fix it without touching the schema:

- Read full bodies in the planning phase via
  `git log --reverse --format='%H%x00%s%x00%b%x00---END---'`.
  The synthesizer record now carries a `body` field alongside
  subject, files, and concern.
- Author full messages (subject + blank line + body) in the saved
  style for every reword, squash, and cluster pick. The body is
  informed by the original bodies of every commit being folded —
  the synthesizer understands what each contributed and writes
  one coherent body, not a verbatim concatenation.
- Show body previews in the plan-review user gate, indented under
  the subject for any pick or reword that carries an authored
  body. Subject-only entries render as before.

build-todo.sh and revalidate.sh need no change — both already
amend with `-F tmpfile` and write whatever message the plan
provides.

Tests lock in the executor side end-to-end (build a real repo,
hand-write a plan with a multi-line body, run the rebase, assert
the final commit's %B contains the body) and strengthen the
existing build-todo unit test to require subject + blank + body
in the saved message file. by @jskswamy
- Detect branch as cluster, fix depth-3 path bug

The path-prefix heuristic in detect-clusters.sh missed logical
clusters that span sibling directories — for example, a refactor
that extracts one file per service into dev/netbox/,
dev/telegraf/, dev/grafana/, plus a wiring commit at the repo
root. The heuristic required every commit in a contiguous run to
share the same parent directory, and split-by-service feature
branches never satisfied that. The user's own branch decision
was the missing signal.

Two changes:

- Replace the broken awk-based prefix in detect-clusters.sh
  with dirname. The previous code used $1/$2/$3 with NF>=3,
  which at exactly depth 3 (three slash-separated fields, e.g.
  dev/netbox/env) returned the filename rather than the parent
  directory. Two such commits in the same directory yielded
  different "prefixes" and never clustered. The new logic uses
  the parent directory at any depth >= 1.
- Add detect-branch-cluster.sh, a single-purpose helper that
  proposes the entire $base..HEAD range as one
  medium-confidence cluster on any non-main / non-master branch
  with at least two commits. On main, master, detached HEAD, or
  branches with fewer than two commits, it emits nothing.
  Output format matches detect-clusters.sh so downstream
  consumers handle them uniformly.

The synthesizer's planning checklist now runs both detectors and
combines their outputs per documented rules: overlap collapses
to the branch option only, disjoint coverage presents Option A
(whole-branch, medium) alongside Option B (path sub-clusters,
high), branch-only and path-only present a single proposal, and
neither emitting a candidate triggers a "no cluster +
reasoning" render in the plan-review user gate.

Tests cover both the depth-3 fix (4 files in one directory at
depth 3 cluster correctly) and the cross-directory case (the
bug-report fixture, where the path heuristic must stay silent
so the branch heuristic owns it). A new test exercises all six
arms of detect-branch-cluster: 4-commit branch, 2-commit
branch, 1-commit branch, on main, on master, detached HEAD. by @jskswamy
- Release v1.10.0

Bump marketplace version from 1.9.0 to 1.10.0. Sync clean-merge
plugin version from 1.2.0 to 1.3.0 to reflect two new user-visible
features in this release: commit body preservation through squash
and amend (review-commits), and branch-as-cluster detection with
the depth-3 path-prefix bug fix. by @jskswamy
## [1.9.0] - 2026-05-06

### Added

- Add design and implementation plan for codebase-wide refactor scan

Design spec extends /refactor:scan from diff-only scanning to a
sharded codebase-wide pipeline: per-package scanner shards write
candidate YAML, a synthesizer correlates them into root-cause
architectural findings, a human review gate via findings.md keeps
the user in control, and per-section validators create rich beads
issues with the full evidence dossier embedded in notes.

Coverage targets the cross-codebase subset of Fowler's refactoring
catalog (Bucket A): similarity-cluster, call-graph, hierarchy,
type-discriminant, and language idiom passes. Single-file
refactorings remain out of scope and continue to belong to
quality-reviewer.

Implementation plan decomposes the work into bite-sized tasks
covering schema fixtures, the new synthesizer agent, scanner and
validator extensions, four-step orchestration changes to scan.md,
skill triggers, README, and an end-to-end smoke test.

Spec: docs/superpowers/specs/2026-05-05-codebase-wide-refactor-scan-design.md
Plan: docs/superpowers/plans/2026-05-05-codebase-wide-refactor-scan.md by @jskswamy
- Add codebase-wide scope to refactor scan

Extends the refactor plugin from diff-only scanning to whole-
codebase architectural review. Adds a new agent and reshapes
the orchestration around a sharded pipeline with a human review
gate.

Synthesizer agent (new). Correlates raw scanner candidates into
root-cause architectural findings using six signals: shared
package locus, repeated pattern, cross-layer concept duplication,
shared type root, call-graph hub, and architectural seam crossing.
Writes a human-reviewable findings.md and never touches beads.

Scanner extended. Now supports diff, package, and all scopes. For
package and all scopes it enumerates functions from the codebase-
memory-mcp index instead of parsing a diff. Five passes (A through
E) cover the cross-codebase Fowler refactorings: similarity-cluster
mining of pre-built SIMILAR_TO edges, call-graph analysis, hierarchy
patterns, type-discriminant detection, and language idioms. Full
source snippets are captured via get_code_snippet for each candidate
so downstream agents need no further codebase access.

Validator switched to section-driven flow. Reads one architectural
section from a user-reviewed findings.md, resolves evidence-refs
back to raw candidates, and creates one rich beads issue with the
full evidence dossier embedded in notes. Nothing collected during
scanning is dropped; the user's edits to the section body are
authoritative for title, priority, and narrative.

Scan command grew flags --scope, --limit, --fresh, and --clean.
State persists to .refactor-scan/<ts>/ enabling disk-based resume:
a dropped session re-running the command auto-detects in-flight
state and picks up at the right stage. The human review gate keeps
users in control: anything still in findings.md when they reply
"proceed" becomes a beads issue.

Diff-scope behavior is preserved unchanged for the existing
post-task workflow. The skill description and README document the
new modes and the resume model.

Working dirs and beads runtime export added to .gitignore.

Smoke-tested end-to-end on the tailsctl Go repo (3923 nodes, 11594
edges including SIMILAR_TO and SEMANTICALLY_RELATED). Pipeline
ran scanner shards across packages, synthesizer produced
architectural findings, the review gate paused for editing, and
validators created rich beads issues. by @jskswamy
- Add design for multi-agent review-commits

The current /review-commits skill produces wrong-style messages after
fixup, squash, edit, and reword operations across all stop types.
Three root causes: GIT_SEQUENCE_EDITOR is set instead of GIT_EDITOR
so the message editor still pops mid-rebase, "invoke /commit" is
prose rather than a mechanical contract, and there is no
post-condition that subjects match the saved style.

The design replaces the skill with a planner/executor split. All
message authoring moves to the planning phase; the executor replays
pre-authored messages via git rebase --exec with GIT_EDITOR=true,
so no editor ever opens. A revalidator walks the rewritten log and
auto-amends any drifted subject from the synthesizer's saved text,
avoiding token-wasting aborts.

Reading parallelizes for branches with 10+ commits via subagents in
batches; smaller branches use a single-agent fast path. The
synthesizer is always single-agent. by @jskswamy
- Add implementation plan for multi-agent review-commits

Twelve TDD tasks covering: scaffold and test harness, settings loader
with CLI overrides, classic/conventional style checker, plan-schema
doc, reader and synthesizer subagent prompts, todo builder, apply-split
helper for edit actions, revalidator with auto-amend on drift,
SKILL.md rewrite around the planner/executor flow, first-run threshold
prompt, and README/changelog updates.

Each task is self-contained, has bite-sized steps with full code,
exact paths, and verifiable expectations. Self-review confirms every
spec section is covered. by @jskswamy
- Add review-commits planner/executor skill

The /review-commits skill previously delegated commit-message
authoring to /commit at execute time. Messages drifted from the
saved style after every fixup, squash, edit, and reword because
GIT_EDITOR was left at the user's default — the message editor
popped mid-rebase and the agent had to improvise inline,
necessitating a follow-up cycle to fix the style.

Restructure around a planner/executor split. The planner reads
each commit oldest-to-newest, runs hygiene analysis (subject
pairs, file-structural, semantic via codebase-memory when
available), detects logical clusters of 4+ contiguous commits
sharing a 3-level path prefix, and pre-authors final messages
in the saved style by reading the style file directly. The
executor uses GIT_EDITOR=true plus a pre-built todo with exec
lines, so no editor ever opens during rebase. A revalidator
walks the rewritten log and auto-amends any drifted subject
from the saved messages.

Add a library of bash and python helpers under lib/: style-check,
build-todo, apply-split, revalidate, detect-clusters, plus the
plan-schema and synthesizer-prompt reference docs. Includes a
test harness with five unit tests covering each helper. SKILL.md
drives the flow with a Branch Flow for feature-branch cleanup,
a Main Flow for on main/master, and a soft-reset escape hatch.

The codebase index freshness check compares the latest commit
timestamp in the rebase range against the saved last_indexed
time, with a 24-hour calendar fallback. The skill invokes
/codebase:index when commits are newer than the graph.

An initial design and a follow-up simplification design are
both preserved at docs/specs/ to document how this skill landed
through iteration. by @jskswamy

### Changed

- Update CHANGELOG for v1.9.0

Document all changes included in the v1.9.0 release. by @jskswamy

### Other

- Extract shared scaffolding for nix-tool hooks

The three PostToolUse hook scripts (nixfmt, statix, deadnix)
duplicated identical scaffolding around a single nix-shell
invocation: stdin JSON parse, flake.nix path gate, nix-shell
availability gate, and JSON status emission. They differed only
by package, command template, and success message. Style had
already drifted between siblings (tabs vs. spaces, quoted vs.
unquoted variables).

Extract a parameterized run-nix-tool.sh helper that takes the
package, command template (with {{file}} substitution), and
success message. Each tool script collapses to a 4-line exec
invocation. The three identical matcher blocks in hooks.json
collapse into a single matcher with three hook commands.

Adding a fourth nix tool now needs one ~4-line script and one
hooks.json entry, with no risk of style drift. by @jskswamy
- Make review-commits parallel threshold configurable

The threshold for switching from single-agent to multi-agent reading
should not be hard-coded. Different repos and users have different
tolerance for parallel-agent overhead, and tuning the crossover is
exactly the kind of preference that belongs in plugin settings.

Add a settings file (.claude/clean-merge.local.md) with
parallel_threshold and parallel_batch_size, with safe defaults of 10
and 5. Add per-invocation override flags (--parallel-threshold,
--no-parallel, --force-parallel) and a first-run prompt that offers
to save a custom threshold when the default would activate. by @jskswamy
- Ignore .worktrees for isolated implementation workspaces by @jskswamy
- Release v1.9.0

Bump marketplace version from 1.8.2 to 1.9.0.
Bump clean-merge plugin from 1.1.0 to 1.2.0 — minor bump for the
new planner/executor review-commits skill, logical clustering
detection, and revalidator auto-amend. by @jskswamy
## [1.8.2] - 2026-04-30

### Changed

- Update CHANGELOG for v1.8.2

Document changes included in the v1.8.2 release. by @jskswamy

### Other

- Auto-index stale or missing index in codebase explore skill

The explore skill previously only printed a stale-index warning and
fell back to grep when no index existed. The /codebase:ask command
already had auto-indexing logic that respected the user's auto_index
preference (always/ask/never), but explore did not, so brainstorming
and planning sessions silently degraded to grep when the index was
missing or stale.

Align explore with ask by mirroring the same auto-index decision
flow: prompt or auto-run index_repository on a missing or stale
index according to the resolved preference, then continue. Update
last_indexed after a successful refresh, and only fall back to
grep/glob when the user declines or auto_index is never. by @jskswamy
- Release v1.8.2

Bump marketplace version from 1.8.1 to 1.8.2.
Sync codebase plugin: 0.1.1 → 0.1.2. by @jskswamy
## [1.8.1] - 2026-04-13

### Fixed

- Fix codebase plugin commands blocking MCP tool access

The allowed-tools whitelist in all four codebase commands (ask, graph,
index, impact) only listed Bash/Read/Grep/Glob/AskUserQuestion. This
prevented codebase-memory-mcp tools (list_projects, search_graph,
trace_path, etc.) from being called, causing the commands to always
fall back to grep/read instead of using the semantic index.

Remove allowed-tools from all commands so MCP tools are accessible
when the server is connected. The explore skill already had no
restriction and worked correctly. by @jskswamy

### Other

- Release v1.8.1

Bump marketplace version from 1.8.0 to 1.8.1.
Sync codebase plugin version 0.1.0 to 0.1.1.
Update CHANGELOG and regenerate README. by @jskswamy

### Removed

- Remove allowed-tools from all plugin commands and skills

The allowed-tools frontmatter whitelist blocks MCP tools that
commands are designed to use. This caused codebase-memory-mcp,
git MCP, and nix MCP tools to be silently unavailable, forcing
fallback to grep/bash workarounds.

Since allowed-tools has never prevented an actual misuse, remove
it from all 17 commands and skills across 9 plugins: clean-merge,
codebase (already fixed), devenv, git-commit, guardrails, jot,
refactor, sketch-note, task-decomposer, task-executor, typst-notes. by @jskswamy
## [1.8.0] - 2026-04-13

### Added

- Add rebase-first workflow and commit hygiene analysis to review-commits

Replace soft-reset with interactive rebase as the default commit
cleanup mechanism. Add three-layer commit hygiene analysis that
detects introduce-then-fix pairs, non-atomic commits, and unrelated
changes before building a rebase plan.

Layer 1 (subject-based) catches introduce-then-fix pairs from git
log subjects. Layer 2 (file-structural) flags commits touching
unrelated directories. Layer 3 (semantic) uses codebase-memory-mcp
to verify atomicity through symbol clusters and call chains.

The rebase plan maps each commit to pick/fixup/squash/edit/drop/
reword actions, presented for user approval before execution via
GIT_SEQUENCE_EDITOR. Soft-reset remains as an escape hatch.

Closes #1 by @jskswamy

### Changed

- Update CHANGELOG and README for v1.8.0

Document all changes included in the v1.8.0 release.
Regenerate plugins section in README from marketplace.json. by @jskswamy

### Other

- Release v1.8.0

Bump marketplace version from 1.7.0 to 1.8.0.
Bump clean-merge plugin from 1.0.0 to 1.1.0. by @jskswamy

### Removed

- Clean up stale plan files and add .aide.yaml to gitignore

Remove implementation plans for already-shipped plugins (clean-merge,
codebase, refactor, review-commits rebase-first). The code is the
source of truth; plans for completed work add noise. by @jskswamy
## [1.7.0] - 2026-04-13

### Added

- Add codebase plugin for intelligent code exploration

New plugin wrapping codebase-memory-mcp with four commands and
an auto-trigger skill:

- /codebase:ask — natural language queries with intent-based
  routing (location, understanding, similarity, onboarding)
- /codebase:impact — change impact analysis with risk levels
- /codebase:graph — symbol relationship traversal
- /codebase:index — index management wrapper
- explore skill — auto-enriches brainstorming and planning
  sessions with indexed codebase knowledge

Reduces token usage by querying a semantic index instead of
repeated grep/glob/read exploration across the repo. by @jskswamy
- Add refactor plugin for cross-codebase duplication detection

Two-agent design that scans committed code against the semantic
index to find refactoring opportunities invisible to per-file
code review:

- Scanner agent runs 3 passes: semantic similarity (Fowler
  structural patterns, GoF), structural analysis (code smells,
  SOLID/DRY), and language idiom checks (Go, Python, TypeScript)
- Validator agent confirms candidates by reading source files,
  then creates beads issues with TDD-first refactoring plans
- /refactor:scan orchestrates the pipeline, delegating index
  management to the codebase plugin
- Auto-trigger skill hooks into task-executor after task close

Includes design spec, implementation plan, and marketplace
registration for both codebase and refactor plugins. by @jskswamy

### Changed

- Update CHANGELOG and README for v1.7.0

Document codebase and refactor plugin additions in the v1.7.0
release. Regenerate plugins section in README from marketplace. by @jskswamy

### Other

- Release v1.7.0

Bump marketplace version from 1.6.4 to 1.7.0.
New plugins: codebase (code exploration), refactor (duplication
detection). by @jskswamy
## [1.6.4] - 2026-03-30

### Changed

- Update CHANGELOG and README for v1.6.4

Document all changes included in the v1.6.4 release.
Regenerate plugins section in README from marketplace.json. by @jskswamy

### Other

- Release v1.6.4

Bump marketplace version from 1.6.3 to 1.6.4. by @jskswamy

### Removed

- Remove commit message validation hook from guardrails

The Bash PreToolUse prompt hook fired an LLM evaluation on every
bash command, not just git commit. The LLM non-deterministically
blocked legitimate commands by overriding its own allow instruction.
The git-commit plugin already validates commit messages in its own
workflow, making this hook redundant. by @jskswamy
## [1.6.3] - 2026-03-30

### Added

- Add review-commits design spec for clean-merge plugin

Document the approved design for a standalone clean-merge plugin
with two skills: review-commits (workflow for regrouping, rewording,
and merging branch commits) and validate-commits (deterministic
post-commit checks for AI co-author leaks, conflict markers, and
squash residue). Produced through collaborative brainstorming to
automate the repetitive commit-cleanup workflow. by @jskswamy
- Add clean-merge plugin with commit review and validation

Introduce a standalone plugin for cleaning up commits before pushing.
Two skills: review-commits (auto-detects branch vs main, orchestrates
squashing/regrouping/rewording via /commit delegation) and
validate-commits (five deterministic checks — clean worktree, tests,
AI co-author leaks, conflict markers, squash residue).

Registered in marketplace under the git category. by @jskswamy

### Changed

- Update CHANGELOG and README for v1.6.3

Document all changes included in the v1.6.3 release.
Regenerate plugins section in README from marketplace.json. by @jskswamy

### Other

- Release v1.6.3

Bump marketplace version from 1.6.2 to 1.6.3. by @jskswamy
## [1.6.2] - 2026-03-18

### Changed

- Update CHANGELOG and README for v1.6.2

Document bugfixes for Stop hook validation and restored
MCP commit intercept prompt. by @jskswamy

### Fixed

- Fix Stop hook JSON validation failure in task-decomposer

The prompt-type Stop hook produced natural language output instead
of valid JSON, causing validation errors on every Claude response.

Replace with a command-type hook that runs a shell script:
- Checks last commit for beads task ID references
- If found, checks for linked parked ideas
- Exits silently (code 0, no output) when nothing to surface
- Only prints when parked ideas exist after a task commit

Bump task-decomposer 1.6.0 → 1.6.1. by @jskswamy

### Other

- Restore MCP commit intercept prompt deleted during v2.0 migration

The v2.0 migration incorrectly deleted intercept-mcp-commit.md
which is actively referenced by hooks.json as a prompt-type
PreToolUse hook. Without it, the hook fails when Claude attempts
to use the MCP git commit tool directly.

Bump git-commit 1.2.1 → 1.2.2. by @jskswamy
- Release v1.6.2

Bump marketplace version from 1.6.1 to 1.6.2.
Bugfixes: task-decomposer 1.6.1 (Stop hook), git-commit 1.2.2
(restored MCP intercept prompt). by @jskswamy
## [1.6.1] - 2026-03-18

### Changed

- Migrate devenv command to v2.0 skills directory format

Move commands/devenv.md to skills/devenv/SKILL.md and remove
the legacy commands/ directory. Bump devenv 1.3.1 → 1.3.2. by @jskswamy
- Update CHANGELOG and README for v1.6.1

Document devenv migration to v2.0 skills directory format. by @jskswamy

### Other

- Release v1.6.1

Bump marketplace version from 1.6.0 to 1.6.1.
Complete v2.0 migration: devenv 1.3.1 → 1.3.2 (skill dir format). by @jskswamy
## [1.6.0] - 2026-03-18

### Changed

- Migrate all plugin skills to v2.0 directory format

Convert all flat skills/<name>.md files to the new
skills/<name>/SKILL.md directory structure across 7 plugins:
task-decomposer (5), task-executor (1), git-commit (2),
jot (1), sketch-note (1), guardrails (1), typst-notes (2).

Move task-decomposer frameworks/ into skills/decompose/ as
reference material accessible via ${CLAUDE_PLUGIN_ROOT}.

Add allowed-tools to typst-notes publish command. Add v2.0
agent frontmatter: isolation: worktree for task-executor
reviewers, memory: project for issue-writer, memory: user
for jot learning-tutor. by @jskswamy
- Update CHANGELOG and README for v1.6.0

Document plugin v2.0 migration: skills directory format,
hooks.json conversion, agent frontmatter fields, and
${CLAUDE_PLUGIN_ROOT} usage across all plugins. by @jskswamy

### Fixed

- Fix plugin v2.0 critical issues

Add missing name: field to agent frontmatter in task-decomposer
(issue-writer) and task-executor (spec-reviewer, quality-reviewer).

Convert task-decomposer legacy hook from review-after-commit.md
with event: Stop frontmatter to hooks/hooks.json prompt-type format.

Remove unused legacy hook .md files from git-commit plugin
(intercept-bash-commit.md, intercept-mcp-commit.md) — hooks.json
already handles the functionality. by @jskswamy

### Other

- Use ${CLAUDE_PLUGIN_ROOT} for framework file paths

Replace find-based framework file lookup with direct
${CLAUDE_PLUGIN_ROOT}/skills/decompose/frameworks/ paths
in both the decompose skill and command. by @jskswamy
- Bump plugin versions for v2.0 migration

Patch bumps for format-only changes:
  git-commit 1.2.0 → 1.2.1
  jot 1.4.1 → 1.4.2
  sketch-note 1.2.1 → 1.2.2
  guardrails 1.0.0 → 1.0.1
  typst-notes 1.0.2 → 1.0.3

Minor bumps for feature additions:
  task-decomposer 1.5.0 → 1.6.0
  task-executor 1.1.0 → 1.2.0 by @jskswamy
- Release v1.6.0

Bump marketplace version from 1.5.0 to 1.6.0.
Migrate all plugins to Claude Code v2.0 structure:
skills/<name>/SKILL.md format, hooks.json, agent name
fields, memory/isolation frontmatter, ${CLAUDE_PLUGIN_ROOT}. by @jskswamy
## [1.5.0] - 2026-03-18

### Added

- Add configurable decomposition framework support

Wrap different task decomposition methodologies (superpowers, speckit,
bmad) under a unified UX. On first /decompose, the plugin detects
available frameworks, asks the user to choose, and persists the
selection per-project in .claude/task-decomposer.local.md.

The /execute command now reads the persisted framework and adapts
subagent prompts and review criteria accordingly — TDD enforcement
for superpowers, requirements traceability for speckit, architecture
compliance for bmad.

All framework artifacts (constitutions, PRDs, architecture docs) are
stored in beads rather than framework-specific files, ensuring a
single source of truth across sessions and context compaction.

- task-decomposer v1.4.0 → v1.5.0
- task-executor v1.0.0 → v1.1.0 by @jskswamy

### Changed

- Update CHANGELOG and README for v1.5.0

Document all changes included in the v1.5.0 release.
Regenerate plugins section in README from marketplace.json. by @jskswamy

### Fixed

- Fix invalid autoActivation key in task-executor manifest

The plugin.json used an unrecognized autoActivation key which
caused installation to fail. Replace with valid author and
keywords fields matching the format of other plugins. by @jskswamy

### Other

- Reinitialize beads with dolt backend

The previous beads database was missing from the dolt server.
Ran bd init --force to bootstrap a fresh dolt-backed database
with updated hooks (v0.61.0) and agent instructions. by @jskswamy
- Release v1.5.0

Bump marketplace version from 1.4.0 to 1.5.0.
Plugin versions: task-decomposer 1.5.0, task-executor 1.1.0. by @jskswamy
## [1.4.0] - 2026-02-26

### Added

- Add task tracker noise filtering to commit styles

When agents use tools like beads for task tracking, internal
references (tracker IDs, workflow phases, agent metadata) were
leaking into commit messages. Someone reading git history without
context of these tools would find the references confusing.

Changes:
- Add "Content Filtering" section to both classic and conventional
  style files with explicit rules and before/after examples
- Expand Step 7b validation in the commit command to catch broader
  patterns: bd commands, dependency references, acceptance criteria
  leaks, agent dispatch metadata, and specification fragments by @jskswamy
- Add superpowers-inspired task structure to decomposer

The decomposer now produces richer, more actionable tasks using
the Do/Verify pattern: each task includes self-contained context,
exact file paths, step-by-step actions, and verification commands
with expected outputs. Tasks are sized to 2-5 minutes of work so
a fresh agent can execute any task independently.

Key enhancements:
- Tasks use Context/Do/Verify structure instead of flat
  Description/Design/Acceptance fields
- Issue-writer maps Do to design, Verify to acceptance, and
  Context to description for richer beads issues
- Task completion requires running verification commands before
  closing (the "Iron Law"), with --skip-verify escape hatch
- Design exploration gate between understanding and planning
  proposes 2-3 approaches with trade-offs before decomposing by @jskswamy
- Add task-executor plugin for subagent-driven execution

New plugin that executes decomposed tasks using isolated subagents.
Each task gets a fresh agent with self-contained context from the
Do/Verify structure, followed by dual-stage review and an atomic
commit via the /commit plugin.

Components:
- /execute command with batch processing, dependency-ordered
  dispatch, and human checkpoints between batches
- Spec compliance reviewer agent that independently runs
  verification commands and checks requirement coverage
- Code quality reviewer agent that categorizes issues as
  Critical/Important/Minor with security focus
- Auto-detection skill for natural execution triggers
- Registered in marketplace under workflow category by @jskswamy

### Changed

- Update CHANGELOG and README for v1.4.0

Document all changes included in the v1.4.0 release.
Regenerate plugins section in README from marketplace.json. by @jskswamy

### Other

- Release v1.4.0

Bump marketplace version from 1.3.3 to 1.4.0. by @jskswamy
## [1.3.3] - 2026-02-19

### Added

- Add commit message validation guardrails

Prevent internal workflow context from leaking into git
history. Commit messages are now evaluated for task tracker
IDs, workflow phase labels, AI attribution, and progress
tracking artifacts before they enter the log.

- Add LLM-as-judge validation step (Step 7b) to /commit
  command that silently strips violations during generation
- Add commit-eval agent for standalone message evaluation
  and auditing existing history
- Add prompt-based PreToolUse hook on Bash as advisory
  safety net for commits bypassing /commit
- Update guardrails plugin description and hooks config by @jskswamy

### Changed

- Update CHANGELOG and README for v1.3.3

Document all changes included in the v1.3.3 release.
Regenerate plugins section in README from marketplace.json. by @jskswamy

### Other

- Release v1.3.3

Bump marketplace version from 1.3.2 to 1.3.3. by @jskswamy
## [1.3.2] - 2026-02-10

### Changed

- Update CHANGELOG and README for v1.3.2 by @jskswamy

### Fixed

- Fix commit plugin hook blocking its own commit

The PreToolUse Bash hook intercepted git commit commands issued
by the /commit workflow itself, creating a circular block. The
hook regex also missed env-var-prefixed commands, allowing
accidental bypasses like `SKIP_COMMIT_HOOK=1 git commit`.

- Broaden hook regex to catch env-var-prefixed git commits
- Add `__GIT_COMMIT_PLUGIN__=1` bypass token to hook script
- Prefix all git commit templates in commit.md with the token by @jskswamy

### Other

- Release v1.3.2

Bump marketplace version from 1.3.0 to 1.3.2. by @jskswamy
## [1.3.0] - 2026-02-04

### Added

- Add guardrails plugin for IDE refactoring handoff

New plugin that provides efficiency guardrails, starting with IDE
refactoring handoff. IDEs use AST-based semantic refactoring (instant,
atomic, accurate) while AI uses text-based pattern matching (slower,
sequential). This plugin teaches Claude when to delegate structural
changes to the user's IDE.

Components:
- Background knowledge skill (ide-handoff.md) - primary mechanism where
  Claude self-regulates based on understanding refactoring patterns
- Safety net hook - detects repeated edit patterns (3+ identical
  substitutions) and suggests handoff
- /handoff command - generates IDE-specific instructions for IntelliJ/
  GoLand and VSCode
- Templates for both IDE families with keyboard shortcuts

Triggers handoff for: package moves, cross-file renames, signature
changes, interface extraction, any 10+ file coordinated structural
change.

Extensible design allows adding future guardrails for security, cost
awareness, and testing patterns. by @jskswamy

### Changed

- Update CHANGELOG and README for v1.3.0

Document all changes included in the v1.3.0 release.
Regenerate plugins section in README from marketplace.json. by @jskswamy

### Fixed

- Fix README template extraction for task-decomposer and typst-notes

The gomplate template extracts features using bold bullet patterns like
"- **Feature:** description". Both plugins had formats that didn't match:

- task-decomposer: Used tables and subsection headers instead of bullets
- typst-notes: Missing the ## Features section entirely

This caused the README generator to fall back to marketplace.json tags,
displaying keyword-only features ("Beads", "Typst") instead of real
descriptions. task-decomposer also showed wrong usage "/taskdecomposer"
instead of "/decompose".

Changes:
- Add ## Features section with bold bullets to both plugin READMEs
- Add ## Usage section with /decompose examples to task-decomposer
- Regenerate main README.md via update-readme.sh by @jskswamy
## [1.2.0] - 2026-02-02

### Added

- Add multi-epic support to task-decomposer

Enable decomposition to create multiple epics when breaking down
complex work that spans multiple themes or areas. Previously limited
to creating at most one epic per decomposition.

Changes:
- Add --epics flag for explicit multi-epic specification (comma-sep)
- Add auto-grouping heuristics with theme detection keywords
- Update issue-writer agent to handle multiple epics and cross-epic
  dependencies
- Update decomposition preview format for multi-epic output
- Bump version to 1.4.0

The auto-grouping feature analyzes task descriptions for common
themes (UI, backend, security, etc.) and suggests epic groupings
when tasks naturally cluster together.

Closes: claude-plugins-4j4 by @jskswamy

### Changed

- Update CHANGELOG and README for v1.2.0

Document all changes included in the v1.2.0 release.
Regenerate plugins section in README from marketplace.json. by @jskswamy

### Fixed

- Fix unreliable commit interception with deterministic hook

The prompt-based PreToolUse hook for intercepting git commit commands
was non-deterministic - LLM evaluation varied between calls, sometimes
blocking unrelated commands while allowing actual git commits through.

Changes:
- Replace prompt hook with command hook using bash pattern matching
- Add intercept-git-commit.sh script for reliable git commit detection
- Add Step 1b to /commit command: check CLAUDE.md for commit
  instructions and offer to add them on first use
- Update README with changelog and new hook architecture docs
- Bump version to 1.2.0

The CLAUDE.md integration helps ensure agents use /commit in future
sessions by adding explicit instructions to the project configuration.

Closes: claude-plugins-qy5 by @jskswamy

### Other

- Release v1.2.0

Bump marketplace version from 1.1.8 to 1.2.0.
Plugin versions: task-decomposer 1.4.0, git-commit 1.2.0. by @jskswamy
## [1.1.8] - 2026-01-31

### Changed

- Rename commit skill to commit-action to avoid name collision

The skill and command both had name "commit", causing the command's
short description to appear in the system reminder instead of the
skill's trigger phrases. This prevented auto-invocation when users
said "commit the changes".

Renamed skill to "commit-action" so both are distinctly visible
and the skill's trigger phrase list is properly exposed.

Fixes: claude-plugins-z9l by @jskswamy
- Update CHANGELOG and README for v1.1.8

Document all changes included in the v1.1.8 release.
Regenerate plugins section in README from marketplace.json. by @jskswamy

### Fixed

- Fix incorrect bd CLI flags in park and parked commands

The bd CLI uses -l/--label (singular) not --labels (plural).
Also fixed bd label remove syntax and added instructions
for setting deferred status when updating existing issues.

Files fixed:
- commands/park.md - fixed --labels and added update flow
- commands/parked.md - fixed --labels and label remove syntax
- commands/task.md - fixed --labels
- skills/park-idea.md - fixed --labels
- skills/review-parked.md - fixed --labels and label remove
- hooks/review-after-commit.md - fixed --labels

Fixes: claude-plugins-1uw by @jskswamy

### Other

- Simplify /release to unified marketplace versioning

Remove plugin-specific tagging in favor of single marketplace version
tags. Since Claude installs plugins via git SHA, individual plugin tags
add no value - one marketplace version equals one snapshot of all
plugins.

Changes:
- Remove plugin-name argument from /release command
- Always release entire marketplace with single v{version} tag
- Auto-sync plugin.json versions to marketplace.json during release
- Simplify documentation and examples throughout by @jskswamy
- Release v1.1.8

Bump marketplace version from 1.1.7 to 1.1.8.
Sync plugin versions: task-decomposer 1.3.1, git-commit 1.1.2. by @jskswamy
## [task-decomposer-v1.3.0] - 2026-01-31

### Changed

- Rename /plan to /decompose to avoid built-in command conflict

The /plan command conflicted with Claude Code's built-in /plan command
which enters plan mode. Renamed to /decompose which aligns with the
existing decompose skill and clearly describes the action.

Changes:
- Rename commands/plan.md to commands/decompose.md
- Update all command references in README.md and epic.md
- Bump version to 1.3.0 (breaking change) by @jskswamy
- Update CHANGELOG and README for task-decomposer-v1.3.0

Document the /plan to /decompose rename in changelog.
Regenerate plugins section in README from marketplace.json. by @jskswamy

### Other

- Release task-decomposer v1.3.0

Bump task-decomposer plugin version to 1.3.0 in marketplace.
Update marketplace metadata version to 1.1.7.

Breaking change: /plan command renamed to /decompose to avoid
conflict with Claude Code's built-in /plan command. by @jskswamy
## [task-decomposer-v1.2.0] - 2026-01-29

### Added

- Add missing plugin documentation to README

The main README was outdated, listing only 3 of 6 plugins. Users
browsing the marketplace couldn't discover sketch-note, typst-notes,
or task-decomposer.

Added documentation sections for:
- sketch-note: Visual sketch notes in Excalidraw format
- task-decomposer: Transform complex tasks into beads issues
- typst-notes: PDF/HTML notes with Typst templates

Each section follows the existing format with features, install
command, usage examples, and link to the plugin README.

Closes: claude-plugins-csj by @jskswamy
- Add README auto-generation using gomplate

The README plugins section was manually maintained and often fell out
of sync with actual plugin features. Now uses gomplate templates to
auto-generate content from marketplace.json and plugin READMEs.

Changes:
- Add gomplate to flake.nix dev packages
- Create templates/readme-plugins.md.tmpl for plugin section generation
- Add scripts/update-readme.sh to regenerate README between markers
- Add <!-- PLUGINS:START/END --> markers to README.md
- Update release command with Step 7.5 for README regeneration
- Document nix prerequisite in CONTRIBUTING.md

The template extracts features from plugin READMEs (bold bullets or
numbered headings) and falls back to marketplace tags. Usage examples
are extracted from the first code block in each plugin's Usage section. by @jskswamy
- Add beads viewer setup and agent instructions

Configure gitignore for .bv/ directory (beads viewer local config and
caches) and add comprehensive beads workflow documentation to AGENTS.md.

The AGENTS.md additions cover:
- Essential bd CLI commands for agents
- Workflow pattern (ready → claim → work → complete → sync)
- Key concepts (dependencies, priority, types, blocking)
- Session close protocol checklist
- Best practices for issue tracking by @jskswamy
- Add commands to task-decomposer plugin

Add 7 explicit commands to complement existing auto-invoked skills:
- /plan: Task decomposition with --dry-run, --quick, --epic flags
- /task: Single task operations (create, start, done, show, next)
- /park: Quick idea parking with metadata options
- /parked: Manage parked ideas (list, promote, discard, review)
- /backlog: Dashboard views (overview, ready, blocked, priorities, epics)
- /epic: Epic management (create, add, remove, progress, close)
- /deps: Dependency management (add, remove, show, graph)

Commands follow kubectl/unix conventions with noun-verb patterns and
provide explicit argument control for workflows that skills handle
automatically.

Bump version to 1.2.0. by @jskswamy

### Changed

- Update CHANGELOG and README for task-decomposer-v1.2.0

Document all changes included in the v1.2.0 release.
Regenerate plugins section in README from marketplace.json. by @jskswamy

### Other

- Release task-decomposer v1.2.0

Sync marketplace.json with plugin.json version 1.2.0 which added
7 commands to complement auto-invoked skills. Bump marketplace
metadata version to 1.1.6. by @jskswamy
## [task-decomposer-v1.1.0] - 2026-01-29

### Added

- Add task-decomposer plugin for beads workflow integration

New plugin that enhances beads-based project management with four
main capabilities:

- Task decomposition: Transform complex work into structured beads
  issues through Understanding → Designing → Creating phases with
  user gates between each phase

- Idea parking: Quick capture of side thoughts while working without
  breaking flow, using deferred status and parked-idea labels

- Parked idea review: On-demand or automatic (after task commits)
  review of parked ideas with promote/keep/discard options

- Task-aware commits: Generate rich commit messages combining beads
  context (what/why/acceptance) with actual code changes

Includes issue-writer agent for executing beads CLI commands in
correct dependency order. by @jskswamy
- Add auto-activation to git-commit plugin

The plugin previously required explicit /commit invocation. Now it
triggers automatically when users express intent to commit, such as
"commit these changes" or "let's commit".

Changes:
- Add intent-based commit skill that recognizes action phrases
- Add PreToolUse hooks to intercept direct git commit attempts
- Update commit-style skill to clarify it handles educational queries
- Document auto-activation, trigger phrases, and hook architecture

The hooks intercept both MCP git_commit tool and bash git commit
commands, redirecting to the /commit workflow for proper atomic
validation and style-consistent message generation.

Closes: claude-plugins-n1c, claude-plugins-l2t, claude-plugins-2g5 by @jskswamy
- Add understand skill to task-decomposer plugin

New skill for deep task exploration through structured questioning
before any planning begins. Unlike decompose which quickly moves to
issue creation, understand systematically probes seven dimensions:

- Goal clarity: What does "done" look like?
- Context & background: What triggered this?
- Scope boundaries: What's in/out?
- Constraints & requirements: Performance, security, tech limits?
- Dependencies & integration: What systems does this touch?
- Risks & unknowns: What could go wrong?
- Success criteria: How will we verify it works?

The skill uses a five-phase conversation flow (discovery, probing,
assumption surfacing, synthesis, transition) and adapts questioning
based on task type (technical, product, bug fix, refactoring).

Output is an understanding summary that can feed into the decompose
skill for issue creation. by @jskswamy

### Changed

- Update CHANGELOG for task-decomposer-v1.1.0

Document all changes included in the task-decomposer v1.1.0 release.
Generated using git-cliff with plugin-specific filtering. by @jskswamy

### Other

- Release task-decomposer v1.1.0

Bump task-decomposer plugin version from 1.0.0 to 1.1.0.
Update marketplace registry with new version and bump
marketplace metadata version to 1.1.5. by @jskswamy
## [1.0.2] - 2026-01-23

### Added

- Add typst-notes plugin for document generation

New plugin that converts conversation context, jot
notes, or files into professionally formatted PDFs
and HTML using Typst with 7 templates (executive
summary, cheat sheet, sketchnote, meeting minutes,
study guide, technical brief, portfolio) and 4
color themes.

Includes jot integration that resolves note paths
via workbench_path config, preference persistence
across sessions, and compile.sh with --root / for
correct absolute imports. Bundled Inter, Source
Serif, and JetBrains Mono fonts. by @jskswamy

### Changed

- Update CHANGELOG for v1.0.2

Document all changes included in the v1.0.2 release.
Generated using git-cliff with plugin-specific filtering. by @jskswamy

### Other

- Release typst-notes v1.0.2

Bump typst-notes plugin version from 1.0.0 to 1.0.2.
Update marketplace registry with new version and bump
marketplace metadata version to 1.1.4. by @jskswamy
## [1.3.1] - 2026-01-23

### Added

- Add attribution for Feynman Learning Framework source

Credit the original prompt that inspired the /teach command
implementation. Following the same pattern as git-commit plugin
which has a dedicated Sources section.

Attribution added to:
- README.md (inline blockquote + Sources section)
- commands/teach.md (inline blockquote)
- agents/learning-tutor.md (inline blockquote)

Also fixed redundant phrasing in README description. by @jskswamy
- Add 1mcp NixOS server discovery to devenv plugin

Prefer an already-running NixOS MCP server via 1mcp proxy over
starting the plugin's own bundled server. The bundled server is
kept as fallback for environments without 1mcp.

Changes to the package search priority order:
1. 1mcp (preferred, already running, no extra process)
2. Global/project mcp-nixos
3. Plugin's bundled mcp-nixos
4. Bash fallback (nix search)

Also adds version resolution support using nixhub_find_version
and nixhub_package_versions tools for handling versioned package
requests like nodejs@20. by @jskswamy

### Changed

- Update CHANGELOG for v1.3.1

Document all changes included in the v1.3.1 release.
Generated using git-cliff with plugin-specific filtering. by @jskswamy

### Other

- Release devenv v1.3.1

Bump devenv plugin version from 1.3.0 to 1.3.1.
Update marketplace registry with new version and bump
marketplace metadata version to 1.1.3. by @jskswamy
## [1.1.2] - 2026-01-17

### Added

- Add /teach command for Feynman-style learning to jot plugin

Implements the Richard Feynman Iterative Learning Framework:
- /teach command for papers, videos, articles, and concepts
- Phase 0 prerequisite check - confirms user has engaged with content
- 7-phase interactive loop: assessment, explanation, gaps, questions,
  refinement, application, and analogy creation
- Depth levels: shallow (1 iter), standard (2), deep (3)
- Teaching notes saved to notes/learned/ with wikilinks

Key components:
- commands/teach.md: Main command with argument parsing
- agents/content-extractor.md: PDF, YouTube, article extraction
- agents/learning-tutor.md: Interactive Feynman loop with prereq check
- templates/teach/teaching-note.md: Output template

Philosophy: There are no shortcuts to learning. The Feynman Technique
deepens understanding through explanation, not acquisition. by @jskswamy

### Changed

- Update CHANGELOG for v1.1.2

Document all changes included in the v1.1.2 release.
Generated using git-cliff.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com> by @jskswamy

### Other

- Release marketplace v1.1.2 with jot plugin version sync

Bump marketplace metadata version from 1.1.1 to 1.1.2.
Sync jot plugin version from 1.3.1 to 1.4.1 to match plugin.json.
Update jot description to include teaching notes feature.
Add new tags: learning, feynman, teach, teaching-notes.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com> by @jskswamy
## [1.1.1] - 2026-01-16

### Added

- Add duplicate detection and enhance workflow to jot plugin

Before creating a note, agents now check if a note with the same name
already exists. If found, users can choose to enhance the existing
note or create a new one.

Changes:
- Add 'Check for Existing Note' step to both capture agents
- Add 'Enhance Existing Note Workflow' section for updating notes
- Update filename conventions: remove date prefix from reference
  items (session, article, video, person, book, organisation, trove)
- Keep date prefix only for inbox items (task, note, idea) for GTD
- Bump plugin version to 1.2.0

Inbox items use pattern matching (*-slug.md) for duplicate detection
while reference items use exact filename matching. by @jskswamy
- Add sketch-note plugin for Excalidraw visual documentation

Implement a new plugin that generates visual sketch notes in Excalidraw
format from conversations, code architecture, or custom descriptions.

Features:
- /sketch command with three modes: conversation, code, custom
- Proactive sketch agent triggered by visualization requests
- Excalidraw format skill with complete JSON schema reference
- Customizable styling: roughness, stroke width, colors, effects
- Persistent user preferences via .claude/sketch-note.local.md
- Output saved to sketches/ directory as .excalidraw files

Plugin structure:
- 1 command (sketch.md)
- 1 agent (sketch.md)
- 1 skill (excalidraw-format)
- 3 style definitions (hand-drawn, sketchy, clean)
- 3 content templates (conversation, code-architecture, custom) by @jskswamy
- Add .beads/.gitignore to exclude unnecessary files

This commit introduces a .gitignore file for the .beads directory to
prevent tracking of various temporary and machine-specific files.

The patterns include:

- SQLite database files
- Daemon runtime files
- Local version tracking files
- Legacy database files
- Worktree redirect files
- Merge artifacts
- Sync state files by @jskswamy
- Add beads configuration for AI-native issue tracking

Initialize beads in this repository with:
- README explaining beads usage and quick start guide
- Configuration with sync-branch set to 'beads-sync'
- Git attributes for JSONL merge driver
- AGENTS.md with workflow instructions for AI coding agents

Beads provides git-native issue tracking designed for AI-assisted
development workflows. Issues live in the repo as JSONL, sync with
git, and work seamlessly with Claude Code and other AI agents. by @jskswamy
- Add PNG export options to sketch-note plugin

Implement multiple approaches for generating PNG output from sketches:

1. Direct PNG via Mermaid CLI - generates PNG directly without
   intermediate Excalidraw file, uses hand-drawn theme styling

2. Excalidraw conversion - creates Excalidraw first, then converts
   using excalidraw-brute-export-cli or excalidraw-cli

The workflow detects available tool runners (nix-shell, npx) and
globally installed tools, enabling zero-install mode where tools run
on-demand via npx or nix-shell without requiring global installation.

Features:
- --format argument: excalidraw, png, both, or direct-png
- --scale argument: 1, 2, or 4 for PNG resolution
- Interactive workflow guides users through export options
- Automatic tool detection with smart fallbacks
- export-png.sh helper script with nix/npx support by @jskswamy
- Add auto-version sync hook for plugins

When plugin content files are modified (commands/, agents/, skills/,
etc.), this hook automatically:
- Bumps the patch version in plugin.json
- Syncs the version to marketplace.json
- Shows a system message confirming the bump

Uses session markers (/tmp/.claude-version-bumped-{plugin}) to ensure
only one bump per plugin per session, preventing multiple bumps when
editing several files.

Skips metadata files (plugin.json, marketplace.json, README, CHANGELOG)
to avoid infinite loops. by @jskswamy
- Add unified storage and cross-plugin skills to sketch-note

Update sketch-note plugin to use the shared workbench_path configuration
from .claude/jot.local.md, ensuring sketches and captures are stored
together in a unified location (default: ~/workbench/sketches/).

Add two cross-plugin skills enabling seamless workflows between jot
and sketch-note:

- plugins/jot/skills/sketch-from-capture.md: Enables creating visual
  diagrams from captured content (articles, videos, blips)
- plugins/sketch-note/skills/capture-for-sketch.md: Enables sketching
  directly from URLs, YouTube videos, or GitHub repos

This makes it easier to capture content and immediately visualize it,
or to create visual summaries of external resources. by @jskswamy

### Changed

- Update changelog with v1.0.1 release notes

Add changelog entries documenting recent changes:
- Initial changelog generation with git-cliff automation
- Removal of automatic Claude co-author attribution from git-commit
  plugin (v1.1.1)

Updates version link to compare v1.0.0..v1.0.1. by @jskswamy
- Move file existence check to start of capture workflow

Previously, the capture agents would process through multiple steps
before checking if a note already existed, wasting time when the
user wanted to update an existing note.

Changes:
- capture.md: Merge Step 1 and 1b into unified step that checks for
  existing notes immediately after type detection and slug extraction
- quick-capture.md: Move existence check to Step 1c, right after
  parsing and alias resolution, before any context gathering
- Both agents now read and display existing note info before asking
  any user questions
- Renumber subsequent steps in quick-capture.md (Steps 2-10)

Closes claude-plugins-3f3 by @jskswamy
- Move plugin hooks to local .claude/hooks directory

Relocate version sync and changelog notification hooks from the public
hooks/ directory to .claude/hooks/ for repository-local use only.

This keeps automation scripts private to this repository rather than
publishing them as part of the marketplace. The hooks can be exported
to other repositories later if needed.

Hooks moved:
- sync-plugin-version.sh: Auto-bumps patch version on plugin changes
- update-changelog.sh: Notifies when changelog updates are needed by @jskswamy
- Move release command to .claude/commands directory

Local slash commands must be in .claude/commands/ to be discovered by
Claude Code. The previous .claude/plugins/ location is for installable
plugins, not local commands.

This fixes the /release command not appearing in the command list. by @jskswamy
- Update CHANGELOG for v1.1.1

Document all changes included in the v1.1.1 release.
Generated using git-cliff. by @jskswamy

### Other

- Bd sync: 2026-01-12 23:01:25 by @jskswamy
- Sync plugin versions in marketplace registry

Update marketplace.json to match actual plugin versions:
- jot: 1.0.0 → 1.3.0
- sketch-note: 1.0.0 → 1.2.0 (includes PNG export feature)

Also bump sketch-note plugin.json from 1.1.0 to 1.2.0 to reflect
the PNG export changes added earlier. by @jskswamy
- Release marketplace v1.1.1 with plugin version bumps

Bump versions for plugins with changes since last sync:
- jot: 1.3.0 → 1.3.1 (added sketch-from-capture skill)
- sketch-note: 1.2.0 → 1.2.1 (added unified storage, capture-for-sketch)
- marketplace metadata: 1.1.0 → 1.1.1 by @jskswamy
## [1.0.1] - 2026-01-12

### Added

- Add initial changelog for plugin marketplace

Document all notable changes since the initial commit using Keep a
Changelog format. The changelog is generated by git-cliff configured
for classical/imperative commit messages.

Sections included:
- Added: devenv plugin, git-commit plugin, jot plugin, changelog
  automation, and plugin documentation
- Changed: marketplace naming, pre-commit config, devenv enhancements
- Initial Setup: marketplace foundation and development environment
- Removed: welcome message from shell hook

This provides project history visibility and supports the changelog
automation workflow added in commit 346dc78. by @jskswamy

### Removed

- Remove automatic Claude co-author attribution from commits

Update the git-commit plugin to only add Co-Authored-By lines when the
--pair flag is explicitly used and a human co-author is selected.

Changes:
- Clarify co-author handling rules in commit command documentation
- Add explicit instruction to never add Claude/Anthropic co-author lines
- Bump version to 1.1.1

This ensures commit messages remain clean and co-authorship reflects
actual pair programming sessions rather than AI assistance. by @jskswamy
## [1.0.0] - 2026-01-12

### Added

- Add Devenv Plugin for Nix Flake Management

Introduce the Devenv plugin to initialize and manage Nix flake
development environments easily. This plugin features auto-detection
of project stacks, generates `flake.nix` with best practices, and
integrates security tooling for enhanced safety.

Key features include:

- Auto-detection of project stacks (Node.js, Python, Go, Rust, etc.)
- Pre-commit hooks with SAST tools
- Automatic linting and formatting with nixfmt, statix, and deadnix

Additionally, comprehensive documentation and installation instructions
are provided to streamline user adoption and integration into
development workflows. by @jskswamy
- Add options for secret scanning and fix gitleaks hook

Update the plugin version to 1.0.1 and enhance the documentation
to include options for secret scanning with trufflehog and gitleaks.

The changes also fix the gitleaks pre-commit hook configuration
to enable it as a custom hook, ensuring that secrets can be
properly scanned before commits. This provides users with
flexibility in choosing their secret scanning tool while
maintaining compatibility with the existing setup.

- Added secret scanner preference prompt in the documentation
- Specified the configuration for gitleaks as a custom hook
- Updated keywords for better categorization in plugin.json
- Ensured gitleaks is included in the packages for manual use. by @jskswamy
- Add MCP server support for enhanced Nix package search

This commit introduces support for the MCP server in the Nix
development environment, improving package searchability. The
plugin now integrates with `mcp-nixos`, allowing users to access
over 130K NixOS packages with accurate names and version history
via NixHub.io.

The integration works as follows:
- The plugin first checks for a global or project-level MCP
  configuration to avoid duplicates.
- If not available, it utilizes the bundled MCP server, which
  runs via `nix-shell -p uv`.
- As a fallback, the native `nix search` command is used.

Additionally, users can customize their settings in
`.claude/devenv.local.md` to enable or disable MCP search,
ensuring flexibility in package management. by @jskswamy
- Add git-commit plugin for intelligent commit message generation

Introduce a Claude Code plugin that generates commit messages with
support for classic and conventional commit styles. The plugin
validates atomic commits, detects related unstaged changes, and
supports pair programming attribution.

Features:
- Classic and conventional commit style support
- Strict atomic commit validation with split commit workflow
- Related unstaged/untracked file detection
- Pair programming co-author attribution (--pair flag)
- Configurable preferences via .claude/git-commit.local.md by @jskswamy
- Add session context awareness to commit message generation

The plugin now reviews the conversation history before generating
commit messages to capture the reasoning behind changes.

New Step 6b extracts from the session:
- User's original intent and problem being solved
- Key decisions and trade-offs discussed
- Issue/ticket references mentioned
- Clarifications and scope adjustments

This enables commit messages that explain WHY changes were made, not
just WHAT changed. The diff shows implementation details, but session
context captures the motivation that would otherwise be lost.

Context priority: CLI arguments > session context > diff analysis

Bumps version to 1.1.0 for this feature addition. by @jskswamy
- Add jot plugin for quick knowledge capture

Introduce a Claude Code plugin for low-friction capture of notes,
tasks, ideas, and tech radar blips with Obsidian-style auto-linking.

Key features:
- Single /capture command with type flags (task, note, idea, blip)
- URL-based extraction for articles, videos, people, books, and more
- ThoughtWorks-style tech radar with rings and quadrants
- Auto-linking to related notes via [[wikilinks]]
- Rich content templates targeting 60-120+ lines per capture
- Zettelkasten-inspired book template with reflection prompts
- Configurable workbench path for central storage

All tools and technologies are captured as "blips" (tech radar items)
with comprehensive documentation including features, installation,
usage examples, pros/cons, and alternatives. by @jskswamy
- Add changelog automation with git-cliff and hooks

Implement automated changelog generation using git-cliff configured for
classical/imperative commit messages (not conventional commits).

Changes:
- Add cliff.toml with parsers that categorize commits by imperative
  verbs (Add, Fix, Update, Remove, etc.) into Keep a Changelog sections
- Add pre-push hook in flake.nix that warns about unreleased commits
- Add Claude Code PostToolUse hook that notifies when plugin versions
  change, suggesting changelog updates
- Add jq dependency for JSON processing in hooks

The git-cliff configuration supports the repository's classical commit
style, grouping commits into Added, Changed, Fixed, Removed, and other
standard changelog sections. by @jskswamy
- Add plugin documentation for git-commit and jot

Document the git-commit plugin featuring intelligent commit message
generation with classic/conventional styles, atomic commit validation,
pair programming support, and session context awareness.

Document the jot plugin for quick knowledge capture including tasks,
notes, ideas, session summaries, tech radar blips, and URL-based
captures with Obsidian-style auto-linking.

Update roadmap to reflect completed milestones:
- Git commit helpers (now git-commit plugin)
- Note-taking and knowledge management (now jot plugin) by @jskswamy

### Changed

- Rename marketplace to avoid violating Claude's naming rules

Updated the marketplace name from "claude-plugins" to
"jskswamy-plugins" to comply with the restrictions set by
Claude regarding marketplace names. by @jskswamy
- Update pre-commit configuration in documentation

Revise the documentation for the pre-commit hooks to reflect changes in
the configuration. Specifically, the `trailing-whitespace` and
`end-of-file-fixer` hooks have been replaced with
`trim-trailing-whitespace` for better clarity and functionality.

Additionally, include instructions to update `.gitignore` to exclude
generated files, ensuring a cleaner project structure. This change
aims to streamline the setup process for new developers and improve
the overall maintainability of the project. by @jskswamy
- Update devenv plugin version and enhance direnv support

Upgrade the devenv plugin to version 1.2.0, which includes updates to
the metadata and adds new tags for improved functionality. The tags
now include "direnv" and "direnv-instant" to support enhanced
environment loading options.

Additionally, remove the obsolete settings.local.json file, as it is no
longer needed. The README and command documentation have been updated
to reflect the new direnv-instant integration, allowing for async
environment loading and an instant shell prompt. Detailed setup
instructions for direnv-instant are provided, ensuring a smoother
developer experience when managing Nix flake environments. by @jskswamy
- Allow customization of welcome message style

Added the ability for users to specify how the welcome message
should appear when entering their development environment. The
configuration options include various styles such as `box`,
`minimal`, `project`, `tech`, and `custom`. A custom message
can be set for the `custom` style.

Updated the README and commands documentation to reflect these
changes, providing guidance on how to modify the welcome
message style and text. This enhancement aims to improve
user experience by allowing more personalized greetings. by @jskswamy
- Update version of devenv plugin to 1.3.0

Bump the version of the devenv plugin from 1.2.0 to 1.3.0 in the
marketplace configuration. This update includes improvements and
enhancements that justify the version increment. The plugin helps
initialize and manage Nix flake development environments with
auto-detection and security tooling. by @jskswamy
- Enhance jot plugin with session capture and context features

Add new capture capabilities to support realistic work session workflows:

Session summaries:
- New /capture session command with guided questions
- Captures goal, accomplishments, decisions, lessons, and follow-ups
- Saves to notes/sessions/ directory
- Alias: /capture conversation

Type aliases for reduced friction:
- todo → task
- thought → note
- conversation → session

URL references in quick captures:
- /capture todo use https://example.com/ to do X
- Keeps as quick capture, not full extraction
- Optionally fetches page title only

Automatic session context:
- Silently captures git repo, branch, working directory
- Embedded in all quick captures for context recovery

Optional additional context:
- "Anything else you want to remember?" after discovery context
- User can skip; section omitted if skipped

These features address the need to capture notes, tasks, and session
summaries during active Claude Code sessions without losing the
context needed to regain understanding later. by @jskswamy

### Initial Setup

- Initial commit of Claude Plugins Marketplace

This commit establishes the Claude Plugins Marketplace, a curated
collection of Claude Code plugins aimed at enhancing developer
workflows, code generation, and productivity.

Key components included in this initial setup:

- .claude-plugin/marketplace.json: Marketplace registry for plugins
- .claude/settings.json: Configuration to enable the official
  plugin-dev tool
- .claude/settings.local.json: Local settings with necessary
  permissions
- .gitignore: Common files and directories to ignore
- CLAUDE.md: Guidance for using the marketplace and creating new
  plugins
- CONTRIBUTING.md: Guidelines for contributing plugins
- README.md: Overview of the marketplace and available plugins
- plugins/: Directory for individual plugins (currently empty) by @jskswamy
- Initialize development environment for Claude Code plugin

Add necessary files and configurations to set up the
development environment for the Claude Code plugin marketplace.

This includes:

- .gitignore: Added entries for Nix/direnv and
  pre-commit configuration files.
- flake.lock: New file to manage dependencies with
  specific versions.
- flake.nix: Configuration file defining the inputs
  and outputs for the development environment,
  including pre-commit hooks for linting,
  spell checking, and other checks. by @jskswamy
- Initialize direnv for development environment

Update the project to use the direnv plugin for managing the
development environment. This includes adding necessary files
to .gitignore to avoid committing sensitive environment files
and updating flake.lock and flake.nix to include direnv-instant
as a dependency.

- Added .env, .env.*, .envrc to .gitignore
- Included direnv-instant in flake.nix and flake.lock
  to ensure proper environment setup
- Updated nixpkgs references in flake.lock for compatibility by @jskswamy

### Removed

- Remove welcome message from shell hook by @jskswamy
[2.1.15]: https://github.com/jskswamy/skills/compare/v2.1.14..v2.1.15
[2.1.14]: https://github.com/jskswamy/skills/compare/v2.1.13..v2.1.14
[2.1.13]: https://github.com/jskswamy/skills/compare/v2.1.12..v2.1.13
[2.1.12]: https://github.com/jskswamy/skills/compare/v2.1.11..v2.1.12
[2.1.11]: https://github.com/jskswamy/skills/compare/v2.1.10..v2.1.11
[2.1.10]: https://github.com/jskswamy/skills/compare/v2.1.9..v2.1.10
[2.1.9]: https://github.com/jskswamy/skills/compare/v2.1.8..v2.1.9
[2.1.8]: https://github.com/jskswamy/skills/compare/v2.1.6..v2.1.8
[2.1.6]: https://github.com/jskswamy/skills/compare/v2.1.5..v2.1.6
[2.1.5]: https://github.com/jskswamy/skills/compare/v2.1.4..v2.1.5
[2.1.4]: https://github.com/jskswamy/skills/compare/v2.1.3..v2.1.4
[2.1.3]: https://github.com/jskswamy/skills/compare/v2.1.2..v2.1.3
[2.1.2]: https://github.com/jskswamy/skills/compare/v2.1.1..v2.1.2
[2.1.1]: https://github.com/jskswamy/skills/compare/v2.1.0..v2.1.1
[2.1.0]: https://github.com/jskswamy/skills/compare/v2.0.2..v2.1.0
[2.0.2]: https://github.com/jskswamy/skills/compare/v2.0.1..v2.0.2
[2.0.1]: https://github.com/jskswamy/skills/compare/v2.0.0..v2.0.1
[2.0.0]: https://github.com/jskswamy/skills/compare/v1.10.0..v2.0.0
[1.10.0]: https://github.com/jskswamy/skills/compare/v1.9.0..v1.10.0
[1.9.0]: https://github.com/jskswamy/skills/compare/v1.8.2..v1.9.0
[1.8.2]: https://github.com/jskswamy/skills/compare/v1.8.1..v1.8.2
[1.8.1]: https://github.com/jskswamy/skills/compare/v1.8.0..v1.8.1
[1.8.0]: https://github.com/jskswamy/skills/compare/v1.7.0..v1.8.0
[1.7.0]: https://github.com/jskswamy/skills/compare/v1.6.4..v1.7.0
[1.6.4]: https://github.com/jskswamy/skills/compare/v1.6.3..v1.6.4
[1.6.3]: https://github.com/jskswamy/skills/compare/v1.6.2..v1.6.3
[1.6.2]: https://github.com/jskswamy/skills/compare/v1.6.1..v1.6.2
[1.6.1]: https://github.com/jskswamy/skills/compare/v1.6.0..v1.6.1
[1.6.0]: https://github.com/jskswamy/skills/compare/v1.5.0..v1.6.0
[1.5.0]: https://github.com/jskswamy/skills/compare/v1.4.0..v1.5.0
[1.4.0]: https://github.com/jskswamy/skills/compare/v1.3.3..v1.4.0
[1.3.3]: https://github.com/jskswamy/skills/compare/v1.3.2..v1.3.3
[1.3.2]: https://github.com/jskswamy/skills/compare/v1.3.0..v1.3.2
[1.3.0]: https://github.com/jskswamy/skills/compare/v1.2.0..v1.3.0
[1.2.0]: https://github.com/jskswamy/skills/compare/v1.1.8..v1.2.0
[1.1.8]: https://github.com/jskswamy/skills/compare/task-decomposer-v1.3.0..v1.1.8
[task-decomposer-v1.3.0]: https://github.com/jskswamy/skills/compare/task-decomposer-v1.2.0..task-decomposer-v1.3.0
[task-decomposer-v1.2.0]: https://github.com/jskswamy/skills/compare/task-decomposer-v1.1.0..task-decomposer-v1.2.0
[task-decomposer-v1.1.0]: https://github.com/jskswamy/skills/compare/v1.0.2..task-decomposer-v1.1.0
[1.0.2]: https://github.com/jskswamy/skills/compare/v1.3.1..v1.0.2
[1.3.1]: https://github.com/jskswamy/skills/compare/v1.1.2..v1.3.1
[1.1.2]: https://github.com/jskswamy/skills/compare/v1.1.1..v1.1.2
[1.1.1]: https://github.com/jskswamy/skills/compare/v1.0.1..v1.1.1
[1.0.1]: https://github.com/jskswamy/skills/compare/v1.0.0..v1.0.1

