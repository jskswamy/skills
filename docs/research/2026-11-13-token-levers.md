# Token levers across harnesses

Research for `docs/specs/2026-11-13-token-diet-design.md`.

- Date: 2026-11-13, at revision `f262c96`.
- Sources:
  - Claude Code docs (code.claude.com/docs/en/*)
  - Codex source (openai/codex `16280e1`)
  - OpenCode source (anomalyco/opencode `fb11429`)
  - Pi 1.5.0 local docs
  - oh-my-pi docs (omp 18.18.6)
  - `agy` 1.4.12 changelog
  - agentskills spec (`83021e2`)
  - this repo's `docs/harness-research.md` and `harness_dictionary.md`
- No live token counts were taken.

## 1. What every request carries

| Cost | Claude Code | Codex | OpenCode | Pi | omp | Antigravity |
|---|---|---|---|---|---|---|
| Skill listing | name + `description` + `when_to_use`. Capped at 1,536 chars per skill. The whole listing gets 1% of the context; on overflow the least-used skills lose their description | `name: description (path)`. Capped at 1,024 per skill. The listing gets 2% of the context (default 8,000 chars); over budget, descriptions are trimmed evenly, then the tail is dropped | `id/name/description`. No cap | name + description (1,024) + path | name + description, only while a read tool is active | name + description (1,024) |
| Agent listing | agent descriptions, once there are agents. Warning above 15k tokens | – (plugins cannot ship agents) | `- id: description` inside the `subagent` tool | – (only with `pi-subagents`: up to 16 agents / 12,288 bytes) | agent catalog | agent list |
| MCP tools | deferred by default (ToolSearch) | deferred behind `tool_search` when the model supports it | Code Mode: catalog + search | extension tools: `defaultActive:false` / `exposure:"deferred"` | `xdev` catalog | on demand unless `eager` |
| Hook text | SessionStart once, then stays in history. UserPromptSubmit on every turn. Over 10k chars goes to a file | `additionalContext`. Over 2,500 tokens goes to a file | **our runtime pushes it into the system prompt on every request** (`harnesses/opencode/runtime.mjs:128-132`) | `sendMessage`, which becomes a user message | extension | SessionStart becomes `injectSteps` |

## 2. What a loaded skill costs afterwards

| | Claude Code | Codex | OpenCode | Pi | omp | Antigravity |
|---|---|---|---|---|---|---|
| Body stays in history | yes. After compaction, the first 5k tokens per skill (25k total) come back | yes. `$skill` injection is **cut at 8,000 bytes** | yes, as a tool result. Compaction clips it to 2,000 | yes. Compaction clips it to 2,000 | yes, **never pruned** | yes. Body capped at 24 KB |

## 3. Levers a plugin author controls

| Lever | Claude Code | Codex | OpenCode | Pi | omp | Antigravity | agent-plugins |
|---|---|---|---|---|---|---|---|
| Hide from the model, `/name` still works | `disable-model-invocation` | `agents/openai.yaml` `policy.allow_implicit_invocation: false` | `autoinvoke:false` (mapped today) | `disable-model-invocation`; the template must carry the body | same as Pi | `disable-model-invocation` (same key) | none |
| Sub-agent on a cheaper model | agent `model: sonnet\|haiku`, `effort`, `maxTurns`, `tools`, `omitClaudeMd` | not from a plugin | `model: provider/model` only (not portable) | with `pi-subagents`: `model:` | OMP-native agents: `model: @smol` (the Claude-dialect `model` is dropped) | `model: flash\|pro` | – |
| Sub-agent asks the user | no (relay through the parent) | unverified | possible for plugin agents (`question`); unverified in the UI | `pi-subagents` `contact_supervisor` | no; the questions go in the final answer | **yes, `AskQuestion`** | – |
| Resume a sub-agent | `SendMessage` | user agents only | `subagent` + `sessionID` | `resume` | `agent://<id>` | `send_message` / `@agent` | – |
| Small skill bodies | the body persists | **8 KB cut** | clipped on compaction | clipped on compaction | never pruned | 24 KB cap | spec: under 5k tokens / 500 lines |
| Stable injected text (the cache) | plugin text is appended and never busts the cache. A skill `model:` costs a cache miss | a tool or MCP change busts it | a system-part change busts it | a `systemPrompt` change busts it | breakpoint before project context | compaction keeps tools |

## 4. What this repo adds today

| Item | Size | Paid | Harnesses |
|---|---|---|---|
| Skill listing (31 skills) | ~12k chars | every request | all |
| Agent descriptions (12 agents), mostly `<example>` blocks | ~11.7k chars | every request where agents are listed | Claude Code, OpenCode, omp, Antigravity |
| `codebase` SessionStart reminder | 1.0k | once, then it stays in history (OpenCode: every request, in the system prompt) | all with hooks |
| `commit-tools` routing reminder | 0.4k | same as above | same |
| `codebase` SubagentStart reminder | 0.4k | every sub-agent | Claude Code, OpenCode, omp |
| `codebase` `discovery-augment.sh` | unmeasured | every Grep/Glob | Claude Code and the harnesses that carry PreToolUse |
| SKILL.md bodies over 8 KB | 10 skills (see 5.2) | when invoked; cut on Codex | all |
| Agent `model`/`tools` dropped by the adapter | – | agents run on the main model with every tool | omp, Antigravity, OpenCode |

## 5. Findings, by expected savings

1. **Agent descriptions cost as much as the skill listing** (~11.7k chars), and most of it is `<example>` blocks. Moving the examples into the agent body, or cutting them, roughly halves this. This is not in the spec yet.
2. **Ten SKILL.md bodies exceed Codex's 8 KB `$skill` cut:**
   - `bivouac:session` 24.5k
   - `commit` 17.7k
   - `devenv:manage` 15.3k
   - `codebase:seams` 14.9k
   - `review-commits` 14.9k
   - `sketch-note:sketch` 14.0k
   - `refactor:scan` 13.9k
   - `codebase:capabilities` 11.9k
   - `validate-commits` 9.3k
   - `codebase:ask` 9.3k

   On Codex these silently lose their later steps. Moving detail into `references/` fixes correctness on Codex, cost on omp (never pruned), and context everywhere.
3. **Hiding human-started skills** works natively on six harnesses: through the Codex `openai.yaml`, and on Pi and omp with the template carrying the body.
4. **The OpenCode runtime re-sends hook text in the system prompt on every request**, and each new tool note busts the cache. The fix is to inject once into the messages.
5. **Adapters drop agent `model`/`tools` on omp, Antigravity and OpenCode.** Mapping `model` (agy `flash`, omp native `@smol`) makes the existing agents cheaper without any new relay.
6. **Sub-agent delegation with a relay** pays off on Claude Code, OpenCode, omp and Pi with `pi-subagents`. On Antigravity the sub-agent can ask directly, so no relay is needed. It is not possible on Codex from a plugin.
7. **Description length** matters most where the listing is budgeted: Claude Code (1%) and Codex (2%). Alternative M still argues against cutting trigger text. Moving examples out of agent descriptions (finding 1) is the safer cut.

## 6. User-side settings (not this repo)

- **Claude Code:** `skillListingBudgetFraction`, `skillListingMaxDescChars`, `Skill(name)` deny rules, disable plugins, `ENABLE_TOOL_SEARCH`.
- **Codex:** `skills.config` with `enabled=false`, `skills.max_context_tokens`, `model_reasoning_effort`, MCP `disabled_tools`.
- **OpenCode:** permission deny on skills and tools, Code Mode, a cheap `model` per sub-agent, `cache.ttl`.
- **Pi:** package filters, `defaultTools`, `PI_CACHE_RETENTION=long`.
- **omp:** `skills.ignoredSkills`, `modelRoles`, `task.agentModelOverrides`.
- **Antigravity:** disable plugins, `/model`.
