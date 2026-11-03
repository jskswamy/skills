# Project Stack Detection Table

## Language indicator files to suggested packages

| File | Stack | Suggested Packages |
|------|-------|-------------------|
| `package.json` | Node.js | `nodejs`, check lockfile for `pnpm`/`yarn`/`npm` |
| `pnpm-lock.yaml` | Node.js + pnpm | `nodejs`, `pnpm` |
| `yarn.lock` | Node.js + yarn | `nodejs`, `yarn` |
| `package-lock.json` | Node.js + npm | `nodejs` |
| `Cargo.toml` | Rust | `rustc`, `cargo`, `rust-analyzer` |
| `go.mod` | Go | `go`, `gopls` |
| `pyproject.toml` | Python | `python3`, `uv` |
| `requirements.txt` | Python | `python3`, `pip` |
| `Gemfile` | Ruby | `ruby`, `bundler` |
| `pom.xml` | Java | `jdk`, `maven` |
| `build.gradle` | Java/Kotlin | `jdk`, `gradle` |
| `*.csproj` | .NET | `dotnet-sdk` |
| `Makefile` | C/C++ | `gnumake`, `gcc` |
| `CMakeLists.txt` | C/C++ | `cmake`, `gcc` |
| `Dockerfile` | Docker | `docker` |
