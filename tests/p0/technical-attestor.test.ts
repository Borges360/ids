import { describe, it, expect } from "vitest";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  rm,
  unlink,
} from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { createServer } from "node:http";
import { execFileSync } from "node:child_process";
import { generateKeyPairSync } from "node:crypto";
import { DEFAULTS } from "@inteiro/contracts";
import { recordTaskContext } from "@inteiro/agent-core";
import { installHarness } from "../../packages/cli/src/install-agents.ts";
import { registry } from "@inteiro/visual/baseline";

describe.skipIf(process.env.INTEIRO_BROWSER_UNIT !== "1")(
  "Independent automatic baseline evaluator",
  () => {
    it("reruns real checks, rejects a candidate-local key and retroactive intent, promotes only declared changes", async () => {
      const base = await mkdtemp(join(tmpdir(), "inteiro-attestor-")),
        root = join(base, "candidate");
      await mkdir(join(root, "src"), { recursive: true });
      const html =
        '<!doctype html><html lang="en"><head><title>Synthetic evaluator fixture</title><link rel="stylesheet" href="/styles.css"></head><body class="in-composition"><main><h1>Synthetic fixture</h1><button type="button" class="in-button in-button--primary">Action</button></main></body></html>';
      await writeFile(join(root, "src/index.html"), html);
      const server = createServer(async (request, response) => {
        try {
          const path = new URL(request.url ?? "/", "http://fixture.invalid")
            .pathname;
          if (path === "/styles.css") {
            response.setHeader("Content-Type", "text/css");
            response.end(
              await readFile("packages/composition/dist/composition.css"),
            );
          } else if (/^\/fonts\/recursive-[a-z-]+\.woff2$/.test(path)) {
            response.setHeader("Content-Type", "font/woff2");
            response.end(await readFile("packages/composition" + path));
          } else {
            response.setHeader("Content-Type", "text/html");
            response.end(await readFile(join(root, "src/index.html")));
          }
        } catch {
          response.statusCode = 404;
          response.end();
        }
      });
      await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
      try {
        const { attestBaselines, declareVisualIntent } = await import(
          pathToFileURL(resolve("scripts/attest-baselines.mjs")).href
        );
        const config = structuredClone(DEFAULTS);
        config.governance.mode = "technical-autonomous";
        config.context.harness = "pi";
        config.project.framework = "html";
        config.browser.baseURL =
          "http://127.0.0.1:" + (server.address() as { port: number }).port;
        config.browser.timeoutMs = 3000;
        config.static.include = ["src/*.html"];
        await writeFile(
          join(root, "inteiro.config.json"),
          JSON.stringify(config),
        );
        await writeFile(
          join(root, ".gitignore"),
          ".inteiro/reports/\n.inteiro/contexts/\n",
        );
        execFileSync("git", ["init"], { cwd: root, stdio: "ignore" });
        execFileSync("git", ["add", "src"], { cwd: root, stdio: "ignore" });
        execFileSync(
          "git",
          [
            "-c",
            "user.name=Synthetic",
            "-c",
            "user.email=fixture@example.invalid",
            "commit",
            "-m",
            "Synthetic evaluator fixture",
          ],
          { cwd: root, stdio: "ignore" },
        );
        await installHarness(root, "pi", { dryRun: false, yes: true });
        await mkdir(join(root, ".inteiro/fixtures"), { recursive: true });
        await writeFile(
          join(root, "inteiro.routes.json"),
          JSON.stringify({
            schemaVersion: "1.0",
            routes: [
              {
                id: "fixture",
                path: "/",
                fixture: "synthetic",
                criticality: "high",
                viewports: ["mobile"],
                modes: ["light-calm"],
                states: [
                  {
                    id: "default",
                    actions: [
                      {
                        type: "expectReachable",
                        target: { role: "button", name: "Action" },
                      },
                    ],
                  },
                ],
              },
            ],
          }),
        );
        await writeFile(
          join(root, ".inteiro/fixtures/synthetic.json"),
          JSON.stringify({
            classification: "synthetic",
            clock: "2026-01-01T00:00:00Z",
          }),
        );
        const { publicKey, privateKey } = generateKeyPairSync("ed25519");
        const privatePem = privateKey.export({ format: "pem", type: "pkcs8" }),
          keyFile = join(base, "authority.pem");
        await writeFile(keyFile, privatePem, { mode: 0o600 });
        await writeFile(
          join(root, ".inteiro/technical-attestors.json"),
          JSON.stringify({
            schemaVersion: "1.0",
            authorities: {
              fixture: publicKey
                .export({ format: "pem", type: "spki" })
                .toString(),
            },
          }),
        );
        expect(
          (
            await recordTaskContext(root, config, {
              schemaVersion: "1.0",
              id: "synthetic-evaluator",
              type: "new-page",
              description: "Synthetic automatic evaluator integration",
              patternIds: ["form-layout"],
              scope: { allowedFiles: ["src/index.html"] },
              acceptanceCriteria: [
                "Button reachable and baseline technically attested",
              ],
            })
          ).status,
        ).toBe("passed");
        const args = { cwd: root, keyFile, authority: "fixture" };
        const localKey = join(root, "candidate-key.pem");
        await writeFile(localKey, privatePem);
        await expect(
          attestBaselines({ ...args, keyFile: localKey }),
        ).rejects.toThrow("outside the candidate filesystem");
        await unlink(localKey);
        const first = await attestBaselines(args);
        expect(first, JSON.stringify(first)).toMatchObject({
          status: "passed",
          kind: "automatic-baseline-promotion",
          humanApproval: "not-applicable",
        });
        expect(first.promoted).toHaveLength(1);
        expect(await attestBaselines(args)).toMatchObject({
          status: "passed",
          kind: "automatic-baseline-noop",
          promoted: [],
        });
        const previous = (await registry(root, config.visual.baselineDir))[0]!;
        await writeFile(
          join(root, "src/index.html"),
          html.replace("Synthetic fixture", "Retroactive change"),
        );
        await expect(
          declareVisualIntent({
            ...args,
            baselineKey: previous.key,
            allowedRegions: [{ x: 0, y: 0, width: 375, height: 812 }],
            reason: "Synthetic intent",
          }),
        ).rejects.toThrow("before source changes");
        await writeFile(join(root, "src/index.html"), html);
        expect(
          (
            await declareVisualIntent({
              ...args,
              baselineKey: previous.key,
              allowedRegions: [{ x: 0, y: 0, width: 375, height: 812 }],
              reason: "Synthetic full fixture heading change",
            })
          ).status,
        ).toBe("passed");
        await writeFile(
          join(root, "src/index.html"),
          html.replace(
            "Synthetic fixture",
            "Changed technical fixture with a distinct heading",
          ),
        );
        const changed = await attestBaselines(args);
        expect(changed, JSON.stringify(changed)).toMatchObject({
          status: "passed",
          kind: "automatic-baseline-promotion",
        });
        expect(
          (await registry(root, config.visual.baselineDir)).filter(
            (entry) => entry.state === "superseded",
          ),
        ).toHaveLength(1);
      } finally {
        await new Promise<void>((done) => server.close(() => done()));
        await rm(base, { recursive: true, force: true });
      }
    }, 30000);
  },
);
