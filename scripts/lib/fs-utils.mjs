import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export async function removeDir(path) {
  await rm(path, { recursive: true, force: true });
}

export async function ensureDir(path) {
  await mkdir(path, { recursive: true });
}

export async function copyResourceTree({ from, to }) {
  await ensureDir(dirname(to));
  await cp(from, to, { recursive: true, force: true, preserveTimestamps: true });
}

export async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

export async function writeJson(path, value) {
  await ensureDir(dirname(path));
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}
