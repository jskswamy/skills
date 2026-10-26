import { loadPluginHooks } from "./hooks.mjs";

const QUOTED_ROOT = /["']\$\{?CLAUDE_PLUGIN_ROOT/;

// Every hook is required on every enabled harness. canCarry(entry) returns
// { ok }, { notApplicable: reason } or { unsupported: reason }. An unsupported
// hook is an error unless registry marks it optional for this harness.
export function applyHookPolicy({ entries, plugin, harness, canCarry }) {
  const optional = plugin.harnesses?.[harness]?.optional ?? {};
  const carried = [];
  const report = [];
  for (const entry of entries) {
    // Runtimes substitute an already quoted root ("${PI_PACKAGE_ROOT}"), so
    // quoting the token again would leave the path unquoted.
    if (QUOTED_ROOT.test(entry.command)) {
      report.push({ kind: "hooks", resource: entry.id, status: "error", reason: "leave ${CLAUDE_PLUGIN_ROOT} unquoted in hook commands" });
      continue;
    }
    const verdict = canCarry(entry);
    if (verdict.ok) {
      carried.push(entry);
    } else if (verdict.notApplicable) {
      report.push({ kind: "hooks", resource: entry.id, status: "not-applicable", reason: verdict.notApplicable });
    } else if (optional[entry.id]) {
      report.push({ kind: "hooks", resource: entry.id, status: "skipped", reason: `${verdict.unsupported}; optional: ${optional[entry.id]}` });
    } else {
      report.push({ kind: "hooks", resource: entry.id, status: "error", reason: verdict.unsupported });
    }
  }
  return { carried, report };
}

// The hook step every non-Claude adapter runs: load the plugin's hooks,
// apply the policy, and record what was not carried. prepare may expand an
// entry (for example to split a matcher) before the policy sees it.
export async function carryHooks({ repoRoot, model, harness, canCarry, report, prepare = (entry) => [entry] }) {
  const { carried, report: entries } = applyHookPolicy({
    entries: (await loadPluginHooks({ repoRoot, hooks: model.hooks })).flatMap(prepare),
    plugin: model,
    harness,
    canCarry,
  });
  for (const entry of entries) report.add(entry);
  return carried;
}

export async function validateOptionalHooks({ repoRoot, registry }) {
  const errors = [];
  for (const plugin of registry.plugins ?? []) {
    const ids = new Set(
      (await loadPluginHooks({ repoRoot, hooks: (plugin.resources?.hooks ?? []).map((entry) => ({ path: `hooks/${entry}` })) })).map(
        (entry) => entry.id,
      ),
    );
    for (const [harness, config] of Object.entries(plugin.harnesses ?? {})) {
      for (const [id, reason] of Object.entries(config?.optional ?? {})) {
        const label = `${plugin.name}.harnesses.${harness}.optional.${id}`;
        if (!ids.has(id)) errors.push(`${label}: no such hook`);
        else if (typeof reason !== "string" || reason.trim() === "") errors.push(`${label}: reason must be a non-empty string`);
      }
    }
  }
  return errors;
}
