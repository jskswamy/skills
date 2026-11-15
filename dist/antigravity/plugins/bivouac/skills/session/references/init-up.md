# Initialize or Bring Up a Repo

If the repo is not configured, guide the user to the built-in wizard:

```bash
bivouac init
```

Do not generate a custom `bivouac.pkl` unless the user explicitly asks for config authoring help.

When configuring or migrating:

- Shared defaults live in `~/.config/bivouac/base.pkl`; project config layers on top.
- `sshKeys` contains public-key file paths, not account IDs or fingerprints. Relative paths resolve against the declaring config. Use `init` to migrate old entries; keep private keys local. Encrypted keys must already be unlocked in ssh-agent. `up` requires approval before registering missing public keys; registrations remain if VM creation fails or on `down`.
- Select coding harnesses with `agents`, not guessed entries in `packages`. Selected unfree agents are permitted narrowly. For unfree packages supplied by imported modules, use `allowUnfreePackages` with package names rather than enabling all unfree software.

If config exists and the user wants an instance:

```bash
bivouac up
```

Explain that `up` reconciles the configured remote environment and does not send repository contents by itself. Code reaches the instance when a session starts.
