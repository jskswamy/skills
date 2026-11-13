# Step 7b: Validate Commit Message (LLM as Judge)

**CRITICAL:** Before presenting the commit message to the user, evaluate it for style violations AND leaked internal context. This is a self-check — you are acting as both generator and judge.

#### 7b.1: Subject Style Check (deterministic)

Run the shared style script against the generated subject line:

```bash
SCRIPT="$COMMIT_SKILL_DIR/lib/style-check.sh"
STYLE_FILE="$COMMIT_SKILL_DIR/styles/<selected_style>.md"
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
