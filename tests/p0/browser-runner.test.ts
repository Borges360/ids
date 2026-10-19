import { describe, it, expect } from "vitest";
import { createServer } from "node:http";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateKeyPairSync, sign } from "node:crypto";
import { DEFAULTS, hash, canonical } from "@inteiro/contracts";
import { visualTest } from "@inteiro/visual";
import { createResponseAliases, sanitizeCapture } from "@inteiro/visual";
import { chromium } from "@playwright/test";
import {
  registry,
  approveBaseline,
  baselineMetadataHash,
} from "@inteiro/visual/baseline";
describe.skipIf(process.env.INTEIRO_BROWSER_UNIT !== "1")(
  "P0 real browser pipeline and baseline lifecycle",
  () => {
    it("times out missing responses, rejects unknown aliases and sanitizes capture DOM", async () => {
      const browser = await chromium.launch({ headless: true });
      try {
        const page = await browser.newPage();
        const responses = createResponseAliases(
          page,
          [{ url: "/missing", alias: "missing", body: {} }],
          "http://127.0.0.1",
          25,
        );
        await expect(responses.waitFor("unknown")).rejects.toThrow(
          "Unknown response alias",
        );
        await expect(responses.waitFor("missing")).rejects.toThrow("Timed out");
        responses.dispose();
        await expect(responses.waitFor("missing")).rejects.toThrow("closed");
        await page.setContent(
          '<main>person@example.invalid<input value="sk-abcdefghijklmnopqrstuv"></main>',
        );
        expect(await sanitizeCapture(page)).toBe(3);
        expect(await page.locator("main").innerText()).toBe("[EMAIL]");
        expect(await page.locator("input").inputValue()).toBe("[REDACTED]");
      } finally {
        await browser.close();
      }
    });
    it("blocks initial golden, rejects tampering, compares approved image and detects overflow", async () => {
      const root = await mkdtemp(join(tmpdir(), "inteiro-browser-"));
      let overflow = false;
      const server = createServer((req, res) => {
        res.setHeader("content-type", "text/html");
        res.end(
          '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Fixture</title><body><main' +
            (overflow ? ' style="width:2000px"' : "") +
            '><h1>Teste sintético</h1><button type="button">Ação</button><p id="result">Carregando</p></main><script>fetch("/api/state",{method:"POST"}).then(r=>r.json()).then(data=>document.getElementById("result").textContent=data.message)</script></body></html>',
        );
      });
      await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
      try {
        const address = server.address() as { port: number };
        const config = structuredClone(DEFAULTS);
        config.browser.baseURL = "http://127.0.0.1:" + address.port;
        config.browser.viewports = [{ id: "mobile", width: 375, height: 812 }];
        config.browser.timeoutMs = 2000;
        await mkdir(join(root, ".inteiro/fixtures"), { recursive: true });
        await writeFile(
          join(root, ".inteiro/fixtures/synthetic.json"),
          JSON.stringify({
            classification: "synthetic",
            responses: [
              {
                url: "/api/state",
                method: "POST",
                alias: "state",
                body: { message: "Pronto" },
              },
            ],
            clock: "2026-10-18T12:00:00Z",
          }),
        );
        await writeFile(
          join(root, "inteiro.routes.json"),
          JSON.stringify({
            schemaVersion: "1.0",
            routes: [
              {
                id: "fixture",
                path: "/",
                criticality: "high",
                fixture: "synthetic",
                viewports: ["mobile"],
                modes: ["light-calm"],
                states: [
                  {
                    id: "default",
                    actions: [
                      { type: "expectVisible", target: { role: "main" } },
                      { type: "waitForResponseAlias", alias: "state" },
                      {
                        type: "expectText",
                        target: { role: "main" },
                        value: "Pronto",
                      },
                      { type: "screenshot", target: { role: "main" } },
                    ],
                  },
                ],
              },
            ],
          }),
        );
        const initial = await visualTest(root, config, { propose: true });
        expect(initial.status, JSON.stringify(initial)).toBe("blocked");
        expect(initial.findings.map((f) => f.ruleId)).toContain("VIS-BASE-001");
        expect(initial.responseObservations).toEqual([
          expect.objectContaining({
            alias: "state",
            method: "POST",
            status: 200,
          }),
        ]);
        const actionCaptures = initial.actionCaptures as {
          actual: string;
          sha256: string;
        }[];
        expect(actionCaptures).toHaveLength(1);
        expect(
          hash(await readFile(join(root, actionCaptures[0]!.actual))),
        ).toBe(actionCaptures[0]!.sha256);
        const entries = await registry(root, config.visual.baselineDir);
        expect(entries).toHaveLength(1);
        const candidate = entries[0]!;
        expect(candidate.state).toBe("proposed");
        const { publicKey, privateKey } = generateKeyPairSync("ed25519");
        const policy = {
          reviewers: {
            "synthetic-test-reviewer": publicKey
              .export({ format: "pem", type: "spki" })
              .toString(),
          },
        };
        await writeFile(
          join(root, ".inteiro/reviewers.json"),
          JSON.stringify(policy),
        );
        const payload = {
          reviewId: "synthetic-test-only",
          candidateId: candidate.id,
          candidateHash: baselineMetadataHash(candidate),
          imageSha256: candidate.imageSha256,
          sourceCommit: candidate.sourceCommit,
          contractHash: candidate.contractHash,
          policyHash: hash(policy),
          reviewer: "synthetic-test-reviewer",
          reason: "Synthetic test fixture, not product approval",
          approvedAt: new Date().toISOString(),
          expiresAt: "2099-01-01",
        };
        const approval = {
          ...payload,
          signature: sign(
            null,
            Buffer.from(canonical(payload)),
            privateKey,
          ).toString("base64"),
        };
        await expect(
          approveBaseline(
            root,
            config.visual.baselineDir,
            { ...approval, imageSha256: "tampered" },
            policy,
          ),
        ).rejects.toThrow();
        await approveBaseline(
          root,
          config.visual.baselineDir,
          approval,
          policy,
        );
        const approved = await visualTest(root, config);
        expect(approved.status, JSON.stringify(approved)).toBe("passed");
        config.browser.requiredFonts = ["UnavailableFixtureFont"];
        const missingFont = await visualTest(root, config);
        expect(missingFont.status).toBe("error");
        expect(
          missingFont.findings.some((f) => f.ruleId === "VIS-ENV-001"),
        ).toBe(true);
        config.browser.requiredFonts = [];
        overflow = true;
        const regression = await visualTest(root, config);
        expect(regression.status).toBe("failed");
        expect(regression.findings.map((f) => f.ruleId)).toContain(
          "VIS-LAYOUT-001",
        );
        expect(regression.findings.map((f) => f.ruleId)).toContain(
          "VIS-DIFF-001",
        );
      } finally {
        await new Promise<void>((r) => server.close(() => r()));
        await rm(root, { recursive: true, force: true });
      }
    }, 30000);
    it("reports unreachable infrastructure without suggesting CSS repair", async () => {
      const root = await mkdtemp(join(tmpdir(), "inteiro-infra-"));
      try {
        await writeFile(
          join(root, "inteiro.routes.json"),
          JSON.stringify({
            schemaVersion: "1.0",
            routes: [
              {
                id: "fixture",
                path: "/",
                criticality: "normal",
                fixture: "synthetic",
                viewports: ["mobile"],
                modes: ["light-calm"],
                states: [{ id: "default", actions: [] }],
              },
            ],
          }),
        );
        const config = structuredClone(DEFAULTS);
        config.browser.baseURL = "http://127.0.0.1:1";
        config.browser.timeoutMs = 250;
        const r = await visualTest(root, config);
        expect(r.status).toBe("error");
        expect(r.findings[0]!.ruleId).toBe("VIS-ENV-001");
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    });
  },
);
