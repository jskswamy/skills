# Command Wrappers over Canonical Skills Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make command workflows reusable across harnesses by extracting at least the Codebase command suite into canonical skills and turning Claude commands into thin wrappers.

**Architecture:** Skills own the reusable workflow. Claude command files keep existing names/frontmatter but delegate to those skills. `registry.json` declares both the wrapper commands and new canonical skills so `npm run build` regenerates Claude wrappers and Pi exposes the skills directly.

**Tech Stack:** Markdown Agent Skills, Claude command markdown, Node build/validation scripts already present, npm test using `node:test`.

**Spec:** `docs/superpowers/specs/2026-09-30-command-wrappers-over-skills-design.md`

## Global Constraints

- Keep Claude command names and user-facing install layout unchanged.
- Do not implement Pi extension commands in this refactor.
- Do not introduce a separate `workflows/` layer.
- Avoid duplicating full workflows between migrated commands and canonical skills.
- Use globally unique skill names because Pi exposes skills as `/skill:<name>`.
- Preserve Claude behavior by documenting Claude commands/tools as available paths, not removing them.
- Run `npm run build`, `npm run validate`, and `npm test` before completion.

## Review Focus

- Claude command wrapper accidentally drops frontmatter or `argument-hint`: wrapper tests must verify frontmatter survives.
- Extracted Codebase skill still references `${CLAUDE_PLUGIN_ROOT}` or command-only paths: grep must verify those are removed from migrated skills.
- New skills not listed in `registry.json`: validation/build must copy them into `plugins/codebase/skills/`.
- Full workflow duplicated in command and skill: wrapper thinness check must flag long command files after migration.
- Pi explicit invocation unclear: each migrated skill description must explain the direct `/skill:<name>` use case through specific trigger text.

---

## File Structure

Create or modify:

```text
skills/codebase-ask/SKILL.md       # new canonical workflow from commands/codebase/ask.md
skills/codebase-index/SKILL.md     # new canonical workflow from commands/codebase/index.md
skills/codebase-impact/SKILL.md    # new canonical workflow from commands/codebase/impact.md
skills/codebase-graph/SKILL.md     # new canonical workflow from commands/codebase/graph.md
skills/codebase-explore/SKILL.md   # update to delegate direct questions to codebase-ask
commands/codebase/ask.md           # thin Claude wrapper
commands/codebase/index.md         # thin Claude wrapper
commands/codebase/impact.md        # thin Claude wrapper
commands/codebase/graph.md         # thin Claude wrapper
registry.json                      # add new codebase skills
tests/build/wrapper-thinness.test.mjs # guard codebase command wrappers stay thin
plugins/codebase/**                # regenerated Claude wrapper output
```

This plan migrates only Codebase first. Commit Tools and Craft follow in later plans once the wrapper pattern is proven.

### Task 1: Add wrapper-thinness tests for Codebase commands

**Files:**
- Create: `tests/build/wrapper-thinness.test.mjs`

**Interfaces:**
- Produces: tests that fail while Codebase commands still contain full workflows.
- Consumes: root `commands/codebase/*.md` files.

- [ ] **Step 1: Write failing wrapper tests**

Create `tests/build/wrapper-thinness.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const wrappers = [
  ["commands/codebase/ask.md", "codebase-ask"],
  ["commands/codebase/index.md", "codebase-index"],
  ["commands/codebase/impact.md", "codebase-impact"],
  ["commands/codebase/graph.md", "codebase-graph"],
];

test("codebase commands are thin wrappers over skills", async () => {
  for (const [path, skill] of wrappers) {
    const content = await readFile(path, "utf8");
    assert.match(content, /^---[\s\S]*?---/, `${path} keeps frontmatter`);
    assert.match(content, new RegExp(`\\b${skill}\\b`), `${path} names ${skill}`);
    assert.match(content, /Forward all arguments/i, `${path} forwards arguments`);
    assert.ok(content.split("\n").length <= 25, `${path} should be a thin wrapper`);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/build/wrapper-thinness.test.mjs`

Expected: FAIL because current Codebase command files are long full workflows and do not reference the new skills.

- [ ] **Step 3: Commit is skipped unless user asks**

Do not commit during implementation if the user has asked to handle git interactions separately. Otherwise commit after task completion.

