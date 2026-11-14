import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEFAULTS,
  hash,
  resolveConfig,
  type Config,
} from "@inteiro/contracts";
import { baselineContractHash } from "../../packages/visual/src/baseline.ts";

describe("visual baseline contract hash", () => {
  it("keeps existing Pi baseline approvals valid for Codex", () => {
    const pi = structuredClone(DEFAULTS) as Config;
    pi.context.harness = "pi";
    const codex = structuredClone(pi);
    codex.context.harness = "codex";

    expect(baselineContractHash(pi)).toBe(hash(pi));
    expect(baselineContractHash(codex)).toBe(hash(pi));
    expect(baselineContractHash(codex)).not.toBe(hash(codex));
  });

  it("still binds visual and browser configuration", () => {
    const baseline = structuredClone(DEFAULTS) as Config;
    baseline.context.harness = "pi";
    const changed = structuredClone(baseline);
    changed.visual.maxDiffPixelRatio += 0.001;

    expect(baselineContractHash(changed)).not.toBe(
      baselineContractHash(baseline),
    );
  });

  it("matches the contract hash already recorded by the IDS baseline registry", async () => {
    const { config } = await resolveConfig(process.cwd());
    const codex = structuredClone(config);
    codex.context.harness = "codex";
    const records = JSON.parse(
      await readFile(
        resolve(process.cwd(), config.visual.baselineDir, "registry.json"),
        "utf8",
      ),
    ) as { contractHash: string }[];

    expect([...new Set(records.map((record) => record.contractHash))]).toEqual([
      baselineContractHash(codex),
    ]);
  });
});
