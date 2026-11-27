import { it, expect } from "vitest";
import { selectRouteImpact } from "../../packages/visual/src/impact.ts";
const routes = [
  { id: "people", sourceFiles: ["src/people.ts", "src/shared.css"] },
  { id: "projects", sourceFiles: ["src/projects.ts", "src/shared.css"] },
];
it("selects affected routes only with a complete explicit dependency inventory", () => {
  expect(selectRouteImpact(routes, ["src/people.ts"], "pr")).toMatchObject({
    scope: "affected",
    routeIds: ["people"],
  });
  expect(selectRouteImpact(routes, ["src/shared.css"], "dev")).toMatchObject({
    scope: "affected",
    routeIds: ["people", "projects"],
  });
  expect(
    selectRouteImpact([{ id: "unknown" }, ...routes], ["src/people.ts"], "pr")
      .scope,
  ).toBe("full");
});
it("broadens unknown files, shared contracts and unavailable or empty change sets", () => {
  for (const changed of [
    undefined,
    [],
    ["src/new-file.ts"],
    ["inteiro.config.json"],
    ["packages/tokens/source/catalog.json"],
    [".inteiro/technical-attestors.json"],
  ])
    expect(selectRouteImpact(routes, changed, "pr").scope).toBe("full");
});
it.each(["ci", "main", "nightly", "release"])(
  "cannot reduce mandatory %s coverage with changed paths",
  (profile) => {
    expect(selectRouteImpact(routes, ["src/people.ts"], profile)).toMatchObject(
      {
        scope: "full",
        routeIds: ["people", "projects"],
        reason: "protected-profile",
      },
    );
  },
);
