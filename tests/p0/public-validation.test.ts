import { it, expect } from "vitest";
import {
  readFile,
  readdir,
  mkdtemp,
  rm,
  realpath,
  mkdir,
  writeFile,
} from "node:fs/promises";
import { join, dirname, basename } from "node:path";
import { tmpdir } from "node:os";
import { DEFAULTS, merge, hash } from "@inteiro/contracts";
import {
  validateRoutes,
  validateResponseFixtures,
  validateFixtureActions,
} from "@inteiro/visual";
import { readPublicWorkerValidation } from "../../packages/evaluation/src/worker-bootstrap.ts";
import {
  prepareBenchmarkWorker,
  auditBenchmarkWorker,
} from "@inteiro/evaluation/workspace";

async function tasks() {
  return (
    await Promise.all(
      ["benchmarks/tasks.public.json", "benchmarks/tasks.heldout.json"].map(
        async (path) => JSON.parse(await readFile(path, "utf8")).tasks,
      ),
    )
  ).flat();
}
it("publishes intact routes, deterministic fixtures and executable public action contracts for all 40 tasks", async () => {
  const catalog = await tasks();
  expect(catalog).toHaveLength(40);
  for (const task of catalog) {
    const loaded = await readPublicWorkerValidation(
      process.cwd(),
      task.id,
      task.validation,
    );
    expect(loaded.validation.coverage?.themes, task.id).toHaveLength(4);
    expect(loaded.validation.coverage?.densities, task.id).toHaveLength(2);
    expect(loaded.validation.coverage?.content.classification).toBe(
      "synthetic",
    );
    const config = merge(
      DEFAULTS,
      JSON.parse(await readFile(task.contract, "utf8")),
    );
    const routes = JSON.parse(
      loaded.publicFiles
        .find((file) => file.path === "inteiro.routes.json")!
        .bytes.toString(),
    ).routes;
    expect(validateRoutes(routes, config), task.id).toEqual([]);
    for (const route of routes)
      for (const state of route.states) {
        const fixture = JSON.parse(
          loaded.publicFiles
            .find(
              (file) =>
                file.path ===
                ".inteiro/fixtures/" +
                  (state.fixture ?? route.fixture) +
                  ".json",
            )!
            .bytes.toString(),
        );
        expect(
          validateResponseFixtures(fixture.responses, config.browser.baseURL),
          task.id,
        ).toEqual([]);
        expect(
          validateFixtureActions(fixture.responses, state.actions),
          task.id,
        ).toEqual([]);
      }
    expect(
      loaded.publicFiles.every(
        (file) => !/(?:criteria|control|mutation|reference)/.test(file.path),
      ),
    ).toBe(true);
    await expect(
      readPublicWorkerValidation(process.cwd(), task.id, {
        ...task.validation,
        sha256: "0".repeat(64),
      }),
    ).rejects.toThrow("snapshot");
  }
});

it("rejects intact-hash public coverage that points to absent states, keyboard actions, modes or fixtures", async () => {
  const task = (await tasks())[0];
  const temporary = await mkdtemp(join(tmpdir(), "inteiro-public-coverage-"));
  try {
    const manifest = JSON.parse(await readFile(task.validation.path, "utf8"));
    for (const resource of [
      manifest.routes,
      ...manifest.fixtures,
      manifest.technicalPolicy,
    ].filter(Boolean)) {
      await mkdir(dirname(join(temporary, resource.path)), { recursive: true });
      await writeFile(
        join(temporary, resource.path),
        await readFile(resource.path),
      );
    }
    const invalid = [
      (value: any) => {
        value.coverage.states.default.scenario = "absent";
      },
      (value: any) => {
        value.coverage.keyboard.push({ scenario: "default", actionIndex: 0 });
      },
      (value: any) => {
        value.coverage.viewports.push("absent");
      },
      (value: any) => {
        value.coverage.content.fixture.sha256 = "0".repeat(64);
      },
      (value: any) => {
        value.coverage.states.default = {
          applicable: true,
          scenario: "default",
          phase: "action-capture",
          actionIndex: 0,
        };
      },
    ];
    for (const mutate of invalid) {
      const value = structuredClone(manifest);
      mutate(value);
      const bytes = JSON.stringify(value);
      await writeFile(join(temporary, task.validation.path), bytes);
      await expect(
        readPublicWorkerValidation(temporary, task.id, {
          ...task.validation,
          sha256: hash(Buffer.from(bytes)),
        }),
      ).rejects.toThrow(/coverage/);
    }
  } finally {
    const actual = await realpath(temporary);
    if (
      dirname(actual) !== (await realpath(tmpdir())) ||
      !basename(actual).startsWith("inteiro-public-coverage-")
    )
      throw Error("Unsafe temporary cleanup");
    await rm(actual, { recursive: true, force: true });
  }
});

it("prepares and audits all 40 public contracts without copying independent grading criteria to a candidate", async () => {
  const temporary = await mkdtemp(join(tmpdir(), "inteiro-public40-"));
  const files = async (root: string, prefix = ""): Promise<string[]> => {
    const result: string[] = [];
    for (const entry of await readdir(join(root, prefix), {
      withFileTypes: true,
    })) {
      if (entry.name === ".git") continue;
      const path = prefix ? prefix + "/" + entry.name : entry.name;
      if (entry.isDirectory()) result.push(...(await files(root, path)));
      else result.push(path);
    }
    return result;
  };
  try {
    for (const task of await tasks()) {
      const target = join(temporary, task.id);
      const prepared = await prepareBenchmarkWorker(
        process.cwd(),
        target,
        task.id,
      );
      expect(prepared.status).toBe("passed");
      if (prepared.status !== "passed")
        throw Error("Unexpected preparation plan");
      expect(prepared.readyForValidation).toBe(false); // Distribution installation is a separate qualification stage.
      expect(
        (await auditBenchmarkWorker(process.cwd(), prepared.id)).status,
        task.id,
      ).toBe("passed");
      expect(await files(target)).not.toContainEqual(
        expect.stringMatching(
          /(?:evaluator|criteria|mutation|controls|reference-implementation)/,
        ),
      );
      const provenance = JSON.parse(
        await readFile(join(target, ".inteiro/public-validation.json"), "utf8"),
      );
      expect(provenance.manifestHash).toBe(task.validation.sha256);
      for (const resource of provenance.resources)
        expect(hash(await readFile(join(target, resource.path)))).toBe(
          resource.sha256,
        );
    }
  } finally {
    const actual = await realpath(temporary);
    if (
      dirname(actual) !== (await realpath(tmpdir())) ||
      !basename(actual).startsWith("inteiro-public40-")
    )
      throw Error("Unsafe temporary cleanup");
    await rm(actual, { recursive: true, force: true });
  }
}, 60000);
