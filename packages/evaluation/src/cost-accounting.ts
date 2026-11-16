import { validateSchema, hash } from "@inteiro/contracts";
export const COST_COMPONENTS = [
  "modelTokens",
  "tools",
  "humanReview",
  "infrastructure",
] as const;
export type CostComponent = (typeof COST_COMPONENTS)[number];
export interface TaskCostBreakdown {
  schemaVersion: "1.0";
  currency: string;
  modelTokens: number | null;
  tools: number | null;
  humanReview: number | null;
  infrastructure: number | null;
}
export interface CostObservation {
  cost: number | null;
  costBreakdown?: TaskCostBreakdown;
}
export interface TaskCostEvent {
  id: string;
  category: CostComponent;
  currency: string;
  cost: number | null;
}
function money(value: unknown): asserts value is number | null {
  if (
    value !== null &&
    (typeof value !== "number" || !Number.isFinite(value) || value < 0)
  )
    throw Error("Cost must be finite, non-negative or explicitly unknown");
}
/** Adds declared decimal representations before converting back to a JSON number. */
export function sumTaskCosts(values: readonly number[]): number {
  if (!values.length) return 0;
  const parts = values.map((value) => {
    money(value);
    if (typeof value !== "number") throw Error("Cannot sum an unknown cost");
    const [mantissa, power = "0"] = String(value).toLowerCase().split("e");
    return {
      coefficient: BigInt(mantissa!.replace(".", "")),
      exponent: Number(power) - (mantissa!.split(".")[1]?.length ?? 0),
    };
  });
  const exponent = parts.reduce(
    (minimum, part) => Math.min(minimum, part.exponent),
    parts[0]!.exponent,
  );
  const coefficient = parts.reduce(
    (sum, part) =>
      sum + part.coefficient * 10n ** BigInt(part.exponent - exponent),
    0n,
  );
  const total = Number(coefficient.toString() + "e" + exponent);
  if (!Number.isFinite(total)) throw Error("Cost aggregate overflow");
  return total;
}
function tolerance(a: number, b: number) {
  if (a === 0 || b === 0) return 0;
  return Math.max(
    Math.abs(a) * Number.EPSILON * 8,
    Math.abs(b) * Number.EPSILON * 8,
  );
}
export function reconcileTaskCost(row: CostObservation) {
  money(row.cost);
  const breakdown = row.costBreakdown;
  if (breakdown === undefined)
    return {
      currency: null,
      total: row.cost,
      complete: false,
      derived: false,
      knownComponentSubtotal: 0,
      source: "legacy-declared-total" as const,
    };
  if (!validateSchema("task-cost-breakdown", breakdown).valid)
    throw Error("Invalid task cost breakdown");
  for (const name of COST_COMPONENTS) money(breakdown[name]);
  const values = COST_COMPONENTS.flatMap((name) =>
    breakdown[name] === null ? [] : [breakdown[name]!],
  );
  const complete = values.length === COST_COMPONENTS.length,
    subtotal = sumTaskCosts(values);
  if (
    row.cost !== null &&
    ((complete &&
      Math.abs(row.cost - subtotal) > tolerance(row.cost, subtotal)) ||
      (!complete && subtotal - row.cost > tolerance(row.cost, subtotal)))
  )
    throw Error("Declared task cost does not reconcile with its components");
  return {
    currency: breakdown.currency,
    total: complete ? subtotal : row.cost,
    complete,
    derived: complete && row.cost === null,
    knownComponentSubtotal: subtotal,
    source: complete
      ? ("recorded-components" as const)
      : ("partially-recorded-components" as const),
  };
}
export function summarizeTaskCosts(rows: readonly CostObservation[]) {
  const records = rows.map(reconcileTaskCost),
    currencies = new Set(records.map((record) => record.currency));
  if (currencies.size > 1)
    throw Error(
      "Cannot aggregate different or unspecified currencies; group them separately",
    );
  const totalKnown = records.every((record) => record.total !== null),
    complete = rows.length > 0 && records.every((record) => record.complete),
    knownTotalSubtotal = sumTaskCosts(
      records.flatMap((record) =>
        record.total === null ? [] : [record.total],
      ),
    );
  const components = Object.fromEntries(
    COST_COMPONENTS.map((name) => {
      const known = rows.flatMap((row) =>
        row.costBreakdown?.[name] === undefined ||
        row.costBreakdown[name] === null
          ? []
          : [row.costBreakdown[name]!],
      );
      const subtotal = sumTaskCosts(known);
      return [
        name,
        {
          total:
            rows.length > 0 && known.length === rows.length ? subtotal : null,
          knownSubtotal: subtotal,
          knownObservations: known.length,
          unknownObservations: rows.length - known.length,
        },
      ];
    }),
  ) as Record<
    CostComponent,
    {
      total: number | null;
      knownSubtotal: number;
      knownObservations: number;
      unknownObservations: number;
    }
  >;
  return {
    currency: records[0]?.currency ?? null,
    scope: "recorded-cost-components" as const,
    totalCost: totalKnown ? knownTotalSubtotal : null,
    totalTaskCost: complete ? knownTotalSubtotal : null,
    knownTotalSubtotal,
    completeObservations: records.filter((record) => record.complete).length,
    incompleteObservations: records.filter((record) => !record.complete).length,
    legacyObservations: rows.filter((row) => row.costBreakdown === undefined)
      .length,
    derivedTotals: records.filter((record) => record.derived).length,
    unknownTotals: records.filter((record) => record.total === null).length,
    components,
    billingAttested: false as const,
  };
}
/** Aggregates reported provider/tool/labor events without inventing missing prices. */
export function aggregateTaskCostEvents(
  currency: string,
  events: readonly TaskCostEvent[],
) {
  if (!/^[A-Z]{3}$/.test(currency)) throw Error("Invalid task cost currency");
  if (!validateSchema("task-cost-events", events).valid)
    throw Error("Invalid task cost events");
  const ids = new Set<string>();
  for (const event of events) {
    if (event.currency !== currency)
      throw Error("Cost event currency differs from ledger currency");
    if (ids.has(event.id)) throw Error("Duplicate task cost event ID");
    ids.add(event.id);
    money(event.cost);
  }
  const breakdown: TaskCostBreakdown = {
      schemaVersion: "1.0",
      currency,
      modelTokens: null,
      tools: null,
      humanReview: null,
      infrastructure: null,
    },
    knownSubtotals = {} as Record<CostComponent, number>;
  for (const category of COST_COMPONENTS) {
    const selected = events.filter((event) => event.category === category),
      known = selected.flatMap((event) =>
        event.cost === null ? [] : [event.cost],
      );
    knownSubtotals[category] = sumTaskCosts(known);
    if (selected.length > 0 && known.length === selected.length)
      breakdown[category] = knownSubtotals[category];
  }
  const reconciled = reconcileTaskCost({
    cost: null,
    costBreakdown: breakdown,
  });
  return {
    schemaVersion: "1.0",
    currency,
    costBreakdown: breakdown,
    total: reconciled.total,
    complete: reconciled.complete,
    knownSubtotals,
    eventCount: events.length,
    eventsHash: hash(events),
    billingAttested: false as const,
  };
}
