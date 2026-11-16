import { it, expect } from "vitest";
import { mkdtemp, writeFile, readFile, rm, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname, basename } from "node:path";
import {
  aggregateTaskCostEvents,
  reconcileTaskCost,
  summarizeTaskCosts,
  sumTaskCosts,
  type TaskCostBreakdown,
  type TaskCostEvent,
} from "@inteiro/evaluation/costs";
import { metrics, type Observation } from "@inteiro/evaluation";
import {
  summarizeExperiments,
  importExperiment,
} from "@inteiro/evaluation/experiments";
const breakdown = (
  patch: Partial<TaskCostBreakdown> = {},
): TaskCostBreakdown => ({
  schemaVersion: "1.0",
  currency: "USD",
  modelTokens: 0.1,
  tools: 0.2,
  humanReview: 0,
  infrastructure: 0,
  ...patch,
});
const observation = (patch: Partial<Observation> = {}): Observation => ({
  caseId: "synthetic-accounting",
  model: "no-model-execution",
  ablation: "context",
  seed: 1,
  accepted: false,
  initialAccepted: false,
  outcome: "model_failure",
  attempts: 1,
  durationMs: 1,
  cost: 0.3,
  costBreakdown: breakdown(),
  tokensIn: 1,
  tokensOut: 1,
  humanMinutes: 0,
  ...patch,
});
it("sums recorded decimal amounts rather than exporting floating addition artifacts", () => {
  expect(sumTaskCosts([0.1, 0.2])).toBe(0.3);
  expect(sumTaskCosts([1e-8, 2e-8])).toBe(3e-8);
  expect(sumTaskCosts([1e100, 1e100])).toBe(2e100);
  expect(sumTaskCosts([Number.MIN_VALUE, Number.MIN_VALUE])).toBe(1e-323);
  expect(sumTaskCosts([])).toBe(0);
  expect(
    reconcileTaskCost({ cost: 0.1 + 0.2, costBreakdown: breakdown() }).total,
  ).toBe(0.3);
});
it("derives a complete total while retaining the unknown original observation", () => {
  const row = observation({ cost: null });
  const result = metrics([row]);
  expect(row.cost).toBeNull();
  expect(result.totalCost).toBe(0.3);
  expect(result.unknownCost).toBe(0);
  expect(result.accounting).toMatchObject({
    currency: "USD",
    totalTaskCost: 0.3,
    completeObservations: 1,
    derivedTotals: 1,
    billingAttested: false,
  });
  expect(summarizeExperiments([row])[0]!.costMedian).toBe(0.3);
});
it("preserves unknown categories and partial subtotals without inventing zero charges", () => {
  const row = observation({
    cost: null,
    costBreakdown: breakdown({ tools: null }),
  });
  const report = metrics([row]);
  expect(report.totalCost).toBeNull();
  expect(report.accounting.totalTaskCost).toBeNull();
  expect(report.accounting.components.tools).toEqual({
    total: null,
    knownSubtotal: 0,
    knownObservations: 0,
    unknownObservations: 1,
  });
  expect(report.accounting.components.modelTokens.total).toBe(0.1);
  const legacyRow = observation();
  delete legacyRow.costBreakdown;
  const legacy = metrics([legacyRow]);
  expect(legacy.totalCost).toBe(0.3);
  expect(legacy.accounting.totalTaskCost).toBeNull();
  expect(legacy.accounting.currency).toBeNull();
});
it("keeps a declared invoice total distinct from an incomplete component breakdown", () => {
  const report = summarizeTaskCosts([
    { cost: 1, costBreakdown: breakdown({ tools: null }) },
  ]);
  expect(report.totalCost).toBe(1);
  expect(report.totalTaskCost).toBeNull();
  expect(report.incompleteObservations).toBe(1);
  expect(() =>
    reconcileTaskCost({
      cost: 0.05,
      costBreakdown: breakdown({ tools: null }),
    }),
  ).toThrow("reconcile");
});
it("separates currencies, including unspecified legacy units, before aggregating groups", () => {
  const legacyRow = observation({ caseId: "legacy" });
  delete legacyRow.costBreakdown;
  const rows = [
    observation(),
    observation({
      caseId: "other",
      costBreakdown: breakdown({ currency: "BRL" }),
    }),
    legacyRow,
  ];
  expect(() => metrics(rows)).toThrow("currencies");
  const groups = summarizeExperiments(rows);
  expect(groups.map((row) => row.currency)).toEqual(["USD", "BRL", null]);
  expect(groups.map((row) => row.totalCost)).toEqual([0.3, 0.3, 0.3]);
});
for (const [name, change] of [
  ["negative", { modelTokens: -1 }],
  ["string number", { tools: "0" }],
  ["missing category", { infrastructure: undefined }],
  ["unknown category", { other: 0 }],
  ["lowercase currency", { currency: "usd" }],
  ["blank currency", { currency: " " }],
  ["wrong schema", { schemaVersion: "2.0" }],
  ["infinite", { modelTokens: Infinity }],
  ["NaN", { tools: NaN }],
] as const)
  it("rejects " + name + " in recorded cost components", () => {
    expect(() =>
      reconcileTaskCost({
        cost: null,
        costBreakdown: { ...breakdown(), ...change } as TaskCostBreakdown,
      }),
    ).toThrow();
  });
