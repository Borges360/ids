import { createServer } from "node:http";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { lintSource, lintProject } from "../packages/lint/src/index.ts";
import {
  DEFAULTS,
  hash,
  resolveConfig,
  reviewSourceHash,
  bundle,
  reportFormats,
  safePath,
} from "../packages/contracts/src/index.ts";
import { resolveContext } from "../packages/agent-core/src/context.ts";
import {
  visualTest,
  comparePng,
  selectRouteImpact,
} from "../packages/visual/src/index.ts";
const sourceHash = await reviewSourceHash(process.cwd());
const quantiles = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    samples: values.length,
    min: sorted[0] ?? null,
    max: sorted.at(-1) ?? null,
    p50: sorted.length ? sorted[Math.ceil(sorted.length * 0.5) - 1] : null,
    p95: sorted.length ? sorted[Math.ceil(sorted.length * 0.95) - 1] : null,
    values,
  };
};
const staticSamples = [];
for (let batch = 0; batch < 5; batch++) {
  const started = performance.now();
  for (let i = 0; i < 1000; i++)
    await lintSource(
      "source-" + i + ".tsx",
      'export const Name = <label>Nome<input style={{color:"var(--in-color-text-primary)"}}/></label>',
    );
  staticSamples.push(performance.now() - started);
}
// End-to-end lint: the gate's own project walk, file reads and rules over
// 1,000 generated files on disk (synthetic content, mixed source types).
const lintRoot = await mkdtemp(join(tmpdir(), "inteiro-lint-e2e-"));
const lintSamples = [];
let lintObservation;
try {
  const kinds = [
    [
      "tsx",
      600,
      (
        i,
      ) => `export const Field${i} = () => <label>Nome ${i}<input style={{ color: "var(--in-color-text-primary)" }} /></label>;
`,
    ],
    [
      "css",
      200,
      (
        i,
      ) => `.card-${i} { color: var(--in-color-text-primary); padding: var(--in-space-medium); }
`,
    ],
    [
      "html",
      100,
      (
        i,
      ) => `<main><h1>Página ${i}</h1><button class="in-button">Salvar</button></main>
`,
    ],
    [
      "vue",
      50,
      (i) => `<template><button class="in-button">Item ${i}</button></template>
`,
    ],
    [
      "svelte",
      50,
      (i) => `<button class="in-button">Item ${i}</button>
`,
    ],
  ];
  let count = 0;
  for (const [extension, total, content] of kinds)
    for (let i = 0; i < total; i++) {
      const directory = join(lintRoot, "src", extension, String(i % 20));
      await mkdir(directory, { recursive: true });
      await writeFile(join(directory, `file-${i}.${extension}`), content(i));
      count++;
    }
  const lintConfig = structuredClone(DEFAULTS);
  lintConfig.static.include = ["src/**/*.{tsx,css,html,vue,svelte}"];
  for (let run = 0; run < 5; run++) {
    const started = performance.now();
    const result = await lintProject(lintRoot, lintConfig);
    lintSamples.push(performance.now() - started);
    lintObservation = {
      generatedFiles: count,
      lintedFiles: result.files,
      status: result.status,
      findings: result.findings.length,
    };
  }
} finally {
  await rm(lintRoot, { recursive: true, force: true });
}
const contextSamples = [],
  contextStatuses = [],
  serializationSamples = [];
