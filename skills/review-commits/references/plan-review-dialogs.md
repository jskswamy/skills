# Step 5: Plan Review Dialogs

## Cluster proposals and final plan

First, present any cluster proposals. The form depends on which
detectors fired:

**Both detectors fire (overlap-free disjoint case):**

```
Cluster proposals for branch <name>:

  Option A (recommended, branch heuristic, medium confidence):
    Collapse all 4 commits into one
      pick   f3696d7  Extract netbox process-compose commands to scripts
      fixup  bc7a342  ↳ folded
      fixup  fd11711  ↳ folded
      fixup  c0cc5e8  ↳ folded

  Option B (path heuristic, high confidence):
    Collapse 4 commits in plugins/foo/skills/bar/ into one
      pick   9e14e75  Add NetBoxClient interface, mock, and validation
      fixup  3312c0b  ↳ folded
      fixup  …
      fixup  …

○ Accept Option A — collapse the whole branch
○ Accept Option B — collapse only the sub-clusters
○ Keep all as pick — don't collapse
○ Modify per-commit
```

**Branch detector only (no path sub-clusters):**

```
Cluster proposal for branch <name>:

  Branch heuristic, medium confidence:
    Collapse all N commits into one
      pick   <h1>  <subject>
      fixup  <h2>  ↳ folded
      ...

  No path-prefix sub-clusters found.

○ Accept — collapse the whole branch
○ Keep all as pick — don't collapse
○ Modify per-commit
```

**Path detector only (running on main/master, or branch candidate did not fire):**

```
Cluster proposals (path heuristic, high confidence):
  Collapse N commits in <dir> into one
    pick   <h1>  <subject>
    fixup  <h2>  ↳ folded
    ...

○ Accept — collapse the sub-cluster(s)
○ Keep all as pick — don't collapse
○ Modify per-commit
```

**Neither detector fires:**

```
No cluster proposals.
  Branch heuristic: skipped (on main/master)
  Path heuristic: no contiguous run of 4+ commits shares a parent directory.

  If these commits form one logical feature, use Modify to choose
  which to collapse manually.
```

After the cluster decision is made, present the final per-commit plan:

```
Rebase plan for N commits on <branch-name>:

  Current log:
    c844c6a  Add sync-beads skill
    7de838b  Fix sync-beads skill
    ...

  Proposed sequence:
    pick   9e14e75  Add NetBoxClient interface, mock, and validation
                      Adds NetBoxClient as the testable boundary for all
                      NetBox HTTP calls. The mock is generated via…
    fixup  3312c0b  ↳ folded into above
    edit   a1b2c3d  Update auth handler  ← will split into 2
    drop   f4e5d6c  Fix unrelated typo

○ Accept — execute this plan
○ Modify — adjust action for specific commits
○ Reset — soft-reset and regroup manually (escape hatch)
```
