const PLUGIN_ROOT = /\$\{CLAUDE_PLUGIN_ROOT\}|\$CLAUDE_PLUGIN_ROOT\b/g;

// Hook commands locate their scripts through Claude's plugin-root token.
export function rewritePluginRoot(command, replacement) {
  return command.replace(PLUGIN_ROOT, replacement);
}

const PLUGIN_ROOT_PATH = /(?:\$\{CLAUDE_PLUGIN_ROOT\}|\$CLAUDE_PLUGIN_ROOT\b)\/([^\s"';|&]*)/g;

// The plugin-relative paths a hook command reaches through the token.
export function pluginRootPaths(command) {
  return [...command.matchAll(PLUGIN_ROOT_PATH)].map((match) => match[1]);
}

// For harnesses that run hooks from the canonical tree rather than a Claude
// wrapper: maps ${CLAUDE_PLUGIN_ROOT}/<wrapper path> through the wrapper
// layout ({ from: canonical path, to: wrapper path }) to <root>/<canonical path>.
export function canonicalPluginPaths(command, layout, root) {
  return command.replace(PLUGIN_ROOT_PATH, (_, rest) => {
    const entry = layout.find(({ to }) => rest === to || rest.startsWith(`${to}/`));
    if (!entry) throw new Error(`no canonical file for \${CLAUDE_PLUGIN_ROOT}/${rest}`);
    return `${root}/${entry.from}${rest.slice(entry.to.length)}`;
  });
}
