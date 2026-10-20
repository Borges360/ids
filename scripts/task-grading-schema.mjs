export const taskGradingSchema = (() => {
  const text = { type: "string", pattern: "\\S" };
  const object = (properties) => ({
    type: "object",
    additionalProperties: false,
    required: Object.keys(properties),
    properties,
  });
  const locator = {
    oneOf: [
      object({ text }),
      object({ label: text }),
      object({ testId: text }),
      {
        type: "object",
        additionalProperties: false,
        required: ["role"],
        properties: {
          role: {
            enum: [
              "button",
              "textbox",
              "dialog",
              "navigation",
              "list",
              "listitem",
              "status",
              "alert",
              "heading",
              "checkbox",
              "combobox",
              "row",
              "cell",
              "tab",
              "tabpanel",
              "link",
            ],
          },
          name: text,
        },
      },
    ],
  };
  const step = (op, properties = {}) =>
    object({ op: { const: op }, ...properties });
  const steps = [
    ...[
      "click",
      "check",
      "uncheck",
      "expect-visible",
      "expect-hidden",
      "expect-focused",
      "expect-enabled",
      "expect-disabled",
    ].map((op) => step(op, { locator })),
    ...["fill", "press", "select", "expect-text", "expect-value"].map((op) =>
      step(op, { locator, value: text }),
    ),
    step("expect-count", {
      locator,
      count: { type: "integer", minimum: 0, maximum: 10000 },
    }),
    step("expect-ordered-text", {
      locator,
      values: { type: "array", items: text },
    }),
    step("expect-attribute", {
      locator,
      name: text,
      value: { type: ["string", "null"] },
    }),
    step("expect-root-attribute", { name: text, value: text }),
    step("expect-request", {
      id: text,
      count: { type: "integer", minimum: 0, maximum: 100 },
      body: { type: ["object", "null"] },
    }),
    step("respond", { id: text }),
    step("reload"),
    step("expect-no-overflow"),
  ];
  return object({
    schemaVersion: { const: "1.0" },
    kind: { const: "independent-task-criteria" },
    caseId: { type: "string", pattern: "^(?:task-[0-9]{2}|heldout-[0-9]+)$" },
    entry: { type: "string", pattern: "^/src/.*\\.html$" },
    fixture: object({
      path: text,
      sha256: { type: "string", pattern: "^[a-f0-9]{64}$" },
    }),
    scenarios: {
      type: "array",
      minItems: 1,
      items: object({
        id: text,
        viewport: object({
          width: { type: "integer", minimum: 320, maximum: 3840 },
          height: { type: "integer", minimum: 320, maximum: 2160 },
        }),
        theme: { enum: ["dark", "light", "contrast-dark", "contrast-light"] },
        density: { enum: ["calm", "focus"] },
        direction: { enum: ["ltr", "rtl"] },
        steps: { type: "array", minItems: 1, items: { oneOf: steps } },
      }),
    },
  });
})();
export const taskFixtureSchema = (() => {
  const text = { type: "string", pattern: "\\S" };
  const object = (properties) => ({
    type: "object",
    additionalProperties: false,
    required: Object.keys(properties),
    properties,
  });
  return object({
    schemaVersion: { const: "1.0" },
    classification: { const: "synthetic" },
    clock: {
      type: "string",
      pattern: "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{3})?Z$",
    },
    seed: { type: "integer", minimum: 0, maximum: 4294967295 },
    routes: {
      type: "array",
      items: object({
        id: text,
        path: { type: "string", pattern: "^/api/[^#]*$" },
        method: { enum: ["GET", "POST", "PUT", "PATCH", "DELETE"] },
        responses: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["status", "json"],
            properties: {
              status: { type: "integer", minimum: 200, maximum: 599 },
              json: {},
              release: text,
            },
          },
        },
      }),
    },
  });
})();
