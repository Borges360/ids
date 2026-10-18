import { mkdir, writeFile } from "node:fs/promises";
import { DEFAULTS, STATES } from "../packages/contracts/src/index.ts";
const infer = (v) =>
  Array.isArray(v)
    ? { type: "array", items: v.length ? infer(v[0]) : { type: "string" } }
    : v && typeof v === "object"
      ? {
          type: "object",
          additionalProperties: false,
          properties: Object.fromEntries(
            Object.entries(v).map(([k, x]) => [k, infer(x)]),
          ),
        }
      : { type: typeof v };
const config = infer(DEFAULTS);
config.required = ["schemaVersion", "project"];
config.properties.schemaVersion.const = "1.0";
config.properties.project.required = ["id"];
config.properties.browser.properties.viewports.items.required = [
  "id",
  "width",
  "height",
];
config.properties.visual.properties.maxDiffPixelRatio = {
  type: "number",
  minimum: 0,
  maximum: 1,
};
config.properties.visual.properties.colorThreshold = {
  type: "number",
  minimum: 0,
  maximum: 1,
};
config.properties.$schema = { type: "string" };
const base = {
  schemaVersion: { const: "1.0" },
  inteiroVersion: { type: "string" },
  hash: { type: "string", pattern: "^[a-f0-9]{64}$" },
  createdAt: { type: "string" },
  configId: { type: "string" },
};
const contracts = {
  config: config,
  "design-contract": {
    type: "object",
    properties: {
      ...base,
      tokens: { type: "array", items: { type: "string" } },
      patterns: { type: "array", items: { type: "string" } },
      themes: { type: "array", items: { type: "string" } },
      densities: { type: "array", items: { type: "string" } },
    },
    required: [
      ...Object.keys(base),
      "tokens",
      "patterns",
      "themes",
      "densities",
    ],
  },
  "implementation-contract": {
    type: "object",
    properties: {
      ...base,
      framework: { type: "string" },
      allowedImports: { type: "array", items: { type: "string" } },
      restrictions: { type: "object" },
      checks: { type: "array", items: { type: "string" } },
    },
    required: [...Object.keys(base), "framework", "restrictions", "checks"],
  },
  "visual-acceptance-contract": {
    type: "object",
    properties: {
      ...base,
      routes: { type: "array", items: { type: "object" } },
      viewports: { type: "array", items: { type: "object" } },
      policy: { type: "object" },
      environment: { type: "string" },
    },
    required: [
      ...Object.keys(base),
      "routes",
      "viewports",
      "policy",
      "environment",
    ],
  },
  "evidence-bundle": {
    type: "object",
    properties: {
      ...base,
      configHash: { type: "string", pattern: "^[a-f0-9]{64}$" },
      runId: { type: "string", pattern: "^run-" },
      status: { enum: STATES },
      gates: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          required: ["name", "status", "findings", "durationMs"],
          properties: {
            name: { type: "string" },
            status: { enum: STATES },
            findings: { type: "array" },
            durationMs: { type: "number", minimum: 0 },
          },
        },
      },
      findings: { type: "array" },
      artifacts: { type: "array" },
    },
    required: [
      ...Object.keys(base),
      "configHash",
      "runId",
      "status",
      "gates",
      "findings",
      "artifacts",
    ],
  },
  review: {
    type: "object",
    required: [
      "runId",
      "evidenceHash",
      "reviewer",
      "approvalRef",
      "reason",
      "axes",
    ],
    properties: {
      runId: { type: "string" },
      evidenceHash: { type: "string", pattern: "^[a-f0-9]{64}$" },
      reviewer: { type: "string", minLength: 1 },
      approvalRef: { type: "string", minLength: 1 },
      reason: { type: "string", minLength: 1 },
      axes: {
        type: "array",
        minItems: 7,
        maxItems: 7,
        items: {
          type: "object",
          required: [
            "axis",
            "score",
            "evidenceId",
            "element",
            "reason",
            "action",
          ],
          properties: {
            axis: {
              enum: [
                "hierarchy",
                "composition",
                "density",
                "identity",
                "content",
                "responsiveness",
                "robustness",
              ],
            },
            score: { type: "integer", minimum: 0, maximum: 4 },
            evidenceId: { type: "string" },
            element: { type: "string" },
            reason: { type: "string" },
            action: { type: "string" },
          },
        },
      },
    },
  },
  pattern: {
    type: "object",
    required: [
      "schemaVersion",
      "id",
      "version",
      "kind",
      "description",
      "slots",
      "variants",
      "states",
      "requiredTokens",
      "allowedDependencies",
      "accessibility",
      "responsive",
      "examples",
      "tests",
    ],
    properties: {
      schemaVersion: { const: "1.0" },
      id: { type: "string", pattern: "^[a-z][a-z0-9-]*$" },
      version: { type: "string" },
      kind: { const: "pattern" },
      description: { type: "string" },
      slots: { type: "array", items: { type: "string" } },
      variants: { type: "array", items: { type: "string" } },
      states: { type: "array", minItems: 1, items: { type: "string" } },
      requiredTokens: { type: "array", items: { type: "string" } },
      allowedDependencies: { type: "array", items: { type: "string" } },
      accessibility: { type: "object" },
      responsive: { type: "object" },
      examples: { type: "array", items: { type: "string" } },
      tests: { type: "array", items: { type: "string" } },
    },
  },
};
await mkdir("packages/contracts/schemas", { recursive: true });
for (const [id, schema] of Object.entries(contracts))
  await writeFile(
    `packages/contracts/schemas/${id}.schema.json`,
    JSON.stringify(
      {
        $schema: "http://json-schema.org/draft-07/schema#",
        $id: `https://inteiro.dev/schemas/1.0/${id}.schema.json`,
        ...schema,
      },
      null,
      2,
    ) + "\n",
  );
