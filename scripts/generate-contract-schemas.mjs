import { mkdir, writeFile } from "node:fs/promises";
import {
  DEFAULTS,
  STATES,
  TASK_TYPES,
  RUN_ID_PATTERN,
} from "../packages/contracts/src/index.ts";
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
config.properties.design.properties.contract.const = "@inteiro/design-system";
config.properties.browser.properties.fontAssets = {
  type: "array",
  items: {
    type: "object",
    required: ["path", "sha256"],
    additionalProperties: false,
    properties: {
      path: { type: "string" },
      sha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
    },
  },
};
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
  "migration-policy": {
    type: "object",
    additionalProperties: false,
    required: ["schemaVersion", "mappings"],
    properties: {
      schemaVersion: { const: "1.0" },
      mappings: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "from",
            "tokenId",
            "files",
            "selectors",
            "properties",
            "owner",
            "reason",
            "approvalRef",
          ],
          properties: {
            from: { type: "string", minLength: 1 },
            tokenId: { type: "string", minLength: 1 },
            files: {
              type: "array",
              minItems: 1,
              uniqueItems: true,
              items: { type: "string", minLength: 1 },
            },
            selectors: {
              type: "array",
              minItems: 1,
              uniqueItems: true,
              items: { type: "string", minLength: 1 },
            },
            properties: {
              type: "array",
              minItems: 1,
              uniqueItems: true,
              items: { type: "string", minLength: 1 },
            },
            owner: { type: "string", minLength: 1 },
            reason: { type: "string", minLength: 1 },
            approvalRef: { type: "string", minLength: 1 },
          },
        },
      },
    },
  },
  "task-manifest": {
    type: "object",
    required: [
      "schemaVersion",
      "id",
      "type",
      "description",
      "patternIds",
      "scope",
      "acceptanceCriteria",
    ],
    properties: {
      schemaVersion: { const: "1.0" },
      id: { type: "string", pattern: "^[a-zA-Z0-9][a-zA-Z0-9._-]{0,159}$" },
      type: { enum: TASK_TYPES },
      description: { type: "string", minLength: 1 },
      patternIds: {
        type: "array",
        uniqueItems: true,
        items: { type: "string" },
      },
      scope: {
        type: "object",
        additionalProperties: false,
        required: ["allowedFiles"],
        properties: {
          allowedFiles: {
            type: "array",
            minItems: 1,
            uniqueItems: true,
            items: { type: "string", minLength: 1 },
          },
        },
      },
      acceptanceCriteria: {
        type: "array",
        minItems: 1,
        items: { type: "string", minLength: 1 },
      },
      contextBundleId: { type: "string", pattern: "^context:[a-f0-9]{64}$" },
      configHash: { type: "string", pattern: "^[a-f0-9]{64}$" },
      reviewRequired: { type: "boolean" },
      excludedByRequester: { type: "array", items: { type: "string" } },
      contractRefs: {
        type: "array",
        uniqueItems: true,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["path", "sha256"],
          properties: {
            path: { type: "string", minLength: 1 },
            sha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
          },
        },
      },
    },
  },
  "context-bundle": {
    type: "object",
    additionalProperties: false,
    required: [
      "schemaVersion",
      "inteiroVersion",
      "createdAt",
      "configId",
      "requestId",
      "configHash",
      "harness",
      "taskType",
      "taskHash",
      "identity",
      "patterns",
      "provenance",
      "resolutionErrors",
      "requiredChecks",
      "acceptance",
      "constraints",
      "status",
      "bundleId",
      "estimatedTokens",
      "budgetTokens",
      "missingPatterns",
      "limits",
    ],
    properties: {
      schemaVersion: { const: "1.0" },
      inteiroVersion: { type: "string" },
      createdAt: { type: "string" },
      configId: { type: "string" },
      requestId: {
        type: "string",
        pattern:
          "^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$",
      },
      configHash: { type: "string", pattern: "^[a-f0-9]{64}$" },
      taskHash: { type: "string", pattern: "^[a-f0-9]{64}$" },
      harness: { type: "string" },
      taskType: { enum: TASK_TYPES },
      identity: { type: "array", items: { type: "string" } },
      patterns: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "states", "tokens", "markup", "examples", "reason"],
          properties: {
            id: { type: "string" },
            states: { type: "array", items: { type: "string" } },
            tokens: { type: "array", items: { type: "string" } },
            markup: { type: "string" },
            examples: { type: "array", items: { type: "string" } },
            reason: { type: "string" },
          },
        },
      },
      provenance: {
        type: "array",
        items: {
          type: "object",
          required: ["path", "sha256", "required"],
          properties: {
            path: { type: "string" },
            sha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
            required: { type: "boolean" },
          },
        },
      },
      requiredChecks: { type: "array", items: { type: "string" } },
      resolutionErrors: { type: "array", items: { type: "string" } },
      acceptance: {
        type: "object",
        required: [
          "viewports",
          "routesFile",
          "fixturesDirectory",
          "baselinePolicy",
          "requiredReviewTypes",
        ],
        properties: {
          viewports: config.properties.browser.properties.viewports,
          routesFile: { type: "string" },
          fixturesDirectory: { type: "string" },
          baselinePolicy: { type: "string" },
          requiredReviewTypes: { type: "array", items: { type: "string" } },
        },
      },
      constraints: {
        type: "object",
        required: [
          "maxAttempts",
          "maxChangedFiles",
          "maxDiffLines",
          "prohibitedActions",
        ],
        properties: {
          ...config.properties.repair.properties,
          prohibitedActions: { type: "array", items: { type: "string" } },
        },
      },
      status: { enum: ["passed", "blocked"] },
      bundleId: { type: "string", pattern: "^context:[a-f0-9]{64}$" },
      estimatedTokens: { type: "integer", minimum: 0 },
      budgetTokens: { type: "integer", minimum: 1 },
      missingPatterns: { type: "array", items: { type: "string" } },
      limits: { type: "array", items: { type: "string" } },
    },
  },
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
      runId: { type: "string", pattern: RUN_ID_PATTERN },
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
      runId: { type: "string", pattern: RUN_ID_PATTERN },
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
