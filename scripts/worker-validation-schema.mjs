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
