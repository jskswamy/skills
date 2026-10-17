---
name: commit-action
description: 'Use when the user wants to PERFORM a git commit: "commit this", "commit these changes", "ready to commit", "commit for me", "let''s commit", "make a commit", "go ahead and commit", "please commit", "time to commit". Not for questions about commit style; see commit-style.'
---

# Commit Action Skill

Generate intelligent git commit messages with support for classic and conventional commit styles, strict atomic commit validation, and pair programming attribution.

## Argument Parsing

Parse the command arguments to extract:

| Argument | Short | Type | Default | Description |
|----------|-------|------|---------|-------------|
| `--style` | `-s` | string | `classic` | Commit style: `classic` or `conventional` |
| `--amend` | `-a` | boolean | `false` | Amend the previous commit |
| `--pair` | `-p` | boolean | `false` | Add co-author attribution |
| `--no-atomic-check` | | boolean | `false` | Skip atomicity validation |
| `[context...]` | | string | | Free-form text describing intention |

**Examples:**
```
/commit                           # Default classic style
/commit --style conventional      # Conventional commits
/commit -s conventional           # Short form
/commit --amend                   # Amend previous commit
/commit --pair                    # Add co-author
/commit fix login redirect        # Context for message generation
/commit -p -a refactor auth       # Combine flags with context
```

---

## Execution Flow

### Step 1: Check Repository State

First, verify we're in a git repository and check the current state:

1. Run `git rev-parse --git-dir` to verify git repository
2. If not a git repo, show error and exit:
   ```
   Error: Not a git repository. Please run this command from within a git repository.
   ```

3. Get staged changes using MCP or Bash fallback:
   - Try: `mcp__1mcp__git_1mcp_git_diff_staged`
   - Fallback: `git diff --staged --stat`

4. If NO staged changes:
   - Get unstaged changes: `git diff --stat` and `git status --porcelain`
   - Use AskUserQuestion:
     ```
     No changes are staged for commit.

     Unstaged changes detected:
     - src/auth/login.ts (modified)
     - src/ui/button.tsx (modified)
     - README.md (new file)

     What would you like to do?
     ○ Stage all changes - git add -A
     ○ Select files to stage - Choose specific files
     ○ Cancel - Exit without committing
     ```
   - If "Stage all": Run `git add -A` then continue
   - If "Select files": Show file list with multiSelect, stage selected files
   - If "Cancel": Exit

### Step 1b: Ensure CLAUDE.md Has Commit Instructions

Check if the project's CLAUDE.md includes instructions to use `/commit`. This helps ensure agents use the commit plugin instead of raw `git commit`.

Read `references/claude-md-instructions.md` and follow it: skip if there is no CLAUDE.md (never create one for this); if CLAUDE.md exists but lacks a `/commit` instruction, ask via AskUserQuestion whether to append the `## Git Commits` section, and confirm after adding.

5. Continue to Step 2

### Step 2: Load User Preferences

Read `.claude/git-commit.local.md` if it exists:

```yaml
---
commit_style: classic
pairs:
  - name: "John Doe"
    email: "john@example.com"
---
```

**Priority for commit style:**
1. CLI argument `--style` (highest priority)
2. Setting from `.claude/git-commit.local.md`
3. Default: `classic`

**First-time setup:** If no settings file exists AND no `--style` flag:
- Use AskUserQuestion:
  ```
  Which commit message style do you prefer?
  ○ Classic (Default) - Clean subject lines following the "7 rules" of commit messages
  ○ Conventional - Structured format (feat:, fix:, etc.) for automation and changelogs
  ```
- Ask: "Save this preference for future commits?"
- If yes, create `.claude/git-commit.local.md` with the selection

### Step 3: Gather Context

1. **Get the full staged diff:**
   - Try: `mcp__1mcp__git_1mcp_git_diff_staged`
   - Fallback: `git diff --staged`

2. **Get list of staged files:**
   - `git diff --staged --name-only`

