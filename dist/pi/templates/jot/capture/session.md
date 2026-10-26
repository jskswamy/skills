# Session Capture Template

## Instructions for Agent

Capture a summary of a Claude Code session - what was worked on, key decisions, lessons learned, and follow-ups.

### Guided Questions

Instead of a single context question, ask these in sequence:

1. "What was the main goal or task for this session?"
2. "What did you accomplish? List the key outcomes."
3. "Were there any key decisions or choices made?"
4. "Did you learn anything notable? Any gotchas or insights?"
5. "Are there any follow-up tasks or next steps?"
6. "Anything else you want to remember about this session?" (OPTIONAL - skip if user says no)

### Output Format

```markdown
# Session: [Brief Goal/Topic]

**Date:** [YYYY-MM-DD]

## 📍 Session Context

- **Project:** [repo name or project directory]
- **Repo:** [git remote URL or "Local project"]
- **Branch:** [current branch]
- **Directory:** [working directory path]

## 🎯 Goal

[What the user was trying to accomplish]

## ✅ Accomplishments

- [Key outcome 1]
- [Key outcome 2]
- [Key outcome 3]

## 🔑 Key Decisions

[Decisions made during the session, if any]
- [Decision 1 and rationale]
- [Decision 2 and rationale]

[If no significant decisions, write "No major decisions made this session."]

## 💡 Lessons Learned

[Insights, gotchas, or things discovered]
- [Lesson 1]
- [Lesson 2]

[If no notable lessons, write "Routine session - no notable lessons."]

## 📋 Follow-up Tasks

- [ ] [Task 1]
- [ ] [Task 2]
- [ ] [Task 3]

[If no follow-ups, write "No immediate follow-ups."]

## 📌 Additional Context

[If user provided additional context, include it here. Otherwise, omit this section entirely.]

## 🏷️ Tags

`[tag1]` `[tag2]` `[tag3]`

## 🔗 Related Notes

[[related-note-1]]
[[related-note-2]]

---
_Session captured_
```

### Rules

- **Gather session context automatically** using Bash commands (git repo, branch, directory) - do NOT ask the user
- **Ask guided questions** in sequence, not all at once
- **OPTIONAL: Ask for additional context** at the end - "Anything else you want to remember?" (if skipped, omit section)
- **Be brief** - this is for quick capture, not detailed documentation
- **Use checkboxes** for follow-up tasks (Obsidian-compatible)
- **Generate 3-5 tags** based on topics discussed
- **Use emojis on headings** exactly as shown
- **Filename**: `slugified-goal.md` (no date prefix)
- **Save to**: `notes/sessions/`
- Output only markdown, no preamble
- If user has no answer for a section, use the default text provided
