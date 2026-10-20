import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { execFileSync, spawn } from "node:child_process";
import {
  hash,
  safePath,
  safeRead,
  finding,
  aggregate,
  redact,
  type Config,
  type GateResult,
  type Finding,
} from "@inteiro/contracts";
import { registry, proposeBaseline, verifyApproval } from "./baseline.ts";
import type { Page, Locator } from "@playwright/test";
import { discoverRoutes, coverageFindings } from "./coverage.ts";
import { inspectInteractionTargets } from "./targets.ts";
import {
  fixtureRandomSeed,
  installFixtureRandom,
  RANDOM_PROFILE,
} from "./determinism.ts";
export {
  fixtureRandomSeed,
  installFixtureRandom,
  RANDOM_PROFILE,
} from "./determinism.ts";
export {
  inspectInteractionTargets,
  type InteractionTarget,
} from "./targets.ts";
import {
  createResponseAliases,
  matchesResponse,
  validateResponseFixtures,
  sanitizeCapture,
  type ResponseAliases,
  type ResponseFixture,
} from "./actions.ts";
export {
  createResponseAliases,
  validateResponseFixtures,
  sanitizeCapture,
} from "./actions.ts";
const require = createRequire(import.meta.url);
export interface Action {
  type: string;
  target?: { testId?: string; role?: string; name?: string };
  value?: string;
  key?: string;
  alias?: string;
}
export interface Route {
  id: string;
  path: string;
  criticality: string;
  fixture: string;
  viewports: string[];
  modes: string[];
  states: { id: string; path?: string; fixture?: string; actions: Action[] }[];
  not_applicable?: Record<string, string>;
}
export interface Fixture {
  classification: "synthetic" | "restricted";
  clock: string;
  seed?: number;
  responses?: ResponseFixture[];
}
const allowedActions = [
  "click",
  "fill",
  "select",
  "press",
  "expectVisible",
  "expectText",
  "waitForResponseAlias",
  "screenshot",
];
export function validateRoutes(routes: Route[], config: Config) {
  const findings: Finding[] = [];
  const ids = new Set<string>();
  if (!routes.length)
    findings.push(
      finding("VIS-STATE-001", "No routes declared", { status: "blocked" }),
    );
  for (const r of routes) {
    if (
      !/^[a-zA-Z0-9_-]+$/.test(r.id) ||
      !r.fixture ||
      !/^[a-zA-Z0-9_-]+$/.test(r.fixture)
    )
      throw new Error("Route/fixture id must be a safe identifier");
    if (ids.has(r.id) || !r.id)
      findings.push(
        finding("VIS-STATE-001", "Duplicate/missing route id", {
          status: "blocked",
        }),
      );
    ids.add(r.id);
    if (
      !r.path.startsWith("/") ||
      r.path.startsWith("//") ||
      new URL(r.path, config.browser.baseURL).origin !==
        new URL(config.browser.baseURL).origin
    )
      throw new Error("Route escapes authorized app");
    if (
      !r.fixture ||
      !r.states?.length ||
      !r.states.some((s) => s.id === "default") ||
      !r.viewports?.length ||
      !r.modes?.length
    )
      findings.push(
        finding("VIS-DATA-001", "Incomplete route fixture/state/matrix", {
          route: r.path,
          status: "blocked",
        }),
      );
    if (r.criticality === "high" && !r.states.some((s) => s.actions.length))
      findings.push(
        finding("VIS-STATE-001", "Critical route requires a primary flow", {
          route: r.path,
          status: "blocked",
        }),
      );
    for (const vp of r.viewports ?? [])
      if (!config.browser.viewports.some((v) => v.id === vp))
        throw new Error("Unknown viewport " + vp);
    for (const mode of r.modes ?? [])
      if (
        !/^(dark|light|contrast-dark|contrast-light)-(calm|focus)$/.test(mode)
      )
        throw new Error("Unknown mode " + mode);
    for (const state of r.states ?? []) {
      if (
        state.path &&
        new URL(state.path, config.browser.baseURL).origin !==
          new URL(config.browser.baseURL).origin
      )
        throw new Error("State path escapes app");
      if (state.fixture && !/^[a-zA-Z0-9_-]+$/.test(state.fixture))
        throw new Error("Invalid fixture ID");
      for (const action of state.actions) {
        if (!allowedActions.includes(action.type))
          throw new Error("Unsafe/unsupported action " + action.type);
        if (
          action.type === "waitForResponseAlias" &&
          (!action.alias || !/^[a-zA-Z0-9_-]{1,80}$/.test(action.alias))
        )
          throw new Error("Valid response alias required");
        if (
          action.type !== "waitForResponseAlias" &&
          action.type !== "screenshot" &&
          !action.target?.role &&
          !action.target?.testId
        )
          throw new Error("Stable role/testId target required");
      }
    }
  }
  return findings;
}
function locator(page: Page, target: Action["target"]): Locator {
  if (target?.testId) return page.getByTestId(target.testId);
  if (target?.role)
    return page.getByRole(
      target.role as Parameters<Page["getByRole"]>[0],
      target.name ? { name: target.name, exact: true } : {},
    );
  throw new Error("Target required");
}
export async function runAction(
  page: Page,
  action: Action,
  runtime: {
    responses?: ResponseAliases;
    capture?: (action: Action) => Promise<void>;
  } = {},
) {
  if (!allowedActions.includes(action.type)) throw new Error("Unsafe action");
  if (action.type === "screenshot") {
    if (!runtime.capture)
      throw new Error("Screenshot evidence executor required");
    await runtime.capture(action);
    return;
  }
  if (action.type === "waitForResponseAlias") {
    if (!runtime.responses || !action.alias)
      throw new Error("Fixture-bound response alias required");
    await runtime.responses.waitFor(action.alias);
    return;
  }
  const loc = locator(page, action.target);
  switch (action.type) {
    case "click":
      await loc.click();
      break;
    case "fill":
      await loc.fill(action.value ?? "");
      break;
    case "select":
      await loc.selectOption(action.value ?? "");
      break;
    case "press":
      await loc.press(action.key ?? "Enter");
      break;
    case "expectVisible":
      await loc.waitFor({ state: "visible" });
      break;
    case "expectText":
      await (
        await import("@playwright/test")
      )
        .expect(loc)
        .toContainText(action.value ?? "");
      break;
  }
}
export function comparePng(expected: Buffer, actual: Buffer, config: Config) {
  const { PNG } = require("pngjs"),
    pixelmatch = require("pixelmatch").default;
  const a = PNG.sync.read(actual),
    e = PNG.sync.read(expected);
  if (a.width !== e.width || a.height !== e.height)
    return {
      passed: false,
      ratio: 1,
      reason: "dimension-mismatch",
      diff: actual,
    };
  const diff = new PNG({ width: a.width, height: a.height });
  const count = pixelmatch(e.data, a.data, diff.data, a.width, a.height, {
    threshold: config.visual.colorThreshold,
  });
  const ratio = count / (a.width * a.height);
  return {
    passed: ratio <= config.visual.maxDiffPixelRatio,
    ratio,
    reason: "pixel-comparison",
    diff: PNG.sync.write(diff),
  };
}
async function readiness(url: string, timeout: number) {
  const end = Date.now() + timeout;
  let last = "";
  while (Date.now() < end) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (res.ok) return;
      last = String(res.status);
    } catch (e) {
      last = String(e);
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("Healthcheck unavailable " + last);
}
export async function visualTest(
  root: string,
  config: Config,
  options: {
    authorizeStart?: boolean;
    propose?: boolean;
    all?: boolean;
    routeIds?: string[];
  } = {},
): Promise<GateResult> {
  const start = performance.now(),
    findings: Finding[] = [],
    captures: Record<string, unknown>[] = [],
    actionCaptures: Record<string, unknown>[] = [],
    responseObservations: Record<string, unknown>[] = [];
  let browser:
      | Awaited<
          ReturnType<(typeof import("@playwright/test"))["chromium"]["launch"]>
        >
      | undefined,
    server: ReturnType<typeof spawn> | undefined;
  let executed = 0;
  try {
    const manifest = JSON.parse(
      await safeRead(root, config.browser.routesFile),
    ) as { schemaVersion: string; routes: Route[] };
    if (manifest.schemaVersion !== "1.0")
      throw new Error("Unsupported route schema");
    findings.push(...validateRoutes(manifest.routes, config));
    findings.push(
      ...coverageFindings(
        await discoverRoutes(root, config),
        manifest.routes,
        config.browser.criticalRoutes,
      ),
    );
    for (const asset of config.browser.fontAssets) {
      try {
        if (hash(await readFile(safePath(root, asset.path))) !== asset.sha256)
          findings.push(
            finding("VIS-DATA-001", "Font checksum mismatch: " + asset.path, {
              status: "blocked",
            }),
          );
      } catch {
        findings.push(
          finding("VIS-DATA-001", "Font asset unavailable: " + asset.path, {
            status: "blocked",
          }),
        );
      }
    }
    if (findings.length)
      return {
        name: "browser",
        status: "blocked",
        findings,
        durationMs: performance.now() - start,
        executed,
      };
    const { chromium } = await import("@playwright/test");
    browser = await chromium.launch({ headless: true });
    if (config.browser.startCommand && options.authorizeStart)
      server = spawn(config.browser.startCommand, {
        cwd: root,
        shell: true,
        stdio: "ignore",
        detached: process.platform !== "win32",
      });
    await readiness(
      new URL(config.browser.readyPath, config.browser.baseURL).href,
      config.browser.timeoutMs,
    );
    const entries = await registry(root, config.visual.baselineDir);
    const environmentFingerprint = hash({
      platform: process.platform,
      arch: process.arch,
      browser: browser.version(),
      profile: config.browser.environment,
      randomness: RANDOM_PROFILE,
      fontAssets: config.browser.fontAssets,
    });
    const artifactDir = config.reporting.outDir + "/captures-" + Date.now();
    await mkdir(safePath(root, artifactDir), { recursive: true });
    const axePath = require.resolve("axe-core/axe.min.js");
    let commit = "unknown";
    try {
      commit = execFileSync("git", ["rev-parse", "HEAD"], {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
    } catch {}
    for (const route of manifest.routes.filter(
      (route) =>
        !options.routeIds?.length || options.routeIds.includes(route.id),
    ))
      for (const state of route.states)
        for (const viewportId of options.all
          ? config.browser.viewports.map((v) => v.id)
          : route.viewports)
          for (const mode of options.all
            ? config.design.theme.flatMap((theme) =>
                config.design.density.map((density) => theme + "-" + density),
              )
            : route.modes) {
            const viewport = config.browser.viewports.find(
              (v) => v.id === viewportId,
            )!;
            const density = mode.slice(mode.lastIndexOf("-") + 1),
              theme = mode.slice(0, mode.lastIndexOf("-"));
            const fixtureId = state.fixture ?? route.fixture;
            let fixture: Fixture;
            try {
              fixture = JSON.parse(
                await safeRead(
                  root,
                  ".inteiro/fixtures/" + fixtureId + ".json",
                ),
              ) as Fixture;
            } catch (e) {
              findings.push(
                finding(
                  "VIS-DATA-001",
                  "Fixture unavailable or invalid: " + fixtureId,
                  {
                    route: route.path,
                    state: state.id,
                    viewport: viewportId,
                    status: "blocked",
                  },
                ),
              );
              continue;
            }
            if (
              !["synthetic", "restricted"].includes(fixture.classification) ||
              !Number.isFinite(Date.parse(fixture.clock)) ||
              (fixture.seed !== undefined &&
                (!Number.isInteger(fixture.seed) ||
                  fixture.seed < 0 ||
                  fixture.seed > 0xffffffff))
            ) {
              findings.push(
                finding(
                  "VIS-DATA-001",
                  "Fixture must declare classification, frozen clock and optional unsigned 32-bit seed",
                  {
                    route: route.path,
                    viewport: viewportId,
                    status: "blocked",
                  },
                ),
              );
              continue;
            }
            const responseErrors = validateResponseFixtures(
              fixture.responses ?? [],
              config.browser.baseURL,
            );
            if (responseErrors.length) {
              findings.push(
                finding("VIS-DATA-001", responseErrors.join("; "), {
                  route: route.path,
                  status: "blocked",
                }),
              );
              continue;
            }
            if (fixture.classification === "restricted") {
              findings.push(
                finding(
                  "VIS-DATA-001",
                  "Restricted fixture capture requires local redaction review",
                  { route: route.path, status: "needs_review" },
                ),
              );
              continue;
            }
            const context = await browser.newContext({
              viewport: { width: viewport.width, height: viewport.height },
              locale: "pt-BR",
              timezoneId: "UTC",
              reducedMotion: "reduce",
              serviceWorkers: "block",
            });
            const randomSeed = fixtureRandomSeed(fixture);
            await installFixtureRandom(context, randomSeed);
            await context.tracing.start({
              screenshots: false,
              snapshots: false,
            });
            const page = await context.newPage();
            page.setDefaultTimeout(Math.min(10000, config.browser.timeoutMs));
            const responses = createResponseAliases(
              page,
              fixture.responses ?? [],
              config.browser.baseURL,
              Math.min(10000, config.browser.timeoutMs),
            );
            const per: Finding[] = [];
            const add = (
              rule: string,
              msg: string,
              status: Finding["status"] = "failed",
            ) =>
              per.push(
                finding(rule, redact(msg), {
                  route: route.path,
                  viewport: viewportId,
                  state: state.id,
                  theme,
                  density,
                  status,
                }),
              );
            const origin = new URL(config.browser.baseURL).origin;
            const origins = new Set([origin, ...config.browser.allowedOrigins]);
            await context.route("**/*", async (request) => {
              const url = request.request().url();
              if (
                !url.startsWith("data:") &&
                !origins.has(new URL(url).origin)
              ) {
                add("VIS-RUNTIME-001", "Request to non-allowlisted origin");
                return request.abort();
              }
              const mock = fixture.responses?.find((r) =>
                matchesResponse(
                  url,
                  request.request().method(),
                  r,
                  config.browser.baseURL,
                ),
              );
              if (mock)
                return request.fulfill({
                  status: mock.status ?? 200,
                  contentType: "application/json",
                  body: JSON.stringify(mock.body),
                });
              return request.continue();
            });
            page.on("pageerror", (error) =>
              add("VIS-RUNTIME-001", error.message),
            );
            page.on("console", (msg) => {
              if (msg.type() === "error") add("VIS-RUNTIME-001", msg.text());
            });
            const key = hash({
              projectId: config.project.id,
              routeId: route.id,
              stateId: state.id,
              viewportId,
              theme,
              density,
              browserVersion: browser.version(),
              renderProfile: config.browser.environment,
            });
            const actualPath = artifactDir + "/" + key + "-actual.png";
            try {
              await page.clock.setFixedTime(new Date(fixture.clock));
              const response = await page.goto(
                new URL(state.path ?? route.path, config.browser.baseURL).href,
                { waitUntil: "networkidle" },
              );
              if (!response?.ok())
                add(
                  "VIS-RUNTIME-001",
                  "Route returned HTTP " + response?.status(),
                );
              await page.evaluate(
                ({ theme, density }) => {
                  document.documentElement.dataset.inTheme = theme;
                  document.documentElement.dataset.inDensity = density;
                },
                { theme, density },
              );
              await page.evaluate(() => document.fonts.ready);
              const missingFonts = await page.evaluate(
                async (families: string[]) => {
                  const missing: string[] = [];
                  for (const family of families) {
                    try {
                      const faces = await document.fonts.load(
                        "16px " + JSON.stringify(family),
                      );
                      if (
                        !faces.length ||
                        faces.some((face) => face.status !== "loaded")
                      )
                        missing.push(family);
                    } catch {
                      missing.push(family);
                    }
                  }
                  return missing;
                },
                config.browser.requiredFonts,
              );
              if (missingFonts.length)
                add(
                  "VIS-ENV-001",
                  "Required font did not load: " + missingFonts.join(", "),
                  "error",
                );
              await page.addStyleTag({
                content:
                  "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}",
              });
              for (const [actionIndex, action] of state.actions.entries())
                await runAction(page, action, {
                  responses,
                  capture: async (captureAction) => {
                    if (await sanitizeCapture(page))
                      add(
                        "SEC-DATA-001",
                        "Sensitive-looking fixture text redacted from action screenshot; fixture review required",
                        "blocked",
                      );
                    const path =
                      artifactDir +
                      "/" +
                      key +
                      "-action-" +
                      actionIndex +
                      ".png";
                    const bytes = captureAction.target
                      ? await locator(page, captureAction.target).screenshot({
                          path: safePath(root, path),
                          animations: "disabled",
                        })
                      : await page.screenshot({
                          path: safePath(root, path),
                          fullPage: config.visual.fullPage,
                          animations: "disabled",
                        });
                    actionCaptures.push({
                      actual: path,
                      sha256: hash(bytes),
                      route: route.path,
                      state: state.id,
                      viewport: viewportId,
                      theme,
                      density,
                      actionIndex,
                    });
                  },
                });
              const dom = await page.evaluate(() => ({
                overflow: document.documentElement.scrollWidth > innerWidth + 1,
                mains: document.querySelectorAll("main,[role=main]").length,
                title: document.title,
                headings: document.querySelectorAll("h1").length,
                images: Array.from(document.images).some(
                  (i) => !i.complete || i.naturalWidth === 0,
                ),
                fonts: document.fonts.status,
              }));
              if (dom.overflow)
                add("VIS-LAYOUT-001", "Document exceeds viewport width");
              if (dom.mains !== 1 || !dom.title || dom.headings !== 1)
                add(
                  "VIS-ACCESS-001",
                  "Route must have one main, one h1 and title",
                );
              if (dom.images || dom.fonts !== "loaded")
                add("VIS-DATA-001", "Broken image or font");
              for (const target of await inspectInteractionTargets(page))
                if (target.undersized)
                  add(
                    "VIS-TARGET-001",
                    `INTEIRO target below 44×44 CSS px: ${target.tag}${target.id ? "#" + target.id : ""} ${target.name} (${target.targetWidth}×${target.targetHeight})`,
                  );
              await page.addScriptTag({ path: axePath });
              const axe = await page.evaluate(async () => {
                const a = (
                  window as unknown as {
                    axe: {
                      run: (o: unknown) => Promise<{
                        violations: {
                          id: string;
                          impact: string;
                          nodes: { target: string[] }[];
                        }[];
                      }>;
                    };
                  }
                ).axe;
                return a.run({
                  runOnly: {
                    type: "tag",
                    values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"],
                  },
                });
              });
              for (const v of axe.violations)
                add(
                  "VIS-ACCESS-001",
                  v.id +
                    " " +
                    v.impact +
                    " " +
                    v.nodes.flatMap((n) => n.target).join(", "),
                );
              const redactions = await sanitizeCapture(page);
              if (redactions)
                add(
                  "SEC-DATA-001",
                  "Sensitive-looking fixture text redacted from screenshot; fixture review required",
                  "blocked",
                );
              const actual = await page.screenshot({
                path: safePath(root, actualPath),
                fullPage: config.visual.fullPage,
                animations: "disabled",
              });
              const baseline = entries.find(
                (b) => b.key === key && b.state === "approved",
              );
              if (!baseline)
                add("VIS-BASE-001", "Approved baseline missing", "blocked");
              else if (
                baseline.contractHash !== hash(config) ||
                baseline.fixtureHash !== hash(fixture) ||
                baseline.environmentFingerprint !== environmentFingerprint
              )
                add(
                  "VIS-BASE-001",
                  "Baseline contract/fixture/environment mismatch",
                  "blocked",
                );
              else {
                try {
                  const approval = JSON.parse(
                    await safeRead(
                      root,
                      config.visual.baselineDir +
                        "/" +
                        baseline.id +
                        ".approval.json",
                    ),
                  );
                  const policy = JSON.parse(
                    await safeRead(root, ".inteiro/reviewers.json"),
                  );
                  verifyApproval(approval, baseline, policy);
                } catch (e) {
                  add(
                    "VIS-BASE-001",
                    "Baseline authorization invalid: " + String(e),
                    "blocked",
                  );
                }
                const expected = await readFile(safePath(root, baseline.image));
                if (hash(expected) !== baseline.imageSha256)
                  add("VIS-BASE-001", "Baseline integrity mismatch", "blocked");
                else {
                  const comparison = comparePng(expected, actual, config);
                  await writeFile(
                    safePath(root, artifactDir + "/" + key + "-expected.png"),
                    expected,
                  );
                  await writeFile(
                    safePath(root, artifactDir + "/" + key + "-diff.png"),
                    comparison.diff,
                  );
                  if (!comparison.passed)
                    add(
                      "VIS-DIFF-001",
                      "Visual difference ratio " + comparison.ratio,
                    );
                }
              }
              if (
                options.propose &&
                !per.some((f) => !["VIS-BASE-001"].includes(f.ruleId))
              )
                await proposeBaseline(root, config.visual.baselineDir, {
                  key,
                  image: actualPath,
                  sourceCommit: commit,
                  sourcePullRequest: "",
                  contractHash: hash(config),
                  fixtureHash: hash(fixture),
                  environmentFingerprint,
                  projectId: config.project.id,
                  routeId: route.id,
                  stateId: state.id,
                  viewportId,
                  theme,
                  density,
                  browserVersion: browser.version(),
                  renderProfile: config.browser.environment,
                });
              for (const f of per) f.evidenceRefs.push(actualPath);
              captures.push({
                key,
                browserVersion: browser.version(),
                route: route.path,
                state: state.id,
                viewport: viewportId,
                theme,
                density,
                actual: actualPath,
                sha256: hash(actual),
                fixtureHash: hash(fixture),
                environmentFingerprint,
                randomSeed,
                randomProfile: RANDOM_PROFILE,
              });
              executed++;
            } catch (e) {
              add("VIS-STATE-001", String(e));
              try {
                if (await sanitizeCapture(page))
                  add(
                    "SEC-DATA-001",
                    "Sensitive-looking fixture text redacted from failure screenshot; fixture review required",
                    "blocked",
                  );
                await page.screenshot({
                  path: safePath(root, actualPath),
                  fullPage: true,
                  animations: "disabled",
                  timeout: 3000,
                });
                for (const f of per) f.evidenceRefs.push(actualPath);
              } catch {}
            } finally {
              responseObservations.push(
                ...responses.observations.map((observation) => ({
                  ...observation,
                  route: route.path,
                  state: state.id,
                  viewport: viewportId,
                })),
              );
              responses.dispose();
              // A trace may contain pre-sanitization response data. Discard it on a data finding.
              await context.tracing.stop(
                per.some((f) => f.ruleId === "SEC-DATA-001")
                  ? {}
                  : {
                      path: safePath(
                        root,
                        artifactDir + "/" + key + "-trace.zip",
                      ),
                    },
              );
              await context.close();
              findings.push(...per);
            }
          }
    return {
      name: "browser",
      status: findings.length
        ? aggregate(
            findings.map((f) => ({
              name: f.ruleId,
              status: f.status,
              findings: [],
              durationMs: 0,
            })),
          )
        : executed
          ? "passed"
          : "blocked",
      findings,
      durationMs: performance.now() - start,
      executed,
      captures,
      actionCaptures,
      responseObservations,
      environmentFingerprint,
    };
  } catch (e) {
    findings.push(
      finding("VIS-ENV-001", redact(String(e)), { status: "error" }),
    );
    return {
      name: "browser",
      status: "error",
      findings,
      durationMs: performance.now() - start,
      executed,
    };
  } finally {
    await browser?.close();
    if (server?.pid) {
      if (process.platform === "win32") {
        try {
          execFileSync("taskkill", ["/pid", String(server.pid), "/t", "/f"], {
            stdio: "ignore",
          });
        } catch {}
      } else {
        try {
          process.kill(-server.pid, "SIGTERM");
        } catch {
          server.kill();
        }
      }
    }
  }
}