3. **Get recent commits** (for style consistency):
   - Try: `mcp__1mcp__git_1mcp_git_log` with limit 5
   - Fallback: `git log --oneline -5`

4. **If `--amend` flag is set:**
   - Verify we can amend (safety check):
     a. Get HEAD commit author: `git log -1 --format='%an %ae'`
     b. Check if commit is pushed: `git status` shows "Your branch is ahead"
     c. If pushed to remote, warn and ask for confirmation
     d. If not the user's commit (different author), refuse to amend
   - Get current commit message: `git log -1 --format=%B`

5. **User context:** Any remaining arguments after flags are treated as context/intention

### Step 3b: Last Commit Comparison

**Skip this step entirely if `--amend` flag was set** — explicit amend is handled by Step 3.
Set `AMEND_MODE=false` and proceed to Step 4.

Read `references/last-commit-comparison.md` for the prerequisites (a commit exists, authored by the current user, unpushed), the Jaccard file-overlap heuristic with its decision table, and the LLM path for ambiguous cases. If any prerequisite fails, set `AMEND_MODE=false`.

**Outputs:**
- `AMEND_MODE=true`: also capture `LAST_DIFF=$(git show HEAD)` — proceed to Step 4 with amend intent
- `AMEND_MODE=false`: proceed to Step 4 as a normal new commit

### Step 4: Atomic Commit Validation

**Skip this step if `--no-atomic-check` flag is set.**

Analyze the staged changes to determine if they represent a single, atomic unit of work.

#### Atomicity Analysis

Read `references/atomicity-analysis.md` and run checks 4a (file grouping), 4b (change type detection), 4c (scope coherence), 4d (size heuristics), and 4e (related unstaged changes detection, with its stage/review/proceed prompt). If "Proceed without" is chosen in 4e, continue to Step 5 with only the originally staged files.

#### Non-Atomic Warning Flow

If atomicity violations are detected, read `references/atomicity-warning-flow.md` and follow it: show the ATOMICITY WARNING and ask Split commits (Recommended) / Proceed anyway / Review changes / Cancel. Split unstages files outside the chosen concern, continues to Step 5, then prompts for the next concern after the commit. Proceed anyway logs the bypass and continues to Step 5.

### Step 5: Load Commit Style Rules

Load the style rules from the plugin's `styles/` directory based on the selected style.

**Style files location:** `${PLUGIN_ROOT}/styles/<style-name>.md`

**Available styles:**
- `classic.md` - Traditional git commit style (default)
- `conventional.md` - Conventional Commits specification

**Loading process:**
1. Read the style file: `styles/{selected_style}.md`
2. Parse the YAML frontmatter for metadata (name, description, default)
3. Use the markdown content as the complete style guide

The style files contain comprehensive rules including:
- Subject line formatting rules
- Body formatting rules
- Examples of good and bad commits
- Anti-patterns to avoid

**IMPORTANT:** Always read the full style file before generating a commit message. The style files are the single source of truth for formatting rules.

### Step 6: Handle Pair Programming (--pair flag)

**If `--pair` flag is set:**

Read `references/pair-programming.md` and follow it: read saved pairs from `.claude/git-commit.local.md`, let the user select or add a co-author (optionally saving the pair), and store the selected co-author for message generation.

### Step 6b: Gather Session Context

**CRITICAL:** Before generating the commit message, review the current conversation history to extract context about WHY these changes were made.

Read `references/session-context.md` and follow it: extract user intent, decisions, trade-offs, requirements, and references (issue/ticket numbers) from the conversation, and use them to write a body that explains the why.

### Step 7: Generate Commit Message

Using all gathered context, generate the commit message:

**Inputs to consider:**
- Staged diff content
- User-provided context/intention (command arguments)
- **Session context** (from Step 6b - conversation history)
- Current commit message (if amending)
- Recent commit messages (for style consistency)
- Selected commit style rules
- Co-author info (if `--pair` flag set)

