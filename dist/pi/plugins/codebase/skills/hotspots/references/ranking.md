# Rank Hotspots

1. **Churn.** Count commits per file since `--since` (default 6 months):
   ```bash
   git log --since="<since>" --format= --name-only -- <path> | sort | uniq -c | sort -rn
   ```
   Keep only files that still exist (`git ls-files`). Ignore lockfiles, generated output and vendored code (anything `.gitattributes` marks `linguist-generated`, plus `dist/`, `vendor/`, `node_modules/`, `*.lock`, `package-lock.json`).
2. **Risk.** For each of the top 40 churned files, get fan-in: the number of distinct files with `CALLS`/`IMPORTS` edges into it (`query_graph` on `b.file_path = '<file>'`, or `get_architecture` `hotspots`/`layers` when available). When the graph is unavailable, use file length (`wc -l`) as the fallback risk signal and say so.
3. **Score** = churn × (1 + fan-in), or churn × lines/100 in the fallback. Rank and keep the top 15.
4. **Context** for each: last touched (`git log -1 --format=%cs -- <file>`), owning component (from the repo's `codebase-rules` components if any, else top-level directory), and whether any test file references it (`rg -l` on its module name under test directories).
5. **Follow-up.** When `bd` is available (`command -v bd`), offer to file a beads issue for each of the top 3 (title `Reduce risk in <file>`, description with churn, fan-in and the note). File nothing without a yes.
