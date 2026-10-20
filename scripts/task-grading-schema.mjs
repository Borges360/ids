export const taskGradingSchema = (() => {
  const text = { type: "string", pattern: "\\S" };
  const object = (properties, optional = []) => ({
    type: "object",
    additionalProperties: false,
    required: Object.keys(properties).filter((key) => !optional.includes(key)),
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
              "menu",
              "menuitem",
              "progressbar",
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
    step("upload", {
      locator,
      file: object({
        name: { type: "string", pattern: "^[a-zA-Z0-9._-]+$" },
        mimeType: text,
        content: { type: "string", maxLength: 65536 },
      }),
    }),
    step("expect-token-style", {
      locator,
      name: { enum: ["color", "background-color", "font-family"] },
      value: { type: "string", pattern: "^--in-[a-z][a-z0-9-]+$" },
    }),
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
      step(op, {
        locator,
        value: ["fill", "expect-value", "select"].includes(op)
          ? { type: "string", maxLength: 65536 }
          : text,
      }),
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
    step("back"),
    step("expect-exact-text", {
      locator,
      value: { type: "string", maxLength: 65536 },
    }),
    step("expect-path", {
      value: { type: "string", pattern: "^/src/[^\\s#]*$" },
    }),
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
      items: object(
        {
          id: text,
          viewport: object({
            width: { type: "integer", minimum: 320, maximum: 3840 },
            height: { type: "integer", minimum: 320, maximum: 2160 },
          }),
          theme: { enum: ["dark", "light", "contrast-dark", "contrast-light"] },
          density: { enum: ["calm", "focus"] },
          direction: { enum: ["ltr", "rtl"] },
          zoomFactor: { enum: [1, 2] },
          steps: { type: "array", minItems: 1, items: { oneOf: steps } },
        },
        ["zoomFactor"],
      ),
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
              abort: { enum: ["connectionreset", "timedout"] },
            },
          },
        },
      }),
    },
  });
})();
export const taskGradingResultSchema = (() => {
  const text = { type: "string", pattern: "\\S" };
  const sha = { type: "string", pattern: "^[a-f0-9]{64}$" };
  const object = (properties, optional = []) => ({
    type: "object",
    additionalProperties: false,
    required: Object.keys(properties).filter((key) => !optional.includes(key)),
    properties,
  });
  const snapshot = object({ path: text, sha256: sha });
  const frame = object({
    cssWidth: { type: "number", exclusiveMinimum: 0 },
    dpr: { type: "number", exclusiveMinimum: 0 },
  });
  const result = object(
    {
      id: text,
      status: { enum: ["passed", "failed"] },
      completedSteps: { type: "integer", minimum: 0 },
      plannedSteps: { type: "integer", minimum: 1 },
      message: text,
      zoom: object({
        method: { const: "native-browser-tab-zoom" },
        factor: { enum: [1, 2] },
        before: frame,
        after: frame,
      }),
    },
    ["message", "zoom"],
  );
  return {
    ...object(
      {
        schemaVersion: { const: "1.0" },
        kind: { const: "independent-task-grading" },
        runId: { type: "string", pattern: "^run-[a-f0-9-]{36}$" },
        caseId: text,
        sourceHash: sha,
        gitSha: { type: "string", pattern: "^[a-f0-9]{40}$" },
        configHash: sha,
        grading: snapshot,
        fixture: snapshot,
        plannedScenarios: { type: "integer", minimum: 1 },
        assertionTimeoutMs: { type: "integer", minimum: 500, maximum: 30000 },
        status: { enum: ["passed", "failed", "error", "not_run"] },
        executed: { type: "integer", minimum: 0 },
        results: { type: "array", items: result },
        browserVersion: text,
        message: text,
        agentExecution: { const: "not_run" },
        hash: sha,
      },
      ["browserVersion", "message", "hash"],
    ),
    allOf: [
      {
        if: { properties: { status: { const: "passed" } } },
        then: {
          required: ["browserVersion", "hash"],
          properties: { executed: { minimum: 1 }, results: { minItems: 1 } },
        },
      },
      {
        if: { properties: { status: { const: "not_run" } } },
        then: {
          properties: { executed: { const: 0 }, results: { maxItems: 0 } },
        },
      },
      {
        if: { properties: { status: { enum: ["passed", "failed", "error"] } } },
        then: { required: ["hash"] },
      },
    ],
  };
})();
