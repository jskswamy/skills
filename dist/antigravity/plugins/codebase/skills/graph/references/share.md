# Shareable Copy

Offer this once, after the results are presented. When this skill was invoked by another skill or a subagent rather than directly by the user (for example, from a craft or brainstorming workflow), skip this step entirely: only a person asks for a shareable copy.

Ask: **Want a shareable copy?** (Yes / No). On No, stop. Don't ask again in the same run.

On Yes:

1. Ask where to save it. Suggest a path outside the repo (the harness scratch or temp directory). Never write the file into the repo unless the user names a path inside it.
2. Write Markdown. Draw any structure (components, dependencies, call paths, corridors, seams) as Mermaid diagrams; keep tables as Markdown tables. Include every `file:line` reference from the answer.
3. Start the file with one header line per repo in scope, then the agent warning:

   ```markdown
   > Snapshot of <repo>@<short-sha> (+ uncommitted changes) — <ISO 8601 date>
   > Snapshot for people; agents must re-run the skill instead of reading this.
   ```

   `<short-sha>` is `git rev-parse --short HEAD` in that repo. Include `(+ uncommitted changes)` only when `git diff HEAD` or `git ls-files -o --exclude-standard` is not empty there.
4. In Claude Code, also offer to publish the same content as an HTML page with the Artifact tool. Other harnesses get the file only.
5. Print the saved path (and the published link, if any).
