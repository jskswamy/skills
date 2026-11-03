# Shell Welcome Replacement

## Replacing SHELL_WELCOME_HERE

**Shell welcome replacement:** Replace `# SHELL_WELCOME_HERE` based on user's `shell_welcome` preference:

| Style | Replacement Content |
|-------|---------------------|
| `box` | `echo "╔══════════════════════════════════════╗"`<br>`echo "║            🔧 devenv                 ║"`<br>`echo "║     Development environment loaded   ║"`<br>`echo "╚══════════════════════════════════════╝"` |
| `minimal` | `echo ""`<br>`echo "  ▸ devenv ready"`<br>`echo ""` |
| `project` | `echo ""`<br>`echo "  ╭───────────────────────────────────╮"`<br>`echo "  │  📁 $(basename $PWD)"`<br>`echo "  │  Development environment loaded"`<br>`echo "  ╰───────────────────────────────────╯"`<br>`echo ""` |
| `tech` | `echo ""`<br>`echo "  [devenv] :: environment initialized"`<br>`echo "  └── packages loaded, hooks active"`<br>`echo ""` |
| `custom` | Parse `shell_welcome_custom` from settings, split by `\n`, wrap each line in `echo "..."` |
| `none` | `# No welcome message` (empty comment, no output) |

**For custom messages:**
1. Read `shell_welcome_custom` from `.claude/devenv.local.md`
2. Split by `\n` for multi-line support
3. Wrap each line in `echo "..."` statements
4. Escape special characters: `$` becomes `\$`, `"` becomes `\"`, `\` becomes `\\`
5. If empty, fall back to `box` style
