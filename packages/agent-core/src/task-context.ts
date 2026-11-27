import { mkdir, writeFile } from "node:fs/promises";
import {
  canonical,
  hash,
  safePath,
  safeRead,
  finding,
  type Config,
  type GateResult,
  validateSchema,
} from "@inteiro/contracts";
import { resolveContext, TASK_TYPES, type ContextTask } from "./context.ts";

export interface TaskManifest extends ContextTask {
  schemaVersion: "1.0";
  id: string;
  patternIds: string[];
  scope: { allowedFiles: string[] };
  acceptanceCriteria: string[];
  contextBundleId?: string;
  configHash?: string;
  contractRefs?: { path: string; sha256: string }[];
}
export type ResolvedContext = Awaited<ReturnType<typeof resolveContext>>;
function contextPayload(context: ResolvedContext) {
  const {
    status: _,
    bundleId: __,
    estimatedTokens: ___,
    budgetTokens: ____,
    missingPatterns: _____,
    limits: ______,
    ...payload
  } = context;
  return payload;
}
export function taskManifestErrors(task: TaskManifest, root: string): string[] {
  const errors: string[] = [];
  if (!task || typeof task !== "object" || Array.isArray(task))
    return ["Task manifest must be an object"];
  if (!validateSchema("task-manifest", task).valid)
    return ["Task manifest does not satisfy the published schema"];
  if (
    task?.schemaVersion !== "1.0" ||
    typeof task.id !== "string" ||
    !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,159}$/.test(task.id)
  )
    errors.push("Task requires a versioned identifier");
  if (
    !TASK_TYPES.includes(task?.type as (typeof TASK_TYPES)[number]) ||
    typeof task.description !== "string" ||
    !task.description.trim()
  )
    errors.push("Task requires a supported classification and description");
  if (
    !Array.isArray(task.patternIds) ||
    task.patternIds.some((id) => typeof id !== "string")
  )
    errors.push("Task must declare pattern IDs");
  if (
    !Array.isArray(task.acceptanceCriteria) ||
    !task.acceptanceCriteria.length ||
    task.acceptanceCriteria.some(
      (item) => typeof item !== "string" || !item.trim(),
    )
  )
    errors.push("Task requires explicit acceptance criteria");
  if (
    !Array.isArray(task.scope?.allowedFiles) ||
    !task.scope.allowedFiles.length
  )
    errors.push("Task requires explicit allowed files");
  else
    for (const path of task.scope.allowedFiles) {
      try {
        if (
          typeof path !== "string" ||
          path.includes("\\") ||
          path.split("/").some((part) => !part || part === "." || part === "..")
        )
          throw new Error();
        safePath(root, path);
      } catch {
        errors.push("Invalid task scope path");
      }
    }
  return errors;
}

/** Verify actual bundle contents against today's resolver, task, policy and installed provenance. */
export async function verifyStoredContext(
  root: string,
  config: Config,
  task: TaskManifest,
): Promise<ResolvedContext> {
  const errors = taskManifestErrors(task, root);
  if (errors.length) throw new Error(errors.join("; "));
  if (
    task.configHash !== hash(config) ||
    !/^context:[a-f0-9]{64}$/.test(task.contextBundleId ?? "")
  )
    throw new Error(
      "Task requires a current configuration and context bundle reference",
    );
  const context = JSON.parse(
    await safeRead(
      root,
      ".inteiro/contexts/" + task.contextBundleId!.slice(8) + ".json",
    ),
  ) as ResolvedContext;
  if (!validateSchema("context-bundle", context).valid)
    throw new Error("Invalid context bundle schema");
  if (
    context.bundleId !== task.contextBundleId ||
    context.status !== "passed" ||
    !/^\d{4}-\d{2}-\d{2}T/.test(context.createdAt) ||
    !Number.isFinite(Date.parse(context.createdAt)) ||
    Date.parse(context.createdAt) > Date.now() + 1000 ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(
      context.requestId,
    )
  )
    throw new Error("Invalid resolved context receipt");
  const fresh = await resolveContext(task, root, config);
  if (fresh.status !== "passed")
    throw new Error("Current context cannot satisfy the task");
  const payload = contextPayload(context),
    expected = {
      ...contextPayload(fresh),
      createdAt: context.createdAt,
      requestId: context.requestId,
    };
  const expectedHash = hash(expected);
  if (
    hash(payload) !== expectedHash ||
    context.bundleId !== "context:" + expectedHash ||
    context.estimatedTokens !==
      Math.ceil(Buffer.byteLength(canonical(payload)) / 4) ||
    context.budgetTokens !== config.context.maxTokens ||
    canonical(context.missingPatterns) !== canonical(fresh.missingPatterns) ||
    canonical(context.limits) !== canonical(fresh.limits)
  )
    throw new Error(
      "Context bundle differs from resolved task, contract or installed provenance",
    );
  return context;
}

export async function recordTaskContext(
  root: string,
  config: Config,
  task: TaskManifest,
  dryRun = false,
) {
  const errors = taskManifestErrors(task, root);
  if (errors.length)
    return {
      status: "blocked" as const,
      errors,
      nextAction:
        "Declare task classification, allowed files, patterns and acceptance criteria in .inteiro/task.json",
    };
  const context = await resolveContext(task, root, config);
  if (context.status !== "passed")
    return {
      status: "blocked" as const,
      errors: ["Context resolver could not satisfy task"],
      context,
      nextAction:
        "Resolve integration, pattern selection or context budget findings",
    };
  const manifest: TaskManifest = {
    ...task,
    configHash: hash(config),
    contextBundleId: context.bundleId,
  };
  if (!dryRun) {
    await mkdir(safePath(root, ".inteiro/contexts"), { recursive: true });
    await writeFile(
      safePath(
        root,
        ".inteiro/contexts/" + context.bundleId.slice(8) + ".json",
      ),
      JSON.stringify(context, null, 2) + "\n",
    );
    await writeFile(
      safePath(root, ".inteiro/task.json"),
      JSON.stringify(manifest, null, 2) + "\n",
    );
  }
  return {
    status: dryRun ? ("not_run" as const) : ("passed" as const),
    manifest,
    context,
    errors: [],
    observability:
      "A recorded declaration does not prove internal model access",
  };
}
export async function taskContextGate(
  root: string,
  config: Config,
): Promise<GateResult> {
  const start = performance.now();
  try {
    const task = JSON.parse(
      await safeRead(root, ".inteiro/task.json"),
    ) as TaskManifest;
    const context = await verifyStoredContext(root, config, task);
    return {
      name: "task-context",
      status: "passed",
      findings: [],
      durationMs: performance.now() - start,
      taskId: task.id,
      contextBundleId: context.bundleId,
      taskHash: context.taskHash,
      loaded: "unobserved",
      used: "declared",
      compliant: "not_run",
    };
  } catch (error) {
    return {
      name: "task-context",
      status: "blocked",
      findings: [
        finding("IN-CTX-001", String(error), {
          file: ".inteiro/task.json",
          status: "blocked",
        }),
      ],
      durationMs: performance.now() - start,
      nextAction:
        "Complete .inteiro/task.json then run inteiro context resolve --record --json",
    };
  }
}
