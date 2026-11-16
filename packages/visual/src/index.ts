import { readFile, mkdir, writeFile, unlink } from "node:fs/promises";
import { inspectTracePrivacy } from "./trace-privacy.ts";
export { inspectTracePrivacy } from "./trace-privacy.ts";
import { createRequire } from "node:module";
import { release, version } from "node:os";
import { execFileSync, spawn } from "node:child_process";
import {
  hash,
  safePath,
  safeRead,
  finding,
  aggregate,
  redact,
  reviewSourceHash,
  type Config,
  type GateResult,
  type Finding,
} from "@inteiro/contracts";
import {
  baselineContractHash,
  registry,
  proposeBaseline,
  verifyApproval,
} from "./baseline.ts";
import { verifyTechnicalBaselineApproval } from "./technical-baseline.ts";
import {
  createFixtureResponder,
  validateFixtureActions,
} from "./fixture-responder.ts";
export {
  createFixtureResponder,
  validateFixtureActions,
} from "./fixture-responder.ts";
import type { Page, Locator } from "@playwright/test";
export { selectRouteImpact, changedSourceFiles } from "./impact.ts";
import { discoverRoutes, coverageFindings } from "./coverage.ts";
import { inspectInteractionTargets } from "./targets.ts";
import { inspectTargetClipping } from "./clipping.ts";
export { inspectTargetClipping } from "./clipping.ts";
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
  validateSyntheticText,
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
  target?: {
    testId?: string;
    role?: string;
    name?: string;
    label?: string;
    document?: true;
  };
  value?: string;
  key?: string;
  alias?: string;
  attribute?: string;
  stateId?: string;
  file?: { name: string; mimeType: "text/plain"; content: string };
}
export interface Route {
  sourceFiles?: string[];
  id: string;
  path: string;
  criticality: string;
  fixture: string;
  viewports: string[];
  modes: string[];
  states: {
    id: string;
    path?: string;
    fixture?: string;
    actions: Action[];
    viewports?: string[];
    viewportReason?: string;
  }[];
  not_applicable?: Record<string, string>;
}
export interface Fixture {
  classification: "synthetic" | "restricted";
  clock: string;
  seed?: number;
  syntheticText?: string[];
  responses?: ResponseFixture[];
}
const allowedActions = [
  "click",
  "fill",
  "select",
  "press",
  "expectVisible",
  "expectText",
  "keyboard",
  "expectFocused",
  "expectReachable",
  "expectUnclipped",
  "waitForResponseAlias",
  "releaseResponseAlias",
  "expectDisabled",
  "expectEnabled",
  "setInputFiles",
  "reload",
  "expectAttribute",
  "expectValue",
  "expectChecked",
  "screenshot",
];
const keyboardKeys = new Set([
  "Tab",
  "Shift+Tab",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Home",
  "End",
  "Escape",
  "Enter",
  "Space",
  "PageUp",
  "PageDown",
]);
const assertionAttributes = new Set([
  "aria-selected",
  "aria-expanded",
  "aria-invalid",
  "aria-describedby",
  "aria-controls",
  "tabindex",
  "data-in-theme",
  "data-in-density",
  "dir",
  "readonly",
]);
export class VisualActionAssertionError extends Error {
  readonly ruleId: "VIS-ACCESS-001" | "VIS-LAYOUT-001" | "VIS-STATE-001";
  constructor(
    ruleId: "VIS-ACCESS-001" | "VIS-LAYOUT-001" | "VIS-STATE-001",
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.ruleId = ruleId;
    this.name = "VisualActionAssertionError";
  }
}
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
        state.viewports &&
        (!state.viewports.length ||
          state.viewports.some(
            (id) => !config.browser.viewports.some((v) => v.id === id),
          ) ||
          !state.viewportReason?.trim())
      )
        throw Error(
          "State viewport subset requires configured IDs and an explicit reason",
        );
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
          action.type === "expectAttribute" &&
          !assertionAttributes.has(action.attribute ?? "")
        )
          throw Error("Unsupported state attribute assertion");
        if (
          action.type === "expectChecked" &&
          !["true", "false"].includes(action.value ?? "true")
        )
          throw Error("Checked assertion requires a boolean value");
        if (
          action.stateId !== undefined &&
          !/^[a-zA-Z0-9_-]{1,80}$/.test(action.stateId)
        )
          throw Error("Invalid declared capture state");
        if (
          action.type === "setInputFiles" &&
          (!action.file ||
            !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,100}$/.test(action.file.name) ||
            action.file.mimeType !== "text/plain" ||
            typeof action.file.content !== "string" ||
            Buffer.byteLength(action.file.content) > 65536)
        )
          throw Error(
            "File upload requires bounded synthetic text content and a safe filename",
          );
        if (
          action.type === "keyboard" &&
          (!keyboardKeys.has(action.key ?? "") || action.target !== undefined)
        )
          throw new Error(
            "Keyboard action requires an allowlisted key and no target; it must not force focus",
          );
        if (
          ["waitForResponseAlias", "releaseResponseAlias"].includes(
            action.type,
          ) &&
          (!action.alias || !/^[a-zA-Z0-9_-]{1,80}$/.test(action.alias))
        )
          throw new Error("Valid response alias required");
        if (
          action.type !== "waitForResponseAlias" &&
          action.type !== "releaseResponseAlias" &&
          action.type !== "screenshot" &&
          action.type !== "keyboard" &&
          action.type !== "reload" &&
          !action.target?.role &&
          !action.target?.label &&
          !action.target?.document &&
          !action.target?.testId
        )
          throw new Error("Stable role/testId target required");
      }
    }
  }
  return findings;
}
function locator(page: Page, target: Action["target"]): Locator {
  if (target?.document) return page.locator("html");
  if (target?.testId) return page.getByTestId(target.testId);
  if (target?.label) return page.getByLabel(target.label, { exact: true });
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
    timeoutMs?: number;
    responder?: ReturnType<typeof createFixtureResponder>;
  } = {},
) {
  if (!allowedActions.includes(action.type)) throw new Error("Unsafe action");
  if (action.type === "reload") {
    await page.reload({ waitUntil: "domcontentloaded" });
    return { reloaded: true };
  }
  if (action.type === "keyboard") {
    if (!keyboardKeys.has(action.key ?? "") || action.target !== undefined)
      throw new Error(
        "Keyboard action requires an allowlisted key and no target; it must not force focus",
      );
    await page.keyboard.press(action.key!);
    const focused = await page.evaluate(() => {
      const element = document.activeElement;
      return element
        ? {
            tag: element.tagName.toLowerCase(),
            id: element.id,
            testId: element.getAttribute("data-testid"),
            role: element.getAttribute("role"),
          }
        : null;
    });
    return { key: action.key, focused };
  }
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
  if (action.type === "releaseResponseAlias") {
    if (!runtime.responder || !action.alias)
      throw Error("Fixture-bound response release required");
    runtime.responder.release(action.alias);
    return { alias: action.alias, released: true };
  }
  const loc = locator(page, action.target);
  switch (action.type) {
    case "expectAttribute":
      if (!assertionAttributes.has(action.attribute ?? ""))
        throw Error("Unsupported state attribute assertion");
      await (
        await import("@playwright/test")
      )
        .expect(loc)
        .toHaveAttribute(action.attribute!, action.value ?? "", {
          timeout: runtime.timeoutMs ?? 5000,
        });
      break;
    case "expectValue":
      await (
        await import("@playwright/test")
      )
        .expect(loc)
        .toHaveValue(action.value ?? "", {
          timeout: runtime.timeoutMs ?? 5000,
        });
      break;
    case "expectChecked":
      if (!["true", "false"].includes(action.value ?? "true"))
        throw Error("Checked assertion requires a boolean value");
      if (action.value === "false")
        await (
          await import("@playwright/test")
        )
          .expect(loc)
          .not.toBeChecked({ timeout: runtime.timeoutMs ?? 5000 });
      else
        await (
          await import("@playwright/test")
        )
          .expect(loc)
          .toBeChecked({ timeout: runtime.timeoutMs ?? 5000 });
      break;
    case "setInputFiles":
      if (
        !action.file ||
        action.file.mimeType !== "text/plain" ||
        !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,100}$/.test(action.file.name) ||
        Buffer.byteLength(action.file.content) > 65536
      )
        throw Error("Invalid synthetic file upload");
      await loc.setInputFiles({
        name: action.file.name,
        mimeType: action.file.mimeType,
        buffer: Buffer.from(action.file.content),
      });
      break;
    case "expectDisabled":
      await (
        await import("@playwright/test")
      )
        .expect(loc)
        .toBeDisabled({ timeout: runtime.timeoutMs ?? 5000 });
      break;
    case "expectEnabled":
      await (
        await import("@playwright/test")
      )
        .expect(loc)
        .toBeEnabled({ timeout: runtime.timeoutMs ?? 5000 });
      break;
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
    case "expectFocused":
      try {
        await (
          await import("@playwright/test")
        )
          .expect(loc)
          .toBeFocused({ timeout: runtime.timeoutMs ?? 5000 });
      } catch (error) {
        throw new VisualActionAssertionError(
          "VIS-ACCESS-001",
          "Declared keyboard target does not have focus",
          { cause: error },
        );
      }
      return { target: action.target, focused: true };
    case "expectReachable": {
      await loc.waitFor({ state: "visible" });
      if (!(await loc.isEnabled()))
        throw new VisualActionAssertionError(
          "VIS-STATE-001",
          "Declared critical target is disabled",
        );
      try {
        // Playwright's real actionability checks include hit testing, overlays,
        // clipping/scrolling, stability, pointer-events and enabled state.
        await loc.click({ trial: true, timeout: runtime.timeoutMs ?? 5000 });
      } catch (error) {
        throw new VisualActionAssertionError(
          "VIS-LAYOUT-001",
          "Declared critical target is not reachable by pointer",
          { cause: error },
        );
      }
      return {
        target: action.target,
        reachable: true,
        boundingBox: await loc.boundingBox(),
      };
    }
    case "expectUnclipped": {
      await loc.waitFor({ state: "visible" });
      await loc.scrollIntoViewIfNeeded();
      const geometry = await inspectTargetClipping(loc);
      if (geometry.clipped)
        throw new VisualActionAssertionError(
          "VIS-LAYOUT-001",
          "Declared critical target is clipped: " + JSON.stringify(geometry),
        );
      return { target: action.target, ...geometry };
    }
  }
  const focused = await page.evaluate(() => {
    const element = document.activeElement;
    return element
      ? {
          tag: element.tagName.toLowerCase(),
          id: element.id,
          testId: element.getAttribute("data-testid"),
          role: element.getAttribute("role"),
        }
      : null;
  });
  return {
    target: action.target,
    focused,
    boundingBox: await settledTargetBox(loc),
  };
}
/**
 * Post-action geometry is evidence, not another assertion. An action may
 * legitimately rename or remove its own target asynchronously (for example, a
 * submit label reset when the request completes), so resolve the current
 * matches once without waiting instead of re-resolving the locator after a
 * separate count(). Ambiguous matches remain a strict-mode error.
 */
