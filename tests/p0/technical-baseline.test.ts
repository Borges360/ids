import { it, expect } from "vitest";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { generateKeyPairSync, sign } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import {
  hash,
  canonical,
  governanceContractHash,
  reviewSourceHash,
} from "@inteiro/contracts";
import {
  proposeBaseline,
  registry,
  baselineMetadataHash,
} from "@inteiro/visual/baseline";
import {
  BASELINE_TECHNICAL_CHECKS,
  promoteTechnicalBaseline,
  verifyTechnicalBaselineApproval,
  verifyVisualChangeIntent,
  type TechnicalBaselineApproval,
  type VisualChangeIntent,
} from "@inteiro/visual/technical-baseline";

it("separates capture, technical validation and promotion; preserves predecessors and requires prior signed intent", async () => {
  const root = await mkdtemp(join(tmpdir(), "inteiro-machine-baseline-"));
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const policy = {
    schemaVersion: "1.0" as const,
    authorities: {
      machine: publicKey.export({ format: "pem", type: "spki" }).toString(),
    },
  };
  const seal = <T extends { signature: string }>(value: T): T => {
    const { signature: _, ...payload } = value;
    return {
      ...value,
      signature: sign(
        null,
        Buffer.from(canonical(payload)),
        privateKey,
      ).toString("base64"),
    };
  };
  try {
    const { PNG } = createRequire(import.meta.url)("pngjs");
    const image = (value: number) => {
      const png = new PNG({ width: 2, height: 1 });
      png.data.fill(value);
      return PNG.sync.write(png);
    };
    const git = (...args: string[]) =>
      execFileSync("git", args, {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();
    git("init");
    await writeFile(
      join(root, ".gitignore"),
      "references/\nactual.png\nchecks.json\n",
    );
    await writeFile(join(root, "ui.html"), "synthetic-original-source");
    git("add", ".");
    git(
      "-c",
      "user.name=Fixture",
      "-c",
      "user.email=fixture@example.invalid",
      "commit",
      "-m",
      "Synthetic source",
    );
    await writeFile(join(root, "actual.png"), image(1));
    await writeFile(join(root, "checks.json"), "synthetic-check-output");
    const data = {
      key: "fixture-key",
      image: "actual.png",
      sourceCommit: git("rev-parse", "HEAD"),
      sourceHash: await reviewSourceHash(root),
      sourcePullRequest: "",
      contractHash: "c".repeat(64),
      fixtureHash: "d".repeat(64),
      environmentFingerprint: "e".repeat(64),
      projectId: "fixture",
      routeId: "route",
      stateId: "default",
      viewportId: "mobile",
      theme: "dark",
      density: "calm",
      browserVersion: "synthetic",
      renderProfile: "synthetic",
    };
    const first = await proposeBaseline(root, "references", data);
    expect(first.state).toBe("proposed");
    const receipt = (
      candidate: typeof first,
      intent?: VisualChangeIntent,
    ): TechnicalBaselineApproval =>
      seal({
        schemaVersion: "1.0",
        kind: "automatic-technical-verification",
        purpose: "baseline-promotion",
        authority: "machine",
        governanceContractHash: governanceContractHash(),
        policyHash: hash(policy),
        sourceCommit: candidate.sourceCommit,
        sourceHash: candidate.sourceHash!,
        configHash: candidate.contractHash,
        status: "passed",
        exitCode: 0,
        requirements: ["E05"],
        checks: BASELINE_TECHNICAL_CHECKS.map((command) => ({
          command,
          status: "passed",
          exitCode: 0,
          evidence: [
            {
              path: "checks.json",
              sha256: hash(Buffer.from("synthetic-check-output")),
            },
          ],
        })),
        candidateId: candidate.id,
        candidateHash: baselineMetadataHash(candidate),
        imageSha256: candidate.imageSha256,
        startedAt: new Date(Date.now() - 1000).toISOString(),
        finishedAt: new Date(Date.now() - 500).toISOString(),
        expiresAt: new Date(Date.now() + 60000).toISOString(),
        signature: "",
        ...(intent ? { intent } : {}),
      });
    const incomplete = receipt(first);
    incomplete.checks.pop();
    expect(() =>
      verifyTechnicalBaselineApproval(seal(incomplete), first, policy),
    ).toThrow("incomplete");
    const forged = { ...receipt(first), signature: "" };
    await expect(
      promoteTechnicalBaseline(root, "references", forged, policy),
    ).rejects.toThrow();
    await promoteTechnicalBaseline(root, "references", receipt(first), policy);
    expect((await registry(root, "references"))[0]).toMatchObject({
      state: "approved",
      approvedBy: "automatic:machine",
    });
    await writeFile(join(root, "actual.png"), image(2));
    await writeFile(join(root, "ui.html"), "synthetic-deliberate-change");
    const second = await proposeBaseline(root, "references", {
      ...data,
      sourceHash: await reviewSourceHash(root),
    });
    expect(second.previousBaselineId).toBe(first.id);
    await expect(
      promoteTechnicalBaseline(root, "references", receipt(second), policy),
    ).rejects.toThrow("intent");
    const intent = seal({
      kind: "declared-visual-change" as const,
      allowedRegions: [{ x: 0, y: 0, width: 2, height: 1 }],
      authority: "machine",
      policyHash: hash(policy),
      key: first.key,
      previousBaselineId: first.id,
      previousImageSha256: first.imageSha256,
      sourceHashBeforeChange: first.sourceHash!,
      reason: "Synthetic deliberate change declared before validation",
      declaredAt: new Date(Date.now() - 3000).toISOString(),
      signature: "",
    });
    const narrowIntent = seal({
      ...intent,
      allowedRegions: [{ x: 0, y: 0, width: 1, height: 1 }],
    });
    expect(() =>
      verifyVisualChangeIntent(
        intent,
        second,
        first,
        policy,
        intent.declaredAt,
      ),
    ).not.toThrow();
    expect(() =>
      verifyVisualChangeIntent(
        intent,
        second,
        first,
        policy,
        new Date(Date.parse(intent.declaredAt) - 1).toISOString(),
      ),
    ).toThrow("intent");
    expect(() =>
      verifyVisualChangeIntent(
        seal({ ...intent, sourceHashBeforeChange: second.sourceHash! }),
        second,
        first,
        policy,
        intent.declaredAt,
      ),
    ).toThrow("intent");
    await expect(
      promoteTechnicalBaseline(
        root,
        "references",
        receipt(second, narrowIntent),
        policy,
      ),
    ).rejects.toThrow("outside prior visual intent");
    const approved = await promoteTechnicalBaseline(
      root,
      "references",
      receipt(second, intent),
      policy,
    );
    const entries = await registry(root, "references");
    expect(entries[0]!.state).toBe("superseded");
    expect(entries[1]!.state).toBe("approved");
    expect(await readFile(join(root, entries[0]!.image))).toEqual(image(1));
    expect(() =>
      verifyTechnicalBaselineApproval(
        receipt(second, intent),
        { ...approved, fixtureHash: "0".repeat(64) },
        policy,
        first,
      ),
    ).toThrow();
    await expect(
      promoteTechnicalBaseline(
        root,
        "references",
        receipt(second, intent),
        policy,
      ),
    ).rejects.toThrow("unavailable");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