it("rejects contradictory totals and does not hide overflow behind unknown categories", () => {
  expect(() =>
    reconcileTaskCost({
      cost: 0,
      costBreakdown: breakdown({ modelTokens: Number.MIN_VALUE, tools: 0 }),
    }),
  ).toThrow("reconcile");
  expect(() =>
    reconcileTaskCost({ cost: 0.4, costBreakdown: breakdown() }),
  ).toThrow("reconcile");
  expect(() =>
    reconcileTaskCost({
      cost: 0,
      costBreakdown: breakdown({ modelTokens: 1e-300, tools: 0 }),
    }),
  ).toThrow("reconcile");
  expect(() => sumTaskCosts([Number.MAX_VALUE, Number.MAX_VALUE])).toThrow(
    "overflow",
  );
  expect(() =>
    summarizeTaskCosts([{ cost: 1e308 }, { cost: 1e308 }, { cost: null }]),
  ).toThrow("overflow");
  expect(() =>
    reconcileTaskCost({
      cost: null,
      costBreakdown: breakdown({
        modelTokens: 1e308,
        tools: 1e308,
        humanReview: null,
      }),
    }),
  ).toThrow("overflow");
});
it("counts tokens consumed by failed work toward each accepted task and keeps missing usage unknown", () => {
  const rows = [
    observation({
      accepted: true,
      initialAccepted: true,
      outcome: "accepted",
      tokensIn: 10,
      tokensOut: 20,
      durationMs: 200,
    }),
    observation({ tokensIn: 5, tokensOut: 5, durationMs: 900 }),
  ];
  expect(metrics(rows)).toMatchObject({
    totalTokens: 40,
    tokensPerAcceptedTask: 40,
    unknownTokenObservations: 0,
  });
  expect(summarizeExperiments(rows)[0]).toMatchObject({
    timeToAcceptedMedian: 200,
    timeToAcceptedP90: 200,
    costKnownObservations: 2,
  });
  rows[1]!.tokensOut = null;
  expect(metrics(rows)).toMatchObject({
    totalTokens: null,
    tokensPerAcceptedTask: null,
    knownTokenSubtotal: 35,
    unknownTokenObservations: 1,
  });
  expect(
    summarizeExperiments([observation()])[0]!.timeToAcceptedMedian,
  ).toBeNull();
});
it("refuses invalid or overflowing token aggregates", () => {
  expect(() => metrics([observation({ tokensIn: -1 })])).toThrow("token");
  expect(() => metrics([observation({ tokensIn: 1.5 })])).toThrow("token");
  expect(() =>
    metrics([observation({ tokensIn: Number.MAX_SAFE_INTEGER, tokensOut: 1 })]),
  ).toThrow("overflow");
});
const events: TaskCostEvent[] = [
  { id: "model-1", category: "modelTokens", currency: "USD", cost: 0.1 },
  { id: "tool-1", category: "tools", currency: "USD", cost: 0.2 },
  {
    id: "human-explicit-zero",
    category: "humanReview",
    currency: "USD",
    cost: 0,
  },
  {
    id: "infrastructure-explicit-zero",
    category: "infrastructure",
    currency: "USD",
    cost: 0,
  },
];
it("aggregates uniquely identified billing/tool/labor events in one declared currency", () => {
  const result = aggregateTaskCostEvents("USD", events);
  expect(result).toMatchObject({
    total: 0.3,
    complete: true,
    eventCount: 4,
    billingAttested: false,
    costBreakdown: breakdown(),
  });
  expect(result.eventsHash).toMatch(/^[a-f0-9]{64}$/);
  expect(aggregateTaskCostEvents("USD", [])).toMatchObject({
    total: null,
    complete: false,
    costBreakdown: {
      modelTokens: null,
      tools: null,
      humanReview: null,
      infrastructure: null,
    },
  });
  const partial = aggregateTaskCostEvents("USD", [
    ...events,
    { id: "unpriced-tool", category: "tools", currency: "USD", cost: null },
  ]);
  expect(partial.total).toBeNull();
  expect(partial.costBreakdown.tools).toBeNull();
  expect(partial.knownSubtotals.tools).toBe(0.2);
});
it("refuses duplicate events, mixed currencies and unsupported billing categories", () => {
  expect(() => aggregateTaskCostEvents("USD", [...events, events[0]!])).toThrow(
    "Duplicate",
  );
  expect(() => aggregateTaskCostEvents("BRL", events)).toThrow("currency");
  expect(() =>
    aggregateTaskCostEvents("USD", [
      { ...events[0]!, category: "other" } as unknown as TaskCostEvent,
    ]),
  ).toThrow("Invalid");
});
it("exports component-aware JSON and CSV and validates costs before writing outputs", async () => {
  const root = await mkdtemp(join(tmpdir(), "inteiro-cost-accounting-"));
  try {
    const input = {
      schemaVersion: "1.0",
      idsCommit: "a".repeat(40),
      datasetHash: "b".repeat(64),
      configHash: "c".repeat(64),
      environmentHash: "d".repeat(64),
      observations: [observation({ cost: null })],
    };
    await writeFile(join(root, "input.json"), JSON.stringify(input));
    const result = await importExperiment(root, "input.json", "out");
    expect(result.groups[0]!.accounting.totalTaskCost).toBe(0.3);
    const csv = await readFile(join(root, "out/results.csv"), "utf8");
    expect(csv).toContain(
      "currency,total_task_cost,model_token_cost,tool_cost,human_review_cost,infrastructure_cost",
    );
    expect(csv).toContain('"USD","0.3","0.1","0.2","0","0"');
    const original = await readFile(join(root, "out/results.json"), "utf8");
    input.observations[0]!.cost = 9;
    await writeFile(join(root, "input.json"), JSON.stringify(input));
    await expect(importExperiment(root, "input.json", "out")).rejects.toThrow(
      "reconcile",
    );
    expect(await readFile(join(root, "out/results.json"), "utf8")).toBe(
      original,
    );
  } finally {
    const actual = await realpath(root);
    if (
      dirname(actual) !== (await realpath(tmpdir())) ||
      !basename(actual).startsWith("inteiro-cost-accounting-")
    )
      throw Error("Unsafe cleanup");
    await rm(actual, { recursive: true, force: true });
  }
});
