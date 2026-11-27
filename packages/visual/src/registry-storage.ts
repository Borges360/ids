import {
  mkdir,
  readFile,
  writeFile,
  rename,
  unlink,
  rmdir,
} from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { setTimeout as wait } from "node:timers/promises";
import { safePath, hash } from "@inteiro/contracts";
import type { Baseline } from "./baseline.ts";

export async function withBaselineRegistryLock<T>(
  root: string,
  dir: string,
  operation: () => Promise<T>,
): Promise<T> {
  const target = safePath(root, dir);
  if (target === resolve(root))
    throw Error("Baseline storage must use a dedicated subdirectory");
  await mkdir(target, { recursive: true });
  const lock = safePath(root, dir + "/.registry.lock");
  try {
    await mkdir(lock);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST")
      throw Error("Baseline registry is locked by another operation");
    throw error;
  }
  try {
    return await operation();
  } finally {
    await rmdir(lock);
  }
}

/** Preserves the exact prior ledger before an atomic replacement. */
export async function writeBaselineRegistry(
  root: string,
  dir: string,
  entries: Baseline[],
) {
  const target = safePath(root, dir + "/registry.json");
  let previous: Buffer | undefined;
  try {
    previous = await readFile(target);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  if (previous) {
    await mkdir(safePath(root, dir + "/history"), { recursive: true });
    const history = safePath(
      root,
      dir + "/history/registry-" + hash(previous) + ".json",
    );
    try {
      await writeFile(history, previous, { flag: "wx" });
    } catch (error) {
      if (
        (error as NodeJS.ErrnoException).code !== "EEXIST" ||
        hash(await readFile(history)) !== hash(previous)
      )
        throw error;
    }
  }
  const temporary = safePath(root, dir + "/registry-" + randomUUID() + ".tmp");
  try {
    await writeFile(temporary, JSON.stringify(entries, null, 2), {
      flag: "wx",
    });
    for (let attempt = 0; ; attempt++) {
      try {
        await rename(temporary, target);
        break;
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (
          process.platform !== "win32" ||
          attempt >= 2 ||
          !["EPERM", "EACCES", "EBUSY"].includes(code ?? "")
        )
          throw error;
        await wait(1000 * 2 ** attempt);
      }
    }
  } finally {
    await unlink(temporary).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
  }
}
