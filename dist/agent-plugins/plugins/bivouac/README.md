# bivouac

Safe workflows for disposable remote coding-agent sessions with bivouac.

## Install

```text
/plugin install bivouac@skills
```

## Commands

```text
/bivouac:session [start|status|issues|pull|merge|delete|ssh|connect|serve|unserve|sync|download|provision|down|image] [request...]
```

The command is a thin wrapper around the canonical `bivouac:session` skill and forwards all arguments exactly as provided.

## Skill

```text
/bivouac:session        (Pi and OpenCode: /bivouac-session)
```

Use it to manage remote coding-agent sessions and custom cloud images while preserving safety boundaries around session resolution, signed local replay, resumable retirement, provisioning, publishing, shutdown, and image billing/retention.
