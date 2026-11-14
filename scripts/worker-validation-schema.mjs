const snapshot = {
  type: "object",
  additionalProperties: false,
  required: ["path", "sha256"],
  properties: {
    path: { type: "string", pattern: "^benchmarks/validation/" },
    sha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
  },
};
export const workerValidationSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "schemaVersion",
    "kind",
    "caseId",
    "patternIds",
    "routes",
    "fixtures",
  ],
  properties: {
    schemaVersion: { const: "1.0" },
    kind: { const: "public-worker-validation" },
    caseId: { type: "string", pattern: "^(?:task-[0-9]{2}|heldout-[0-9]+)$" },
    patternIds: {
      type: "array",
      minItems: 1,
      uniqueItems: true,
      items: { type: "string", pattern: "^[a-z0-9-]+$" },
    },
    routes: snapshot,
    reviewPolicy: snapshot,
    technicalPolicy: snapshot,
    governanceContractHash: { type: "string", pattern: "^[a-f0-9]{64}$" },
    coverage: {
      type: "object",
      additionalProperties: false,
      required: [
        "states",
        "viewports",
        "themes",
        "densities",
        "keyboard",
        "content",
        "reducedMotion",
      ],
      properties: {
        states: {
          type: "object",
          minProperties: 1,
          additionalProperties: {
            oneOf: [
              {
                type: "object",
                additionalProperties: false,
                required: ["applicable", "reason"],
                properties: {
                  applicable: { const: false },
                  reason: { type: "string", minLength: 20 },
                },
              },
              {
                type: "object",
                additionalProperties: false,
                required: ["applicable", "scenario", "phase"],
                properties: {
                  applicable: { const: true },
                  scenario: { type: "string", minLength: 1 },
                  phase: { enum: ["final", "action-capture"] },
                  actionIndex: { type: "integer", minimum: 0 },
                },
                allOf: [
                  {
                    if: { properties: { phase: { const: "action-capture" } } },
                    then: { required: ["actionIndex"] },
                  },
                ],
              },
            ],
          },
        },
        viewports: {
          type: "array",
          minItems: 1,
          uniqueItems: true,
          items: { type: "string", minLength: 1 },
        },
        themes: {
          type: "array",
          minItems: 1,
          uniqueItems: true,
          items: { enum: ["light", "dark", "contrast-light", "contrast-dark"] },
        },
        densities: {
          type: "array",
          minItems: 1,
          uniqueItems: true,
          items: { enum: ["calm", "focus"] },
        },
        keyboard: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["scenario", "actionIndex"],
            properties: {
              scenario: { type: "string", minLength: 1 },
              actionIndex: { type: "integer", minimum: 0 },
            },
          },
        },
        content: {
          type: "object",
          additionalProperties: false,
          required: ["classification", "fixture"],
          properties: {
            classification: { const: "synthetic" },
            fixture: snapshot,
          },
        },
        reducedMotion: { const: "reduce" },
      },
    },
    fixtures: {
      type: "array",
      minItems: 1,
      items: {
        ...snapshot,
        required: ["id", "path", "sha256"],
        properties: {
          ...snapshot.properties,
          id: { type: "string", pattern: "^[a-zA-Z0-9_-]+$" },
        },
      },
    },
  },
};