### Task 2: Extract Codebase command workflows into canonical skills

**Files:**
- Create: `skills/codebase-ask/SKILL.md`
- Create: `skills/codebase-index/SKILL.md`
- Create: `skills/codebase-impact/SKILL.md`
- Create: `skills/codebase-graph/SKILL.md`
- Modify: `skills/codebase-explore/SKILL.md`

**Interfaces:**
- Produces: four new explicit Pi-invokable skills.
- Consumes: current workflow prose from `commands/codebase/*.md`.

- [ ] **Step 1: Create `codebase-ask` skill from command workflow**

Copy the workflow body from `commands/codebase/ask.md` into `skills/codebase-ask/SKILL.md` with frontmatter:

```yaml
---
name: codebase-ask
description: Answer direct questions about codebase location, behavior, impact, similar code, or onboarding. Use when the user asks where code lives, how code works, what a change affects, or what patterns to follow.
---
```

Change title to `# Codebase Ask Skill`.

Portability edits:

- Replace `/codebase:index` hard requirements with: `If the Claude Code /codebase:index command is available, use it. Otherwise invoke the codebase-index skill or call the indexing tool directly if available.`
- Replace `AskUserQuestion` with: `Ask the user using the harness's question mechanism; in Claude Code this may be AskUserQuestion, and in Pi ask directly in chat and wait for the answer.`
- Replace `Grep`/`Glob` fallback wording with: `Use available search/read tools such as Grep/Glob/Read in Claude Code or grep/find/read/bash in Pi.`

- [ ] **Step 2: Create `codebase-index` skill from command workflow**

Copy `commands/codebase/index.md` into `skills/codebase-index/SKILL.md` with frontmatter:

```yaml
---
name: codebase-index
description: Build or refresh a codebase-memory-mcp index for the current repository. Use before semantic codebase questions when no index exists or the index is stale.
---
```

Change title to `# Codebase Index Skill` and apply the same portability edits for file reading and user prompts.

- [ ] **Step 3: Create `codebase-impact` skill from command workflow**

Copy `commands/codebase/impact.md` into `skills/codebase-impact/SKILL.md` with frontmatter:

```yaml
---
name: codebase-impact
description: Analyze the impact and blast radius of code changes using codebase-memory-mcp when available. Use when the user asks what changed, what is affected, or what might break.
---
```

Change title to `# Codebase Impact Skill` and make fallback wording harness-neutral.

- [ ] **Step 4: Create `codebase-graph` skill from command workflow**

Copy `commands/codebase/graph.md` into `skills/codebase-graph/SKILL.md` with frontmatter:

```yaml
---
name: codebase-graph
description: Explore callers, callees, and graph relationships for a code symbol. Use when the user asks for a symbol graph, call graph, dependencies, callers, or callees.
---
```

Change title to `# Codebase Graph Skill` and make fallback wording harness-neutral.

- [ ] **Step 5: Update `codebase-explore` direct question delegation**

In `skills/codebase-explore/SKILL.md`, replace the direct-question reference to `/codebase:ask` and `${CLAUDE_PLUGIN_ROOT}` with:

```markdown
For direct user questions, invoke or follow the `codebase-ask` skill with the user's question. In Claude Code, `/codebase:ask` remains a convenience command for the same workflow.
```

- [ ] **Step 6: Verify migrated skills do not use unsupported root variables**

Run:

```bash
rg '\$\{CLAUDE_PLUGIN_ROOT\}|CLAUDE_PLUGIN_ROOT' skills/codebase-*
```

Expected: no output.

- [ ] **Step 7: Run tests**

Run: `npm test -- tests/build/wrapper-thinness.test.mjs`

Expected: still FAIL until wrappers are thinned in Task 3.

### Task 3: Convert Codebase commands into thin wrappers

**Files:**
- Modify: `commands/codebase/ask.md`
- Modify: `commands/codebase/index.md`
- Modify: `commands/codebase/impact.md`
- Modify: `commands/codebase/graph.md`

**Interfaces:**
- Consumes: skills from Task 2.
- Produces: thin Claude wrappers that preserve command frontmatter.

- [ ] **Step 1: Replace `commands/codebase/ask.md` body**

Keep existing frontmatter. Replace body with:

