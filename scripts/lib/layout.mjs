import { join } from "node:path";
import { copyResourceTree } from "./fs-utils.mjs";

// Where each canonical resource lands inside a Claude-style plugin tree.
// Hook commands address files through this layout via ${CLAUDE_PLUGIN_ROOT},
// so every harness that ships hook scripts reuses it.
export function wrapperLayout(model) {
  return [
    ...model.skills.map(({ name, path }) => ({ kind: "skills", from: path, to: `skills/${name}` })),
    ...["commands", "agents"].flatMap((kind) =>
      model[kind].map(({ path }) => ({ kind, from: path, to: `${kind}/${path.split("/").at(-1)}` })),
    ),
    ...["hooks", "templates"].flatMap((kind) =>
      model[kind].map(({ path }) => ({
        kind,
        from: path,
        to: `${kind}/${stripLeadingGroup(path.slice(kind.length + 1), model.name)}`,
      })),
    ),
    ...model.extra.map(({ from, to }) => ({ kind: "extra", from, to })),
  ];
}

export async function copyLayout({ repoRoot, layout, to }) {
  for (const entry of layout) {
    const source = join(repoRoot, entry.from);
    await copyResourceTree({
      from: source,
      to: join(to, entry.to),
      // a skill's tests/ are dev-only; installs should not carry them
      filter: entry.kind === "skills" ? (src) => src !== join(source, "tests") : undefined,
    });
  }
}

// The shared hook runtime is code, not plugin content, so it always comes
// from this repo, even when generating from a fixture registry.
const SELF_ROOT = join(import.meta.dirname, "..", "..");

export async function copyRuntime({ files, to }) {
  for (const [from, dest] of Object.entries(files)) {
    await copyResourceTree({ from: join(SELF_ROOT, from), to: join(to, dest) });
  }
}

function stripLeadingGroup(path, group) {
  const prefix = `${group}/`;
  return path.startsWith(prefix) ? path.slice(prefix.length) : path;
}