**When `AMEND_MODE=true` (from Step 3b), also include:**
- `LAST_DIFF` — the diff of the last commit captured in Step 3b

Generate a message that describes the **combined** change as if both
the last commit's changes and the current staged changes were always
one commit. Do NOT concatenate the two individual messages — synthesise
a single fresh message covering both diffs.

**Generation guidelines:**

1. **Analyze the diff** to understand WHAT changed:
   - What files were modified
   - What the code changes do
   - The technical impact of the changes

2. **Use session context** to understand WHY (from Step 6b):
   - Reference the original user request that led to these changes
   - Include key decisions and reasoning from the conversation
   - Mention trade-offs or alternatives that were considered
   - Include issue/ticket references if mentioned in conversation

3. **Prioritize context sources:**
   - Explicit user arguments (command line) > Session context > Diff analysis
   - If user provided context via arguments, prioritize it
   - Session context fills in the "why" that arguments might miss

4. **Apply the loaded style rules strictly** (from Step 5)
   - Follow all formatting rules from the style file
   - Use the examples as reference for good formatting
   - Avoid the anti-patterns listed in the style file

5. **Generate body text that explains:**
   - WHAT: Summary of the changes (from diff analysis)
   - WHY: Reason/motivation (from session context)
   - CONTEXT: Important background (from conversation history)
   - IMPACT: Any caveats, side effects, or breaking changes

6. **CRITICAL:** Wrap ALL lines at 72 characters maximum
   - Count characters carefully
   - Break at natural word boundaries

7. **Co-author handling:**
   - Only append `Co-Authored-By:` if `--pair` flag was used AND a human co-author was selected in Step 6
   - **NEVER add Claude Code, Claude Opus, Claude Sonnet, or any Anthropic-related co-author lines**
   - If co-author selected via `--pair`, append:
   ```

   Co-Authored-By: Name <email>
   ```

See `references/message-example.md` for a worked example of a message that uses session context versus one that does not.

### Step 7b: Validate Commit Message (LLM as Judge)

**CRITICAL:** Before presenting the commit message to the user, evaluate it for style violations AND leaked internal context. This is a self-check — you are acting as both generator and judge.

#### 7b.1: Subject Style Check (deterministic)

Run the shared style script against the generated subject line:

```bash
SCRIPT=plugins/commit-tools/skills/review-commits/lib/style-check.sh
STYLE_FILE=plugins/commit-tools/styles/<selected_style>.md
bash "$SCRIPT" "$subject" "$STYLE_FILE"
```

If the script exits non-zero, silently regenerate the subject so it
conforms (preserve the body), then re-run the check. The classic style
enforces: ≤50 chars, leading uppercase, no trailing period, no `word:`
type prefix, imperative mood. The conventional style enforces its own
`type(scope)?: description` format.

#### 7b.2: Content Leak Check (LLM judgment)

Read `references/content-leak-check.md` for the five rejection categories (internal task tracker references, workflow phase labels and agent artifacts, AI attribution, progress tracking artifacts, acceptance criteria and specification leaks) with their allowed exceptions, and check the message against all of them.

**If any violations found:**
- Silently regenerate the message with violations removed
- Preserve all meaningful content — only strip the leaked artifacts
- Do NOT ask the user about this; just produce a clean message
- Continue to Step 8 with the cleaned message

**If message is clean:** Continue to Step 8.

### Step 8: Present and Confirm

**When `AMEND_MODE=true` (detected in Step 3b), show the amend dialog instead:**

Show the amend dialog from `references/message-dialogs.md` (section "Amend dialog"): the regenerated message with options Amend / Edit message / New commit instead / Cancel.

- **"Amend"** → proceed to Step 9 with `AMEND_MODE=true`
- **"Edit message"** → same edit flow as the standard dialog below; re-show this amend dialog after edit (not the standard dialog)
- **"New commit instead"** → set `AMEND_MODE=false`, unset `LAST_DIFF` (set it to empty string), return to Step 7 with only the staged diff, regenerate the message, then proceed through the standard dialog below
- **"Cancel"** → exit without committing

