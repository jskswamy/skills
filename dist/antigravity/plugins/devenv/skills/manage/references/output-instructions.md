# 2i. Output Instructions

## Completion messages

**If direnv-instant was selected:**
```
Development environment created!

To enter the environment:
  nix develop

Or with direnv-instant (async, instant prompt):
  direnv allow

direnv-instant shell setup (one-time):
  # bash (~/.bashrc) or zsh (~/.zshrc):
  eval "$(direnv-instant hook bash)"  # or zsh

  # fish (~/.config/fish/config.fish):
  direnv-instant hook fish | source

Note: Remove any existing `eval "$(direnv hook ...)"` first.

Your environment includes:
- [list packages]
```

**If standard direnv was selected:**
```
Development environment created!

To enter the environment:
  nix develop

Or with direnv:
  direnv allow

Your environment includes:
- [list packages]
```

**If direnv mode is "none":**
```
Development environment created!

To enter the environment:
  nix develop

Your environment includes:
- [list packages]
```

**[If pre-commit was selected, append:]**
```
Pre-commit hooks are configured via git-hooks.nix.
They will auto-install when you run `nix develop`.

Available hooks:
- [list enabled hooks]

To run hooks manually: pre-commit run --all-files
To validate in CI: nix flake check
```
