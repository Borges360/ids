import { describe, it, expect } from "vitest";
import { createServer } from "node:http";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateKeyPairSync, sign } from "node:crypto";
import { DEFAULTS, hash, canonical } from "@inteiro/contracts";
import { visualTest } from "@inteiro/visual";
import {
  registry,
  approveBaseline,
  baselineMetadataHash,
} from "@inteiro/visual/baseline";
describe.skipIf(process.env.INTEIRO_BROWSER_UNIT !== "1")(
  "P0 real browser pipeline and baseline lifecycle",
  () => {
    it("blocks initial golden, rejects tampering, compares approved image and detects overflow", async () => {
      const root = await mkdtemp(join(tmpdir(), "inteiro-browser-"));
      let overflow = false;
      const server = createServer((req, res) => {
        res.setHeader("content-type", "text/html");
        res.end(
          '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Fixture</title><body><main' +
            (overflow ? ' style="width:2000px"' : "") +
            '><h1>Teste sintético</h1><button type="button">Ação</button></main></body></html>',
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
