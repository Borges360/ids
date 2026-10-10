import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";

export async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

export async function writeManaged(
  path: string,
  contents: string,
  opts: { dryRun: boolean; yes: boolean }
): Promise<"written" | "skipped" | "would-write" | "would-overwrite"> {
  const already = await exists(path);
  if (opts.dryRun) return already ? "would-overwrite" : "would-write";
  if (already && !opts.yes) {
    const current = await readFile(path, "utf8");
    if (current === contents) return "skipped";
    return "skipped";
  }
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents, "utf8");
  return "written";
}

export async function collectFiles(root: string, ext = [".css", ".scss", ".ts", ".tsx", ".js", ".jsx", ".vue", ".svelte", ".html", ".md"]): Promise<string[]> {
  const out: string[] = [];
  async function walk(dir: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".git") continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (ext.some((e) => entry.name.endsWith(e))) out.push(full);
    }
  }
  const info = await stat(root);
  if (info.isFile()) return [root];
  await walk(root);
  return out;
}

export { dirname, join, relative, resolve, readFile };
