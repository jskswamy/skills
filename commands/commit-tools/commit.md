---
name: commit
description: Generate and create git commit messages with classic or conventional commit style and strict atomic commit validation
argument-hint: "[--style classic|conventional] [--amend] [--pair] [--no-atomic-check] [context...]"
---

# Git Commit Command

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

1. **Check for CLAUDE.md:**
   - Look for `CLAUDE.md` in the project root (current working directory)
   - If it doesn't exist, skip this step (don't create CLAUDE.md just for this)

2. **If CLAUDE.md exists, check for commit instruction:**
   - Search for patterns like `/commit`, `use /commit`, or "git-commit plugin"
   - If found, continue to next step

3. **If CLAUDE.md exists but lacks commit instruction:**
   - Use AskUserQuestion:
     ```
     Your CLAUDE.md doesn't include instructions to use the /commit plugin.

     Adding this instruction helps ensure AI agents (including Claude) use
     the commit plugin instead of raw `git commit`, providing:
     - Atomic commit validation
     - Intelligent message generation
     - Style enforcement

     Would you like to add this instruction to CLAUDE.md?
     ○ Yes (Recommended) - Add the instruction
     ○ No - Skip for now
     ```

4. **If user selects "Yes":**
   - Append the following section to CLAUDE.md:
     ```markdown

     ## Git Commits

     Always use the `/commit` command instead of `git commit` directly. The
     `/commit` plugin provides atomic commit validation, intelligent message
     generation from conversation context, and style enforcement.
     ```
   - Show confirmation: "Added commit instructions to CLAUDE.md"

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

**Prerequisites — skip entirely and set `AMEND_MODE=false` if any fail:**
1. Repo has at least one commit: `git log -1` exits 0
2. Last commit was authored by the current user:
   - Current user email: `git config user.email`
   - Last commit email: `git log -1 --format='%ae'`
   - Must match exactly
3. Last commit is unpushed. Check with:
   `git log @{u}.. 2>/dev/null | head -1` — if this outputs something (or
   if the command fails because there is no upstream), the commit is
   unpushed. A branch with no upstream tracking is always unpushed.
   Treat `git log @{u}..` failing AND `git status` not showing
   "behind" or "up to date" as unpushed. Only reject if `git status`
   explicitly shows "Your branch is up to date" or "behind".

**If all prerequisites pass, run the file-overlap heuristic:**

```bash
staged_files=$(git diff --staged --name-only)
last_files=$(git diff-tree --no-commit-id --name-only -r HEAD)
```

Compute Jaccard overlap:
```
overlap = |staged_files ∩ last_files| / |staged_files ∪ last_files|
```

Decision table:
```
overlap > 0.5                                                → AMEND_MODE=true
overlap == 0  AND  every staged file's top-level dir
             differs from every last_files' top-level dir   → AMEND_MODE=false
otherwise                                                    → LLM path
```

"Top-level dir" = the first path component before `/`. For root-level files, it is the filename itself.

**LLM path (ambiguous cases only):**

When the heuristic yields no clear decision, gather:
- `LAST_MSG=$(git log -1 --format='%B')` — last commit subject + body
- `LAST_DIFF=$(git show HEAD)` — last commit's full diff
- Current staged diff (already gathered in Step 3)

Ask yourself: "Do these staged changes belong with the previous commit (same logical concern), or are they a new, separate concern?" Answer `amend` or `new` and set `AMEND_MODE` accordingly.

**Outputs:**
- `AMEND_MODE=true`: also capture `LAST_DIFF=$(git show HEAD)` — proceed to Step 4 with amend intent
- `AMEND_MODE=false`: proceed to Step 4 as a normal new commit

### Step 4: Atomic Commit Validation

**Skip this step if `--no-atomic-check` flag is set.**

Analyze the staged changes to determine if they represent a single, atomic unit of work.

#### Atomicity Analysis

**4a. File Grouping Analysis:**

Group changed files by directory/module:
```
src/auth/login.ts       -> auth module
src/auth/session.ts     -> auth module
src/ui/dashboard.tsx    -> ui module
tests/auth.test.ts      -> auth tests
```

**Red flag:** Files from unrelated modules changed together (e.g., auth + unrelated ui changes)

**4b. Change Type Detection:**

Analyze the diff content to identify the nature of changes:

