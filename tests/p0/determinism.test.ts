import { it, expect } from "vitest";
import { fixtureRandomSeed } from "@inteiro/visual";
it("uses complete fixture content to derive a stable legacy seed", () => {
  const first = { clock: "2026-01-01", responses: [], seed: undefined };
  const second = { responses: [], clock: "2026-01-01" };
  expect(fixtureRandomSeed(first)).toBe(fixtureRandomSeed(second));
  expect(fixtureRandomSeed(first)).not.toBe(
    fixtureRandomSeed({ ...first, clock: "2027-01-01" }),
  );
});
it("preserves explicitly declared zero and maximum unsigned seeds", () => {
  expect(fixtureRandomSeed({ seed: 0 })).toBe(0);
  expect(fixtureRandomSeed({ seed: 0xffffffff })).toBe(0xffffffff);
});
it.each([
  -1,
  0.5,
  0x100000000,
  Number.NaN,
  Number.POSITIVE_INFINITY,
  "1",
  null,
])("rejects invalid fixture seed %s", (seed) => {
  expect(() => fixtureRandomSeed({ seed: seed as number })).toThrow(
    "unsigned 32-bit",
  );
});
