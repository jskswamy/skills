# Multi-Agent review-commits Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the `clean-merge:review-commits` skill so commit messages produced during rebase always follow the user's saved style — by moving message authoring into the planning phase and replaying messages mechanically during execution.

**Architecture:** Planner/executor split. A planner phase (single-agent ≤9 commits, parallel readers + synthesizer for 10+) reads commits, runs hygiene analysis, and pre-authors the final message text for every rewritten commit. The executor runs `git rebase -i` with `GIT_EDITOR=true` and a todo script containing `exec git commit --amend -F <msg-file>` lines, so no editor ever opens. A revalidator walks the rewritten log and auto-amends any drifted subject from the saved messages.

**Tech Stack:** Bash 4+, jq (already a hard dep across the marketplace), git ≥2.20 (for `--exec` in interactive rebase todo), markdown for skill prompt content. No new runtime dependencies.

---

## File Structure

```
plugins/clean-merge/skills/review-commits/
├── SKILL.md                        # rewritten — planner/executor flow
├── lib/
│   ├── load-settings.sh            # resolve settings file + CLI overrides
│   ├── style-check.sh              # validate subject vs classic|conventional
│   ├── build-todo.sh               # plan.yaml → rebase todo with exec lines
│   ├── apply-split.sh              # handle edit (split) action mid-rebase
│   ├── revalidate.sh               # walk log, check + auto-amend on drift
│   ├── reader-prompt.md            # subagent prompt for parallel readers
│   └── synthesizer-prompt.md       # subagent prompt for synthesizer
└── tests/
    ├── run-all.sh                  # discovers and runs every test-*.sh
    ├── helpers.sh                  # assert_eq, mk_repo, etc.
    ├── test-load-settings.sh
    ├── test-style-check.sh
    ├── test-build-todo.sh
    ├── test-apply-split.sh
    └── test-revalidate.sh
```

Each helper has one responsibility. `lib/*.sh` files are sourced or executed; they never call each other except through documented interfaces (env vars in / stdout out / non-zero exit on failure).

User-visible config lives at `.claude/clean-merge.local.md` and is per-project. The skill never writes to the global `~/.claude/`.

---

## Conventions used by every test

`tests/helpers.sh` provides:

```bash
# tests/helpers.sh
set -euo pipefail

assert_eq() {
  local got="$1" want="$2" msg="${3:-assertion failed}"
  if [[ "$got" != "$want" ]]; then
    echo "FAIL: $msg"
    echo "  want: $want"
    echo "  got:  $got"
    exit 1
  fi
}

assert_exit() {
  local cmd="$1" want_code="$2" msg="${3:-exit code mismatch}"
  set +e; eval "$cmd" >/dev/null 2>&1; local got=$?; set -e
  assert_eq "$got" "$want_code" "$msg"
}

mk_repo() {
  local dir="$1"
  rm -rf "$dir" && mkdir -p "$dir" && cd "$dir"
  git init -q -b main
  git -c user.email=t@t -c user.name=t commit -q --allow-empty -m "init"
}
```

This is created in Task 1 and used by all later test files.

---

### Task 1: Scaffold skill lib/ and tests/

**Files:**
- Create: `plugins/clean-merge/skills/review-commits/lib/.gitkeep`
- Create: `plugins/clean-merge/skills/review-commits/tests/helpers.sh`
- Create: `plugins/clean-merge/skills/review-commits/tests/run-all.sh`

- [ ] **Step 1: Create directories**

```bash
mkdir -p plugins/clean-merge/skills/review-commits/lib
mkdir -p plugins/clean-merge/skills/review-commits/tests
touch plugins/clean-merge/skills/review-commits/lib/.gitkeep
```

- [ ] **Step 2: Write `tests/helpers.sh`**

Use the content shown in "Conventions used by every test" above. Make it executable:

```bash
chmod +x plugins/clean-merge/skills/review-commits/tests/helpers.sh
```

- [ ] **Step 3: Write `tests/run-all.sh`**

```bash
#!/bin/bash
# Discovers and runs every tests/test-*.sh under this directory.
set -euo pipefail
cd "$(dirname "$0")"
fail=0
for t in test-*.sh; do
  [[ -e "$t" ]] || continue
  echo "== $t =="
  if ! bash "$t"; then fail=1; fi
done
exit $fail
```

```bash
chmod +x plugins/clean-merge/skills/review-commits/tests/run-all.sh
```

- [ ] **Step 4: Verify the runner runs cleanly with no tests yet**

Run: `bash plugins/clean-merge/skills/review-commits/tests/run-all.sh`
Expected: exit 0, no output beyond shell echo.

- [ ] **Step 5: Commit**

```bash
git add plugins/clean-merge/skills/review-commits/lib/.gitkeep \
        plugins/clean-merge/skills/review-commits/tests/helpers.sh \
        plugins/clean-merge/skills/review-commits/tests/run-all.sh
__GIT_COMMIT_PLUGIN__=1 git commit -m "Scaffold review-commits lib and test harness"
```

---

### Task 2: Settings loader (TDD)

`load-settings.sh` resolves settings in this priority: CLI flags > `.claude/clean-merge.local.md` > built-in defaults. It is *sourced* by SKILL-driven shell, so it exports env vars rather than printing.

