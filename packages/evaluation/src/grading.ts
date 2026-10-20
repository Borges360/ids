import { createServer } from "node:http";
import { readFile, mkdir, writeFile, realpath } from "node:fs/promises";
import { dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  hash,
  safePath,
  safeRead,
  reviewSourceHash,
  resolveConfig,
  validateSchema,
  redact,
} from "@inteiro/contracts";
import type { Page, Locator } from "@playwright/test";
export type GradeLocator =
  | {
      role:
        | "button"
        | "textbox"
        | "dialog"
        | "navigation"
        | "list"
        | "listitem"
        | "status"
        | "alert"
        | "heading"
        | "checkbox"
        | "combobox"
        | "row"
        | "cell"
        | "tab"
        | "tabpanel"
        | "link";
      name?: string;
    }
  | { text: string }
  | { label: string }
  | { testId: string };
export interface GradeStep {
  op: string;
  locator?: GradeLocator;
  value?: string | null;
  name?: string;
  count?: number;
  id?: string;
  body?: Record<string, unknown> | null;
  values?: string[];
}
export interface TaskGrading {
  schemaVersion: "1.0";
  kind: "independent-task-criteria";
  caseId: string;
  entry: string;
  fixture: { path: string; sha256: string };
  scenarios: {
    id: string;
    viewport: { width: number; height: number };
    theme: string;
    density: string;
    direction: string;
    steps: GradeStep[];
  }[];
}
interface Response {
  status: number;
  json: unknown;
  release?: string;
}
interface Fixture {
  schemaVersion: "1.0";
  classification: "synthetic";
  clock: string;
  seed: number;
  routes: { id: string; path: string; method: string; responses: Response[] }[];
}
const locate = (page: Page, locator: GradeLocator): Locator =>
  "text" in locator
    ? page.getByText(locator.text, { exact: true })
    : "label" in locator
      ? page.getByLabel(locator.label, { exact: true })
      : "testId" in locator
        ? page.getByTestId(locator.testId)
        : page.getByRole(locator.role, {
            ...(locator.name ? { name: locator.name } : {}),
            exact: true,
          });