const { config: settings } = await resolveConfig(process.cwd());
const sample = bundle(DEFAULTS, [
  { name: "static", status: "passed", durationMs: 1, findings: [] },
]);
for (let i = 0; i < 20; i++) {
  const started = performance.now();
  const context = await resolveContext(
    {
      type: "component",
      description: "Formulário de cadastro",
      patternIds: ["form-layout"],
    },
    process.cwd(),
    settings,
  );
  contextSamples.push(performance.now() - started);
  contextStatuses.push(context.status);
  const serializeStarted = performance.now();
  reportFormats(sample);
  serializationSamples.push(performance.now() - serializeStarted);
}
const result = {
  schemaVersion: "1.0",
  kind: "measured-synthetic-workloads",
  sourceHash,
  status: contextStatuses.every((status) => status === "passed")
    ? "passed"
    : "blocked",
  environment: {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
  },
  static: {
    ...lintObservation,
    distributionMs: quantiles(lintSamples),
    method:
      "End-to-end lintProject (directory walk, file reads, rules) over 1,000 generated files on disk: 600 TSX, 200 CSS, 100 HTML, 50 Vue, 50 Svelte; five sequential runs; synthetic content",
  },
  staticParser: {
    entries: 1000,
    batches: 5,
    distributionMs: quantiles(staticSamples),
    method:
      "In-memory lintSource of one synthetic TSX snippet x1000 per batch; parser throughput only, not end-to-end lint of files",
  },
  context: {
    distributionMs: quantiles(contextSamples),
    statuses: contextStatuses,
    cacheHitRate: null,
    cacheAvailability: "result-cache-not-implemented",
  },
  serialization: {
    distributionMs: quantiles(serializationSamples),
    includesImages: false,
    workload: "Small synthetic structured gate in four formats",
  },
  unavailable: {
    inferenceCost: null,
    modelBenefit: null,
    humanCalibration: null,
  },
  canary: null,
  changedSubset: null,
};
if (process.argv.includes("--canary")) {
  const root = await mkdtemp(join(tmpdir(), "inteiro-canary-"));
  const font = await readFile(
    "packages/composition/fonts/recursive-latin-full-normal.woff2",
  );
  await writeFile(join(root, "font.woff2"), font);
  const server = createServer((req, res) => {
    if (req.url === "/font.woff2") {
      res.setHeader("content-type", "font/woff2");
      res.end(font);
      return;
    }
    res.setHeader("content-type", "text/html");
    res.end(
      '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Canary</title><style>@font-face{font-family:Recursive;src:url(/font.woff2) format("woff2");font-weight:300 1000}body{font-family:Recursive}</style><main><h1>Canário sintético</h1><p>Conteúdo estável.</p></main></html>',
    );
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  try {
    await mkdir(join(root, ".inteiro/fixtures"), { recursive: true });
    await writeFile(
      join(root, ".inteiro/fixtures/canary.json"),
      JSON.stringify({
        classification: "synthetic",
        clock: "2026-10-18T12:00:00Z",
      }),
    );
    await writeFile(
      join(root, "inteiro.routes.json"),
      JSON.stringify({
        schemaVersion: "1.0",
        routes: [
          {
            id: "canary",
            path: "/",
            criticality: "normal",
            fixture: "canary",
            viewports: ["mobile"],
            modes: ["light-calm"],
            states: [{ id: "default", actions: [] }],
          },
        ],
      }),
    );
    const config = structuredClone(DEFAULTS);
    config.browser.baseURL = "http://127.0.0.1:" + server.address().port;
    config.browser.viewports = [{ id: "mobile", width: 375, height: 812 }];
    config.browser.requiredFonts = ["Recursive"];
    config.browser.fontAssets = [{ path: "font.woff2", sha256: hash(font) }];
    const hashes = [],
      comparisons = [],
      durations = [];
    let reference;
    for (let i = 0; i < 10; i++) {
      const report = await visualTest(root, config);
      if (
        report.status !== "blocked" ||
        report.findings.some((f) => f.ruleId !== "VIS-BASE-001")
      )
        throw new Error(
          "Canary did not execute cleanly: " + JSON.stringify(report),
        );
      hashes.push(report.captures[0].sha256);
      durations.push(report.durationMs);
      const bytes = await readFile(safePath(root, report.captures[0].actual));
      if (reference) {
        const comparison = comparePng(reference, bytes, config);
        comparisons.push({
          run: i + 1,
          passed: comparison.passed,
          diffRatio: comparison.ratio ?? null,
        });
      } else reference = bytes;
    }
    result.canary = {
      runs: 10,
      uniqueScreenshotHashes: new Set(hashes).size,
      hashes,
      durationsMs: durations,
      distributionMs: quantiles(durations),
      comparisons,
      denominator: comparisons.length,
      failedComparisons: comparisons.filter((comparison) => !comparison.passed)
        .length,
      flakyRate: comparisons.length
        ? comparisons.filter((comparison) => !comparison.passed).length /
          comparisons.length
        : null,
      comparisonReference:
        "first synthetic observation; not a product baseline",
      maxDiffPixelRatio: config.visual.maxDiffPixelRatio,
      font: "Recursive full variable, served locally with verified SHA256",
      limitation:
        "Single synthetic fixture on this environment. No product baseline approved.",
    };
    if (result.canary.failedComparisons) result.status = "failed";
  } catch (error) {
    result.status = "error";
    result.diagnostic = String(error);
  } finally {
    await new Promise((r) => server.close(r));
    await rm(root, { recursive: true, force: true });
  }
}
// RFC-001 §19 "visual changed subset": a small example app whose routes declare
// their source files; one changed file selects its routes through the same
// impact contract the PR gate uses, and only that subset is rendered.
if (process.argv.includes("--canary") && result.status === "passed") {
  const root = await mkdtemp(join(tmpdir(), "inteiro-changed-subset-"));
  const font = await readFile(
    "packages/composition/fonts/recursive-latin-full-normal.woff2",
  );
  const pages = ["home", "orders", "settings", "reports", "profile", "help"];
  const server = createServer((req, res) => {
    if (req.url === "/font.woff2") {
      res.setHeader("content-type", "font/woff2");
      res.end(font);
      return;
    }
    const page = pages.find((id) => req.url === "/" + id) ?? "home";
    res.setHeader("content-type", "text/html");
    res.end(
      '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Exemplo: ' +
        page +
        '</title><style>@font-face{font-family:Recursive;src:url(/font.woff2) format("woff2");font-weight:300 1000}body{font-family:Recursive}button{min-width:48px;min-height:48px}</style><main><h1>Página ' +
        page +
        "</h1><p>Conteúdo estável.</p><button>Salvar</button></main></html>",
    );
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  try {
    await mkdir(join(root, ".inteiro/fixtures"), { recursive: true });
    await writeFile(join(root, "font.woff2"), font);
    await writeFile(
      join(root, ".inteiro/fixtures/example.json"),
      JSON.stringify({
        classification: "synthetic",
        clock: "2026-10-18T12:00:00Z",
      }),
    );
    const routes = pages.map((id) => ({
      id,
      path: "/" + id,
      criticality: "normal",
      fixture: "example",
      sourceFiles: [
        "src/pages/" + id + ".html",
        // One shared dependency widens the selection beyond a single route.
        ...(["settings", "profile"].includes(id)
          ? ["src/components/account-form.html"]
          : []),
      ],
      viewports: ["mobile", "desktop"],
      modes: ["light-calm"],
      states: [{ id: "default", actions: [] }],
    }));
    await writeFile(
      join(root, "inteiro.routes.json"),
      JSON.stringify({ schemaVersion: "1.0", routes }),
    );
    const config = structuredClone(DEFAULTS);
    config.browser.baseURL = "http://127.0.0.1:" + server.address().port;
    config.browser.viewports = [
      { id: "mobile", width: 375, height: 812 },
      { id: "desktop", width: 1280, height: 800 },
    ];
    config.browser.requiredFonts = ["Recursive"];
    config.browser.fontAssets = [{ path: "font.woff2", sha256: hash(font) }];
    const changedFiles = ["src/components/account-form.html"];
    const impact = selectRouteImpact(routes, changedFiles, "pr");
    if (impact.scope !== "affected" || impact.routeIds.length !== 2)
      throw new Error(
        "Changed subset was not selected: " + JSON.stringify(impact),
      );
    const expectedCases = impact.routeIds.length * config.browser.viewports.length;
    const durations = [];
    for (let i = 0; i < 10; i++) {
      const report = await visualTest(root, config, {
        routeIds: impact.routeIds,
      });
      // Captures record the route path, not its id.
      const expectedPaths = impact.routeIds.map((id) => "/" + id);
      const rendered = new Set(report.captures.map((capture) => capture.route));
      if (
        report.status !== "blocked" ||
        report.findings.some((f) => f.ruleId !== "VIS-BASE-001") ||
        report.captures.length !== expectedCases ||
        [...rendered].some((path) => !expectedPaths.includes(path)) ||
        rendered.size !== expectedPaths.length
      )
        throw new Error(
          "Changed subset did not execute cleanly: " +
            JSON.stringify({
              status: report.status,
              captures: report.captures.length,
              rendered: [...rendered],
              rules: report.findings.map((f) => f.ruleId),
            }),
        );
      durations.push(report.durationMs);
    }
    result.changedSubset = {
      runs: durations.length,
      declaredRoutes: routes.length,
      changedFiles,
      impact: {
        scope: impact.scope,
        reason: impact.reason,
        routeIds: impact.routeIds,
      },
      casesPerRun: expectedCases,
      omittedRoutes: routes.length - impact.routeIds.length,
      distributionMs: quantiles(durations),
      method:
        "Ten sequential visualTest runs restricted to the routes selected by selectRouteImpact (profile pr) for one changed shared file in a six-route synthetic example app; two viewports, one mode; each run includes browser launch, navigation, DOM/accessibility checks and capture",
      limitation:
        "Synthetic example app on this host, without a promoted baseline (each capture ends in VIS-BASE-001 by design); not a product route set and not a reference-hardware certification.",
    };
  } catch (error) {
    result.status = "error";
    result.diagnostic = String(error);
  } finally {
    await new Promise((r) => server.close(r));
    await rm(root, { recursive: true, force: true });
  }
}
// RFC-001 §19 operational targets are proposed objectives: record the baseline
// measurement against them without making any threshold blocking.
const target = (limit, value, unit, basis) => ({
  limit,
  unit,
  value: typeof value === "number" && Number.isFinite(value) ? value : null,
  met:
    typeof value === "number" && Number.isFinite(value) ? value < limit : null,
  blocking: false,
  basis,
});
result.targets = {
  status: "recorded-not-blocking",
  reference:
    "RFC-001 §19 proposed objectives; measured on this host, not a reference-hardware certification",
  contextResolveP95: target(
    250,
    result.context.distributionMs.p95,
    "ms",
    "20 local resolveContext calls",
  ),
  staticLintP95Per1000Files: target(
    15000,
    result.static.distributionMs.p95,
    "ms",
    "five end-to-end lintProject runs over 1,000 files",
  ),
  reportSerialization: target(
    2000,
    result.serialization.distributionMs.max,
    "ms",
    "maximum of 20 serializations, images excluded",
  ),
  canaryFlakiness: target(
    0.01,
    result.canary?.flakyRate ?? null,
    "ratio",
    result.canary
      ? "failed comparisons / " +
          result.canary.denominator +
          " canary comparisons"
      : "canary not requested",
  ),
  visualChangedSubsetP95: result.changedSubset
    ? target(
        180000,
        result.changedSubset.distributionMs.p95,
        "ms",
        result.changedSubset.runs +
          " changed-subset runs (" +
          result.changedSubset.impact.routeIds.length +
          " of " +
          result.changedSubset.declaredRoutes +
          " routes) of a synthetic example app",
      )
    : {
        ...target(180000, null, "ms", "not measured here"),
        reason: "Changed-subset measurement requires --canary (a browser)",
      },
};
result.finishedSourceHash = await reviewSourceHash(process.cwd());
if (result.finishedSourceHash !== sourceHash) {
  result.status = "error";
  result.diagnostic = "Source changed during measurements";
}
await mkdir("artifacts", { recursive: true });
await writeFile(
  "artifacts/p0-performance.json",
  JSON.stringify(result, null, 2),
);
console.log(JSON.stringify(result, null, 2));
process.exitCode =
  result.status === "passed" ? 0 : result.status === "failed" ? 6 : 8;