```markdown
# /codebase:ask Command

Invoke the `codebase-ask` skill with the user's question.
Forward all arguments exactly as provided.
```

- [ ] **Step 2: Replace `commands/codebase/index.md` body**

Keep existing frontmatter. Replace body with:

```markdown
# /codebase:index Command

Invoke the `codebase-index` skill with the requested indexing mode or flags.
Forward all arguments exactly as provided.
```

- [ ] **Step 3: Replace `commands/codebase/impact.md` body**

Keep existing frontmatter. Replace body with:

```markdown
# /codebase:impact Command

Invoke the `codebase-impact` skill with the requested base revision or impact question.
Forward all arguments exactly as provided.
```

- [ ] **Step 4: Replace `commands/codebase/graph.md` body**

Keep existing frontmatter. Replace body with:

```markdown
# /codebase:graph Command

Invoke the `codebase-graph` skill with the requested symbol, direction, and depth.
Forward all arguments exactly as provided.
```

- [ ] **Step 5: Run wrapper-thinness test**

Run: `npm test -- tests/build/wrapper-thinness.test.mjs`

Expected: PASS.

### Task 4: Register skills, regenerate wrappers, and verify Pi/Claude exposure

**Files:**
- Modify: `registry.json`
- Regenerate: `plugins/codebase/**`

**Interfaces:**
- Consumes: new skills and wrappers from Tasks 2-3.
- Produces: generated Claude plugin containing new skills and thin commands.

- [ ] **Step 1: Update `registry.json`**

Add these skills to the `codebase` plugin `resources.skills` array:

```json
[
  "codebase-explore",
  "codebase-ask",
  "codebase-index",
  "codebase-impact",
  "codebase-graph"
]
```

Keep the existing Codebase commands in `resources.commands`.

- [ ] **Step 2: Run build**

Run: `npm run build`

Expected: `plugins/codebase/skills/` contains all five Codebase skills and `plugins/codebase/commands/*.md` are thin wrappers.

- [ ] **Step 3: Run validation and tests**

Run:

```bash
npm run validate
npm test
```

Expected: PASS.

- [ ] **Step 4: Spot-check generated wrapper**

Run:

```bash
wc -l plugins/codebase/commands/*.md
find plugins/codebase/skills -maxdepth 2 -name SKILL.md | sort
```

Expected: command files are short; generated skills include `codebase-ask`, `codebase-index`, `codebase-impact`, `codebase-graph`, and `codebase-explore`.

### Task 5: Update docs for command wrappers and Pi skill invocation

**Files:**
- Modify: `plugins/codebase/README.md` or canonical Codebase docs if extracted later
- Modify: `README.md` if necessary
- Modify: `docs/authoring-skills.md`

**Interfaces:**
- Consumes: wrapper pattern from Tasks 1-4.
- Produces: docs telling contributors to keep command wrappers thin and skills canonical.

- [ ] **Step 1: Update authoring guide**

In `docs/authoring-skills.md`, add a section:

```markdown
## Command Wrappers

For cross-harness workflows, put the full workflow in `skills/<name>/SKILL.md`.
Claude command files under `commands/` should be thin wrappers that invoke the canonical skill and forward all arguments unchanged.
```

- [ ] **Step 2: Update Codebase README usage**

Add Pi equivalents to Codebase usage:

```text
Claude Code: /codebase:ask <question>
Pi: /skill:codebase-ask <question>
```

List all migrated mappings.

- [ ] **Step 3: Regenerate wrappers if docs are copied through build**

Run `npm run build` if edited docs live in canonical resources that feed generated wrappers.

- [ ] **Step 4: Run final verification**

Run:

```bash
npm run build
npm run validate
npm test
rg '\$\{CLAUDE_PLUGIN_ROOT\}|CLAUDE_PLUGIN_ROOT' skills/codebase-* || true
```

Expected: build/validate/test pass; grep prints no unsupported root-variable references in migrated Codebase skills.

## Follow-Up Work

Create new issues after this plan if needed:

- Migrate Commit Tools commands to skill wrappers.
- Migrate Craft commands to skill wrappers.
- Add Pi extension commands that delegate to canonical skills.
- Add wrapper-thinness validation for all commands after enough commands are migrated.
