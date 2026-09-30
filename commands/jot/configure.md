---
name: configure
description: Reconfigure or edit an existing jot type agent — change questions, output template, triggers, or reset setup entirely.
argument-hint: "[type label, optional]"
---

# Jot Configure

Manage existing jot type agents. Use this when the initial setup missed something, or when you want to change how a type is captured.

## Step 1: Load Config

Read `${CLAUDE_CONFIG_DIR:-$HOME/.claude}/jot.md` (expand `~` to home directory).

Extract:
- `agents_dir` (default: `${CLAUDE_CONFIG_DIR:-$HOME/.claude}/jot/agents/`)
- `routing` array

If `routing` is empty or file doesn't exist:
> "No types configured yet. Use `/jot:capture` to capture something — setup runs automatically on first use."
Stop.

## Step 2: Pick a Type

If an argument was passed (e.g. `/jot:configure blip`), match it against `routing[].label` or `routing[].id` (case-insensitive). If matched, skip the AskUserQuestion and use that entry.

Otherwise, use AskUserQuestion:
```
question: "Which type do you want to configure?"
options: one option per routing entry, label: "[Label]", description: "triggers: [triggers joined by ', ']"
```

Store the matched routing entry as `ENTRY` (`id`, `label`, `agent`).

## Step 3: Check Agent File

```bash
ls "${AGENTS_DIR}/${ENTRY.agent}.md" 2>/dev/null && echo "exists" || echo "missing"
```

If missing:
> "No agent file found for [Label] at [path]. It may have been deleted. Use `/jot:capture [label]` to regenerate it from scratch."
Stop.

## Step 4: Pick Action

Use AskUserQuestion:
```
question: "What do you want to change about [Label]?"
options:
  - Edit questions — Change what jot asks you during capture
  - Edit output template — Change the body structure of the saved note
  - Edit triggers & URL patterns — Change what words or domains route to this type
  - Reconfigure from scratch — Delete this agent and re-run the full setup next capture
```

---

## Action: Edit Questions

Read `${AGENTS_DIR}/${ENTRY.agent}.md`.

Extract the `**Questions to ask:**` block from the Capture Flow section (everything between `**Questions to ask:**` and the next `##` heading).

Show the current questions to the user, then ask:
> "What would you like to change? Describe the addition, removal, or edit."

Apply the requested changes to that section in the file. Preserve all other content exactly.

Confirm: "Updated questions for [Label]."

---

## Action: Edit Output Template

Read `${AGENTS_DIR}/${ENTRY.agent}.md`.

Extract the `## Output Template` section (everything between `## Output Template` and the next `##` heading).

Show the current template to the user, then ask:
> "What would you like to change? Describe the sections to add, remove, or reorder."

Apply the requested changes. Preserve all other content exactly.

Confirm: "Updated output template for [Label]."

---

## Action: Edit Triggers & URL Patterns

Read `${AGENTS_DIR}/${ENTRY.agent}.md`. Show the current frontmatter `triggers:` and `url-patterns:` values.

Use AskUserQuestion:
```
question: "What do you want to change?"
options:
  - Add trigger words
  - Remove trigger words
  - Add URL domains (e.g. github.com)
  - Remove URL domains
```

Ask for the specific words/domains. Apply changes to:
1. The frontmatter `triggers:` / `url-patterns:` in `${AGENTS_DIR}/${ENTRY.agent}.md`
2. The matching entry's `triggers` / `url_patterns` in `${CLAUDE_CONFIG_DIR:-$HOME/.claude}/jot.md`

Both files must stay in sync.

Confirm: "Updated triggers for [Label]."

---

## Action: Reconfigure from Scratch

Use AskUserQuestion to confirm:
```
question: "This will delete the [Label] agent file and remove it from routing. Next time you capture a [Label], jot will run the full setup again. Continue?"
options:
  - Yes — delete and reset
  - No — cancel
```

If confirmed:

1. Delete the agent file:
```bash
rm "${AGENTS_DIR}/${ENTRY.agent}.md"
```

2. Read `${CLAUDE_CONFIG_DIR:-$HOME/.claude}/jot.md`. Remove the entry where `id == ENTRY.id` from the `routing` array. Write the file back.

3. Confirm:
> "Reset [Label]. Next `/jot:capture [label]` will walk through setup from scratch."