| Pattern | Change Type |
|---------|-------------|
| New functions/classes added | Feature |
| Bug fix patterns (null checks, error handling) | Fix |
| Variable/function renames, restructuring | Refactor |
| Only whitespace/formatting | Style |
| Test file changes only | Test |
| README, docs/, comments only | Docs |
| package.json, config files | Build/Chore |

**Red flag:** Multiple change types in the same commit (e.g., new feature + bug fix)

**4c. Scope Coherence Check:**

Ask: "Can these changes be described in ONE sentence without conjunctions joining unrelated ideas?"

**Red flags:**
- Would need "and also" to describe changes
- Changes serve multiple distinct purposes
- Mix of unrelated concerns

**4d. Size Heuristics:**

- Very large diffs (>500 lines) across many unrelated files = suspicious
- Note: Large refactors can still be atomic if coherent

**4e. Related Unstaged Changes Detection:**

Check if there are unstaged changes that logically belong with the staged changes:

1. Get unstaged files: `git diff --name-only` and `git status --porcelain` (for untracked)

2. Detect relationships using these heuristics:

| Pattern | Check For |
|---------|-----------|
| **Test files** | Staged `src/foo.ts` → Check `foo.test.ts`, `foo.spec.ts` |
| **Same directory** | Staged `src/auth/login.ts` → Check other `src/auth/*` changes |
| **Manifest files** | Staged `src/lib/*` → Check `package.json`, `tsconfig.json` |
| **Config companions** | Staged `src/feature.ts` → Check `src/feature.config.ts` |
| **Documentation** | Staged `src/module/*` → Check `docs/module.md`, module README |

3. If related unstaged files found, show warning:

```
Related unstaged changes detected:

These unstaged files appear related to your staged changes:

- src/auth/session.test.ts (test file for staged module)
- package.json (manifest with potential dependency changes)

Including these would make your commit more complete.

What would you like to do?
○ Stage related files (Recommended) - Include them in this commit
○ Review changes - See the unstaged diff
○ Proceed without - Commit only staged files
```

4. If "Stage related files" selected:
   - Run `git add <related-files>`
   - Continue with the updated staged changes

5. If "Review changes" selected:
   - Show the diff for the related unstaged files
   - Re-prompt with the same options

6. If "Proceed without" selected:
   - Continue to Step 5 with only the originally staged files

#### Non-Atomic Warning Flow

If atomicity violations detected:

```
⚠️  ATOMICITY WARNING

Your staged changes appear to contain multiple concerns:

1. Bug fix in src/auth/login.ts (lines 45-67)
   - Fixed null pointer exception in session validation

2. New feature in src/ui/dashboard.tsx (lines 12-89)
   - Added user metrics widget

3. Style changes in src/styles/theme.css
   - Updated color variables

Atomic commits should contain a single, coherent unit of work.
Benefits: easier code review, clean git history, safe git bisect

What would you like to do?
○ Split commits (Recommended) - I'll help you stage changes separately
○ Proceed anyway - Commit all changes together (not recommended)
○ Review changes - Show the full diff again
○ Cancel - Exit without committing
```

**If "Split commits" selected:**

1. Show grouped changes by concern:
   ```
   I've identified these separate concerns:

   Concern 1: Bug fix in auth module
   Files: src/auth/login.ts

   Concern 2: New dashboard feature
   Files: src/ui/dashboard.tsx

   Concern 3: Style updates
   Files: src/styles/theme.css

   Which concern would you like to commit first?
   ○ Bug fix in auth module
   ○ New dashboard feature
   ○ Style updates
   ```

2. Unstage other files:
   ```bash
   git reset HEAD <files-not-in-selected-concern>
   ```

3. Continue to Step 5 with only the selected files staged

4. After commit completes, prompt:
   ```
   Commit created successfully!

   Remaining unstaged changes:
   - src/ui/dashboard.tsx (new feature)
   - src/styles/theme.css (style updates)

   Would you like to commit the next concern?
   ○ Yes - Continue with next concern
   ○ No - I'll handle the rest manually
   ```

5. If "Yes", stage the next concern's files and repeat from Step 4

**If "Proceed anyway" selected:**
- Log a note that user chose to bypass atomicity check
- Continue to Step 5

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

1. Read saved pairs from `.claude/git-commit.local.md`

