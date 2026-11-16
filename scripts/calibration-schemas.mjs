export function calibrationSchemas(axes) {
  const text = { type: "string", pattern: "\\S" };
  const sha = { type: "string", pattern: "^[a-f0-9]{64}$" };
  const timestamp = {
    type: "string",
    pattern: "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{3})?Z$",
  };
  const object = (properties) => ({
    type: "object",
    additionalProperties: false,
    required: Object.keys(properties),
    properties,
  });
  const array = (items, minItems = 1) => ({ type: "array", minItems, items });
  const nullable = (schema) => ({ anyOf: [schema, { type: "null" }] });
  const count = {
    type: "integer",
    minimum: 0,
    maximum: Number.MAX_SAFE_INTEGER,
  };
  const rank = nullable({
    type: "integer",
    minimum: 1,
    maximum: Number.MAX_SAFE_INTEGER,
  });
  const score = object({
    axis: { enum: axes },
    score: { type: "integer", minimum: 0, maximum: 4 },
    evidenceId: text,
    element: text,
    reason: text,
    action: text,
  });
  const rubric = { ...array(score, 7), maxItems: 7 };
  const snapshot = object({ path: text, sha256: sha });
  return {
    "review-calibration-reviewers": object({
      schemaVersion: { const: "1.0" },
      reviewers: {
        type: "object",
        minProperties: 1,
        additionalProperties: object({
          kind: { enum: ["human", "synthetic"] },
          publicKey: text,
        }),
      },
    }),
    "review-calibration-reference": object({
      schemaVersion: { const: "1.0" },
      kind: { const: "review-calibration-reference" },
      purpose: { enum: ["human-reference", "synthetic"] },
      idsCommit: { type: "string", pattern: "^[a-f0-9]{40}$" },
      configHash: sha,
      rubricVersion: { const: "1.0" },
      reviewer: text,
      approvalRef: text,
      reason: text,
      signedAt: timestamp,
      expiresAt: timestamp,
      signature: text,
      cases: array(
        object({
          id: text,
          density: { enum: ["calm", "focus"] },
          scenarios: {
            ...array({ enum: ["long-text", "overlay", "default"] }),
            uniqueItems: true,
          },
          captures: array(object({ id: text, path: text, sha256: sha }), 2),
          axes: rubric,
          verdict: { enum: ["accept", "block"] },
          severe: { type: "boolean" },
          rank,
        }),
        2,
      ),
    }),
    "review-calibration-input": object({
      schemaVersion: { const: "1.0" },
      kind: { const: "recorded-review-calibration" },
      reference: snapshot,
      configHash: sha,
      currency: { type: "string", pattern: "^[A-Z]{3}$" },
      observations: array({
        ...object({
          caseId: text,
          reviewer: text,
          version: text,
          promptHash: sha,
          artifactHashes: array(sha, 2),
          axes: nullable(rubric),
          verdict: { enum: ["accept", "block", "insufficient"] },
          rank,
          cost: nullable({ type: "number", minimum: 0 }),
          durationMs: { type: "number", minimum: 0 },
          tokensIn: nullable(count),
          tokensOut: nullable(count),
        }),
        allOf: [
          {
            if: { properties: { verdict: { enum: ["accept", "block"] } } },
            then: { properties: { axes: rubric } },
          },
        ],
      }),
    }),
  };
}
