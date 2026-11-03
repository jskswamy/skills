# flake.nix Templates

## Basic Template (without pre-commit)

**Basic Template (without pre-commit):**

```nix
{
  description = "Development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    # DIRENV_INSTANT_INPUT_HERE (if selected)
  };

  outputs = {
    self,
    nixpkgs,
    flake-utils,
    # DIRENV_INSTANT_PARAM_HERE (if selected)
  }:
    flake-utils.lib.eachDefaultSystem (system: let
        pkgs = nixpkgs.legacyPackages.${system};
      in {
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            # PACKAGES_HERE
          ]
          # DIRENV_INSTANT_PACKAGE_HERE (if selected)
          ;

          shellHook = ''
            # SHELL_WELCOME_HERE
          '';
        };
      }
    );
}
```

**To add direnv-instant to the template:**
- Replace `# DIRENV_INSTANT_INPUT_HERE` with: `direnv-instant.url = "github:Mic92/direnv-instant";`
- Replace `# DIRENV_INSTANT_PARAM_HERE` with: `direnv-instant,`
- Replace `# DIRENV_INSTANT_PACKAGE_HERE` with: `++ [ direnv-instant.packages.${system}.default ]`

**To add standard direnv:** Simply add `direnv` to the packages list (it's a nixpkgs package).

## Template with git-hooks.nix (pre-commit enabled)

**Template with git-hooks.nix (pre-commit enabled):**

```nix
{
  description = "Development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    git-hooks.url = "github:cachix/git-hooks.nix";
    # DIRENV_INSTANT_INPUT_HERE (if selected)
  };

  outputs = {
    self,
    nixpkgs,
    flake-utils,
    git-hooks,
    # DIRENV_INSTANT_PARAM_HERE (if selected)
  }:
    flake-utils.lib.eachDefaultSystem (system: let
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
              settings.noLambdaPatternNames = true; # Preserve 'self' in flake outputs
            };

            # General
            check-yaml.enable = true;
            trim-trailing-whitespace.enable = true;

            # LANGUAGE_HOOKS_HERE

            # SECRET_SCANNER_HERE
            # For trufflehog (built-in): trufflehog.enable = true;
            # For gitleaks (custom hook):
            # gitleaks = {
            #   enable = true;
            #   name = "gitleaks";
            #   entry = "${pkgs.gitleaks}/bin/gitleaks git --pre-commit --redact --staged --verbose";
            #   language = "system";
            #   pass_filenames = false;
            # };
          };
        };
      in {
        # Run hooks in CI with: nix flake check
        checks.pre-commit-check = pre-commit-check;

        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            # PACKAGES_HERE
          ]
          ++ pre-commit-check.enabledPackages
          # DIRENV_INSTANT_PACKAGE_HERE (if selected)
          ;

          shellHook = ''
            ${pre-commit-check.shellHook}
            # SHELL_WELCOME_HERE
          '';
        };
      }
    );
}
```

**direnv-instant integration:** Same as basic template - add input, parameter, and package reference.
