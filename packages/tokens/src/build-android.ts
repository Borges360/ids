// Gera dist/android/colors.xml a partir do catálogo resolvido (tema escuro).
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { emitAndroidColors } from "./export/platforms.ts";

const target = join(dirname(fileURLToPath(import.meta.url)), "../dist/android/colors.xml");
await mkdir(dirname(target), { recursive: true });
await writeFile(target, emitAndroidColors(), "utf8");
console.log(`android: ${target}`);
