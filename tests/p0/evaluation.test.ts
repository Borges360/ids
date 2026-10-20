import { it, expect } from "vitest";
import {
  wilson,
  percentile,
  median,
  summarizeExperiments,
} from "@inteiro/evaluation/experiments";
import { metrics, type Observation } from "@inteiro/evaluation";
it("reports bounded Wilson intervals and distribution percentiles", () => {
  expect(median([1, 2, 3, 4])).toBe(2.5);
  expect(median([4, 1, 3])).toBe(3);
  expect(median([1e308, 1e308])).toBe(1e308);
  expect(median([])).toBeNull();
  expect(() => median([NaN])).toThrow();
  const ci = wilson(9, 10);
  expect(ci.low).toBeGreaterThan(0);
  expect(ci.high).toBeLessThan(1);
  expect(ci.low).toBeLessThan(0.9);
  expect(ci.high).toBeGreaterThan(0.9);
  expect(percentile([1, 2, 3, 4, 5], 0.9)).toBe(5);
  expect(percentile([], 0.5)).toBeNull();
});
it("separates infrastructure, incomplete and unclassified observations from model failures", () => {
  const base: Observation = {
    caseId: "synthetic",
    model: "synthetic-no-agent",
    ablation: "context",
    seed: 1,
    accepted: false,
    initialAccepted: false,
    attempts: 1,
    durationMs: 10,
    cost: null,
    tokensIn: null,
    tokensOut: null,
    humanMinutes: null,
  };
  const summary = metrics([
    base,
    { ...base, outcome: "environment_error" },
    { ...base, outcome: "incomplete" },
    { ...base, outcome: "model_failure" },
    { ...base, accepted: true, initialAccepted: true, outcome: "accepted" },
  ]);
  expect(summary).toMatchObject({
    tasks: 5,
    evaluatedTasks: 2,
    accepted: 1,
    acceptanceRate: 0.5,
    firstPassRate: 0.5,
    environmentErrors: 1,
    incompleteObservations: 1,
    unclassifiedFailures: 1,
    totalCost: null,
  });
  expect(metrics([base]).acceptanceRate).toBeNull();
  expect(
    summarizeExperiments([{ ...base, outcome: "environment_error" }])[0]!
      .acceptanceInterval95,
  ).toEqual({ low: 0, high: 1 });
});
it("rejects undefined statistical operations instead of exporting NaN", () => {
  for (const [successes, n] of [
    [-1, 10],
    [11, 10],
    [0.5, 10],
    [0, -1],
    [1, Infinity],
  ])
    expect(() => wilson(successes!, n!)).toThrow();
  for (const q of [-0.1, 1.1, NaN]) expect(() => percentile([1], q)).toThrow();
  expect(() => percentile([Infinity], 0.5)).toThrow();
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
