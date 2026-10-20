import { mkdir, writeFile } from "node:fs/promises";
import { benchmarkProtocolSchema } from "./benchmark-protocol-schema.mjs";
import { calibrationSchemas } from "./calibration-schemas.mjs";
import {
  DEFAULTS,
  STATES,
  TASK_TYPES,
  RUN_ID_PATTERN,
  REVIEW_AXES,
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
config.properties.design.properties.theme.items.enum = [
  "dark",
  "light",
  "contrast-dark",
  "contrast-light",
];
config.properties.design.properties.density.items.enum = ["calm", "focus"];
config.properties.review.properties.requiredFor.items.enum = [...TASK_TYPES];
config.properties.reporting.properties.formats.items.enum = [
  "json",
  "html",
  "sarif",
  "junit",
];
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
  "organization-policy": {
    type: "object",
    additionalProperties: false,
    required: ["schemaVersion"],
    properties: {
      $schema: { type: "string" },
      schemaVersion: { const: "1.0" },
      ...Object.fromEntries(
        Object.entries({
          design: ["strictTokens", "theme", "density"],
          context: ["requireProof", "maxTokens"],
          composition: ["allowed"],
          static: [
            "adoption",
            "include",
            "exclude",
            "forbiddenImports",
            "forbiddenTokens",
          ],
          browser: [
            "allowedOrigins",
            "requiredFonts",
            "fontAssets",
            "criticalRoutes",
            "viewports",
            "timeoutMs",
          ],
          visual: ["maxDiffPixelRatio", "colorThreshold", "fullPage"],
          review: ["requiredFor", "allowExternalProvider"],
          repair: ["maxAttempts", "maxChangedFiles", "maxDiffLines"],
          reporting: ["formats"],
        }).map(([section, keys]) => [
          section,
          {
            type: "object",
            additionalProperties: false,
            properties: Object.fromEntries(
              keys.map((key) => [
                key,
                structuredClone(config.properties[section].properties[key]),
              ]),
            ),
          },
        ]),
      ),
    },
  },
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
  ...calibrationSchemas([...REVIEW_AXES]),
  "benchmark-protocol": benchmarkProtocolSchema,
  "experiment-input": {
    type: "object",
    additionalProperties: false,
    required: [
      "schemaVersion",
      "idsCommit",
      "datasetHash",
      "configHash",
      "environmentHash",
      "observations",
    ],
    properties: {
      schemaVersion: { const: "1.0" },
      idsCommit: { type: "string", pattern: "^[a-f0-9]{40}$" },
      datasetHash: { type: "string", pattern: "^[a-f0-9]{64}$" },
      configHash: { type: "string", pattern: "^[a-f0-9]{64}$" },
      environmentHash: { type: "string", pattern: "^[a-f0-9]{64}$" },
      observations: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "caseId",
            "model",
            "ablation",
            "seed",
            "accepted",
            "initialAccepted",
            "attempts",
            "durationMs",
            "cost",
            "tokensIn",
            "tokensOut",
            "humanMinutes",
          ],
          properties: {
            caseId: { type: "string", pattern: "\\S" },
            model: { type: "string", pattern: "\\S" },
            ablation: {
              enum: [
                "unassisted",
                "context",
                "composition-lint",
                "visual-repair",
              ],
            },
            seed: {
              type: "integer",
              minimum: Number.MIN_SAFE_INTEGER,
              maximum: Number.MAX_SAFE_INTEGER,
            },
            accepted: { type: "boolean" },
            initialAccepted: { type: "boolean" },
            attempts: { type: "integer", minimum: 1, maximum: 3 },
            durationMs: { type: "number", minimum: 0 },
            cost: { type: ["number", "null"], minimum: 0 },
            tokensIn: {
              type: ["integer", "null"],
              minimum: 0,
              maximum: Number.MAX_SAFE_INTEGER,
            },
            tokensOut: {
              type: ["integer", "null"],
              minimum: 0,
              maximum: Number.MAX_SAFE_INTEGER,
            },
            humanMinutes: { type: ["number", "null"], minimum: 0 },
            evidencePath: { type: "string", pattern: "\\S" },
            evidenceHash: { type: "string", pattern: "^[a-f0-9]{64}$" },
            outcome: {
              enum: [
                "accepted",
                "model_failure",
                "environment_error",
                "incomplete",
              ],
            },
          },
          dependencies: {
            evidencePath: ["evidenceHash"],
            evidenceHash: ["evidencePath"],
          },
          allOf: [
            {
              if: { properties: { initialAccepted: { const: true } } },
              then: {
                properties: {
                  accepted: { const: true },
                  attempts: { const: 1 },
                },
              },
            },
            {
              if: { properties: { accepted: { const: true } } },
              then: { required: ["evidencePath", "evidenceHash"] },
            },
            {
              if: {
                required: ["outcome"],
                properties: { outcome: { const: "accepted" } },
              },
              then: { properties: { accepted: { const: true } } },
            },
            {
              if: {
                required: ["outcome"],
                properties: {
                  outcome: {
                    enum: ["model_failure", "environment_error", "incomplete"],
                  },
                },
              },
              then: {
                properties: {
                  accepted: { const: false },
                  initialAccepted: { const: false },
                },
              },
            },
          ],
        },
      },
    },
  },
  "repair-context": {
    type: "object",
    required: [
      "schemaVersion",
      "kind",
      "runId",
      "configHash",
      "status",
      "signature",
      "attempt",
      "maxAttempts",
      "scope",
      "findings",
      "requiredChecks",
      "prohibitedActions",
    ],
    properties: {
      schemaVersion: { const: "1.0" },
      kind: { const: "repair-context" },
      runId: { type: "string", pattern: RUN_ID_PATTERN },
      configHash: { type: "string", pattern: "^[a-f0-9]{64}$" },
      status: { enum: [...STATES, "repairable"] },
      signature: { type: "string", pattern: "^[a-f0-9]{64}$" },
      attempt: { type: "integer", minimum: 0 },
      maxAttempts: { type: "integer", minimum: 0 },
      scope: {
        type: "object",
        required: ["allowedFiles", "maxChangedFiles", "maxDiffLines"],
        properties: {
          allowedFiles: { type: "array", items: { type: "string" } },
          maxChangedFiles: { type: "integer", minimum: 0 },
          maxDiffLines: { type: "integer", minimum: 0 },
        },
      },
      findings: { type: "array" },
      requiredChecks: { type: "array", items: { type: "string" } },
      prohibitedActions: { type: "array", items: { type: "string" } },
    },
  },
  "review-request": {
    type: "object",
    required: [
      "schemaVersion",
      "kind",
      "runId",
      "evidenceHash",
      "configHash",
      "sourceHash",
      "sourceCommit",
      "taskHash",
      "artifactHashes",
      "captures",
      "status",
      "validationErrors",
    ],
    properties: {
      schemaVersion: { const: "1.0" },
      kind: { const: "review-request" },
      runId: { type: "string", pattern: RUN_ID_PATTERN },
      evidenceHash: { type: "string", pattern: "^[a-f0-9]{64}$" },
      configHash: { type: "string", pattern: "^[a-f0-9]{64}$" },
      sourceHash: { type: ["string", "null"], pattern: "^[a-f0-9]{64}$" },
      sourceCommit: { type: ["string", "null"], pattern: "^[a-f0-9]{40}$" },
      taskHash: { type: ["string", "null"], pattern: "^[a-f0-9]{64}$" },
      artifactHashes: {
        type: "array",
        items: { type: "string", pattern: "^[a-f0-9]{64}$" },
      },
      captures: {
        type: "array",
        items: {
          type: "object",
          required: ["gate", "kind", "actual", "sha256"],
          properties: {
            gate: { type: "string" },
            kind: { enum: ["final", "action"] },
            actual: { type: "string", minLength: 1 },
            sha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
          },
        },
      },
      status: { enum: ["blocked", "needs_review"] },
      validationErrors: { type: "array", items: { type: "string" } },
    },
    allOf: [
      {
        if: { properties: { status: { const: "needs_review" } } },
        then: {
          properties: {
            sourceHash: { type: "string" },
            sourceCommit: { type: "string" },
            taskHash: { type: "string" },
            artifactHashes: { minItems: 1 },
            captures: { minItems: 1 },
            validationErrors: { maxItems: 0 },
          },
        },
      },
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
      reviewer: { type: "string", minLength: 1, pattern: "\\S" },
      approvalRef: { type: "string", minLength: 1, pattern: "\\S" },
      reason: { type: "string", minLength: 1, pattern: "\\S" },
      configHash: { type: "string", pattern: "^[a-f0-9]{64}$" },
      sourceHash: { type: "string", pattern: "^[a-f0-9]{64}$" },
      taskHash: { type: "string", pattern: "^[a-f0-9]{64}$" },
      sourceCommit: { type: "string", pattern: "^[a-f0-9]{40}$" },
      artifactHashes: {
        type: "array",
        minItems: 1,
        items: { type: "string", pattern: "^[a-f0-9]{64}$" },
      },
      signature: { type: "string", minLength: 1 },
      expiresAt: { type: "string", minLength: 1 },
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
              enum: [...REVIEW_AXES],
            },
            score: { type: "integer", minimum: 0, maximum: 4 },
            evidenceId: { type: "string", pattern: "\\S" },
            element: { type: "string", pattern: "\\S" },
            reason: { type: "string", pattern: "\\S" },
            action: { type: "string", pattern: "\\S" },
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
