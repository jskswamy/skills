# git-hooks.nix Hooks

## Hooks to enable by stack

If pre-commit selected, determine which git-hooks.nix hooks to enable based on detected stack:

| Stack | Hooks to Enable |
|-------|-----------------|
| JavaScript/TypeScript | `eslint.enable = true; prettier.enable = true;` |
| Python | `ruff.enable = true; ruff-format.enable = true;` |
| Go | `golangci-lint.enable = true;` |
| Rust | `clippy.enable = true; rustfmt.enable = true;` |
| Nix (always) | `nixfmt-rfc-style.enable = true; statix.enable = true; deadnix.enable = true;` |
| Shell scripts | `shellcheck.enable = true;` |
| Docker | `hadolint.enable = true;` |
| General (always) | `check-yaml.enable = true; trim-trailing-whitespace.enable = true;` |

## git-hooks.nix Hook Reference

### Available Hooks by Language

| Language | Hook Names |
|----------|------------|
| JavaScript/TypeScript | `eslint`, `prettier` |
| Python | `ruff`, `ruff-format`, `black`, `mypy` |
| Go | `golangci-lint`, `gofmt` |
| Rust | `clippy`, `rustfmt`, `cargo-check` |
| Nix | `nixfmt-rfc-style`, `statix`, `deadnix` |
| Shell | `shellcheck`, `shfmt` |
| Docker | `hadolint` |
| YAML | `check-yaml`, `yamllint` |
| Secrets | `trufflehog`, `ripsecrets` (built-in); `gitleaks` requires custom config |
| General | `trim-trailing-whitespace`, `check-added-large-files`, `check-merge-conflicts` |

### Example Hook Configuration

```nix
hooks = {
  # Enable a built-in hook
  eslint.enable = true;

  # Built-in secret scanner
  trufflehog.enable = true;

  # Enable with custom settings
  ruff = {
    enable = true;
    settings.args = ["--fix"];
  };

  # Custom hook example: gitleaks (not built-in)
  gitleaks = {
    enable = true;
    name = "gitleaks";
    entry = "${pkgs.gitleaks}/bin/gitleaks git --pre-commit --redact --staged --verbose";
    language = "system";
    pass_filenames = false;
  };
};
```

For full list of available hooks, see: https://github.com/cachix/git-hooks.nix
