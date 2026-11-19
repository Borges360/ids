import {
  mkdir,
  readFile,
  writeFile,
  readdir,
  realpath,
  lstat,
  chmod,
  rm,
} from "node:fs/promises";
import {
  dirname,
  basename,
  join,
  resolve,
  relative,
  sep,
  isAbsolute,
} from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  hash,
  safePath,
  safeRead,
  validateSchema,
  resolveConfig,
  redact,
  DEFAULTS,
} from "@inteiro/contracts";
import {
  planWorkerBootstrap,
  executeWorkerBootstrap,
  readPublicWorkerValidation,
  type BootstrapOptions,
} from "./worker-bootstrap.ts";
export type { BootstrapOptions, PublicValidation } from "./worker-bootstrap.ts";

export const WORKER_IMAGE =
  "node:24-bookworm-slim@sha256:a5f4366e834695d5f363b920c104953a535d3a9864d1bdf74566a0ebe01daee5";
export const WORKER_SOURCE_BYTES = 128 * 1024;
interface WorkerTask {
  id: string;
  initialImplementation: string;
  initialFiles: string[];
  instructions: string;
  functionalRequirement: string;
  contract: string;
  fixtures: string[];
  grading: { path: string; sha256: string };
  maxRepairAttempts: number;
  validation?: { path: string; sha256: string };
}
export interface WorkerReceipt {
  schemaVersion: "1.0";
  kind: "prepared-benchmark-worker";
  id: string;
  caseId: string;
  root: string;
  initialCommit: string;
  gradingHash: string;
  datasetHash: string;
  protectedFiles: { path: string; sha256: string }[];
  editableFiles: string[];
  budget: { maxChangedFiles: number; maxDiffLines: number };
  image: string;
  readyForValidation: boolean;
  bootstrap?: Awaited<ReturnType<typeof executeWorkerBootstrap>>;
  operationalDirectories?: string[];
  hash: string;
}
const receiptPattern =
  /^worker-[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const within = (parent: string, child: string) => {
  const path = relative(parent, child);
  return (
    path === "" ||
    (!isAbsolute(path) && path !== ".." && !path.startsWith(".." + sep))
  );
};
async function files(
  root: string,
  directory = "",
  operationalDirectories: string[] = [],
): Promise<string[]> {
  const result: string[] = [];
  for (const item of await readdir(safePath(root, directory || "."), {
    withFileTypes: true,
  })) {
    const path = directory ? directory + "/" + item.name : item.name;
    if (
      path === ".git" ||
      path === "node_modules" ||
      path === ".inteiro/reports" ||
      operationalDirectories.includes(path)
    )
      continue;
    if (item.isSymbolicLink())
      throw Error("Symlinks are not permitted in prepared workspaces");
    if (item.isDirectory())
      result.push(...(await files(root, path, operationalDirectories)));
    else if (item.isFile()) result.push(path);
    else throw Error("Only regular workspace files are permitted");
  }
  return result.sort();
}
function operationalPaths(
  root: string,
  baseline: string,
  editableFiles: string[],
) {
  const paths = [
    ".inteiro/reviews",
    relative(root, safePath(root, baseline)).replaceAll("\\", "/"),
  ];
  const controls = [
    ...editableFiles,
    "inteiro.config.json",
    "package.json",
    "package-lock.json",
    "AGENTS.md",
    ".git",
    ".inteiro/task.json",
    ".inteiro/worker.json",
    ".inteiro/reviewers.json",
    ".inteiro/bootstrap.json",
    "node_modules",
  ];
  for (const path of paths)
    if (
      !path ||
      path === "." ||
      controls.some(
        (file) =>
          within(safePath(root, path), safePath(root, file)) ||
          within(safePath(root, file), safePath(root, path)),
      )
    )
      throw Error(
        "Operational output directory overlaps worker source or controls",
      );
  return paths;
}
function git(root: string, ...args: string[]) {
  return execFileSync(
    "git",
    ["-c", "core.hooksPath=.inteiro/empty-hooks", ...args],
    {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 4 * 1024 * 1024,
    },
  ).trim();
}
async function loadReceipt(datasetRoot: string, id: string) {
  if (!receiptPattern.test(id)) throw Error("Invalid worker receipt ID");
  const receipt: WorkerReceipt = JSON.parse(
    await safeRead(datasetRoot, ".inteiro/reports/workers/" + id + ".json"),
  );
  const { hash: expected, ...payload } = receipt;
  if (
    receipt.schemaVersion !== "1.0" ||
    receipt.kind !== "prepared-benchmark-worker" ||
    receipt.id !== id ||
    hash(payload) !== expected ||
    receipt.image !== WORKER_IMAGE ||
    typeof receipt.readyForValidation !== "boolean" ||
    (receipt.readyForValidation &&
      (!receipt.bootstrap ||
        receipt.bootstrap.kind !== "offline-worker-bootstrap" ||
        receipt.bootstrap.readyForValidation !== true ||
        !/^[a-f0-9]{40}$/.test(receipt.bootstrap.sourceCommit))) ||
    !Array.isArray(receipt.editableFiles) ||
    !Array.isArray(receipt.protectedFiles)
  )
    throw Error("Invalid evaluator-owned worker receipt");
  if (
    receipt.operationalDirectories !== undefined &&
    (!Array.isArray(receipt.operationalDirectories) ||
      receipt.operationalDirectories.some((path) => typeof path !== "string"))
  )
    throw Error("Invalid worker operational directories");
  return receipt;
}
/** Reads evaluator-owned authority, never a receipt supplied by the candidate. */
export async function readBenchmarkWorkerReceipt(
  datasetRoot: string,
  id: string,
) {
  const receipt = await loadReceipt(datasetRoot, id);
  const actual = await realpath(receipt.root);
  if (
    actual !== receipt.root ||
    (await realpath(git(actual, "rev-parse", "--show-toplevel"))) !== actual
  )
    throw Error("Worker root identity changed");
  return receipt;
}
/** Materializes task inputs; optional trusted offline bootstrap completes validator prerequisites. */
export async function prepareBenchmarkWorker(
  datasetRoot: string,
  target: string,
  caseId: string,
  options: { dryRun?: boolean; bootstrap?: BootstrapOptions } = {},
) {
  const root = await realpath(datasetRoot);
  const datasets = await Promise.all(
    ["benchmarks/tasks.public.json", "benchmarks/tasks.heldout.json"].map(
      async (path) => ({ path, bytes: await readFile(safePath(root, path)) }),
    ),
  );
  const matches = datasets
    .flatMap(
      (dataset) => JSON.parse(dataset.bytes.toString()).tasks as WorkerTask[],
    )
    .filter((task) => task.id === caseId);
  if (matches.length !== 1) throw Error("Unknown or ambiguous benchmark task");
  const task = matches[0]!;
  if (
    !task.grading ||
    !Array.isArray(task.initialFiles) ||
    !task.initialFiles.length ||
    !task.initialFiles.includes(task.initialImplementation) ||
    !task.instructions ||
    !Array.isArray(task.fixtures)
  )
    throw Error(
      "Task has no migrated source/fixture/independent criteria contract",
    );
  const gradingBytes = await readFile(safePath(root, task.grading.path));
  const criteria = JSON.parse(gradingBytes.toString());
  if (
    hash(gradingBytes) !== task.grading.sha256 ||
    !validateSchema("task-grading", criteria).valid ||
    criteria.caseId !== task.id
  )
    throw Error("Task grading snapshot mismatch");
  const prefix = "benchmarks/workers/" + caseId + "/src/";
  const inputs: { path: string; bytes: Buffer }[] = [];
  for (const path of task.initialFiles) {
    if (
      typeof path !== "string" ||
      !path.startsWith(prefix) ||
      path
        .slice(prefix.length)
        .split("/")
        .some(
          (part) =>
            !part || part === "." || part === ".." || part.startsWith("."),
        )
    )
      throw Error("Initial source escapes its worker source root");
    const absolute = safePath(root, path);
    if (!(await lstat(absolute)).isFile())
      throw Error("Initial source must be a regular file");
    if ((await lstat(absolute)).size > WORKER_SOURCE_BYTES)
      throw Error("Initial source byte budget exceeded");
    inputs.push({
      path: "src/" + path.slice(prefix.length),
      bytes: await readFile(absolute),
    });
  }
  if (new Set(inputs.map((input) => input.path)).size !== inputs.length)
    throw Error("Duplicate worker source path");
  if (
    inputs.reduce((total, input) => total + input.bytes.length, 0) >
    WORKER_SOURCE_BYTES
  )
    throw Error("Initial source byte budget exceeded");
  inputs.push({
    path: "TASK.md",
    bytes: Buffer.from(await safeRead(root, task.instructions)),
  });
  const configBytes = Buffer.from(await safeRead(root, task.contract));
  JSON.parse(configBytes.toString());
  inputs.push({ path: "inteiro.config.json", bytes: configBytes });
  inputs.push({
    path: ".inteiro/serve.mjs",
    bytes: Buffer.from(await safeRead(root, "benchmarks/contract/serve.mjs")),
  });
  for (const [index, path] of task.fixtures.entries()) {
    const bytes = await readFile(safePath(root, path));
    if (!validateSchema("task-fixture", JSON.parse(bytes.toString())).valid)
      throw Error("Invalid public worker fixture");
    inputs.push({ path: `fixtures/input-${index + 1}.json`, bytes });
  }
  if (
    !task.fixtures.includes(criteria.fixture.path) ||
    hash(await readFile(safePath(root, criteria.fixture.path))) !==
      criteria.fixture.sha256
  )
    throw Error("Worker fixture is not bound to its grading snapshot");
  if (task.validation) {
    const publicValidation = await readPublicWorkerValidation(
      root,
      caseId,
      task.validation,
    );
    inputs.push(...publicValidation.publicFiles);
    inputs.push({
      path: ".inteiro/public-validation.json",
      bytes: Buffer.from(
        JSON.stringify({
          kind: "public-validation-provenance",
          caseId,
          manifestHash: publicValidation.validationHash,
          resources: publicValidation.publicFiles.map((file) => ({
            path: file.path,
            sha256: hash(file.bytes),
          })),
        }),
      ),
    });
  }
  const bootstrapPlan = options.bootstrap
    ? await planWorkerBootstrap(
        root,
        caseId,
        task.validation,
        options.bootstrap,
      )
    : undefined;
  const requested = resolve(root, target),
    parent = await realpath(dirname(requested)),
    destination = join(parent, basename(requested));
  if (
    bootstrapPlan &&
    JSON.parse(configBytes.toString()).governance?.mode ===
      "technical-autonomous" &&
    (!bootstrapPlan.validation.technicalPolicy ||
      !bootstrapPlan.validation.governanceContractHash)
  )
    throw Error(
      "Autonomous bootstrap requires the public authority and mandatory gate contract",
    );
  if (
    within(destination, root) ||
    (within(root, destination) && !within(join(root, "artifacts"), destination))
  )
    throw Error(
      "Worker target must be outside evaluator sources or under artifacts",
    );
  try {
    await lstat(destination);
    throw Error("Worker target already exists");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const editableFiles = inputs
    .filter((input) => input.path.startsWith("src/"))
    .map((input) => input.path);
  const operationalDirectories = operationalPaths(
    destination,
    JSON.parse(configBytes.toString()).visual?.baselineDir ??
      DEFAULTS.visual.baselineDir,
    editableFiles,
  );
  if (options.dryRun)
    return {
      status: "not_run" as const,
      caseId,
      root: destination,
      editableFiles,
      readyForValidation: false as const,
      bootstrapPlanned: !!bootstrapPlan,
    };
  const id = "worker-" + randomUUID();
  await mkdir(destination);
  try {
    for (const input of inputs) {
      const target = safePath(destination, input.path);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, input.bytes);
    }
    for (const directory of [".inteiro/empty-hooks"])
      await mkdir(safePath(destination, directory), { recursive: true });
    await writeFile(
      join(destination, ".gitignore"),
      "node_modules/\n.inteiro/reports/\n.inteiro/packages/\n",
    );
    await writeFile(join(destination, ".gitattributes"), "* text eol=lf\n");
    await writeFile(
      join(destination, "package.json"),
      JSON.stringify(
        {
          name: "inteiro-benchmark-worker",
          private: true,
          type: "module",
          dependencies: {
            "@inteiro/cli": "1.3.0",
            "@inteiro/evaluation": "1.3.0",
            "@inteiro/composition": "1.3.0",
          },
        },
        null,
        2,
      ),
    );
    await writeFile(
      join(destination, ".inteiro/worker.json"),
      JSON.stringify(
        {
          schemaVersion: "1.0",
          id,
          caseId,
          editableFiles,
          dependencies: "not-installed",
          harness: "not-initialized",
          readyForValidation: false,
        },
        null,
        2,
      ),
    );
    // A non-root container user can edit these copies; controls remain on a read-only mount.
    const directories = new Set([
      join(destination, "src"),
      ...editableFiles.map((path) => dirname(safePath(destination, path))),
    ]);
    for (const directory of directories) await chmod(directory, 0o777);
    for (const path of editableFiles)
      await chmod(safePath(destination, path), 0o666);
    const initialResolvedConfig = structuredClone(
      (await resolveConfig(destination)).config,
    );
    const bootstrap = bootstrapPlan
      ? await executeWorkerBootstrap(
          destination,
          root,
          {
            id: caseId,
            description: task.functionalRequirement,
            editableFiles,
          },
          bootstrapPlan,
        )
      : undefined;
    for (const input of inputs.filter(
      (input) => input.path !== "inteiro.config.json",
    ))
      if (
        hash(await readFile(safePath(destination, input.path))) !==
        hash(input.bytes)
      )
        throw Error("Bootstrap changed initial task source");
    const actualConfig = structuredClone(
      (await resolveConfig(destination)).config,
    );
    actualConfig.context.harness = initialResolvedConfig.context.harness;
    if (hash(actualConfig) !== hash(initialResolvedConfig))
      throw Error("Bootstrap changed task constraints");
    if (bootstrap) {
      await writeFile(
        safePath(destination, ".inteiro/bootstrap.json"),
        JSON.stringify(bootstrap, null, 2),
      );
      await writeFile(
        safePath(destination, ".inteiro/worker.json"),
        JSON.stringify(
          {
            schemaVersion: "1.0",
            id,
            caseId,
            editableFiles,
            dependencies: "installed-offline",
            harness: bootstrap.harness,
            readyForValidation: true,
            validationStatus: "not_run",
          },
          null,
          2,
        ),
      );
    }
    git(destination, "init");
    git(destination, "config", "core.autocrlf", "false");
    git(destination, "add", ".");
    git(
      destination,
      "-c",
      "user.name=Benchmark initializer",
      "-c",
      "user.email=benchmark@example.invalid",
      "-c",
      "commit.gpgsign=false",
      "commit",
      "-m",
      "Prepared benchmark inputs; no model execution or product approval",
    );
    const protectedPaths = (
      await files(destination, "", operationalDirectories)
    ).filter((path) => !editableFiles.includes(path));
    protectedPaths.push(".git/config", ".git/HEAD");
    const { config } = await resolveConfig(destination);
    const payload = {
      schemaVersion: "1.0" as const,
      kind: "prepared-benchmark-worker" as const,
      id,
      caseId,
      root: destination,
      initialCommit: git(destination, "rev-parse", "HEAD"),
      gradingHash: task.grading.sha256,
      datasetHash: hash(
        datasets.map((dataset) => ({
          path: dataset.path,
          sha256: hash(dataset.bytes),
        })),
      ),
      protectedFiles: await Promise.all(
        protectedPaths.map(async (path) => ({
          path,
          sha256: hash(await readFile(safePath(destination, path))),
        })),
      ),
      editableFiles,
      budget: {
        maxChangedFiles: Math.min(8, config.repair.maxChangedFiles),
        maxDiffLines: Math.min(450, config.repair.maxDiffLines),
      },
      image: WORKER_IMAGE,
      operationalDirectories,
      readyForValidation: !!bootstrap,
      ...(bootstrap ? { bootstrap } : {}),
    };
    const receipt: WorkerReceipt = { ...payload, hash: hash(payload) };
    const registry = safePath(root, ".inteiro/reports/workers");
    await mkdir(registry, { recursive: true });
    await writeFile(
      join(registry, id + ".json"),
      JSON.stringify(receipt, null, 2),
      { flag: "wx" },
    );
    return { status: "passed" as const, ...receipt };
  } catch (error) {
    const actual = await realpath(destination);
    if (actual !== destination || (await realpath(dirname(actual))) !== parent)
      throw Error("Cannot clean a worker root whose identity changed");
    await rm(actual, { recursive: true, force: true });
    throw error;
  }
}
export async function auditBenchmarkWorker(datasetRoot: string, id: string) {
  const receipt = await loadReceipt(datasetRoot, id),
    findings: string[] = [];
  const actual = await realpath(receipt.root);
  if (
    actual !== receipt.root ||
    (await realpath(git(actual, "rev-parse", "--show-toplevel"))) !== actual
  )
    throw Error("Worker root identity changed");
  const inventory = await files(
      actual,
      "",
      receipt.operationalDirectories ?? [],
    ),
    expected = new Set([
      ...receipt.editableFiles,
      ...receipt.protectedFiles.map((file) => file.path),
    ]);
  for (const file of inventory)
    if (!expected.has(file)) findings.push("unexpected-file:" + file);
  let sourceBytes = 0;
  for (const file of receipt.editableFiles) {
    if (inventory.includes(file))
      sourceBytes += (await lstat(safePath(actual, file))).size;
  }
  const oversized = sourceBytes > WORKER_SOURCE_BYTES;
  if (oversized) findings.push("source-byte-budget-exceeded");
  for (const file of receipt.protectedFiles) {
    try {
      if (hash(await readFile(safePath(actual, file.path))) !== file.sha256)
        findings.push("protected-file-changed:" + file.path);
    } catch {
      findings.push("protected-file-missing:" + file.path);
    }
  }
  for (const file of receipt.editableFiles)
    if (!inventory.includes(file)) findings.push("source-file-missing:" + file);
  if (git(actual, "rev-parse", "HEAD") !== receipt.initialCommit)
    findings.push("initial-commit-changed");
  const stats = (
    oversized
      ? ""
      : git(
          actual,
          "diff",
          "--no-ext-diff",
          "--no-textconv",
          "--numstat",
          "HEAD",
          "--",
          "src",
        )
  )
    .split(/\r?\n/)
    .filter(Boolean);
  let lines = 0;
  for (const row of stats) {
    const [added, removed] = row.split("\t");
    if (!/^\d+$/.test(added ?? "") || !/^\d+$/.test(removed ?? ""))
      findings.push("binary-source-diff");
    else lines += Number(added) + Number(removed);
  }
  if (
    stats.length > receipt.budget.maxChangedFiles ||
    lines > receipt.budget.maxDiffLines
  )
    findings.push("source-diff-budget-exceeded");
  return {
    schemaVersion: "1.0",
    kind: "worker-integrity-audit",
    status: findings.length ? ("blocked" as const) : ("passed" as const),
    id,
    root: actual,
    caseId: receipt.caseId,
    findings,
    diffLines: lines,
    changedFiles: stats.length,
    receiptHash: receipt.hash,
    readyForValidation: receipt.readyForValidation,
  };
}
/** The external harness must expose this restricted route instead of a host shell. */
export async function runBenchmarkWorkerNode(
  datasetRoot: string,
  id: string,
  args: string[],
  options: { timeoutMs?: number } = {},
) {
  const audit = await auditBenchmarkWorker(datasetRoot, id);
  if (audit.status !== "passed")
    return { ...audit, reason: "workspace-integrity-stop" };
  const timeout = options.timeoutMs ?? 10000;
  if (
    !Number.isInteger(timeout) ||
    timeout < 500 ||
    timeout > 60000 ||
    !Array.isArray(args) ||
    args.some((arg) => typeof arg !== "string") ||
    args.length > 64 ||
    Buffer.byteLength(args.join("\0")) > 65536
  )
    throw Error("Invalid isolated tool budget or arguments");
  if (/[,\r\n]/.test(audit.root))
    throw Error("Worker path cannot contain Docker mount separators");
  const receipt = await loadReceipt(datasetRoot, id);
  if (receipt.editableFiles.some((path) => /[,\r\n]/.test(path)))
    throw Error("Worker source path cannot contain Docker mount separators");
  const name = "inteiro-worker-" + randomUUID();
  const command = [
    "run",
    "--pull",
    "never",
    "--rm",
    "--name",
    name,
    "--network",
    "none",
    "--read-only",
    "--cap-drop",
    "ALL",
    "--security-opt",
    "no-new-privileges",
    "--pids-limit",
    "64",
    "--memory",
    "256m",
    "--cpus",
    "1",
    "--ulimit",
    `fsize=${WORKER_SOURCE_BYTES}:${WORKER_SOURCE_BYTES}`,
    "--user",
    "1000:1000",
    "--tmpfs",
    "/tmp:rw,noexec,nosuid,size=64m",
    "--workdir",
    "/workspace",
    "--mount",
    `type=bind,source=${audit.root},target=/workspace,readonly`,
    ...receipt.editableFiles.flatMap((path) => [
      "--mount",
      `type=bind,source=${safePath(audit.root, path)},target=/workspace/${path}`,
    ]),
    WORKER_IMAGE,
    "node",
    ...args,
  ];
  const started = performance.now(),
    child = spawnSync("docker", command, {
      encoding: "utf8",
      timeout,
      maxBuffer: 1024 * 1024,
      windowsHide: true,
    });
  let cleanupVerified = true;
  if (child.error) {
    const cleanup = spawnSync("docker", ["rm", "--force", name], {
      encoding: "utf8",
      timeout: 5000,
      windowsHide: true,
    });
    cleanupVerified = cleanup.status === 0;
  }
  const after = await auditBenchmarkWorker(datasetRoot, id);
  const result = {
    schemaVersion: "1.0",
    kind: "isolated-worker-tool-result",
    status:
      after.status !== "passed"
        ? ("blocked" as const)
        : child.error
          ? ("error" as const)
          : child.status === 0
            ? ("passed" as const)
            : ("failed" as const),
    id,
    containerName: name,
    caseId: audit.caseId,
    receiptHash: audit.receiptHash,
    image: WORKER_IMAGE,
    commandHash: hash(args),
    durationMs: performance.now() - started,
    exitCode: child.status,
    stdout: redact(child.stdout ?? ""),
    stderr: redact(child.stderr ?? ""),
    cleanupVerified,
    integrity: after.status,
    findings: after.findings,
    modelExecution: "not_run" as const,
  };
  const directory = safePath(datasetRoot, ".inteiro/reports/workers/tools");
  await mkdir(directory, { recursive: true });
  await writeFile(
    join(directory, randomUUID() + ".json"),
    JSON.stringify(result, null, 2),
  );
  return result;
}
