const text = { type: "string", pattern: "\\S" };
const sha = { type: "string", pattern: "^[a-f0-9]{64}$" };
const commit = { type: "string", pattern: "^[a-f0-9]{40}$" };
const integer = {
  type: "integer",
  minimum: 1,
  maximum: Number.MAX_SAFE_INTEGER,
};
const object = (properties) => ({
  type: "object",
  additionalProperties: false,
  required: Object.keys(properties),
  properties,
});
const strings = (minItems = 1) => ({
  type: "array",
  minItems,
  uniqueItems: true,
  items: text,
});
const snapshot = object({ path: text, sha256: sha });
export const benchmarkProtocolSchema = object({
  schemaVersion: { const: "1.0" },
  kind: { const: "frozen-benchmark-protocol" },
  idsCommit: commit,
  configHash: sha,
  dataset: object({ commit, public: snapshot, heldout: snapshot }),
  environment: snapshot,
  models: {
    type: "array",
    minItems: 2,
    uniqueItems: true,
    items: object({ id: text, version: text }),
  },
  promptHash: sha,
  seeds: {
    type: "array",
    minItems: 3,
    uniqueItems: true,
    items: {
      type: "integer",
      minimum: Number.MIN_SAFE_INTEGER,
      maximum: Number.MAX_SAFE_INTEGER,
    },
  },
  ablations: {
    type: "array",
    minItems: 4,
    maxItems: 4,
    uniqueItems: true,
    items: {
      enum: ["unassisted", "context", "composition-lint", "visual-repair"],
    },
  },
  permissions: object({
    readRoots: strings(),
    writeRoots: strings(),
    tools: strings(),
    network: { const: "deny" },
  }),
  budget: object({
    maxAttempts: { type: "integer", minimum: 1, maximum: 3 },
    maxDurationMs: integer,
    maxTokens: integer,
    maxCost: { type: "number", exclusiveMinimum: 0 },
    currency: { type: "string", pattern: "^[A-Z]{3}$" },
  }),
});
