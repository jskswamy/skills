# Check 6: Subjects Conform to Style

Resolve the active style file:

1. Read `.claude/git-commit.local.md` and extract the `commit_style` value
   from its YAML frontmatter
2. If missing, default to `classic`
3. Locate the installed `commit-tools:commit` skill and set `COMMIT_SKILL_DIR` to
   its absolute directory. Style file: `$COMMIT_SKILL_DIR/styles/<style>.md`.
   If missing, report a blocker rather than guessing a working-repo path.

Then for each commit in `$BASE..HEAD`, run the shared style check:

```bash
SCRIPT="$COMMIT_SKILL_DIR/lib/style-check.sh"
for h in $(git rev-list --reverse $BASE..HEAD); do
  subj=$(git log -1 --format=%s "$h")
  if ! reason=$(bash "$SCRIPT" "$subj" "$STYLE_FILE" 2>&1); then
    echo "  ✗ $h '$subj' — $reason"
  fi
done
```

The script enforces the loaded style's rules. For `classic` these are:
≤50 chars, leading uppercase, no trailing period, no `word:` type prefix,
imperative mood (best-effort denylist of common past/3rd-person/gerund
forms). For `conventional`: ≤72 chars and the standard `type(scope)?: description`
format.

- **Pass:** Every subject conforms
- **Fail:** List each non-conforming commit hash, subject, and reason
