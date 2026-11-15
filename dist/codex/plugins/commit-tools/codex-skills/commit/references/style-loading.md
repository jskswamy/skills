# Step 5: Load Commit Style Rules

Load the selected style from this skill's bundled `styles/` directory.

**Style files location:** `$COMMIT_SKILL_DIR/styles/<style-name>.md`

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
