const text = { type: "string", pattern: "\\S" };
const sha = { type: "string", pattern: "^[a-f0-9]{64}$" };
const object = (properties, additionalProperties = false) => ({
  type: "object",
  required: Object.keys(properties),
  additionalProperties,
  properties,
});
const artifact = object({ path: text, sha256: sha });
const check = object({
  command: text,
  status: { const: "passed" },
  exitCode: { const: 0 },
  evidence: { type: "array", minItems: 1, items: artifact },
});
export const technicalAttestationSchemas = {
  "technical-authority-policy": object({
    schemaVersion: { const: "1.0" },
    authorities: {
      type: "object",
      minProperties: 1,
      propertyNames: { pattern: "^[a-zA-Z0-9._-]+$" },
      additionalProperties: {
        type: "string",
        pattern: "^-----BEGIN PUBLIC KEY-----",
      },
    },
  }),
  "technical-attestation": object(
    {
      schemaVersion: { const: "1.0" },
      kind: { const: "automatic-technical-verification" },
      authority: { type: "string", pattern: "^[a-zA-Z0-9._-]+$" },
      policyHash: sha,
      governanceContractHash: sha,
      sourceHash: sha,
      sourceCommit: { type: "string", pattern: "^[a-f0-9]{40}$" },
      configHash: sha,
      status: { const: "passed" },
      exitCode: { const: 0 },
      requirements: {
        type: "array",
        minItems: 1,
        uniqueItems: true,
        items: text,
      },
      checks: { type: "array", minItems: 1, items: check },
      startedAt: { type: "string", format: "date-time" },
      finishedAt: { type: "string", format: "date-time" },
      expiresAt: { type: "string", format: "date-time" },
      signature: { type: "string", pattern: "^[A-Za-z0-9+/]+={0,2}$" },
    },
    true,
  ),
};
