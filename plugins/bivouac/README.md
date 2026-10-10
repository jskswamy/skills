# bivouac

Safe workflows for disposable remote coding-agent sessions with bivouac.

## Install

```text
/plugin install bivouac@skills
```

## Commands

```text
/bivouac [start|status|pull|merge|ssh|connect|serve|unserve|sync|download|provision|down] [request...]
```

The command is a thin wrapper around the canonical `bivouac` skill and forwards all arguments exactly as provided.

## Skill

```text
/skill:bivouac
```

Use it to start, monitor, retrieve, and merge disposable remote coding-agent sessions while preserving bivouac's safety boundaries around session resolution, local merges, provisioning, publishing, and shutdown.
