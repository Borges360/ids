const amount = { type: ["number", "null"], minimum: 0 };
export const taskCostBreakdownSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "schemaVersion",
    "currency",
    "modelTokens",
    "tools",
    "humanReview",
    "infrastructure",
  ],
  properties: {
    schemaVersion: { const: "1.0" },
    currency: { type: "string", pattern: "^[A-Z]{3}$" },
    modelTokens: amount,
    tools: amount,
    humanReview: amount,
    infrastructure: amount,
  },
};
export const taskCostEventsSchema = {
  type: "array",
  items: {
    type: "object",
    additionalProperties: false,
    required: ["id", "category", "currency", "cost"],
    properties: {
      id: { type: "string", pattern: "\\S" },
      category: {
        enum: ["modelTokens", "tools", "humanReview", "infrastructure"],
      },
      currency: { type: "string", pattern: "^[A-Z]{3}$" },
      cost: amount,
    },
  },
};
