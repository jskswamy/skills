# Ports and File Transfer

For temporary local access to a remote service:

```bash
bivouac connect --port <port>
```

For tailnet publishing, only when the user clearly asks to publish or unpublish:

```bash
bivouac serve <port>
bivouac unserve <port>
```

For deliberate non-git data movement:

```bash
bivouac sync --dir <path>
bivouac download <path>
```

Before `sync` or `download`, confirm the path is intentionally outside git, such as datasets, weights, logs, or results.
