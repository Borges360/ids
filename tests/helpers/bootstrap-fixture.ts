import { mkdir, writeFile, readFile, copyFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash, generateKeyPairSync } from "node:crypto";
import { hash } from "@inteiro/contracts";
import { workerFixture } from "./worker-fixture.ts";
export async function bootstrapFixture(realDistribution = false) {
  const fixture = await workerFixture();
  const write = async (path: string, value: unknown) => {
    const absolute = join(fixture.dataset, path);
    await mkdir(join(absolute, ".."), { recursive: true });
    await writeFile(absolute, JSON.stringify(value, null, 2));
    return { path, sha256: hash(await readFile(absolute)) };
  };
  const response = await write("benchmarks/validation/task-01/fixture.json", {
    classification: "synthetic",
    clock: "2026-01-01T12:00:00.000Z",
    responses: [
      {
        url: "/api/users",
        method: "POST",
        status: 201,
        alias: "create",
        body: {
          id: "sample-user",
          name: "Pessoa de exemplo",
          email: "pessoa@example.test",
        },
      },
    ],
  });
  const routes = await write("benchmarks/validation/task-01/routes.json", {
    schemaVersion: "1.0",
    routes: [
      {
        id: "task-01",
        path: "/src/index.html",
        criticality: "high",
        fixture: "public-task-01",
        viewports: ["mobile", "desktop"],
        modes: ["light-calm", "dark-focus"],
        states: [
          {
            id: "default",
            actions: [{ type: "expectVisible", target: { role: "main" } }],
          },
          {
            id: "invalid",
            actions: [
              {
                type: "fill",
                target: { role: "textbox", name: "Nome" },
                value: "Pessoa de exemplo",
              },
              {
                type: "fill",
                target: { role: "textbox", name: "E-mail" },
                value: "invalid",
              },
              {
                type: "click",
                target: { role: "button", name: "Criar cadastro" },
              },
            ],
          },
          {
            id: "success",
            actions: [
              {
                type: "fill",
                target: { role: "textbox", name: "Nome" },
                value: "Pessoa de exemplo",
              },
              {
                type: "fill",
                target: { role: "textbox", name: "E-mail" },
                value: "pessoa@example.test",
              },
              {
                type: "click",
                target: { role: "button", name: "Criar cadastro" },
              },
              { type: "waitForResponseAlias", alias: "create" },
              {
                type: "expectText",
                target: { role: "status" },
                value: "Cadastro criado",
              },
            ],
          },
        ],
      },
    ],
  });
  const validation = await write("benchmarks/validation/task-01.json", {
    schemaVersion: "1.0",
    kind: "public-worker-validation",
    caseId: "task-01",
    patternIds: ["form-layout"],
    routes,
    fixtures: [{ id: "public-task-01", ...response }],
    reviewPolicy: await write(
      "benchmarks/validation/task-01/reviewer-policy.json",
      {
        schemaVersion: "1.0",
        reviewers: {
          "synthetic-bootstrap-reviewer": generateKeyPairSync(
            "ed25519",
          ).publicKey.export({ type: "spki", format: "pem" }),
        },
      },
    ),
  });
  const tasks = JSON.parse(
    await readFile(
      join(fixture.dataset, "benchmarks/tasks.public.json"),
      "utf8",
    ),
  );
  tasks.tasks[0].validation = validation;
  await write("benchmarks/tasks.public.json", tasks);
  await mkdir(join(fixture.dataset, "artifacts/tarballs"), { recursive: true });
  if (realDistribution) {
    const manifest = JSON.parse(
      await readFile("artifacts/p0-package-manifest.json", "utf8"),
    );
    if (!manifest.sourceCommit) {
      const proof = JSON.parse(
        await readFile("artifacts/p0-cost-accounting-proof.json", "utf8"),
      );
      if (proof.sourceHash !== manifest.sourceHash)
        throw Error("Prior distribution provenance unavailable");
      manifest.sourceCommit = proof.sourceCommit;
    }
    await write("artifacts/p0-package-manifest.json", manifest);
    for (const pkg of manifest.packages)
      await copyFile(
        join("artifacts/tarballs", pkg.filename),
        join(fixture.dataset, "artifacts/tarballs", pkg.filename),
      );
    const offline = JSON.parse(
      await readFile("artifacts/p0-offline.json", "utf8"),
    );
    if (offline.sourceHash !== manifest.sourceHash)
      throw Error("Dependency lock provenance differs");
    await copyFile(
      join(offline.consumerRoot, "package-lock.json"),
      join(fixture.dataset, "artifacts/dependency-lock.json"),
    );
  } else {
    const names = [
      "tokens",
      "contracts",
      "composition",
      "agent-core",
      "lint",
      "evaluation",
      "visual",
      "cli",
      "mcp",
      "design-system",
      "react",
    ];
    const packages = [];
    const lock: any = {
      name: "synthetic-bootstrap",
      lockfileVersion: 3,
      packages: { "": { name: "synthetic-bootstrap", dependencies: {} } },
    };
    for (const name of names) {
      const filename = `inteiro-${name}-1.2.0.tgz`,
        bytes = Buffer.from(
          "Synthetic dry-run integrity fixture only: " + name,
        ),
        integrity =
          "sha512-" + createHash("sha512").update(bytes).digest("base64");
      await writeFile(
        join(fixture.dataset, "artifacts/tarballs", filename),
        bytes,
      );
      packages.push({
        name: "@inteiro/" + name,
        version: "1.2.0",
        filename,
        integrity,
      });
      lock.packages[""].dependencies["@inteiro/" + name] =
        "file:../tarballs/" + filename;
      lock.packages["node_modules/@inteiro/" + name] = {
        version: "1.2.0",
        resolved: "file:../tarballs/" + filename,
        integrity,
      };
    }
    await write("artifacts/p0-package-manifest.json", {
      schemaVersion: "1.0",
      sourceCommit: "a".repeat(40),
      sourceHash: "b".repeat(64),
      packages,
    });
    await write("artifacts/dependency-lock.json", lock);
  }
  return {
    ...fixture,
    validation,
    options: {
      distributionManifest: "artifacts/p0-package-manifest.json",
      dependencyLock: "artifacts/dependency-lock.json",
      harness: "pi" as const,
    },
  };
}
