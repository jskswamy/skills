# Plan schema

A `plan.yaml` is the contract between the synthesizer and the executor.
Every key shown is required unless marked optional.

```yaml
base: <full sha>                      # required — rebase root
style_file: <absolute path>           # required — path to styles/<name>.md
actions:
  - hash: <abbrev hash>               # required — 7+ char abbrev
    action: pick|fixup|squash|drop|reword|edit
    new_message: |                    # optional — required iff action ∈ {squash,reword}
      <full multi-line message>
    fixup_target_message: |           # optional — required iff action == fixup
      <message that the resulting commit should bear after fixup is folded>
    split_into:                       # optional — required iff action == edit
      - files: [<path>, ...]          # files staged for this child commit
        message: |                    # full message for this child
          <full multi-line message>
```

Notes:

- `pick` and `drop` need no message fields.
- `fixup_target_message` is the message of the *parent* (the commit being
  preserved); after the fixup folds, the executor amends to ensure the
  parent now has this exact text.
- `split_into` order is the order children are committed, oldest first.

## Logical clustering

The synthesizer may detect a "feature cluster" — a contiguous run of
4+ commits that together form one logical change (a feature built up
TDD-style across several atomic commits). When it does, the cluster
collapses into existing primitives, not a new schema entry:

- the **first** commit of the cluster gets `action: pick` and a
  `new_message` field holding the synthesizer's authored message
- every **other** commit of the cluster gets `action: fixup`

`build-todo.sh` already handles this combination correctly: the fixups
fold into the pick; the `exec git commit --amend -F <msg>` line written
after the pick retitles the collapsed commit with the saved text. No
plan-schema field changes for v2.
