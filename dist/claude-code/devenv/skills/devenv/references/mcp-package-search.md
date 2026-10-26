# NixOS MCP Package Search

## 2c. Package search procedure (Initialize Flow)

1. Check `.claude/devenv.local.md` for `use_mcp_search` setting (default: `true`)
2. If MCP search is enabled, try MCP tools in priority order:
   a. **1mcp** (preferred — already running, no extra process):
      ```
      mcp__1mcp__nixos_1mcp_nixos_search(
        query="<package>",
        search_type="packages",
        channel="unstable",
        limit=10
      )
      ```
   b. **Global/project level MCP** (if user has mcp-nixos configured):
      ```
      mcp__nixos__nix(
        action="search",
        query="<package>",
        source="nixos",
        type="packages",
        channel="unstable",
        limit=10
      )
      ```
   c. **Plugin's bundled MCP**:
      ```
      mcp__plugin_devenv_nixos__nix(
        action="search",
        query="<package>",
        source="nixos",
        type="packages",
        channel="unstable",
        limit=10
      )
      ```
3. **Fallback:** If no MCP tool available or `use_mcp_search: false`, use bash:
   `nix-shell -p nix --run "nix search nixpkgs <package> --json"`
4. If version specified (e.g., `nodejs@20`), handle version resolution:
   a. Try `mcp__1mcp__nixos_1mcp_nixhub_find_version(package_name="nodejs", version="20")`
   b. If 1mcp unavailable, try `mcp__plugin_devenv_nixos__nix_versions(package="nodejs", version="20")`
   c. Also search for nixpkgs variants like `nodejs_20`
   d. Prefer the nixpkgs variant if it exists; offer pinned commit hash as alternative

## Manage Flow: Add packages search

   - Check `.claude/devenv.local.md` for `use_mcp_search` setting (default: `true`)
   - If MCP search is enabled, try MCP tools in priority order:
     a. **1mcp** (preferred): `mcp__1mcp__nixos_1mcp_nixos_search(query="<pkg>", search_type="packages", channel="unstable", limit=10)`
     b. Global/project MCP: `mcp__nixos__nix(action="search", query="<pkg>", ...)`
     c. Plugin's bundled MCP: `mcp__plugin_devenv_nixos__nix(action="search", query="<pkg>", ...)`
   - **Fallback:** If no MCP tool available or `use_mcp_search: false`, use bash:
     `nix-shell -p nix --run "nix search nixpkgs <package> --json"`
   - For versioned packages (e.g., `nodejs@20`):
     a. Try `mcp__1mcp__nixos_1mcp_nixhub_find_version(package_name="nodejs", version="20")`
     b. If 1mcp unavailable, try `mcp__plugin_devenv_nixos__nix_versions(package="nodejs", version="20")`
     c. Also search for nixpkgs variants like `nodejs_20`

## MCP Tools: NixOS Package Search

This plugin uses NixOS MCP tools for package search, providing access to 130K+ NixOS packages with accurate, up-to-date information.

### Tool Priority Order

The command tries MCP tools in this order:
1. **1mcp** (preferred): `mcp__1mcp__nixos_1mcp_nixos_search` — already running via 1mcp proxy, no extra process
2. **Global/Project level**: `mcp__nixos__nix` — if user has mcp-nixos configured globally or in project
3. **Plugin's bundled**: `mcp__plugin_devenv_nixos__nix` — plugin's own MCP server (fallback for non-1mcp environments)
4. **Bash fallback**: `nix search` command

This ensures the fastest available tool is used first, with graceful degradation.

### Package Search

**1mcp** (separate tools per action):
```
mcp__1mcp__nixos_1mcp_nixos_search(
  query="<search_term>",
  search_type="packages",
  channel="unstable",
  limit=10
)
```

**Global/Plugin MCP** (combined action parameter):
```
mcp__nixos__nix(  # or mcp__plugin_devenv_nixos__nix
  action="search",
  query="<search_term>",
  source="nixos",
  type="packages",
  channel="unstable",
  limit=10
)
```

### Version Search

For versioned package requests (e.g., `nodejs@20`):

**1mcp** — find specific version:
```
mcp__1mcp__nixos_1mcp_nixhub_find_version(
  package_name="nodejs",
  version="20"
)
```

**1mcp** — list all available versions:
```
mcp__1mcp__nixos_1mcp_nixhub_package_versions(
  package_name="nodejs",
  limit=20
)
```

**Plugin bundled MCP** — version lookup:
```
mcp__plugin_devenv_nixos__nix_versions(
  package="nodejs",
  version="20"
)
```

**Version resolution workflow:**
1. Try `nixhub_find_version` (or `nix_versions`) to find the exact version
2. Also search nixpkgs for variants like `nodejs_20`
3. Prefer the nixpkgs variant if it exists (simpler, no pinning needed)
4. Offer pinned commit hash from nixhub as alternative if no nixpkgs variant found

### Parameter Reference

| Tool | Parameter | Value | Description |
|------|-----------|-------|-------------|
| `1mcp_nixos_search` | query | string | Package name or search term |
| `1mcp_nixos_search` | search_type | "packages" | Search packages (not options) |
| `1mcp_nixos_search` | channel | "unstable" | Nixpkgs channel |
| `1mcp_nixos_search` | limit | number | Max results to return |
| `1mcp_nixhub_find_version` | package_name | string | Package to find version for |
| `1mcp_nixhub_find_version` | version | string | Desired version (e.g., "20") |
| `1mcp_nixhub_package_versions` | package_name | string | Package to list versions for |
| `1mcp_nixhub_package_versions` | limit | number | Max versions to return |
| `nixos__nix` / `plugin_devenv_nixos__nix` | action | "search" | Search for packages |
| `nixos__nix` / `plugin_devenv_nixos__nix` | query | string | Package name or search term |
| `nixos__nix` / `plugin_devenv_nixos__nix` | source | "nixos" | Use NixOS packages source |
| `nixos__nix` / `plugin_devenv_nixos__nix` | type | "packages" | Search packages (not options) |
| `nixos__nix` / `plugin_devenv_nixos__nix` | channel | "unstable" | Use nixos-unstable channel |
| `nixos__nix` / `plugin_devenv_nixos__nix` | limit | number | Max results to return |
| `plugin_devenv_nixos__nix_versions` | package | string | Package to find version for |
| `plugin_devenv_nixos__nix_versions` | version | string | Desired version (optional) |
| `plugin_devenv_nixos__nix_versions` | limit | number | Max versions to return (optional) |

### Fallback Behavior

If no MCP tool is available, the command falls back to:
```bash
nix-shell -p nix --run "nix search nixpkgs <package> --json"
```