**Files:**
- Create: `plugins/clean-merge/skills/review-commits/tests/test-load-settings.sh`
- Create: `plugins/clean-merge/skills/review-commits/lib/load-settings.sh`

- [ ] **Step 1: Write the failing test**

`tests/test-load-settings.sh`:

```bash
#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/helpers.sh"
LIB="$SCRIPT_DIR/../lib/load-settings.sh"

# default with no settings file and no flags
tmp=$(mktemp -d); trap "rm -rf $tmp" EXIT
( cd "$tmp" && mkdir -p .claude
  source "$LIB"
  load_settings
  assert_eq "$PARALLEL_THRESHOLD" "10" "default threshold"
  assert_eq "$PARALLEL_BATCH_SIZE" "5"  "default batch size" )

# settings file value
( cd "$tmp"
  cat > .claude/clean-merge.local.md <<'EOF'
---
parallel_threshold: 25
parallel_batch_size: 8
---
EOF
  source "$LIB"
  load_settings
  assert_eq "$PARALLEL_THRESHOLD" "25" "settings file threshold"
  assert_eq "$PARALLEL_BATCH_SIZE" "8"  "settings file batch size" )

# CLI override beats settings file
( cd "$tmp"
  source "$LIB"
  load_settings --parallel-threshold 3
  assert_eq "$PARALLEL_THRESHOLD" "3" "CLI override threshold" )

# --no-parallel forces single-agent
( cd "$tmp"
  source "$LIB"
  load_settings --no-parallel
  assert_eq "$FORCE_PATH" "single" "no-parallel sets FORCE_PATH=single" )

# --force-parallel forces multi-agent
( cd "$tmp"
  source "$LIB"
  load_settings --force-parallel
  assert_eq "$FORCE_PATH" "multi" "force-parallel sets FORCE_PATH=multi" )

echo "PASS"
```

```bash
chmod +x plugins/clean-merge/skills/review-commits/tests/test-load-settings.sh
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash plugins/clean-merge/skills/review-commits/tests/test-load-settings.sh`
Expected: FAIL — `lib/load-settings.sh` not found.

- [ ] **Step 3: Implement `lib/load-settings.sh`**

```bash
#!/bin/bash
# Resolve settings: CLI flags > .claude/clean-merge.local.md > defaults.
# Source this file then call: load_settings "$@"
# Exports: PARALLEL_THRESHOLD, PARALLEL_BATCH_SIZE, FORCE_PATH

load_settings() {
  PARALLEL_THRESHOLD=10
  PARALLEL_BATCH_SIZE=5
  FORCE_PATH=""

  local settings_file=".claude/clean-merge.local.md"
  if [[ -f "$settings_file" ]]; then
    # extract YAML frontmatter between --- markers
    local fm
    fm=$(awk '/^---$/{c++; next} c==1{print}' "$settings_file")
    local v
    v=$(echo "$fm" | awk -F': *' '/^parallel_threshold:/{print $2}' | head -1)
    [[ -n "$v" ]] && PARALLEL_THRESHOLD="$v"
    v=$(echo "$fm" | awk -F': *' '/^parallel_batch_size:/{print $2}' | head -1)
    [[ -n "$v" ]] && PARALLEL_BATCH_SIZE="$v"
  fi

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --parallel-threshold) PARALLEL_THRESHOLD="$2"; shift 2 ;;
      --no-parallel)        FORCE_PATH="single";    shift   ;;
      --force-parallel)     FORCE_PATH="multi";     shift   ;;
      *) shift ;;  # ignore other flags; SKILL parses them elsewhere
    esac
  done

  export PARALLEL_THRESHOLD PARALLEL_BATCH_SIZE FORCE_PATH
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bash plugins/clean-merge/skills/review-commits/tests/test-load-settings.sh`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add plugins/clean-merge/skills/review-commits/lib/load-settings.sh \
        plugins/clean-merge/skills/review-commits/tests/test-load-settings.sh
__GIT_COMMIT_PLUGIN__=1 git commit -m "Add settings loader for review-commits threshold"
```

---

### Task 3: Style check helper (TDD)

`style-check.sh <subject> <style-file>`: returns 0 if subject conforms, prints reason and exits non-zero otherwise. Style file is one of `plugins/git-commit/styles/{classic,conventional}.md`. The check parses the file's name from frontmatter rather than path so it works in both the marketplace cache and the source repo.

**Files:**
- Create: `plugins/clean-merge/skills/review-commits/tests/test-style-check.sh`
- Create: `plugins/clean-merge/skills/review-commits/lib/style-check.sh`

- [ ] **Step 1: Write the failing test**

`tests/test-style-check.sh`:

```bash
#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/helpers.sh"
SCRIPT="$SCRIPT_DIR/../lib/style-check.sh"

tmp=$(mktemp -d); trap "rm -rf $tmp" EXIT
classic="$tmp/classic.md"
conv="$tmp/conventional.md"
cat > "$classic" <<'EOF'
---
name: classic
---
EOF
cat > "$conv" <<'EOF'
---
name: conventional
---
EOF

# classic: capitalized, no period, ≤72
assert_exit "bash $SCRIPT 'Add foo to bar' '$classic'" 0 "valid classic"
assert_exit "bash $SCRIPT 'add foo to bar' '$classic'" 1 "classic must capitalize"
assert_exit "bash $SCRIPT 'Add foo to bar.' '$classic'" 1 "classic no trailing period"
long=$(printf 'A%.0s' {1..73})
assert_exit "bash $SCRIPT '$long' '$classic'" 1 "classic ≤72 chars"

