import { createServer } from "node:http";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { lintSource } from "../packages/lint/src/index.ts";
import { DEFAULTS, hash } from "../packages/contracts/src/index.ts";
import { visualTest } from "../packages/visual/src/index.ts";
const started = performance.now();
for (let i = 0; i < 1000; i++)
  await lintSource(
    "source-" + i + ".tsx",
    'export const Name = <label>Nome<input style={{color:"var(--in-color-text-primary)"}}/></label>',
  );
const result = {
  schemaVersion: "1.0",
  environment: {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
  },
  static: {
    files: 1000,
    durationMs: performance.now() - started,
    method:
      "Sequential parser calls on a synthetic positive TSX fixture; not a general p95 claim",
  },
  canary: null,
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
      durations = [];
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
    }
    result.canary = {
      runs: 10,
      uniqueScreenshotHashes: new Set(hashes).size,
      hashes,
      durationsMs: durations,
      flakyRate: (new Set(hashes).size - 1) / 10,
      font: "Recursive full variable, served locally with verified SHA256",
      limitation:
        "Single synthetic fixture on this environment. No product baseline approved.",
    };
  } finally {
    await new Promise((r) => server.close(r));
    await rm(root, { recursive: true, force: true });
  }
}
await mkdir("artifacts", { recursive: true });
await writeFile(
  "artifacts/p0-performance.json",
  JSON.stringify(result, null, 2),
);
console.log(JSON.stringify(result, null, 2));
