import { it, expect } from "vitest";
import {
  wilson,
  percentile,
  summarizeExperiments,
} from "@inteiro/evaluation/experiments";
it("reports bounded Wilson intervals and distribution percentiles", () => {
  const ci = wilson(9, 10);
  expect(ci.low).toBeGreaterThan(0);
  expect(ci.high).toBeLessThan(1);
  expect(ci.low).toBeLessThan(0.9);
  expect(ci.high).toBeGreaterThan(0.9);
  expect(percentile([1, 2, 3, 4, 5], 0.9)).toBe(5);
  expect(percentile([], 0.5)).toBeNull();
});
it("keeps independent ablation groups and unknown costs distinct", () => {
  const base = {
    caseId: "one",
    model: "fixture",
    ablation: "context",
    seed: 1,
    accepted: true,
    initialAccepted: false,
    attempts: 2,
    durationMs: 10,
    cost: null,
    tokensIn: null,
    tokensOut: null,
    humanMinutes: null,
  };
  const report = summarizeExperiments([
    base,
    { ...base, ablation: "visual-repair", cost: 1 },
  ]);
  expect(report).toHaveLength(2);
  expect(report[0]!.totalCost).toBeNull();
  expect(report[1]!.costPerAcceptedTask).toBe(1);
});
