# Destroy the Instance

Before destroying the instance, inspect sessions and explain the consequence:

```bash
bivouac session list
bivouac down
```

`down` rescues session work before destroying the VM and refuses unmerged commits or unlanded issue state without explicit force. Ask before running it; forced destruction needs explicit approval to discard that work.
