import { describe, it, expect } from "vitest";
import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { DEFAULTS, merge } from "@inteiro/contracts";
import { visualTest } from "@inteiro/visual";
import { readPublicWorkerValidation } from "../../packages/evaluation/src/worker-bootstrap.ts";
import { createBenchmarkServer } from "../../packages/evaluation/src/grading.ts";
import { gradingCandidate } from "../helpers/grading-candidate.ts";

// Evaluator self-test only: private controls never enter an implementation worker.
describe.skipIf(process.env.INTEIRO_PUBLIC_CONTROL !== "1")(
  "Public browser contracts against synthetic valid controls",
  async () => {
    const tasks = (
      await Promise.all(
        ["public", "heldout"].map(
          async (name) =>
            JSON.parse(await readFile(`benchmarks/tasks.${name}.json`, "utf8"))
              .tasks,
        ),
      )
    ).flat();
    for (const task of tasks)
      it(
        task.id,
        async () => {
          const candidate = await gradingCandidate(task.id, "reference");
          const server = await createBenchmarkServer(candidate.root);
          try {
            const loaded = await readPublicWorkerValidation(
              process.cwd(),
              task.id,
              task.validation,
            );
            for (const file of loaded.publicFiles) {
              const target = join(candidate.root, file.path);
              await mkdir(dirname(target), { recursive: true });
              await writeFile(target, file.bytes);
            }
            const config = merge(
              DEFAULTS,
              JSON.parse(await readFile(task.contract, "utf8")),
            );
            for (const asset of config.browser.fontAssets) {
              const target = join(candidate.root, asset.path);
              await mkdir(dirname(target), { recursive: true });
              await copyFile(asset.path, target);
            }
            await new Promise<void>((resolve) =>
              server.listen(0, "127.0.0.1", resolve),
            );
            const address = server.address();
            if (!address || typeof address === "string")
              throw Error("No browser server address");
            config.browser.baseURL = `http://127.0.0.1:${address.port}`;
            config.browser.startCommand = "";
            // This focused check exercises every state/action at one viewport/mode.
            // The full published viewport/theme matrix remains a separate qualification.
            const routesPath = join(candidate.root, "inteiro.routes.json");
            const manifest = JSON.parse(await readFile(routesPath, "utf8"));
            if (process.env.INTEIRO_PUBLIC_FULL_MATRIX !== "1")
              for (const route of manifest.routes) {
                route.viewports = ["mobile"];
                route.modes = ["light-calm"];
              }
            await writeFile(routesPath, JSON.stringify(manifest));
            const result = await visualTest(candidate.root, config);
            expect(
              result.executed,
              JSON.stringify(result.findings),
            ).toBeGreaterThan(0);
            expect(
              result.findings.filter(
                (finding) => !finding.ruleId.startsWith("VIS-BASE"),
              ),
              task.id,
            ).toEqual([]);
            expect(result.executed).toBe(
              manifest.routes.reduce(
                (count: number, route: any) =>
                  count +
                  route.states.reduce(
                    (states: number, state: any) =>
                      states +
                      route.viewports.filter(
                        (viewport: string) =>
                          !state.viewports ||
                          state.viewports.includes(viewport),
                      ).length *
                        route.modes.length,
                    0,
                  ),
                0,
              ),
            );
          } finally {
            await new Promise<void>((resolve, reject) =>
              server.close((error) => (error ? reject(error) : resolve())),
            );
            await candidate.cleanup();
          }
        },
        240000,
      );
  },
);