async function settledTargetBox(loc: Locator) {
  const handles = await loc.elementHandles();
  try {
    if (handles.length > 1)
      throw new Error(
        `strict mode violation: ${String(loc)} resolved to ${handles.length} elements after the action`,
      );
    const [handle] = handles;
    return handle ? await handle.boundingBox() : null;
  } finally {
    await Promise.all(handles.map((handle) => handle.dispose()));
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
    actionObservations: Record<string, unknown>[] = [],
    fixtureObservations: Record<string, unknown>[] = [],
    responseObservations: Record<string, unknown>[] = [];
  const traceObservations: Record<string, unknown>[] = [];
  const baselineStats = {
    compared: 0,
    authorized: 0,
    different: 0,
    missing: 0,
    proposalRequests: 0,
  };
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
    // All fixture references and aliases are checked before launching a browser.
    for (const route of manifest.routes)
      for (const state of route.states) {
        const fixtureId = state.fixture ?? route.fixture;
        try {
          const fixture = JSON.parse(
            await safeRead(root, ".inteiro/fixtures/" + fixtureId + ".json"),
          ) as Fixture;
          const errors = validateResponseFixtures(
            fixture.responses ?? [],
            config.browser.baseURL,
          );
          if (
            fixture.syntheticText !== undefined &&
            !validateSyntheticText(fixture.syntheticText)
          )
            errors.push("Invalid synthetic text exceptions");
          if (
            !["synthetic", "restricted"].includes(fixture.classification) ||
            !Number.isFinite(Date.parse(fixture.clock)) ||
            (fixture.seed !== undefined &&
              (!Number.isInteger(fixture.seed) ||
                fixture.seed < 0 ||
                fixture.seed > 0xffffffff))
          )
            errors.push("Invalid fixture metadata");
          if (!errors.length)
            errors.push(
              ...validateFixtureActions(fixture.responses ?? [], state.actions),
            );
          if (errors.length)
            findings.push(
              finding("VIS-DATA-001", errors.join("; "), {
                route: route.path,
                state: state.id,
                status: "blocked",
              }),
            );
        } catch (error) {
          findings.push(
            finding(
              "VIS-DATA-001",
              "Fixture unavailable or invalid: " +
                fixtureId +
                ": " +
                String(error),
              { route: route.path, state: state.id, status: "blocked" },
            ),
          );
        }
      }
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
    const views = (route: Route, state: Route["states"][number]) =>
      (options.all
        ? config.browser.viewports.map((v) => v.id)
        : route.viewports
      ).filter((id) => !state.viewports || state.viewports.includes(id));
    const modeCount = (route: Route) =>
      options.all
        ? config.design.theme.length * config.design.density.length
        : route.modes.length;
    const caseCount = (routes: Route[]) =>
      routes.reduce(
        (total, route) =>
          total +
          route.states.reduce(
            (sum, state) => sum + views(route, state).length * modeCount(route),
            0,
          ),
        0,
      );
    const selectedRoutes = manifest.routes.filter(
      (route) =>
        !options.routeIds?.length || options.routeIds.includes(route.id),
    );
    const planned = caseCount(selectedRoutes),
      omitted = caseCount(manifest.routes) - planned;
    const { chromium } = await import("@playwright/test");
    browser = await chromium.launch({ headless: true });
    if (config.browser.startCommand && options.authorizeStart)
      server = spawn(config.browser.startCommand, {
        cwd: root,
        shell: true,
        stdio: "ignore",
        detached: process.platform !== "win32",
        windowsHide: true,
      });
    await readiness(
      new URL(config.browser.readyPath, config.browser.baseURL).href,
      config.browser.timeoutMs,
    );
    const entries = await registry(root, config.visual.baselineDir);
    const sourceHash =
      config.governance.mode === "technical-autonomous"
        ? await reviewSourceHash(root)
        : undefined;
    const renderEnvironment = {
      platform: process.platform,
      arch: process.arch,
      osRelease: release(),
      osVersion: version(),
      playwrightVersion: require("@playwright/test/package.json").version,
      browser: browser.version(),
      profile: config.browser.environment,
      randomness: RANDOM_PROFILE,
      fontAssets: config.browser.fontAssets,
    };
    const environmentFingerprint = hash(renderEnvironment);
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
          ? config.browser.viewports
              .map((v) => v.id)
              .filter((id) => !state.viewports || state.viewports.includes(id))
          : route.viewports.filter(
              (id) => !state.viewports || state.viewports.includes(id),
            ))
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
                  {
                    route: route.path,
                    status:
                      config.governance.mode === "technical-autonomous"
                        ? "blocked"
                        : "needs_review",
                  },
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
            const responder = createFixtureResponder(
              fixture.responses ?? [],
              config.browser.baseURL,
              responses,
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
              try {
                if (await responder.handle(request)) return;
              } catch (error) {
                add("VIS-DATA-001", String(error), "blocked");
                await request.abort().catch(() => {});
                return;
              }
              return request.continue();
            });
            let observingRuntime = true;
            page.on("pageerror", (error) => {
              if (observingRuntime) add("VIS-RUNTIME-001", error.message);
            });
            page.on("console", (msg) => {
              if (
                observingRuntime &&
                msg.type() === "error" &&
                !responder.expectedConsoleError(msg.location().url, msg.text())
              )
                add("VIS-RUNTIME-001", msg.text());
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
              ...(config.governance.mode === "technical-autonomous"
                ? { environmentFingerprint }
                : {}),
            });
            const actualPath = artifactDir + "/" + key + "-actual.png";
            try {
              await page.clock.setFixedTime(new Date(fixture.clock));
              const response = await page.goto(
                new URL(state.path ?? route.path, config.browser.baseURL).href,
                { waitUntil: "domcontentloaded" },
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
              for (const [actionIndex, action] of state.actions.entries()) {
                try {
                  const observation = await runAction(page, action, {
                    responses,
                    responder,
                    timeoutMs: Math.min(10000, config.browser.timeoutMs),
                    capture: async (captureAction) => {
                      if (await sanitizeCapture(page, fixture.syntheticText))
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
                        ...(captureAction.stateId
                          ? { declaredState: captureAction.stateId }
                          : {}),
                      });
                    },
                  });
                  actionObservations.push({
                    route: route.path,
                    state: state.id,
                    viewport: viewportId,
                    theme,
                    density,
                    actionIndex,
                    type: action.type,
                    status: "passed",
                    ...observation,
                  });
                } catch (error) {
                  let geometry: unknown = null;
                  if (action.target) {
                    try {
                      geometry = await inspectTargetClipping(
                        locator(page, action.target),
                      );
                    } catch {}
                  }
                  const focused = await page
                    .evaluate(() => {
                      const element = document.activeElement;
                      return element
                        ? {
                            tag: element.tagName.toLowerCase(),
                            id: element.id,
                            testId: element.getAttribute("data-testid"),
                          }
                        : null;
                    })
                    .catch(() => null);
                  actionObservations.push({
                    route: route.path,
                    state: state.id,
                    viewport: viewportId,
                    theme,
                    density,
                    actionIndex,
                    type: action.type,
                    target: action.target,
                    status: "failed",
                    geometry,
                    focused,
                    ruleId:
                      error instanceof VisualActionAssertionError
                        ? error.ruleId
                        : "VIS-STATE-001",
                    message: redact(String(error)),
                  });
                  throw error;
                }
              }
              // A flow can navigate or reload. Settle fonts in the current document,
              // rather than inspecting the loading flag from the previous page.
              await page.evaluate(() => document.fonts.ready);
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
              const redactions = await sanitizeCapture(
                page,
                fixture.syntheticText,
              );
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
              if (!baseline) {
                baselineStats.missing++;
                add("VIS-BASE-001", "Approved baseline missing", "blocked");
              } else if (
                baseline.contractHash !== baselineContractHash(config) ||
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
                  if (config.governance.mode === "technical-autonomous") {
                    const policy = JSON.parse(
                      await safeRead(root, ".inteiro/technical-attestors.json"),
                    );
                    verifyTechnicalBaselineApproval(
                      approval,
                      baseline,
                      policy,
                      entries.find(
                        (entry) => entry.id === baseline.previousBaselineId,
                      ),
                    );
                  } else {
                    const policy = JSON.parse(
                      await safeRead(root, ".inteiro/reviewers.json"),
                    );
                    verifyApproval(approval, baseline, policy);
                  }
                  baselineStats.authorized++;
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
                  baselineStats.compared++;
                  if (!comparison.passed) baselineStats.different++;
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
                per.some((f) =>
                  ["VIS-BASE-001", "VIS-DIFF-001"].includes(f.ruleId),
                ) &&
                !per.some(
                  (f) => !["VIS-BASE-001", "VIS-DIFF-001"].includes(f.ruleId),
                )
              ) {
                baselineStats.proposalRequests++;
                await proposeBaseline(root, config.visual.baselineDir, {
                  key,
                  image: actualPath,
                  sourceCommit: commit,
                  ...(sourceHash ? { sourceHash } : {}),
                  sourcePullRequest: "",
                  contractHash: baselineContractHash(config),
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
              }
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
              add(
                e instanceof VisualActionAssertionError
                  ? e.ruleId
                  : "VIS-STATE-001",
                e instanceof VisualActionAssertionError && e.cause
                  ? e.message + ": " + String(e.cause)
                  : String(e),
              );
              try {
                if (await sanitizeCapture(page, fixture.syntheticText))
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
              // Disposing intentionally pending fixtures can cause ERR_FAILED in
              // Chromium. Runtime evidence ends with the scenario, before teardown.
              observingRuntime = false;
              responseObservations.push(
                ...responses.observations.map((observation) => ({
                  ...observation,
                  route: route.path,
                  state: state.id,
                  viewport: viewportId,
                })),
              );
              fixtureObservations.push(
                ...responder.observations.map((observation) => ({
                  ...observation,
                  route: route.path,
                  state: state.id,
                  viewport: viewportId,
                })),
              );
              responder.dispose();
              responses.dispose();
              // A missing reference is a governance block, not a failed UI flow.
              const retainTrace =
                per.some((f) => f.ruleId !== "VIS-BASE-001") &&
                !per.some((f) => f.ruleId === "SEC-DATA-001");
              const tracePath = artifactDir + "/" + key + "-trace.zip";
              await context.tracing.stop(
                retainTrace ? { path: safePath(root, tracePath) } : {},
              );
              if (retainTrace) {
                try {
                  const privacy = inspectTracePrivacy(
                    await readFile(safePath(root, tracePath)),
                    fixture.syntheticText ?? [],
                  );
                  traceObservations.push({
                    route: route.path,
                    state: state.id,
                    viewport: viewportId,
                    privacy,
                  });
                  if (privacy.status !== "passed") {
                    await unlink(safePath(root, tracePath));
                    add(
                      "SEC-DATA-001",
                      "Trace withheld after privacy inspection",
                      "blocked",
                    );
                  }
                } catch {
                  await unlink(safePath(root, tracePath)).catch(() => {});
                  add(
                    "SEC-DATA-001",
                    "Trace integrity or privacy could not be verified",
                    "blocked",
                  );
                }
              }
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
      planned,
      omitted,
      coverage: planned ? executed / planned : null,
      routeCoverage: {
        declared: manifest.routes.length,
        selected: selectedRoutes.length,
        covered: new Set(captures.map((c) => c.route)).size,
        denominator: "selected-routes",
        ratio: selectedRoutes.length
          ? new Set(captures.map((c) => c.route)).size / selectedRoutes.length
          : null,
      },
      baselineStats,
      captures,
      actionCaptures,
      actionObservations,
      responseObservations,
      fixtureObservations,
      traceObservations,
      environmentFingerprint,
      renderEnvironment,
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
