{
  description = "Development environment for Claude Code plugin marketplace";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    git-hooks.url = "github:cachix/git-hooks.nix";
    direnv-instant.url = "github:Mic92/direnv-instant";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
      git-hooks,
      direnv-instant,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = nixpkgs.legacyPackages.${system};

        # Pre-commit hooks configuration
        pre-commit-check = git-hooks.lib.${system}.run {
          src = ./.;
          hooks = {
            # Nix
            nixfmt-rfc-style.enable = true;
            statix.enable = true;
            deadnix = {
              enable = true;
              settings.edit = true;
              settings.noLambdaPatternNames = true;
            };

            # Shell
            shellcheck.enable = true;

            # Spell checking
            typos.enable = true;

            # Secrets
            trufflehog.enable = true;

            # General
            check-yaml.enable = true;
            trim-trailing-whitespace.enable = true;

            # Changelog check (warns on pre-push if unreleased changes exist)
            changelog-check = {
              enable = true;
              name = "changelog-check";
              entry = "${pkgs.writeShellScript "changelog-check" ''
                if command -v git-cliff &> /dev/null; then
                  count=$(git-cliff --unreleased --context 2>/dev/null | ${pkgs.jq}/bin/jq -r '.[0].commits | length' 2>/dev/null || echo "0")
                  if [ "$count" -gt 0 ]; then
                    echo "Warning: $count unreleased commit(s). Consider running 'git cliff -o CHANGELOG.md'"
                  fi
                fi
                exit 0
              ''}";
              language = "system";
              pass_filenames = false;
              stages = [ "pre-push" ];
            };

            # Skill security audit (-p = project mode so .skillshare/audit-rules.yaml loads)
            skillshare-audit = {
              enable = true;
              name = "skillshare-audit";
              # skillshare is not packaged in the dev shell: skip with a message when absent
              entry = "sh -c 'command -v skillshare >/dev/null || { echo \"skillshare not installed; skipping skill audit\"; exit 0; }; skillshare audit -p ./skills -T high --no-tui -y'";
              language = "system";
              pass_filenames = false;
              stages = [ "pre-push" ];
            };
          };
        };
      in
      {
        # Run hooks in CI with: nix flake check
        checks.pre-commit-check = pre-commit-check;

        devShells.default = pkgs.mkShell {
          packages =
            with pkgs;
            [
              # Shell script linting
              shellcheck

              # Spell checking
              typos

              # Changelog generation
              git-cliff

              # JSON processing (used by hooks)
              jq

              # README generation from templates
              gomplate
            ]
            ++ pre-commit-check.enabledPackages
            ++ [ direnv-instant.packages.${system}.default ];

          shellHook = ''
            ${pre-commit-check.shellHook}
          '';
        };
      }
    );
}
