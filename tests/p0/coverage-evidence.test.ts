import { it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import {
  verifyPatternCoverage,
  type CoverageMatrix,
  type ExecutedCase,
  type StoryInventory,
} from "../../packages/agent-core/src/coverage-evidence.ts";
import { patterns } from "../../packages/composition/src/index.ts";

const read = <T>(path: string) => JSON.parse(readFileSync(path, "utf8")) as T;
const matrix = () =>
  read<CoverageMatrix>("packages/composition/coverage-matrix.json");
const stories = () =>
  read<StoryInventory[]>("packages/composition/story-matrix.json");
const exists = (path: string) => existsSync(path);

/** Everything the map declares, as executed passing cases (derived, never hand-listed). */
function executedFor(map: CoverageMatrix): ExecutedCase[] {
  const absent = verifyPatternCoverage(map, stories(), [], exists).missing;
  return absent.map((entry) => ({
    key: entry.replace("not executed: ", ""),
    status: "passed" as const,
  }));
}

it("covers every pattern state of the P0 catalogue with a named case per declared dimension", () => {
  const map = matrix();
  expect(map.patterns.map((value) => value.patternId).sort()).toEqual(
    patterns.map((pattern) => pattern.id).sort(),
  );
  expect(map.patterns).toHaveLength(41);
  const result = verifyPatternCoverage(
    map,
    stories(),
    executedFor(map),
    exists,
  );
  expect(result.errors).toEqual([]);
  expect(result.passed).toBe(result.expected);
  // 82 states x 5 widths x 8 theme/density pairs, plus stories and robustness cases.
  expect(result.expected).toBeGreaterThan(3400);
  expect(result.notApplicable).toBeGreaterThan(0);
});

it("refuses a declared dimension without an executed case, a failed case and a skipped case", () => {
  const map = matrix();
  const executed = executedFor(map);
  const drop = (needle: string) =>
    executed.filter((value) => !value.key.includes(needle));
  // Native zoom/RTL for one pattern was never executed.
  const noZoom = verifyPatternCoverage(
    map,
    stories(),
    drop("native browser zoom 200%, RTL and long translation: dialog"),
    exists,
  );
  expect(noZoom.errors.join("|")).toContain("not executed");
  expect(noZoom.passed).toBeLessThan(noZoom.expected);
  // A story that was documented but did not run.
  expect(
    verifyPatternCoverage(
      map,
      stories(),
      drop("stories/Patterns.stories.ts::Dialog Default"),
      exists,
    ).missing,
  ).toHaveLength(1);
  // One failing combination must not hide behind the aggregate.
  const failing = executed.map((value) =>
    value.key.includes("dialog default 320 dark calm")
      ? { ...value, status: "failed" as const }
      : value,
  );
  expect(
    verifyPatternCoverage(map, stories(), failing, exists).errors.join("|"),
  ).toContain("failed:");
  const skipped = executed.map((value) =>
    value.key.includes("dialog default 1440 light focus")
      ? { ...value, status: "skipped" as const }
      : value,
  );
  expect(
    verifyPatternCoverage(map, stories(), skipped, exists).missing,
  ).toHaveLength(1);
});

it("requires every N/A to be justified and every named test to exist", () => {
  const unjustified = matrix();
  const target = unjustified.patterns[0]!;
  const state = Object.entries(target.stateApplicability).find(
    ([, value]) => !value.applicable,
  )![0];
  target.stateApplicability[state]!.reason = " ";
  expect(
    verifyPatternCoverage(unjustified, stories(), executedFor(matrix()), exists)
      .errors,
  ).toContain(`${target.patternId}/${state}: N/A without a justification`);
  const missingTest = verifyPatternCoverage(
    matrix(),
    stories(),
    executedFor(matrix()),
    (path) =>
      path !== "tests/browser/composition-robustness.spec.ts" && exists(path),
  );
  expect(missingTest.errors.join("|")).toContain("without an existing test");
});

it("detects a coverage map that drifted from the story inventory", () => {
  const map = matrix();
  map.patterns.pop();
  expect(
    verifyPatternCoverage(map, stories(), executedFor(map), exists).errors,
  ).toContainEqual(expect.stringContaining("Pattern absent from the map"));
  const states = matrix();
  states.patterns[0]!.states = [...states.patterns[0]!.states, "open"];
  expect(
    verifyPatternCoverage(states, stories(), [], exists).errors.join("|"),
  ).toContain("States differ from the story inventory");
});
