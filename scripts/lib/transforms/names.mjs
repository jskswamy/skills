import { basename } from "node:path";

// For harnesses whose command names are global: a name that another plugin,
// or the harness itself (reserved), also uses gets the plugin as a prefix.
export function commandNames(plugins, reserved = []) {
  const owners = new Map(reserved.map((name) => [name, [null]]));
  for (const plugin of plugins) {
    for (const command of plugin.resources?.commands ?? []) {
      const name = basename(command, ".md");
      owners.set(name, [...(owners.get(name) ?? []), plugin.name]);
    }
  }
  return (plugin, name) => (owners.get(name)?.length > 1 ? `${plugin}-${name}` : name);
}
