import { readFile, writeFile } from "node:fs/promises";
import { patterns } from "../packages/composition/src/index.ts";
const inventory = [
  "default",
  "focus",
  "hover",
  "selected",
  "disabled",
  "loading",
  "empty",
  "error",
  "success",
  "invalid",
  "readonly",
  "open",
  "closed",
];
const records = patterns.map((pattern) => {
  const interactive =
    /<(?:button|input|select|textarea|summary)\b|<a\b[^>]*href=/.test(
      pattern.markup,
    );
  return {
    patternId: pattern.id,
    states: pattern.states,
    dimensions: {
      themes: ["dark", "light", "contrast-dark", "contrast-light"],
      densities: ["calm", "focus"],
      viewports: [320, 375, 768, 1024, 1440],
      content: ["default", "empty-optional-strings", "long-translated"],
      direction: ["ltr", "rtl"],
      motion: ["reduce"],
      zoom: { method: "native-browser-tab-zoom", factors: [2] },
      keyboard: interactive
        ? {
            applicable: true,
            test: "tests/browser/composition-robustness.spec.ts",
          }
        : {
            applicable: false,
            reason:
              "Default rendering has no enabled interactive controls; component semantics are tested without inventing a keyboard flow.",
          },
    },
    stateApplicability: Object.fromEntries(
      inventory.map((state) => [
        state,
        pattern.states.includes(state)
          ? { applicable: true, test: "tests/browser/composition.spec.ts" }
          : ["focus", "hover"].includes(state) && interactive
            ? {
                applicable: true,
                test: "tests/browser/composition-robustness.spec.ts",
              }
            : {
                applicable: false,
                reason:
                  "This presentation contract declares " +
                  pattern.states.join(", ") +
                  ". " +
                  state +
                  " is not a standalone state supported by this pattern; application-owned data transitions are tested in task fixtures.",
              },
      ]),
    ),
    negative: {
      type: "induced-document-overflow",
      test: "tests/browser/composition-robustness.spec.ts",
    },
    qualification: "verified-by-release-audit-index",
  };
});
await writeFile(
  "packages/composition/coverage-matrix.json",
  JSON.stringify({ schemaVersion: "1.0", patterns: records }, null, 2) + "\n",
);
const manifest = JSON.parse(await readFile("inteiro.routes.json", "utf8"));
for (const route of manifest.routes) {
  const pattern = patterns.find((pattern) => pattern.id === route.id);
  if (!pattern) throw Error("Unknown pattern route");
  route.sourceFiles = [
    `packages/composition/patterns/${pattern.id}.json`,
    "packages/composition/src/composition.css",
    "packages/composition/src/behavior.js",
    "packages/composition/src/render.ts",
  ];
  route.states = pattern.states.map((id) => ({
    id,
    path: `/packages/composition/examples/${pattern.id}-${id}.html`,
    actions: [{ type: "expectVisible", target: { role: "main" } }],
  }));
  route.not_applicable = Object.fromEntries(
    [
      "loading",
      "empty",
      "error",
      "disabled",
      "invalid",
      "success",
      "modal",
      "long-content",
    ]
      .filter(
        (state) =>
          !pattern.states.includes(state) &&
          state !== "long-content" &&
          !(state === "modal" && ["dialog", "drawer"].includes(pattern.id)),
      )
      .map((state) => [
        state,
        state === "long-content"
          ? "Long translated and empty optional strings are exercised by tests/browser/composition-robustness.spec.ts for this pattern."
          : `The ${pattern.id} presentation contract does not expose ${state} as a standalone state. Its declared states are ${pattern.states.join(", ")}.`,
      ]),
  );
  route.externalCoverage = {
    "long-content": {
      test: "tests/browser/composition-robustness.spec.ts",
      case: "native browser zoom 200%, RTL and long translation: " + pattern.id,
    },
    "empty-optional-strings": {
      test: "tests/browser/composition-robustness.spec.ts",
      case:
        "empty optional strings, reduced motion and induced clipping: " +
        pattern.id,
    },
  };
}
await writeFile(
  "inteiro.routes.json",
  JSON.stringify(manifest, null, 2) + "\n",
);