# conventional: type(scope)?: description, lowercase
assert_exit "bash $SCRIPT 'feat: add x' '$conv'" 0 "valid conventional no scope"
assert_exit "bash $SCRIPT 'feat(api): add x' '$conv'" 0 "valid conventional with scope"
assert_exit "bash $SCRIPT 'add x' '$conv'" 1 "conventional needs type"
assert_exit "bash $SCRIPT 'Feat: add x' '$conv'" 1 "conventional lowercase"
assert_exit "bash $SCRIPT 'banana: add x' '$conv'" 1 "conventional unknown type"

echo "PASS"
```

```bash
chmod +x plugins/clean-merge/skills/review-commits/tests/test-style-check.sh
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash plugins/clean-merge/skills/review-commits/tests/test-style-check.sh`
Expected: FAIL — script not found.

- [ ] **Step 3: Implement `lib/style-check.sh`**

```bash
#!/bin/bash
# Usage: style-check.sh <subject> <style-file>
# Exit 0 if subject conforms; print reason + exit 1 otherwise.
set -euo pipefail
subject="$1"
style_file="$2"

style_name=$(awk '/^name:/{print $2; exit}' "$style_file")

case "$style_name" in
  classic)
    [[ ${#subject} -le 72 ]] || { echo "subject >72 chars"; exit 1; }
    [[ "$subject" =~ ^[A-Z] ]] || { echo "subject must start uppercase"; exit 1; }
    [[ "$subject" != *. ]] || { echo "subject has trailing period"; exit 1; }
    ;;
  conventional)
    [[ ${#subject} -le 72 ]] || { echo "subject >72 chars"; exit 1; }
    [[ "$subject" =~ ^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([a-z0-9_-]+\))?!?:\ .+ ]] \
      || { echo "subject does not match conventional format"; exit 1; }
    ;;
  *)
    echo "unknown style: $style_name"; exit 2 ;;
esac
exit 0
```

```bash
chmod +x plugins/clean-merge/skills/review-commits/lib/style-check.sh
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bash plugins/clean-merge/skills/review-commits/tests/test-style-check.sh`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add plugins/clean-merge/skills/review-commits/lib/style-check.sh \
        plugins/clean-merge/skills/review-commits/tests/test-style-check.sh
__GIT_COMMIT_PLUGIN__=1 git commit -m "Add style-check helper for classic and conventional"
```

---

### Task 4: Plan schema reference

A short markdown doc capturing the exact YAML structure the synthesizer emits and the executor consumes. Both this file and the synthesizer prompt reference the same schema.

**Files:**
- Create: `plugins/clean-merge/skills/review-commits/lib/plan-schema.md`

- [ ] **Step 1: Write the schema doc**

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add plugins/clean-merge/skills/review-commits/lib/plan-schema.md
__GIT_COMMIT_PLUGIN__=1 git commit -m "Document plan.yaml schema for review-commits"
```

---

### Task 5: Reader subagent prompt

A markdown file that SKILL.md feeds (with substitutions) to each reader subagent. The reader has read-only tools, scoped to the single commit.

**Files:**
- Create: `plugins/clean-merge/skills/review-commits/lib/reader-prompt.md`

- [ ] **Step 1: Write the reader prompt**

```markdown
# Reader subagent prompt

You are a commit reader. Your job: describe ONE commit objectively. Do
NOT compare with other commits, do NOT propose final messages, do NOT
write to disk.

Inputs (substituted into this prompt by the skill):
- COMMIT_HASH: <hash>
- BASE_SHA: <sha>
- PREV_HASH: <hash or "none"> — commit immediately before this one
- NEXT_HASH: <hash or "none"> — commit immediately after this one

Tasks:

1. Run `git show --stat --no-color $COMMIT_HASH` to see the commit
   subject, body, and file list.
2. Run `git show --no-color $COMMIT_HASH` to see the full diff.
3. If a fixup-pair signal seems plausible, run `git show --stat $PREV_HASH`
   to compare. (Do not chase further than 1 step.)

Emit ONE YAML record on stdout matching this schema exactly:

```yaml
hash: <abbrev>                       # 7-char abbrev
subject: <original subject line>
files: [<path>, ...]
top_level_dirs: [<dir>, ...]         # unique top-level dirs touched
concern: <one-line plain English>    # what this commit does
change_type: feat|fix|refactor|docs|test|chore|style|build
suggested_action: pick|fixup|squash|drop|reword|edit
fixup_candidate_for: <hash or null>  # local guess from PREV_HASH only
unrelated: true|false                # local guess
notes: <free text, optional>
```

Reply with the YAML and nothing else. No prose explanation.
```

- [ ] **Step 2: Commit**

```bash
git add plugins/clean-merge/skills/review-commits/lib/reader-prompt.md
__GIT_COMMIT_PLUGIN__=1 git commit -m "Add reader subagent prompt for review-commits"
```

---

### Task 6: Synthesizer subagent prompt

The synthesizer reads all reader records, runs cross-commit hygiene analysis, authors final messages by reading the resolved style file directly, and emits `plan.yaml` to a known path.

**Files:**
- Create: `plugins/clean-merge/skills/review-commits/lib/synthesizer-prompt.md`

- [ ] **Step 1: Write the synthesizer prompt**

```markdown
# Synthesizer subagent prompt

You are the synthesizer. You receive structured commit records and emit
the final rebase plan with all message text pre-authored.

Inputs (substituted by the skill):
- BASE_SHA: <sha>
- WORKING_DIR: <abs path> — write plan.yaml here
- STYLE_FILE: <abs path> — path to plugins/git-commit/styles/<name>.md
- READER_RECORDS_DIR: <abs path> — directory of <hash>.yaml reader output
- SEMANTIC_AVAILABLE: true|false

Tools:
- Read: any file under WORKING_DIR or READER_RECORDS_DIR
- Bash: `git log`, `git show`, `git diff` (read-only)
- If SEMANTIC_AVAILABLE: codebase-memory-mcp tools for module-boundary
  and call-chain analysis (see SKILL.md hygiene Layer 3).

Steps:

1. Read every <hash>.yaml in READER_RECORDS_DIR and the full branch diff
   (`git diff --name-only $BASE_SHA..HEAD`).
2. Run hygiene analysis (Layers 1, 2, optionally 3 — see plan-schema.md
   companion doc for details). Confirm or reject each reader's
   `suggested_action` and `fixup_candidate_for` field. Note especially:
   - Test-with-impl: if commit B touches only test files for symbols
     introduced in commit A, set `action: fixup, fixup_target: <A>`.
3. Read STYLE_FILE in full. The "Subject Line Rules" and "Examples"
   sections are your contract for message format.
4. For every action that needs a new message (squash, reword, edit
   children, or a fixup target whose message must be retitled), author
   the full message in the saved style. The first line must pass
   `style-check.sh <subject> $STYLE_FILE`.
5. Emit `plan.yaml` matching `lib/plan-schema.md` and write it to
   $WORKING_DIR/plan.yaml.
6. Reply with a one-line "SYNTHESIS COMPLETE" summary plus action counts.
```

- [ ] **Step 2: Commit**

```bash
git add plugins/clean-merge/skills/review-commits/lib/synthesizer-prompt.md
__GIT_COMMIT_PLUGIN__=1 git commit -m "Add synthesizer subagent prompt for review-commits"
```

---

### Task 7: Todo builder (TDD)

`build-todo.sh <plan.yaml> <msg-dir>`: reads plan, writes per-commit message files into `<msg-dir>/<hash>`, prints a rebase todo list (with `pick`/`fixup`/`squash`/`drop`/`reword`/`edit` lines and follow-up `exec` lines) to stdout.

**Files:**
- Create: `plugins/clean-merge/skills/review-commits/tests/test-build-todo.sh`
- Create: `plugins/clean-merge/skills/review-commits/lib/build-todo.sh`

- [ ] **Step 1: Write the failing test**

`tests/test-build-todo.sh`:

```bash
#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/helpers.sh"
SCRIPT="$SCRIPT_DIR/../lib/build-todo.sh"

tmp=$(mktemp -d); trap "rm -rf $tmp" EXIT
plan="$tmp/plan.yaml"
msgdir="$tmp/msgs"
mkdir -p "$msgdir"

cat > "$plan" <<'EOF'
base: deadbeef0000000000000000000000000000beef
style_file: /tmp/classic.md
actions:
  - hash: aaaaaaa
    action: pick
  - hash: bbbbbbb
    action: fixup
    fixup_target_message: |
      Retitled parent message
  - hash: ccccccc
    action: drop
  - hash: ddddddd
    action: reword
    new_message: |
      Reworded subject

      Body line.
EOF

todo=$(bash "$SCRIPT" "$plan" "$msgdir")
expected="pick aaaaaaa
fixup bbbbbbb
exec git commit --amend -F $msgdir/aaaaaaa
drop ccccccc
pick ddddddd
exec git commit --amend -F $msgdir/ddddddd"
assert_eq "$todo" "$expected" "todo list"

# message files written
assert_eq "$(cat $msgdir/aaaaaaa)" "Retitled parent message" "fixup target message file"
assert_eq "$(head -1 $msgdir/ddddddd)" "Reworded subject" "reword message file"

echo "PASS"
```

```bash
chmod +x plugins/clean-merge/skills/review-commits/tests/test-build-todo.sh
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash plugins/clean-merge/skills/review-commits/tests/test-build-todo.sh`
Expected: FAIL — script not found.

- [ ] **Step 3: Implement `lib/build-todo.sh`**

```bash
#!/bin/bash
# Usage: build-todo.sh <plan.yaml> <msg-dir>
# Reads plan, writes message files, prints rebase todo to stdout.
set -euo pipefail
plan="$1"
msgdir="$2"
mkdir -p "$msgdir"

# Parse plan.yaml with awk. Schema is small enough to avoid yq dependency.
# We treat the actions list line-by-line. A new action starts at "  - hash:".
awk -v msgdir="$msgdir" '
function flush() {
  if (hash == "") return
  if (action == "pick") {
    print "pick " hash
  } else if (action == "fixup") {
    print "fixup " hash
    if (fixup_msg != "") {
      f = msgdir "/" prev_pick
      printf "%s", fixup_msg > f
      close(f)
      print "exec git commit --amend -F " f
    }
  } else if (action == "drop") {
    print "drop " hash
  } else if (action == "reword" || action == "squash") {
    print "pick " hash
    f = msgdir "/" hash
    printf "%s", new_msg > f
    close(f)
    print "exec git commit --amend -F " f
  } else if (action == "edit") {
    print "edit " hash
    print "exec bash plugins/clean-merge/skills/review-commits/lib/apply-split.sh " hash " " plan_path
  }
  if (action == "pick") prev_pick = hash
  hash=""; action=""; new_msg=""; fixup_msg=""
  reading_new=0; reading_fixup=0
}
BEGIN { hash=""; prev_pick=""; plan_path=ENVIRON["PLAN_PATH"] }
/^  - hash:/         { flush(); hash=$3; next }
/^    action:/       { action=$2; next }
/^    new_message: \|/         { reading_new=1; reading_fixup=0; next }
/^    fixup_target_message: \|/{ reading_fixup=1; reading_new=0; next }
/^    split_into:/   { reading_new=0; reading_fixup=0; next }
/^    [a-z]/         { reading_new=0; reading_fixup=0 }
/^      / && reading_new   { sub(/^      /,""); new_msg = new_msg $0 "\n"; next }
/^      / && reading_fixup { sub(/^      /,""); fixup_msg = fixup_msg $0 "\n"; next }
END { flush() }
' PLAN_PATH="$plan" "$plan" \
  | sed 's/^pick \([0-9a-f]\+\)$/pick \1/'   # passthrough; placeholder for clarity
```

Strip the trailing newline from message files so `cat $f` matches the original literal:

(Done by `printf "%s"` — no trailing newline added.)

```bash
chmod +x plugins/clean-merge/skills/review-commits/lib/build-todo.sh
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bash plugins/clean-merge/skills/review-commits/tests/test-build-todo.sh`
Expected: PASS

If awk gives trouble parsing the YAML literal-block scalars, fall back to a small Python (no extra deps; `python3` is a hard dep across this marketplace) variant — preserve the same stdin/stdout contract and the same test passes.

- [ ] **Step 5: Commit**

```bash
git add plugins/clean-merge/skills/review-commits/lib/build-todo.sh \
        plugins/clean-merge/skills/review-commits/tests/test-build-todo.sh
__GIT_COMMIT_PLUGIN__=1 git commit -m "Build rebase todo with exec lines from plan.yaml"
```

---

### Task 8: Apply-split helper (TDD)

`apply-split.sh <hash> <plan-path>`: invoked by `git rebase --exec` when an `edit` action stops the rebase. Resets the just-applied commit, then iterates `split_into` from the plan, staging each group and committing with the pre-authored message. Bypasses the git-commit PreToolUse block.

**Files:**
- Create: `plugins/clean-merge/skills/review-commits/tests/test-apply-split.sh`
- Create: `plugins/clean-merge/skills/review-commits/lib/apply-split.sh`

- [ ] **Step 1: Write the failing test**

`tests/test-apply-split.sh`:

```bash
#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/helpers.sh"
SCRIPT="$SCRIPT_DIR/../lib/apply-split.sh"

tmp=$(mktemp -d); trap "rm -rf $tmp" EXIT
mk_repo "$tmp/repo"
cd "$tmp/repo"
echo a > a.txt; echo b > b.txt
git -c user.email=t@t -c user.name=t add . && git -c user.email=t@t -c user.name=t commit -q -m "compound"
HASH=$(git rev-parse --short HEAD)

# the split plan: a.txt to one commit, b.txt to another
plan="$tmp/plan.yaml"
cat > "$plan" <<EOF
base: $(git rev-parse HEAD~1)
style_file: ignored
actions:
  - hash: $HASH
    action: edit
    split_into:
      - files: [a.txt]
        message: |
          Add a
      - files: [b.txt]
        message: |
          Add b
EOF

# simulate rebase --exec position: HEAD is the commit just applied.
GIT_AUTHOR_NAME=t GIT_AUTHOR_EMAIL=t@t \
GIT_COMMITTER_NAME=t GIT_COMMITTER_EMAIL=t@t \
  bash "$SCRIPT" "$HASH" "$plan"

# expect two new commits, oldest first
log=$(git log --format=%s HEAD~2..HEAD)
expected="Add b
Add a"
assert_eq "$log" "$expected" "split produces two commits in order"

echo "PASS"
```

```bash
chmod +x plugins/clean-merge/skills/review-commits/tests/test-apply-split.sh
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash plugins/clean-merge/skills/review-commits/tests/test-apply-split.sh`
Expected: FAIL — script not found.

- [ ] **Step 3: Implement `lib/apply-split.sh`**

```bash
#!/bin/bash
# Usage: apply-split.sh <hash> <plan-path>
# Invoked by `git rebase --exec` when an edit action stops the rebase.
# Resets the commit, then commits each split_into group with its message.
set -euo pipefail
hash="$1"
plan="$2"

git reset HEAD~1 >/dev/null

python3 - "$hash" "$plan" <<'PY'
import sys, re, subprocess, os
hash_arg, plan_path = sys.argv[1], sys.argv[2]
text = open(plan_path).read()

# Naive parser: find the action block whose hash matches, then walk split_into.
m = re.search(r'^  - hash:\s*'+re.escape(hash_arg)+r'\s*$([\s\S]*?)(?=^  - hash:|\Z)',
              text, re.MULTILINE)
if not m: sys.exit("hash not found in plan: "+hash_arg)
block = m.group(1)
groups = re.findall(
  r'^      - files:\s*\[([^\]]*)\]\s*$\s*^        message:\s*\|\s*$([\s\S]*?)(?=^      - files:|\Z)',
  block, re.MULTILINE)

for files_csv, msg_block in groups:
    files = [f.strip() for f in files_csv.split(',') if f.strip()]
    msg = '\n'.join(line[10:] if line.startswith(' '*10) else line.lstrip()
                    for line in msg_block.splitlines() if line.strip()) + '\n'
    subprocess.check_call(['git', 'add', '--', *files])
    env = dict(os.environ, __GIT_COMMIT_PLUGIN__='1')
    subprocess.check_call(['git', 'commit', '-q', '-F', '-'],
                          input=msg.encode(), env=env)
PY
```

```bash
chmod +x plugins/clean-merge/skills/review-commits/lib/apply-split.sh
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bash plugins/clean-merge/skills/review-commits/tests/test-apply-split.sh`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add plugins/clean-merge/skills/review-commits/lib/apply-split.sh \
        plugins/clean-merge/skills/review-commits/tests/test-apply-split.sh
__GIT_COMMIT_PLUGIN__=1 git commit -m "Add apply-split helper for edit action mid-rebase"
```

---

### Task 9: Revalidator (TDD)

`revalidate.sh <plan> <msg-dir> <base-sha> <style-file>`: walks `$base..HEAD`, style-checks each subject, auto-amends from message files if the synthesizer authored one for that hash. Returns 0 on success (possibly after amends), 1 if drift remained or planned actions were missing.

**Files:**
- Create: `plugins/clean-merge/skills/review-commits/tests/test-revalidate.sh`
- Create: `plugins/clean-merge/skills/review-commits/lib/revalidate.sh`

- [ ] **Step 1: Write the failing test**

`tests/test-revalidate.sh`:

```bash
#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/helpers.sh"
SCRIPT="$SCRIPT_DIR/../lib/revalidate.sh"
LIB_DIR="$SCRIPT_DIR/../lib"

tmp=$(mktemp -d); trap "rm -rf $tmp" EXIT
mk_repo "$tmp/repo"
cd "$tmp/repo"
base=$(git rev-parse HEAD)

# 1 valid commit, 1 wrong-style commit
echo x > x.txt; git add x.txt
git -c user.email=t@t -c user.name=t commit -q -m "Add x"
echo y > y.txt; git add y.txt
git -c user.email=t@t -c user.name=t commit -q -m "lower case bad"
bad_hash=$(git rev-parse --short HEAD)

# style file: classic
classic="$tmp/classic.md"
cat > "$classic" <<'EOF'
---
name: classic
---
EOF

# msgdir with the corrected message for the bad commit
msgdir="$tmp/msgs"; mkdir -p "$msgdir"
echo -n "Add y properly" > "$msgdir/$bad_hash"

plan="$tmp/plan.yaml"
cat > "$plan" <<EOF
base: $base
style_file: $classic
actions:
  - hash: $(git log --format=%h $base..HEAD | tail -1)
    action: pick
  - hash: $bad_hash
    action: reword
    new_message: |
      Add y properly
EOF

PATH_TO_LIB="$LIB_DIR" bash "$SCRIPT" "$plan" "$msgdir" "$base" "$classic"

# revalidator should have amended the bad commit
new_subj=$(git log -1 --format=%s)
assert_eq "$new_subj" "Add y properly" "revalidator amended drifted subject"

echo "PASS"
```

```bash
chmod +x plugins/clean-merge/skills/review-commits/tests/test-revalidate.sh
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash plugins/clean-merge/skills/review-commits/tests/test-revalidate.sh`
Expected: FAIL — script not found.

- [ ] **Step 3: Implement `lib/revalidate.sh`**

```bash
#!/bin/bash
# Usage: revalidate.sh <plan.yaml> <msg-dir> <base-sha> <style-file>
# Walk $base..HEAD, style-check each subject, auto-amend from msg-dir on drift.
set -euo pipefail
plan="$1"; msgdir="$2"; base="$3"; style_file="$4"
LIB_DIR="${PATH_TO_LIB:-$(dirname "$0")}"

drift=0
# Walk oldest to newest; for each, style-check, amend if drift + msg available.
mapfile -t hashes < <(git rev-list --reverse "$base..HEAD")
for h in "${hashes[@]}"; do
  short=$(git rev-parse --short "$h")
  subj=$(git log -1 --format=%s "$h")
  if ! bash "$LIB_DIR/style-check.sh" "$subj" "$style_file" >/dev/null 2>&1; then
    if [[ -f "$msgdir/$short" ]]; then
      drift=1
    else
      echo "drift: $short '$subj' (no saved message)" >&2
    fi
  fi
done

if [[ $drift -eq 1 ]]; then
  # Build a one-shot rebase that amends each drifted commit from its msg file.
  tmp_todo=$(mktemp)
  mapfile -t hashes < <(git rev-list --reverse "$base..HEAD")
  for h in "${hashes[@]}"; do
    short=$(git rev-parse --short "$h")
    subj=$(git log -1 --format=%s "$h")
    if [[ -f "$msgdir/$short" ]] \
       && ! bash "$LIB_DIR/style-check.sh" "$subj" "$style_file" >/dev/null 2>&1; then
      printf 'pick %s\nexec __GIT_COMMIT_PLUGIN__=1 git commit --amend -F %s\n' \
             "$short" "$msgdir/$short" >> "$tmp_todo"
    else
      printf 'pick %s\n' "$short" >> "$tmp_todo"
    fi
  done
  GIT_EDITOR=true GIT_SEQUENCE_EDITOR="cat $tmp_todo >" git rebase -i "$base"
fi

# final pass: any remaining drift?
final_drift=0
for h in $(git rev-list "$base..HEAD"); do
  subj=$(git log -1 --format=%s "$h")
  bash "$LIB_DIR/style-check.sh" "$subj" "$style_file" >/dev/null 2>&1 || final_drift=1
done
exit $final_drift
```

```bash
chmod +x plugins/clean-merge/skills/review-commits/lib/revalidate.sh
```

The `GIT_SEQUENCE_EDITOR="cat $tmp_todo >"` works because `git` invokes
the editor with the todo file path as its argument; `cat $tmp_todo > $1`
overwrites the todo. (Same trick the rest of the skill uses.)

- [ ] **Step 4: Run test to verify it passes**

Run: `bash plugins/clean-merge/skills/review-commits/tests/test-revalidate.sh`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add plugins/clean-merge/skills/review-commits/lib/revalidate.sh \
        plugins/clean-merge/skills/review-commits/tests/test-revalidate.sh
__GIT_COMMIT_PLUGIN__=1 git commit -m "Auto-amend drifted commit subjects in revalidator"
```

---

### Task 10: Rewrite SKILL.md

Replace the current SKILL.md with the new planner/executor flow. The frontmatter, CLI flags, and external contract are preserved. The body is reorganized.

**Files:**
- Modify: `plugins/clean-merge/skills/review-commits/SKILL.md`

- [ ] **Step 1: Read current SKILL.md to confirm the contract being preserved**

```bash
head -20 plugins/clean-merge/skills/review-commits/SKILL.md
```

Confirm: `argument-hint: "[--tag <version>] [--base <ref>]"`, branch+main flows, soft-reset escape hatch.

- [ ] **Step 2: Replace the file with the new contents**

Write the full rewritten SKILL.md. Frontmatter (preserved):

```yaml
---
name: review-commits
description: >
  Review and clean up commits before pushing. Uses planner/executor split:
  reads commits (parallel for 10+), authors final messages in saved style,
  replays via `git rebase --exec` with GIT_EDITOR=true so no editor opens.
  Auto-amends drifted subjects on revalidation. Activates on:
  "review commits", "clean up commits", "prep for push",
  "squash these commits", "finalize commits", "merge branch to main",
  "clean up my commits before pushing", "review before push".
argument-hint: "[--tag <version>] [--base <ref>] [--parallel-threshold <N>] [--no-parallel] [--force-parallel]"
---
```

Body sections, each implementing the spec section of the same name:

1. **Precondition** — clean worktree (preserved verbatim from current).
2. **Auto-detection** — branch vs main (preserved).
3. **Argument parsing & settings load** —
   `source lib/load-settings.sh && load_settings "$@"`. Then the
   first-run prompt (Task 11).
4. **Test detection & codebase index resolution** — preserved verbatim.
5. **Planner phase**:
   - Count commits in `$base..HEAD`.
   - If `$FORCE_PATH=single` or `count < $PARALLEL_THRESHOLD`: run the
     reader logic inline in this agent (oldest→newest, write each
     reader record to `$WORKING_DIR/records/<hash>.yaml`).
   - Else: dispatch reader subagents in batches of `$PARALLEL_BATCH_SIZE`,
     each with the prompt at `lib/reader-prompt.md` and substitutions
     COMMIT_HASH/BASE_SHA/PREV_HASH/NEXT_HASH.
   - Dispatch one synthesizer subagent with the prompt at
     `lib/synthesizer-prompt.md`. It writes `$WORKING_DIR/plan.yaml`.
6. **Plan review** — show the plan to the user via AskUserQuestion
   with Accept / Modify / Reset options.
7. **Executor**:
   ```bash
   msgdir=$WORKING_DIR/msgs
   bash lib/build-todo.sh $WORKING_DIR/plan.yaml $msgdir > $WORKING_DIR/todo
   GIT_EDITOR=true \
   GIT_SEQUENCE_EDITOR="cat $WORKING_DIR/todo >" \
     git rebase -i $base
   ```
8. **Revalidator**:
   ```bash
   bash lib/revalidate.sh $WORKING_DIR/plan.yaml $msgdir $base $style_file \
     || echo "drift remained — see warnings"
   ```
9. **Merge to main, optional tag, validate-commits invocation** — preserved.
10. **Soft-reset escape hatch** — preserved.

The SKILL.md must explicitly say: "the executor never authors messages.
If you find yourself writing a commit message during this skill, you are
violating the contract — stop and fix the planner instead."

- [ ] **Step 3: Validate the rewritten SKILL.md is well-formed markdown**

```bash
# rough sanity: frontmatter terminates, no orphan code fences
awk '/^---$/{c++} END{exit (c<2)}' plugins/clean-merge/skills/review-commits/SKILL.md \
  || (echo "frontmatter not closed"; exit 1)
grep -c '^```' plugins/clean-merge/skills/review-commits/SKILL.md \
  | awk '$1 % 2 != 0 { print "unmatched code fence"; exit 1 }'
```

- [ ] **Step 4: Run the full test suite**

```bash
bash plugins/clean-merge/skills/review-commits/tests/run-all.sh
```

Expected: PASS (no test depends on SKILL.md content).

- [ ] **Step 5: Commit**

```bash
git add plugins/clean-merge/skills/review-commits/SKILL.md
__GIT_COMMIT_PLUGIN__=1 git commit -m "Rewrite review-commits with planner/executor split"
```

---

### Task 11: First-run prompt for settings

When `.claude/clean-merge.local.md` does not exist AND the run would cross the default threshold, prompt to save a custom value. This is logic *inside* SKILL.md (not a bash helper) — the harness, not bash, drives AskUserQuestion.

**Files:**
- Modify: `plugins/clean-merge/skills/review-commits/SKILL.md` (add subsection under "Argument parsing & settings load")

- [ ] **Step 1: Add the first-run prompt section to SKILL.md**

Append to the settings-load section:

```markdown
### First-run prompt

If `.claude/clean-merge.local.md` does not exist AND the commit count is
≥ `$PARALLEL_THRESHOLD` (default 10), use AskUserQuestion:

```
You have N commits to review. The default threshold for parallel
reading is 10. Save a custom threshold for this project?

○ Use default (10) — recommended
○ Custom value — enter your preferred threshold
○ Always single-agent — never parallelize for this project
```

Map the answer:

| Answer | File written |
|--------|--------------|
| Use default | parallel_threshold: 10, parallel_batch_size: 5 |
| Custom value | prompt for N, write parallel_threshold: N |
| Always single-agent | parallel_threshold: 999999 |

Re-run `load_settings` after writing the file so the rest of the run
sees the user's choice.

If the commit count is below the threshold, do NOT prompt — there is
nothing to decide for this run.
```

- [ ] **Step 2: Commit**

```bash
git add plugins/clean-merge/skills/review-commits/SKILL.md
__GIT_COMMIT_PLUGIN__=1 git commit -m "Add first-run threshold prompt to review-commits"
```

---

### Task 12: README and changelog

**Files:**
- Modify: `plugins/clean-merge/README.md`
- Modify: marketplace `CHANGELOG.md` (if present in `.claude-plugin/`)

- [ ] **Step 1: Update plugin README**

Find the section describing `/review-commits`. Replace the description with one paragraph noting:

- Planner/executor split — messages are pre-authored before the rebase
- Configurable parallel threshold (default 10) for large branches
- Auto-amend revalidation — drifted subjects are fixed without user intervention

```bash
# Locate the file and review what's there
cat plugins/clean-merge/README.md | head -50
```

Write the updated paragraph. Keep it short — this is a reference, not a tutorial.

- [ ] **Step 2: Update marketplace CHANGELOG**

Append under "Unreleased" → `clean-merge`:

```markdown
- review-commits: rewrite with planner/executor split. Pre-authors
  messages in the saved style, replays via `git rebase --exec` so the
  editor never opens mid-rebase, and auto-amends any drifted subject
  on revalidation. Adds configurable `parallel_threshold` (default 10).
```

If no CHANGELOG exists, skip this step.

- [ ] **Step 3: Commit**

```bash
git add plugins/clean-merge/README.md
[[ -f .claude-plugin/CHANGELOG.md ]] && git add .claude-plugin/CHANGELOG.md
__GIT_COMMIT_PLUGIN__=1 git commit -m "Document review-commits planner/executor rewrite"
```

---

## Self-Review

**Spec coverage check:**

| Spec section | Task |
|--------------|------|
| §3 Design overview (planner/executor split) | Tasks 4-10 |
| §4 Threshold gating | Task 2 (loader), Task 10 (skill flow) |
| §4.1 Configuration | Task 2 |
| §4.2 Per-invocation override | Task 2 (CLI flags) |
| §4.3 First-run prompt | Task 11 |
| §5.1 Reader | Task 5 |
| §5.2 Synthesizer | Task 6 |
| §5.3 Plan review | Task 10 (skill flow) |
| §5.4 Executor | Task 7 (todo), Task 8 (split), Task 10 (skill flow) |
| §5.5 Revalidator | Task 9 |
| §7 Failure handling | Tasks 8, 9, 10 |
| §8 Testing | Tasks 1-9 (unit), §8 scenarios documented in SKILL.md |
| §9 Migration | Task 10 |

No gaps.

**Placeholder scan:** No "TBD", no "implement later", every step has the actual code or command. ✓

**Type consistency:** `PARALLEL_THRESHOLD`, `PARALLEL_BATCH_SIZE`, `FORCE_PATH` are the only env vars produced by the loader and consumed by SKILL.md — names match across Tasks 2 and 10. The plan-schema field names (`hash`, `action`, `new_message`, `fixup_target_message`, `split_into`, `files`, `message`) match across Tasks 4, 6, 7, 8, 9. The `style-check.sh` exit-code contract (0 pass, 1 fail) matches across Tasks 3, 9. ✓

---

## Execution Handoff

Plan complete and saved to `plugins/clean-merge/docs/plans/2026-05-06-multi-agent-review-commits.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using `executing-plans`, batch execution with checkpoints.

Which approach?
