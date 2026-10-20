import { readFile, writeFile, mkdir, access, copyFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { createHash, createPublicKey } from "node:crypto";
import {
  safeRead,
  safePath,
  hash,
  validateSchema,
  redact,
} from "@inteiro/contracts";
export interface BootstrapOptions {
  distributionManifest: string;
  dependencyLock: string;
  harness: "pi" | "codex";
  npmCli?: string;
  npmCache?: string;
}
export interface PublicValidation {
  schemaVersion: "1.0";
  kind: "public-worker-validation";
  caseId: string;
  patternIds: string[];
  routes: { path: string; sha256: string };
  fixtures: { id: string; path: string; sha256: string }[];
  reviewPolicy?: { path: string; sha256: string };
}
export interface BootstrapPlan {
  manifestPath: string;
  manifestHash: string;
  sourceCommit: string;
  sourceHash: string;
  packages: {
    name: string;
    version: string;
    filename: string;
    integrity: string;
  }[];
  lock: Record<string, any>;
  lockHash: string;
  validation: PublicValidation;
  validationHash: string;
  publicFiles: { path: string; bytes: Buffer }[];
  options: BootstrapOptions;
}
const packageNames = [
  "tokens",
  "contracts",
  "composition",
  "agent-core",
  "lint",
  "evaluation",
  "visual",
  "cli",
  "mcp",
  "design-system",
  "react",
].map((name) => "@inteiro/" + name);
const publicPath = (path: string) =>
  path.startsWith("benchmarks/validation/") &&
  !path
    .split("/")
    .some(
      (part) => !part || part === "." || part === ".." || part.startsWith("."),
    ) &&
  !path.includes("\\");
export async function planWorkerBootstrap(
  root: string,
  caseId: string,
  validationRef: { path: string; sha256: string } | undefined,
  options: BootstrapOptions,
): Promise<BootstrapPlan> {
  if (!["pi", "codex"].includes(options.harness))
    throw Error("Worker bootstrap requires pi or codex harness");
  if (!validationRef || !publicPath(validationRef.path))
    throw Error(
      "A versioned public validation manifest is required before worker bootstrap",
    );
  const validationBytes = Buffer.from(await safeRead(root, validationRef.path)),
    validation: PublicValidation = JSON.parse(validationBytes.toString());
  if (
    hash(validationBytes) !== validationRef.sha256 ||
    !validateSchema("worker-validation", validation).valid ||
    validation.caseId !== caseId
  )
    throw Error("Invalid public worker validation snapshot");
  const publicFiles: { path: string; bytes: Buffer }[] = [];
  const readPublic = async (
    ref: { path: string; sha256: string },
    target: string,
  ) => {
    if (!publicPath(ref.path))
      throw Error("Public validation cannot read evaluator-owned criteria");
    const bytes = Buffer.from(await safeRead(root, ref.path));
    if (hash(bytes) !== ref.sha256)
      throw Error("Public validation resource changed");
    publicFiles.push({ path: target, bytes });
  };
  await readPublic(validation.routes, "inteiro.routes.json");
  if (validation.reviewPolicy) {
    await readPublic(validation.reviewPolicy, ".inteiro/reviewers.json");
    const policy = JSON.parse(publicFiles.at(-1)!.bytes.toString());
    if (
      !policy ||
      typeof policy !== "object" ||
      Object.keys(policy).some(
        (key) => !["schemaVersion", "reviewers"].includes(key),
      ) ||
      !policy.reviewers ||
      typeof policy.reviewers !== "object" ||
      Array.isArray(policy.reviewers) ||
      !Object.keys(policy.reviewers).length
    )
      throw Error("Invalid public reviewer policy");
    for (const value of Object.values(policy.reviewers))
      if (
        typeof value !== "string" ||
        !value.startsWith("-----BEGIN PUBLIC KEY-----") ||
        createPublicKey(value).asymmetricKeyType !== "ed25519"
      )
        throw Error("Reviewer policy must contain Ed25519 public keys only");
  }
  const ids = new Set<string>();
  for (const fixture of validation.fixtures) {
    if (ids.has(fixture.id)) throw Error("Duplicate public fixture ID");
    ids.add(fixture.id);
    await readPublic(fixture, ".inteiro/fixtures/" + fixture.id + ".json");
    const data = JSON.parse(publicFiles.at(-1)!.bytes.toString());
    if (
      data.classification !== "synthetic" ||
      !Number.isFinite(Date.parse(data.clock)) ||
      (data.seed !== undefined &&
        (!Number.isInteger(data.seed) ||
          data.seed < 0 ||
          data.seed > 0xffffffff))
    )
      throw Error("Invalid synthetic public fixture clock or random seed");
  }
  const manifestBytes = Buffer.from(
      await safeRead(root, options.distributionManifest),
    ),
    manifest = JSON.parse(manifestBytes.toString());
  if (
    manifest.schemaVersion !== "1.0" ||
    !/^[a-f0-9]{40}$/.test(manifest.sourceCommit ?? "") ||
    !/^[a-f0-9]{64}$/.test(manifest.sourceHash ?? "") ||
    !Array.isArray(manifest.packages) ||
    manifest.packages.length !== packageNames.length ||
    new Set(manifest.packages.map((pkg: any) => pkg.name)).size !==
      packageNames.length
  )
    throw Error(
      "Bootstrap requires a pinned package manifest with source commit",
    );
  for (const pkg of manifest.packages) {
    if (
      !packageNames.includes(pkg.name) ||
      pkg.version !== "1.2.0" ||
      !/^[a-zA-Z0-9][a-zA-Z0-9._-]*\.tgz$/.test(pkg.filename) ||
      typeof pkg.integrity !== "string"
    )
      throw Error("Invalid worker distribution entry");
    const archive = safePath(
      root,
      join(dirname(options.distributionManifest), "tarballs", pkg.filename),
    );
    const bytes = await readFile(archive);
    if (
      pkg.integrity !==
      "sha512-" + createHash("sha512").update(bytes).digest("base64")
    )
      throw Error("Worker distribution archive integrity mismatch");
  }
  const lockBytes = Buffer.from(await safeRead(root, options.dependencyLock)),
    lock = JSON.parse(lockBytes.toString());
  if (lock.lockfileVersion !== 3 || !lock.packages?.[""]?.dependencies)
    throw Error("Worker bootstrap requires a version 3 dependency lock");
  for (const [path, pkg] of Object.entries(lock.packages) as [string, any][]) {
    if (!path) continue;
    if (
      !path.startsWith("node_modules/") ||
      path.split("/").includes("..") ||
      pkg.link ||
      typeof pkg.version !== "string" ||
      typeof pkg.integrity !== "string" ||
      !/^sha512-[A-Za-z0-9+/]+=*$/.test(pkg.integrity)
    )
      throw Error("Unsupported or unpinned dependency lock entry");
    const own = manifest.packages.find(
      (entry: any) => path === "node_modules/" + entry.name,
    );
    if (own) {
      if (pkg.version !== own.version || pkg.integrity !== own.integrity)
        throw Error("Dependency lock differs from package distribution");
      pkg.resolved = "file:.inteiro/packages/" + own.filename;
      lock.packages[""].dependencies[own.name] =
        "file:.inteiro/packages/" + own.filename;
    } else if (
      typeof pkg.resolved !== "string" ||
      !pkg.resolved.startsWith("https://registry.npmjs.org/")
    )
      throw Error("Dependency lock uses an unauthorized source");
  }
  for (const name of packageNames)
    if (!lock.packages["node_modules/" + name])
      throw Error("Dependency lock omits an INTEIRO package");
  return {
    manifestPath: options.distributionManifest,
    manifestHash: hash(manifestBytes),
    sourceCommit: manifest.sourceCommit,
    sourceHash: manifest.sourceHash,
    packages: manifest.packages,
    lock,
    lockHash: hash(lockBytes),
    validation,
    validationHash: validationRef.sha256,
    publicFiles,
    options,
  };
}
async function npmPath(explicit?: string) {
  const candidates = [
    explicit,
    process.env.npm_execpath,
    join(dirname(process.execPath), "node_modules/npm/bin/npm-cli.js"),
    join(dirname(process.execPath), "../lib/node_modules/npm/bin/npm-cli.js"),
  ].filter((path): path is string => !!path);
  for (const path of candidates)
    try {
      await access(path);
      return path;
    } catch {}
  throw Error("npm CLI unavailable; provide --npm-cli");
}
function node(root: string, args: string[], timeout = 60000) {
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: "utf8",
    timeout,
    maxBuffer: 2 * 1024 * 1024,
    windowsHide: true,
  });
  if (result.status !== 0 || result.error)
    throw Error(
      "Trusted bootstrap command failed: " +
        redact(
          (
            result.stderr ||
            result.stdout ||
            (result.error ? String(result.error) : "exitCode=" + result.status)
          ).slice(-12000),
        ),
    );
  return result.stdout;
}
const verifyScript = `import {readFile} from 'node:fs/promises';import {resolveConfig,safeRead,safePath,hash} from '@inteiro/contracts';import {validateRoutes,validateResponseFixtures} from '@inteiro/visual';const root=process.cwd();const {config}=await resolveConfig(root);const manifest=JSON.parse(await safeRead(root,config.browser.routesFile));const errors=validateRoutes(manifest.routes,config);if(errors.length)throw Error('Incomplete worker visual contract');const seen=new Set();for(const route of manifest.routes){for(const state of route.states){if(seen.has(route.id+':'+state.id))throw Error('Duplicate visual state');seen.add(route.id+':'+state.id);const fixture=JSON.parse(await safeRead(root,'.inteiro/fixtures/'+(state.fixture??route.fixture)+'.json'));if(fixture.classification!=='synthetic'||!Number.isFinite(Date.parse(fixture.clock))||validateResponseFixtures(fixture.responses??[],config.browser.baseURL).length)throw Error('Invalid synthetic visual fixture');}}for(const asset of config.browser.fontAssets)if(hash(await readFile(safePath(root,asset.path)))!==asset.sha256)throw Error('Worker font asset differs from contract');console.log(JSON.stringify({status:'passed',routes:manifest.routes.length,states:seen.size,configHash:hash(config)}));`;
export async function executeWorkerBootstrap(
  root: string,
  datasetRoot: string,
  task: { id: string; description: string; editableFiles: string[] },
  plan: BootstrapPlan,
) {
  await mkdir(safePath(root, ".inteiro/packages"), { recursive: true });
  for (const pkg of plan.packages) {
    const target = safePath(root, ".inteiro/packages/" + pkg.filename);
    await copyFile(
      safePath(
        datasetRoot,
        join(dirname(plan.manifestPath), "tarballs", pkg.filename),
      ),
      target,
    );
    if (
      pkg.integrity !==
      "sha512-" +
        createHash("sha512")
          .update(await readFile(target))
          .digest("base64")
    )
      throw Error("Distribution changed after bootstrap planning");
  }
  const dependencies = plan.lock.packages[""].dependencies;
  plan.lock.name = "inteiro-benchmark-worker";
  plan.lock.version = "1.0.0";
  plan.lock.packages[""].name = plan.lock.name;
  plan.lock.packages[""].version = plan.lock.version;
  await writeFile(
    safePath(root, "package.json"),
    JSON.stringify(
      {
        name: plan.lock.name,
        version: plan.lock.version,
        private: true,
        type: "module",
        dependencies,
      },
      null,
      2,
    ),
  );
  await writeFile(
    safePath(root, "package-lock.json"),
    JSON.stringify(plan.lock, null, 2),
  );
  await writeFile(safePath(root, ".inteiro/npmrc"), "");
  await writeFile(safePath(root, ".inteiro/global-npmrc"), "");
  node(
    root,
    [
      await npmPath(plan.options.npmCli),
      "ci",
      "--offline",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--userconfig",
      safePath(root, ".inteiro/npmrc"),
      "--globalconfig",
      safePath(root, ".inteiro/global-npmrc"),
      ...(plan.options.npmCache ? ["--cache", plan.options.npmCache] : []),
    ],
    120000,
  );
  const installed = JSON.parse(await safeRead(root, "package-lock.json"));
  for (const pkg of plan.packages)
    if (
      installed.packages?.["node_modules/" + pkg.name]?.integrity !==
      pkg.integrity
    )
      throw Error("Installed package differs from pinned distribution");
  const config = JSON.parse(await safeRead(root, "inteiro.config.json"));
  config.context = { ...(config.context ?? {}), harness: plan.options.harness };
  await writeFile(
    safePath(root, "inteiro.config.json"),
    JSON.stringify(config, null, 2),
  );
  for (const file of plan.publicFiles) {
    await mkdir(dirname(safePath(root, file.path)), { recursive: true });
    await writeFile(safePath(root, file.path), file.bytes);
  }
  const cli = safePath(root, "node_modules/@inteiro/cli/runtime/cli.js");
  const call = (...args: string[]) =>
    JSON.parse(node(root, [cli, ...args, "--cwd", root, "--json"]));
  call("agents", "install", plan.options.harness, "--yes");
  const manifest = {
    schemaVersion: "1.0",
    id: task.id,
    type: "new-page",
    description: task.description,
    patternIds: plan.validation.patternIds,
    scope: { allowedFiles: task.editableFiles },
    reviewRequired: true,
    acceptanceCriteria: [
      "Functional requirement from TASK.md and independent grading pass",
      "Complete INTEIRO static/browser/review gates",
    ],
    contractRefs: [
      {
        path: "inteiro.routes.json",
        sha256: hash(await readFile(safePath(root, "inteiro.routes.json"))),
      },
    ],
  };
  await writeFile(
    safePath(root, ".inteiro/task.json"),
    JSON.stringify(manifest, null, 2),
  );
  const recorded = call("context", "resolve", "--record");
  if (recorded.status !== "passed")
    throw Error("Task context bootstrap did not pass");
  if (
    call("context", "verify", "--harness", plan.options.harness).status !==
      "passed" ||
    call("context", "verify", "--task-context").status !== "passed"
  )
    throw Error("Worker context verification did not pass");
  await writeFile(
    safePath(root, ".inteiro/verify-bootstrap.mjs"),
    verifyScript,
  );
  const validation = JSON.parse(
    node(root, [safePath(root, ".inteiro/verify-bootstrap.mjs")]),
  );
  if (validation.status !== "passed")
    throw Error("Visual prerequisites are incomplete");
  return {
    schemaVersion: "1.0" as const,
    kind: "offline-worker-bootstrap" as const,
    sourceCommit: plan.sourceCommit,
    sourceHash: plan.sourceHash,
    distributionHash: plan.manifestHash,
    dependencyLockHash: hash(
      await readFile(safePath(root, "package-lock.json")),
    ),
    sourceLockHash: plan.lockHash,
    validationHash: plan.validationHash,
    harness: plan.options.harness,
    contextBundleId: recorded.manifest.contextBundleId,
    configHash: validation.configHash,
    routes: validation.routes,
    states: validation.states,
    offline: true as const,
    lifecycleScripts: false as const,
    readyForValidation: true as const,
    approval: "not-created" as const,
  };
}