/** Executes evaluator-owned functional criteria. It never runs a model or candidate shell command. */
export async function gradeBenchmarkTask(
  datasetRoot: string,
  candidateRoot: string,
  gradingPath: string,
  options: { dryRun?: boolean } = {},
) {
  const specificationBytes = await readFile(safePath(datasetRoot, gradingPath));
  const spec: TaskGrading = JSON.parse(specificationBytes.toString("utf8"));
  if (!validateSchema("task-grading", spec).valid)
    throw Error("Invalid independent task grading schema");
  if (
    new Set(spec.scenarios.map((scenario) => scenario.id)).size !==
    spec.scenarios.length
  )
    throw Error("Duplicate grading scenario");
  const fixtureBytes = await readFile(safePath(datasetRoot, spec.fixture.path));
  if (hash(fixtureBytes) !== spec.fixture.sha256)
    throw Error("Grading fixture hash mismatch");
  const fixture: Fixture = JSON.parse(fixtureBytes.toString("utf8"));
  if (!validateSchema("task-fixture", fixture).valid)
    throw Error("Invalid synthetic task fixture schema");
  const identities = fixture.routes.map((route) =>
    JSON.stringify([route.method, route.path]),
  );
  const releaseIds = fixture.routes.flatMap((route) =>
    route.responses.flatMap((response) =>
      response.release ? [response.release] : [],
    ),
  );
  if (
    new Set(identities).size !== identities.length ||
    new Set(releaseIds).size !== releaseIds.length
  )
    throw Error("Ambiguous fixture route or response release identity");
  if (
    fixture.schemaVersion !== "1.0" ||
    fixture.classification !== "synthetic" ||
    !Number.isFinite(Date.parse(fixture.clock)) ||
    !Number.isSafeInteger(fixture.seed) ||
    !Array.isArray(fixture.routes) ||
    new Set(fixture.routes.map((route) => route.id)).size !==
      fixture.routes.length ||
    fixture.routes.some(
      (route) =>
        !route.id ||
        !route.path.startsWith("/api/") ||
        !["GET", "POST", "PUT", "PATCH", "DELETE"].includes(route.method) ||
        !route.responses.length ||
        route.responses.some(
          (response) =>
            !Number.isInteger(response.status) ||
            response.status < 200 ||
            response.status > 599,
        ),
    )
  )
    throw Error("Invalid synthetic grading response fixture");
  const candidate = await realpath(candidateRoot);
  const git = (...args: string[]) =>
    execFileSync("git", args, {
      cwd: candidate,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  if ((await realpath(git("rev-parse", "--show-toplevel"))) !== candidate)
    throw Error("Candidate must own an isolated Git root");
  await safeRead(candidate, spec.entry.slice(1));
  const { config } = await resolveConfig(candidate);
  const sourceHash = await reviewSourceHash(candidate),
    gitSha = git("rev-parse", "HEAD");
  const runId = "run-" + randomUUID();
  const base = {
    schemaVersion: "1.0",
    kind: "independent-task-grading",
    runId,
    caseId: spec.caseId,
    sourceHash,
    gitSha,
    configHash: hash(config),
    grading: { path: gradingPath, sha256: hash(specificationBytes) },
    fixture: spec.fixture,
    plannedScenarios: spec.scenarios.length,
  };
  if (options.dryRun)
    return {
      ...base,
      status: "not_run" as const,
      executed: 0,
      results: [],
      agentExecution: "not_run" as const,
    };
  const { chromium, expect } = await import("@playwright/test");
  const server = await createBenchmarkServer(candidate);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  const results: {
    id: string;
    status: "passed" | "failed";
    completedSteps: number;
    plannedSteps: number;
    message?: string;
  }[] = [];
  let infrastructureError: string | undefined,
    browserVersion: string | undefined;
  try {
    browser = await chromium.launch({ headless: true });
    browserVersion = browser.version();
    const origin =
      "http://127.0.0.1:" + (server.address() as { port: number }).port;
    for (const scenario of spec.scenarios) {
      const context = await browser.newContext({
        viewport: scenario.viewport,
        locale: "pt-BR",
        timezoneId: "UTC",
        reducedMotion: "reduce",
        serviceWorkers: "block",
        acceptDownloads: false,
      });
      const observations = new Map<
          string,
          { body: unknown; contentType: string | null }[]
        >(),
        pending = new Map<string, () => void>(),
        released = new Set<string>();
      const releases = new Set(
        fixture.routes.flatMap((route) =>
          route.responses.flatMap((response) =>
            response.release ? [response.release] : [],
          ),
        ),
      );
      let networkFailure: string | undefined,
        completedSteps = 0;
      try {
        await context.addInitScript(
          ({ clock, seed }) => {
            const NativeDate = Date;
            globalThis.Date = new Proxy(NativeDate, {
              construct(target, args) {
                return Reflect.construct(target, args.length ? args : [clock]);
              },
              apply() {
                return new NativeDate(clock).toString();
              },
              get(target, key) {
                return key === "now" ? () => clock : Reflect.get(target, key);
              },
            });
            let value = seed >>> 0;
            Math.random = () => {
              value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
              return value / 4294967296;
            };
          },
          { clock: Date.parse(fixture.clock), seed: fixture.seed },
        );
        await context.routeWebSocket("**/*", (socket) => {
          networkFailure = "WebSocket egress blocked";
          socket.close();
        });
        await context.route("**/*", async (route) => {
          const url = new URL(route.request().url());
          if (["data:", "blob:"].includes(url.protocol)) {
            await route.continue();
            return;
          }
          if (url.origin !== origin) {
            networkFailure = "Non-allowlisted network request blocked";
            await route.abort();
            return;
          }
          const match = fixture.routes.find(
            (item) =>
              item.method === route.request().method() &&
              item.path === url.pathname + url.search,
          );
          if (!match) {
            if (url.pathname.startsWith("/api/"))
              networkFailure = "Undeclared API request";
            await route.continue();
            return;
          }
          const calls = observations.get(match.id) ?? [];
          let body: unknown = null;
          try {
            body = route.request().postDataJSON();
          } catch {
            body = null;
          }
          const response = match.responses[calls.length];
          calls.push({
            body,
            contentType: route.request().headers()["content-type"] ?? null,
          });
          observations.set(match.id, calls);
          if (!response) {
            networkFailure = "Request exceeds frozen response plan";
            await route.abort();
            return;
          }
          if (response.release && !released.has(response.release))
            await new Promise<void>((resolve) =>
              pending.set(response.release!, resolve),
            );
          await route.fulfill({ status: response.status, json: response.json });
        });
        const page = await context.newPage();
        page.setDefaultTimeout(3000);
        await page.goto(origin + spec.entry, {
          waitUntil: "domcontentloaded",
          timeout: 10000,
        });
        await page.evaluate(({ theme, density, direction }) => {
          document.documentElement.dataset.inTheme = theme;
          document.documentElement.dataset.inDensity = density;
          document.documentElement.dir = direction;
        }, scenario);
        for (const step of scenario.steps) {
          const target = step.locator ? locate(page, step.locator) : undefined;
          switch (step.op) {
            case "click":
              await target!.click();
              break;
            case "fill":
              await target!.fill(step.value!);
              break;
            case "press":
              await target!.press(step.value!);
              break;
            case "select":
              await target!.selectOption(step.value!);
              break;
            case "check":
              await target!.check();
              break;
            case "uncheck":
              await target!.uncheck();
              break;
            case "expect-visible":
              await expect(target!).toBeVisible();
              break;
            case "expect-hidden":
              await expect(target!).toBeHidden();
              break;
            case "expect-focused":
              await expect(target!).toBeFocused();
              break;
            case "expect-enabled":
              await expect(target!).toBeEnabled();
              break;
            case "expect-disabled":
              await expect(target!).toBeDisabled();
              break;
            case "expect-text":
              await expect(target!).toContainText(step.value!);
              break;
            case "expect-value":
              await expect(target!).toHaveValue(step.value!);
              break;
            case "expect-count":
              await expect(target!).toHaveCount(step.count!);
              break;
            case "expect-ordered-text":
              await expect(target!.getByRole("listitem")).toHaveText(
                step.values!,
              );
              break;
            case "expect-attribute":
              if (step.value === null)
                await expect(target!).not.toHaveAttribute(step.name!);
              else
                await expect(target!).toHaveAttribute(step.name!, step.value!);
              break;
            case "expect-root-attribute":
              await expect(page.locator("html")).toHaveAttribute(
                step.name!,
                step.value!,
              );
              break;
            case "reload":
              await page.reload({ waitUntil: "domcontentloaded" });
              break;
            case "expect-no-overflow":
              await expect
                .poll(() =>
                  page.evaluate(
                    () => document.documentElement.scrollWidth - innerWidth,
                  ),
                )
                .toBeLessThanOrEqual(1);
              break;
            case "expect-request":
              await expect
                .poll(() => observations.get(step.id!)?.length ?? 0)
                .toBe(step.count!);
              if (step.body !== null) {
                expect(
                  observations
                    .get(step.id!)
                    ?.at(-1)
                    ?.contentType?.split(";")[0],
                ).toBe("application/json");
                expect(observations.get(step.id!)?.at(-1)?.body).toMatchObject(
                  step.body!,
                );
              }
              break;
            case "respond":
              if (!releases.has(step.id!))
                throw Error("Unknown frozen response release");
              released.add(step.id!);
              pending.get(step.id!)?.();
              pending.delete(step.id!);
              break;
            default:
              throw Error("Unknown grading operation");
          }
          completedSteps++;
        }
        if (networkFailure) throw Error(networkFailure);
        results.push({
          id: scenario.id,
          status: "passed",
          completedSteps,
          plannedSteps: scenario.steps.length,
        });
      } catch (error) {
        results.push({
          id: scenario.id,
          status: "failed",
          completedSteps,
          plannedSteps: scenario.steps.length,
          message: redact(
            error instanceof Error ? error.message : String(error),
          ),
        });
      } finally {
        for (const release of pending.values()) release();
        await context.close();
      }
    }
    if ((await reviewSourceHash(candidate)) !== sourceHash)
      infrastructureError = "Candidate source changed during grading";
  } catch (error) {
    infrastructureError = redact(
      error instanceof Error ? error.message : String(error),
    );
  } finally {
    await browser?.close();
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  const report = {
    ...base,
    status: infrastructureError
      ? ("error" as const)
      : results.length === spec.scenarios.length &&
          results.every((result) => result.status === "passed")
        ? ("passed" as const)
        : ("failed" as const),
    executed: results.length,
    results,
    browserVersion,
    ...(infrastructureError ? { message: infrastructureError } : {}),
    agentExecution: "not_run" as const,
  };
  const directory = ".inteiro/reports/" + runId;
  await mkdir(safePath(candidate, directory), { recursive: true });
  await writeFile(
    safePath(candidate, directory + "/grading.json"),
    JSON.stringify({ ...report, hash: hash(report) }, null, 2),
  );
  return { ...report, hash: hash(report) };
}

/** Serves only candidate src/public and public INTEIRO assets; never evaluator files. */
export async function createBenchmarkServer(candidateRoot: string) {
  const candidate = await realpath(candidateRoot);
  const assets = dirname(
    fileURLToPath(import.meta.resolve("@inteiro/composition/css")),
  );
  const behavior = fileURLToPath(
    import.meta.resolve("@inteiro/composition/behavior"),
  );
  const mime: Record<string, string> = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json",
    ".woff2": "font/woff2",
    ".png": "image/png",
    ".svg": "image/svg+xml",
  };
  const server = createServer(async (request, response) => {
    try {
      if (!["GET", "HEAD"].includes(request.method ?? "")) {
        response.writeHead(405).end();
        return;
      }
      const path = decodeURIComponent(
        new URL(request.url ?? "/", "http://127.0.0.1").pathname,
      );
      let target: string;
      if (path.startsWith("/__inteiro__/"))
        target =
          path === "/__inteiro__/behavior.js"
            ? behavior
            : safePath(assets, path.slice("/__inteiro__/".length));
      else {
        if (
          !/^\/(?:src|public)\//.test(path) ||
          path.split("/").some((part) => part.startsWith("."))
        ) {
          response.writeHead(404).end();
          return;
        }
        target = safePath(candidate, path.slice(1));
      }
      const bytes = await readFile(target);
      response.writeHead(200, {
        "content-type": mime[extname(target)] ?? "application/octet-stream",
        "cache-control": "no-store",
      });
      response.end(request.method === "HEAD" ? undefined : bytes);
    } catch {
      response.writeHead(404).end();
    }
  });
  return server;
}