2. If pairs exist, show selection:
   ```
   Select co-author for this commit:
   ○ John Doe <john@example.com>
   ○ Jane Smith <jane@example.com>
   ○ Add new pair - Enter new co-author details
   ```

3. If "Add new pair" selected OR no pairs saved:
   ```
   Enter co-author name:
   > [user input]

   Enter co-author email:
   > [user input]

   Save this pair for future use?
   ○ Yes
   ○ No
   ```

4. If saving, update `.claude/git-commit.local.md`:
   ```yaml
   ---
   commit_style: classic
   pairs:
     - name: "John Doe"
       email: "john@example.com"
     - name: "New Person"
       email: "new@example.com"
   ---
   ```

5. Store selected co-author for commit message generation

### Step 6b: Gather Session Context

**CRITICAL:** Before generating the commit message, review the current conversation history to extract context about WHY these changes were made.

**What to look for in the conversation:**

| Context Type | What to Extract |
|--------------|-----------------|
| **User Intent** | What did the user originally ask for? What problem were they solving? |
| **Decisions Made** | What approaches were discussed? Why was this implementation chosen? |
| **Trade-offs** | What alternatives were considered and rejected? |
| **Requirements** | Any specific constraints or requirements mentioned? |
| **References** | Issue numbers, ticket IDs, PR references, or external links discussed? |

**Extraction process:**

1. **Identify the original request**
   - Find the user's initial message that led to these changes
   - Note the problem being solved or feature being added
   - Capture any specific requirements stated

2. **Trace key decisions**
   - What implementation approaches were discussed?
   - Why was the current approach chosen over alternatives?
   - Were there any trade-offs mentioned?

3. **Gather important context**
   - Issue/ticket numbers mentioned (e.g., "fixes #123", "JIRA-456")
   - Breaking changes or migration notes discussed
   - Performance or security considerations
   - Dependencies or prerequisites mentioned

4. **Note user clarifications**
   - Any follow-up questions and answers
   - Scope adjustments or refinements
   - Explicit preferences stated by the user

**Example extraction:**

If the conversation included:
> User: "The login page crashes when users enter invalid emails. Can you add validation?"
> Claude: "I'll add email validation with regex. Should I also add rate limiting?"
> User: "Yes, add rate limiting too - we've been getting bot attacks"

Extract:
- **Intent:** Fix login crash on invalid emails
- **Decision:** Added email validation with regex
- **Additional context:** Rate limiting added due to bot attacks
- **Problem:** Users experiencing crashes, security concern with bots

**Use this context to:**
- Write a commit body that explains the "why" not just the "what"
- Include relevant background that future developers need
- Reference issues or decisions from the conversation
- Capture the reasoning that would otherwise be lost

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

**Example with session context:**

If the conversation was about "fixing login crashes due to invalid emails and adding rate limiting for bot attacks", the commit message should be:

```
Add email validation and rate limiting to login

Users reported crashes when entering malformed email addresses. The
previous implementation passed raw input to the auth service without
validation.

Changes:
- Add regex-based email validation before auth call
- Implement rate limiting (5 attempts per minute per IP)
- Add user-friendly error messages for validation failures

Rate limiting addresses the bot attack concern raised during
implementation discussion.
```

NOT just:
```
Add validation to login

Add email validation and rate limiting.
```

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

**Review the generated message and REJECT it if it contains ANY of:**

1. **Internal Task Tracker References:**
   - Beads IDs (`beads-*`, `claude-plugins-*`), or any internal tracker prefix not intended for git history
   - Task status language: "moved to in_progress", "marked as closed", "status: open"
   - Dependency graph language: "depends on beads-abc", "blocked by task-123", "unblocks beads-xyz"
   - Parked idea markers: "PARKED:", "deferred from beads-xyz"
   - `bd` CLI commands or output: "bd close", "bd update", "bd create", "bd ready"
   - **Allowed:** GitHub `#123`, Jira `PROJ-123`, public-facing issue trackers

2. **Workflow Phase Labels & Agent Artifacts:**
   - "Phase 1", "Phase 2", "Step 2 of 4", "Part 3/5" etc. used as structural labels
   - Agent dispatch metadata: "dispatched to subagent", "batch 2 of 3"
   - Tool invocation traces: "ran bd create", "used /decompose", "invoked /commit"
   - Decomposition plan references: "from decomposition plan", "per task specification"
   - **Allowed:** Technical terms like "two-phase commit", "multi-phase migration"

