# Study Plugin

Adaptive study coach. Coach a topic, URL, or local file in a guided session, then test yourself with a Feynman-style recall loop. Coaching notes track gaps, and a recall log shows improvement over time.

## Commands

| Command | Purpose |
|---------|---------|
| `/study:setup` | Set the notes folder and optional content vault paths. Run once before first use. |
| `/study:coach <topic\|url\|path> [--depth shallow\|standard\|deep] [--no-recall]` | Start a coaching session, save a note, then flow into recall unless `--no-recall`. |
| `/study:recall <topic\|url> [--depth shallow\|standard\|deep]` | Re-test a previously coached topic with a Feynman recall session. |

## Configuration

`/study:setup` writes `${CLAUDE_CONFIG_DIR:-$HOME/.claude}/study.md` with `notes_path` (default `~/notes/study`) and `content_vaults` (directories searched when a plain topic is given).

## Components

- Skills: `study-coach`, `study-recall`, `study-setup`
- Agents: `coach-agent`, `content-extractor`, `recall-agent`
- Template: `templates/study-note.md` (coaching note format)