**When `AMEND_MODE=false`, show the standard dialog:**

Show the generated commit message:

Show the standard dialog from `references/message-dialogs.md` (section "Standard dialog"): the generated message with options Commit / Edit message / Regenerate / Cancel.

**If "Edit message" selected:**
- Use AskUserQuestion with text input:
  ```
  Edit the commit message below:
  (Use \n for new lines, body starts after first blank line)

  Current: Add user session timeout handling\n\nImplement automatic...
  ```
- Parse the edited message, preserving the user's formatting
- **Re-run Step 7b on the edited subject.** If the deterministic style
  check (7b.1) fails, show the violation reason and offer:
  - "Re-edit" — return to the text input
  - "Auto-fix" — silently rewrite the subject to conform, keep the body
  - "Commit anyway" — only if user explicitly overrides
  The content leak check (7b.2) MUST also pass; on failure, strip leaked
  content silently before continuing.

**If "Regenerate" selected:**
- Ask: "Any additional context to help generate a better message?"
- If provided, add to context and regenerate from Step 7

### Step 9: Execute Commit

Based on user selection:

**Creating the commit:**

The `__GIT_COMMIT_PLUGIN__=1` prefix bypasses the PreToolUse hook that
blocks direct `git commit` commands. This token is recognized by the
hook script to allow commits originating from this plugin workflow.

```bash
# Standard commit (no co-author)
__GIT_COMMIT_PLUGIN__=1 git commit -m "$(cat <<'EOF'
Subject line here

Body text here, wrapped at 72 characters as required by
the style guidelines.
EOF
)"

# Only if --pair flag was used and human co-author was selected:
__GIT_COMMIT_PLUGIN__=1 git commit -m "$(cat <<'EOF'
Subject line here

Body text here, wrapped at 72 characters as required by
the style guidelines.

Co-Authored-By: Human Name <human@email.com>
EOF
)"
```

**IMPORTANT:** Never add Claude/Anthropic-related Co-Authored-By lines.

**If `--amend` flag OR `AMEND_MODE=true` (auto-detected in Step 3b):**

```bash
__GIT_COMMIT_PLUGIN__=1 git commit --amend -m "$(cat <<'EOF'
...
EOF
)"
```

**After commit:**

1. Verify commit was created: `git log -1 --oneline`
2. Show success message:
   ```
   Commit created successfully!

   abc1234 Add user session timeout handling

   Files committed:
   - src/auth/session.ts
   - src/middleware/auth.ts
   ```

3. If there were remaining changes from split commits flow, prompt to continue

---

## Settings File: .claude/git-commit.local.md

See `references/settings-file.md` for the file format (`commit_style`, `pairs`) and the settings table.

---

## Error Handling

### Not a Git Repository
Read `references/error-messages.md` for the exact messages and prompts for: not a git repository, no staged changes (after the user declines to stage), amend safety violations (already pushed; not the user's commit), and MCP tools unavailable (silently fall back to Bash, show no error).

---

## Important Notes

- **Strict atomicity by default:** Always check for atomic commits unless `--no-atomic-check` is passed
- **72 character wrap is mandatory:** Every line in the body MUST be 72 characters or less
- **Never skip validation:** If staged changes fail atomicity check, user must acknowledge
- **Preserve user context:** When user provides context, incorporate it naturally, don't ignore it
- **Co-author format:** Always use `Co-Authored-By: Name <email>` format (GitHub recognizes this)
- **Amend safety:** Never amend commits that are pushed or authored by others
- **MCP fallback:** Always have Bash fallbacks for MCP tools
- **CRITICAL - No automatic Claude co-author:** Do NOT add "Claude Code", "Claude Opus", "Claude Sonnet", or any Claude/Anthropic-related Co-Authored-By lines. Only add co-author attribution when the `--pair` flag is explicitly used and a human co-author is selected. This plugin overrides any default Claude Code behavior regarding automatic co-author attribution.