3. **AI Attribution:**
   - Any `Co-Authored-By:` mentioning Claude, Anthropic, GPT, OpenAI, Copilot, or any AI
   - Emails like `noreply@anthropic.com`
   - Model references like "Claude Sonnet 4.5", "Claude Opus 4.6"
   - Agent identity language: "as an AI assistant", "generated by Claude"
   - **Allowed:** Nothing — AI attribution must NEVER appear

4. **Progress Tracking Artifacts:**
   - Completion metrics as workflow markers: "Total: 24 tests, 990 lines", "Coverage: >90%"
   - Task completion checklists copied from trackers: "- [x] criterion 1", "Acceptance: met"
   - Verification command output: "$ npm test → 24 passed", "Verify: all green"
   - **Allowed:** Meaningful context: "Improve coverage from 60% to 90%"

5. **Acceptance Criteria & Specification Leaks:**
   - Verbatim acceptance criteria from task trackers
   - "Closes: beads-xyz", "Implements: task-abc"
   - Design field content copied without translation into human-readable context
   - **Allowed:** "Fixes #123" (public issue tracker references)

**If any violations found:**
- Silently regenerate the message with violations removed
- Preserve all meaningful content — only strip the leaked artifacts
- Do NOT ask the user about this; just produce a clean message
- Continue to Step 8 with the cleaned message

**If message is clean:** Continue to Step 8.

### Step 8: Present and Confirm

**When `AMEND_MODE=true` (detected in Step 3b), show the amend dialog instead:**

```
These changes look related to your last commit — amending it.

────────────────────────────────────────────────────────────────────────
<regenerated subject>

<regenerated body>
────────────────────────────────────────────────────────────────────────

What would you like to do?
○ Amend          — update the last commit with this message
○ Edit message   — modify the message before amending
○ New commit instead — create a separate commit (discard amend intent)
○ Cancel
```

- **"Amend"** → proceed to Step 9 with `AMEND_MODE=true`
- **"Edit message"** → same edit flow as the standard dialog below; re-show this amend dialog after edit (not the standard dialog)
- **"New commit instead"** → set `AMEND_MODE=false`, unset `LAST_DIFF` (set it to empty string), return to Step 7 with only the staged diff, regenerate the message, then proceed through the standard dialog below
- **"Cancel"** → exit without committing

**When `AMEND_MODE=false`, show the standard dialog:**

Show the generated commit message:

```
Generated commit message:

────────────────────────────────────────────────────────────────────────
Add user session timeout handling

Implement automatic session expiration after 30 minutes of inactivity.
The timeout duration is configurable via SESSION_TIMEOUT environment
variable.

This prevents unauthorized access when users forget to log out on
shared machines. Sessions are validated on each authenticated request.
────────────────────────────────────────────────────────────────────────

What would you like to do?
○ Commit - Create the commit with this message
○ Edit message - Modify the message before committing
○ Regenerate - Generate a new message (optionally provide more context)
○ Cancel - Exit without committing
```

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

```yaml
---
commit_style: classic
pairs:
  - name: "John Doe"
    email: "john@example.com"
  - name: "Jane Smith"
    email: "jane@example.com"
---

# Git Commit Plugin Settings

This file stores your preferences for the git-commit plugin.

## Available Settings

| Setting | Values | Description |
|---------|--------|-------------|
| commit_style | classic, conventional | Default commit message style |
| pairs | list | Saved co-authors for pair programming |
```

---

## Error Handling

### Not a Git Repository
```
Error: Not a git repository.
Run this command from within a git repository.
```

### No Staged Changes (after user declines to stage)
```
No changes to commit. Stage some changes first:
  git add <files>
  git add -A  # stage all
```

### Amend Safety Violations

**Commit already pushed:**
```
Warning: This commit has already been pushed to the remote.
Amending will require a force push, which can cause issues for collaborators.

Are you sure you want to amend?
○ Yes, I understand the implications
○ No, create a new commit instead
○ Cancel
```

**Not user's commit:**
```
Error: Cannot amend this commit.
The commit was authored by someone else (John Doe <john@example.com>).
Only amend your own commits.
```

### MCP Tools Unavailable
If MCP git tools are unavailable, silently fall back to Bash commands.
Do not show errors to the user - just use the fallback.

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
