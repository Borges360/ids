import { describe, it, expect } from "vitest";
import { createServer } from "node:http";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DEFAULTS } from "@inteiro/contracts";
import {
  visualTest,
  validateResponseFixtures,
  type Action,
} from "@inteiro/visual";
import { validateFixtureActions } from "../../packages/visual/src/fixture-responder.ts";

it("validates finite sequences and all aliases before browser launch", async () => {
  const root = await mkdtemp(join(tmpdir(), "inteiro-fixture-preflight-"));
  try {
    await mkdir(join(root, ".inteiro/fixtures"), { recursive: true });
    const responses = [
      {
        url: "/api",
        sequence: [
          {
            status: 503,
            body: {},
            alias: "failed",
            release: "error-ready",
            expectedFailure: true,
          },
        ],
      },
    ];
    expect(
      validateResponseFixtures(responses, DEFAULTS.browser.baseURL),
    ).toEqual([]);
    expect(
      validateFixtureActions(responses, [
        { type: "releaseResponseAlias", alias: "typo" },
      ]),
    ).toHaveLength(1);
    for (const sequence of [
      [],
      [null],
      [{ status: 999 }],
      [{ status: 200, expectedFailure: true }],
      [{ release: "same" }, { release: "same" }],
    ])
      expect(
        validateResponseFixtures(
          [{ url: "/api", sequence }] as never,
          DEFAULTS.browser.baseURL,
        ).length,
      ).toBeGreaterThan(0);
    await writeFile(
      join(root, ".inteiro/fixtures/async.json"),
      JSON.stringify({
        classification: "synthetic",
        clock: "2026-01-01T00:00:00Z",
        responses,
      }),
    );
    await writeFile(
      join(root, "inteiro.routes.json"),
      JSON.stringify({
        schemaVersion: "1.0",
        routes: [
          {
            id: "async",
            path: "/",
            criticality: "high",
            fixture: "async",
            viewports: ["mobile"],
            modes: ["light-calm"],
            states: [
              {
                id: "default",
                actions: [{ type: "waitForResponseAlias", alias: "typo" }],
              },
            ],
          },
        ],
      }),
    );
    const config = structuredClone(DEFAULTS);
    config.browser.baseURL = "http://127.0.0.1:1";
    const result = await visualTest(root, config);
    expect(result.status).toBe("blocked");
    expect(result.executed).toBe(0);
    expect(result.findings).toEqual([
      expect.objectContaining({
        ruleId: "VIS-DATA-001",
        message: expect.stringContaining("Unknown response alias"),
      }),
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

describe.skipIf(process.env.INTEIRO_BROWSER_UNIT !== "1")(
  "Deterministic async browser states",
  () => {
    it("captures loading, expected error, recovery and success with controlled releases; unexpected app errors still fail", async () => {
      const root = await mkdtemp(join(tmpdir(), "inteiro-async-browser-"));
      const server = createServer((_request, response) => {
        response.setHeader("Content-Type", "text/html");
        response.end(`<!doctype html><html lang="en"><head><title>Async fixture</title><style>body{margin:16px}button{min-width:120px;min-height:48px}</style></head><body><main><h1>Async fixture</h1><p role="status">Loading</p><button>Retry</button></main><script>
        const status=document.querySelector('[role=status]');
        async function load(){status.textContent='Loading';try{const response=await fetch('/api/items');status.textContent=response.ok?'Success':'Expected error';if(!response.ok&&location.search)console.error('unexpected-application-error')}catch{status.textContent='Expected error'}}
        document.querySelector('button').onclick=load;load();
      </script></body></html>`);
      });
      await new Promise<void>((resolve) =>
        server.listen(0, "127.0.0.1", resolve),
      );
      try {
        await mkdir(join(root, ".inteiro/fixtures"), { recursive: true });
        await writeFile(
          join(root, ".inteiro/fixtures/async.json"),
          JSON.stringify({
            classification: "synthetic",
            clock: "2026-01-01T00:00:00Z",
            responses: [
              {
                url: "/api/items",
                sequence: [
                  {
                    status: 503,
                    body: { error: "synthetic" },
                    alias: "error",
                    release: "error-ready",
                    expectedFailure: true,
                  },
                  {
                    status: 200,
                    body: { items: [] },
                    alias: "success",
                    release: "success-ready",
                  },
                ],
              },
            ],
          }),
        );
        const actions: Action[] = [
          { type: "expectText", target: { role: "status" }, value: "Loading" },
          { type: "screenshot" },
          { type: "releaseResponseAlias", alias: "error-ready" },
          { type: "waitForResponseAlias", alias: "error" },
          {
            type: "expectText",
            target: { role: "status" },
            value: "Expected error",
          },
          { type: "screenshot" },
          { type: "click", target: { role: "button", name: "Retry" } },
          { type: "expectText", target: { role: "status" }, value: "Loading" },
          { type: "releaseResponseAlias", alias: "success-ready" },
          { type: "waitForResponseAlias", alias: "success" },
          { type: "expectText", target: { role: "status" }, value: "Success" },
        ];
        const routes = {
          schemaVersion: "1.0",
          routes: [
            {
              id: "async",
              path: "/",
              criticality: "high",
              fixture: "async",
              viewports: ["mobile"],
              modes: ["light-calm"],
              states: [{ id: "default", path: "/", actions }],
            },
          ],
        };
        const save = () =>
          writeFile(join(root, "inteiro.routes.json"), JSON.stringify(routes));
        await save();
        const config = structuredClone(DEFAULTS);
        config.browser.baseURL =
          "http://127.0.0.1:" + (server.address() as { port: number }).port;
        config.browser.timeoutMs = 3000;
        const result = await visualTest(root, config);
        expect(result.executed).toBe(1);
        expect(result.findings.map((f) => f.ruleId)).toEqual(["VIS-BASE-001"]);
        expect(result.actionObservations).toHaveLength(actions.length);
        expect(result.actionCaptures).toHaveLength(2);
        expect(result.responseObservations).toEqual([
          expect.objectContaining({ alias: "error", status: 503 }),
          expect.objectContaining({ alias: "success", status: 200 }),
        ]);
        expect(
          (result.fixtureObservations as any[]).filter(
            (o) => o.type === "release",
          ),
        ).toHaveLength(2);
        // A loading-only state intentionally leaves its response unreleased.
        // Cancelling that request while closing the context is teardown, not
        // an application runtime failure. In-scenario console errors below fail.
        routes.routes[0]!.states[0]!.actions = [actions[0]!, actions[1]!];
        await save();
        const loadingOnly = await visualTest(root, config);
        expect(loadingOnly.executed).toBe(1);
        expect(loadingOnly.findings.map((finding) => finding.ruleId)).toEqual([
          "VIS-BASE-001",
        ]);
        routes.routes[0]!.states[0]!.actions = actions;
        routes.routes[0]!.states[0]!.path = "/?unexpected=1";
        await save();
        const unexpected = await visualTest(root, config);
        expect(unexpected.findings).toContainEqual(
          expect.objectContaining({
            ruleId: "VIS-RUNTIME-001",
            message: "unexpected-application-error",
          }),
        );
        // A third request must fail closed instead of repeating a stale success response.
        routes.routes[0]!.states[0]!.path = "/";
        actions.push({
          type: "click",
          target: { role: "button", name: "Retry" },
        });
        await save();
        const exhausted = await visualTest(root, config);
        expect(exhausted.findings).toContainEqual(
          expect.objectContaining({
            ruleId: "VIS-DATA-001",
            message: expect.stringContaining("sequence exhausted"),
          }),
        );
        actions.pop();
        await save();
        const fixturePath = join(root, ".inteiro/fixtures/async.json");
        const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
        fixture.responses[0].sequence[0].abort = "connectionreset";
        await writeFile(fixturePath, JSON.stringify(fixture));
        const networkRecovery = await visualTest(root, config);
        expect(networkRecovery.findings.map((f) => f.ruleId)).toEqual([
          "VIS-BASE-001",
        ]);
        expect(networkRecovery.responseObservations).toContainEqual(
          expect.objectContaining({
            alias: "error",
            status: 0,
            outcome: "expected-network-failure",
          }),
        );
      } finally {
        await new Promise<void>((resolve) => server.close(() => resolve()));
        await rm(root, { recursive: true, force: true });
      }
    }, 30000);
  },
);
