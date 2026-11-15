# Test Detection (Shared)

Before either flow, if `--test-cmd <cmd>` was provided, use it as the test
command. Otherwise detect the project's test command by checking for project
files in the working directory root:

| File | Command |
|------|---------|
| `go.mod` | `go test ./...` |
| `package.json` | `npm test` |
| `Cargo.toml` | `cargo test` |
| `pyproject.toml` | `pytest` |

Check files in this order. Use the first match. If no project file is
found, skip testing and warn: "No test command detected. Skipping tests."
