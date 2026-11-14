import { readFile, writeFile, mkdir, rename, unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { setTimeout } from "node:timers/promises";
import {
  hash,
  validateSchema,
  safePath,
  governanceContractHash,
} from "../packages/contracts/src/index.ts";
import {
  publicStateContract,
  familyPatterns,
} from "./public-validation-flows.mjs";

// Public inputs only. Private criteria, controls, mutations and references are never read.
const output = async (path, data) => {
  const bytes = Buffer.from(JSON.stringify(data, null, 2) + "\n");
  const target = safePath(process.cwd(), path),
    temporary = safePath(process.cwd(), path + ".tmp-" + randomUUID());
  try {
    await writeFile(temporary, bytes, { flag: "wx" });
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        await rename(temporary, target);
        break;
      } catch (error) {
        if (
          attempt === 1 ||
          !["UNKNOWN", "EBUSY", "EACCES", "EPERM"].includes(error.code)
        )
          throw error;
        await setTimeout(1000);
      }
    }
  } finally {
    await unlink(temporary).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
  }
  return { path, sha256: hash(bytes) };
};
async function main() {
  await mkdir("benchmarks/validation", { recursive: true });
  let technicalPolicy;
  try {
    const policy = JSON.parse(
      await readFile(".inteiro/technical-attestors.json", "utf8"),
    );
    if (!validateSchema("technical-authority-policy", policy).valid)
      throw Error("Invalid technical authority policy");
    technicalPolicy = await output(
      "benchmarks/validation/technical-authority-policy.json",
      policy,
    );
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  for (const catalogPath of [
    "benchmarks/tasks.public.json",
    "benchmarks/tasks.heldout.json",
  ]) {
    const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
    for (const task of catalog.tasks) {
      const number = task.id.startsWith("heldout-")
        ? Number(task.id.split("-")[1]) + 20
        : Number(task.id.split("-")[1]);
      const directory = "benchmarks/validation/" + task.id;
      await mkdir(directory, { recursive: true });
      const input = JSON.parse(await readFile(task.fixtures[0], "utf8"));
      const fixture = {
        classification: "synthetic",
        clock: input.clock,
        seed: input.seed,
        syntheticText: [
          "rafa@example.test",
          ...new Set(
            JSON.stringify(input).match(
              /[A-Z0-9._%+-]+@(?:[A-Z0-9-]+\.)+(?:test|invalid)/gi,
            ) ?? [],
          ),
        ],
        responses: input.routes.map((route) => ({
          url: route.path,
          method: route.method,
          sequence: route.responses.map((response, index) => ({
            body: response.json,
            status: response.status,
            alias: route.id + "-" + index,
            ...(response.release ? { release: response.release } : {}),
            ...(response.status >= 400 || response.abort
              ? { expectedFailure: true }
              : {}),
            ...(response.abort ? { abort: response.abort } : {}),
          })),
        })),
      };
      const fixtureRef = await output(directory + "/fixture.json", fixture);
      const stateContract = publicStateContract(number, input);
      const routes = await output(directory + "/routes.json", {
        schemaVersion: "1.0",
        routes: [
          {
            id: task.id,
            path:
              number === 28 ? "/src/index.html?view=people" : "/src/index.html",
            criticality: "high",
            fixture: task.id,
            viewports: ["mobile", "tablet", "desktop"],
            modes: ["light", "dark", "contrast-light", "contrast-dark"].flatMap(
              (theme) =>
                ["calm", "focus"].map((density) => theme + "-" + density),
            ),
            states: stateContract.states,
            not_applicable: Object.fromEntries(
              Object.entries(stateContract.coverage)
                .filter(([, value]) => !value.applicable)
                .map(([state, value]) => [state, value.reason]),
            ),
          },
        ],
      });
      const validation = await output(directory + "/manifest.json", {
        schemaVersion: "1.0",
        kind: "public-worker-validation",
        governanceContractHash: governanceContractHash(),
        caseId: task.id,
        patternIds: [familyPatterns[number - 1]],
        coverage: {
          states: stateContract.coverage,
          viewports: ["mobile", "tablet", "desktop"],
          themes: ["light", "dark", "contrast-light", "contrast-dark"],
          densities: ["calm", "focus"],
          keyboard: stateContract.states.flatMap((state) =>
            state.actions.flatMap((action, actionIndex) =>
              ["keyboard", "expectFocused"].includes(action.type)
                ? [{ scenario: state.id, actionIndex }]
                : [],
            ),
          ),
          content: { classification: "synthetic", fixture: fixtureRef },
          reducedMotion: "reduce",
        },
        routes,
        fixtures: [{ id: task.id, ...fixtureRef }],
        ...(technicalPolicy ? { technicalPolicy } : {}),
      });
      task.validation = validation;
    }
    await output(catalogPath, catalog);
  }
}
try {
  await main();
  console.log(
    JSON.stringify({
      status: "passed",
      kind: "public-validation-generation",
      tasks: 40,
    }),
  );
} catch (error) {
  console.log(
    JSON.stringify({
      status: "error",
      kind: "public-validation-generation",
      code: error.code ?? null,
      message: String(error),
    }),
  );
  process.exitCode = 8;
}
