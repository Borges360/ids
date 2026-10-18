import { it, expect } from "vitest";
import { coverageFindings } from "../../packages/visual/src/coverage.ts";
import type { Route } from "@inteiro/visual";
it("blocks discovered critical routes without tests", () =>
  expect(
    coverageFindings(
      [{ path: "/checkout", file: "app/checkout/page.tsx" }],
      [],
    )[0]!.status,
  ).toBe("blocked"));
it("accepts concrete fixtures for dynamic routes", () =>
  expect(
    coverageFindings(
      [{ path: "/users/[id]", file: "app/users/[id]/page.tsx" }],
      [{ path: "/users/123", states: [] } as unknown as Route],
    ),
  ).toEqual([]));
it("does not treat an empty route inventory as proof of critical coverage", () =>
  expect(coverageFindings([], [], ["/checkout"])).toHaveLength(1));
