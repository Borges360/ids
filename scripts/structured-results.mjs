import { join } from "node:path";

/**
 * Release qualification asks each test runner for machine-readable results so
 * requirement acceptance never depends on text logs. Only the runner invoked by
 * the qualification step is bound: the variable is removed before workers or
 * nested runners started by tests (including negative controls) inherit it.
 */
export function structuredResultFile(prefix) {
  const directory = process.env.INTEIRO_TEST_RESULTS;
  if (!directory) return undefined;
  delete process.env.INTEIRO_TEST_RESULTS;
  return join(directory, `${prefix}-${process.pid}-${Date.now()}.json`);
}
