# Typst is missing

When the Step 0 preflight prints `TYPST_MISSING`, print:

> **Typst is not installed, so this task cannot run.**
>
> Install it with one of:
> - macOS (Homebrew): `brew install typst`
> - Nix: `nix-env -iA nixpkgs.typst`
> - Cargo: `cargo install --locked typst-cli`
> - Windows: `winget install --id Typst.Typst`
> - Other: download a binary from https://github.com/typst/typst/releases
>
> Verify with `typst --version`, then run this command again.
> I can also install it for you - just say so.

Then use AskUserQuestion to offer: "Install Typst for you now?" with options "Yes, install it" / "No, I'll install it myself".
  - **Yes**: pick the installer for the platform (`brew` on macOS, `nix-env` if Nix is present, else `cargo` if present, else `winget` on Windows). Show the exact command and run it. Re-run the check above; if `typst --version` succeeds, continue the task. If the install fails or no installer exists, report the error, show the manual steps, and stop.
  - **No**: stop. Do not proceed with the task.
