import { mkdir, readFile, writeFile, realpath } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve, relative, isAbsolute } from "node:path";
import {
  generateKeyPairSync,
  createPrivateKey,
  createPublicKey,
} from "node:crypto";
import { pathToFileURL } from "node:url";
import {
  hash,
  safePath,
  validateSchema,
} from "../packages/contracts/src/index.ts";

/** Provisioning belongs to the trusted harness; only the public policy enters the source tree. */
export async function createTechnicalAuthority(cwd = process.cwd()) {
  const root = await realpath(cwd),
    authority = "ids-technical-evaluator-v1";
  const directory = join(
    homedir(),
    ".codex",
    "authorities",
    "ids-" + hash(root).slice(0, 16),
  );
  await mkdir(directory, { recursive: true });
  const keyFile = join(directory, "technical-evaluator-v1.pem");
  try {
    await readFile(keyFile);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    const { privateKey } = generateKeyPairSync("ed25519");
    try {
      await writeFile(
        keyFile,
        privateKey.export({ format: "pem", type: "pkcs8" }),
        { flag: "wx", mode: 0o600 },
      );
    } catch (race) {
      if (race.code !== "EEXIST") throw race;
    }
  }
  const rel = relative(root, await realpath(keyFile));
  if (
    rel !== ".." &&
    !rel.startsWith("../") &&
    !rel.startsWith("..\\") &&
    !isAbsolute(rel)
  )
    throw Error("Authority key must remain outside the candidate filesystem");
  const key = createPrivateKey(await readFile(keyFile));
  if (key.asymmetricKeyType !== "ed25519")
    throw Error("Unsupported authority identity");
  const publicPem = createPublicKey(key)
    .export({ format: "pem", type: "spki" })
    .toString();
  const policy = {
    schemaVersion: "1.0",
    authorities: { [authority]: publicPem },
  };
  if (!validateSchema("technical-authority-policy", policy).valid)
    throw Error("Invalid technical authority policy");
  await mkdir(safePath(root, ".inteiro"), { recursive: true });
  const path = safePath(root, ".inteiro/technical-attestors.json");
  try {
    await writeFile(path, JSON.stringify(policy, null, 2) + "\n", {
      flag: "wx",
    });
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    if (hash(JSON.parse(await readFile(path, "utf8"))) !== hash(policy))
      throw Error(
        "Existing protected authority policy differs; no key or policy was replaced",
      );
  }
  return {
    status: "passed",
    authority,
    keyFile,
    policyHash: hash(policy),
    publicPolicy: ".inteiro/technical-attestors.json",
  };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  try {
    const { keyFile: _, ...result } = await createTechnicalAuthority();
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.log(
      JSON.stringify({
        status: "error",
        kind: "technical-authority-provisioning",
        message: String(error),
      }),
    );
    process.exitCode = 8;
  }
}
