import type { Page, Response, Request } from "@playwright/test";

export interface ResponseFixture {
  url: string;
  body?: unknown;
  status?: number;
  alias?: string;
  method?: string;
  release?: string;
  expectedFailure?: boolean;
  abort?: "connectionreset" | "timedout";
  sequence?: ResponseStep[];
}
export type ResponseStep = Pick<
  ResponseFixture,
  "body" | "status" | "alias" | "release" | "expectedFailure" | "abort"
>;
export function responseSteps(mock: ResponseFixture): ResponseFixture[] {
  return mock.sequence
    ? mock.sequence.map((step) => ({
        url: mock.url,
        ...(mock.method ? { method: mock.method } : {}),
        ...step,
      }))
    : [mock];
}
export function matchesResponse(
  url: string,
  method: string,
  mock: ResponseFixture,
  baseURL: string,
): boolean {
  const actual = new URL(url),
    expected = new URL(mock.url, baseURL);
  return (
    actual.origin === expected.origin &&
    actual.pathname === expected.pathname &&
    (!expected.search || actual.search === expected.search) &&
    method.toUpperCase() === (mock.method ?? "GET").toUpperCase()
  );
}
export function validateResponseFixtures(
  responses: ResponseFixture[],
  baseURL: string,
): string[] {
  const errors: string[] = [],
    aliases = new Set<string>(),
    requests = new Set<string>(),
    releases = new Set<string>();
  if (!Array.isArray(responses)) return ["Fixture responses must be an array"];
  for (const mock of responses) {
    if (!mock || typeof mock !== "object") {
      errors.push("Invalid response fixture");
      continue;
    }
    let validURL = false;
    try {
      validURL =
        typeof mock.url === "string" &&
        mock.url.startsWith("/") &&
        !mock.url.startsWith("//") &&
        !mock.url.includes("\\") &&
        new URL(mock.url, baseURL).origin === new URL(baseURL).origin;
    } catch {}
    if (!validURL)
      errors.push(
        "Fixture response must use a relative path in the authorized application",
      );
    if (mock.method !== undefined && typeof mock.method !== "string") {
      errors.push("Invalid fixture HTTP method");
      continue;
    }
    const method = (mock.method ?? "GET").toUpperCase();
    if (
      !["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"].includes(
        method,
      )
    )
      errors.push("Unsupported fixture HTTP method");
    if (
      mock.status !== undefined &&
      (!Number.isInteger(mock.status) || mock.status < 200 || mock.status > 599)
    )
      errors.push("Invalid fixture HTTP status");
    const request = method + " " + mock.url;
    if (requests.has(request))
      errors.push("Duplicate response fixture: " + request);
    requests.add(request);
    if (
      mock.sequence !== undefined &&
      (!Array.isArray(mock.sequence) ||
        !mock.sequence.length ||
        mock.sequence.some(
          (step) => !step || typeof step !== "object" || Array.isArray(step),
        ) ||
        ["body", "status", "alias", "release", "expectedFailure", "abort"].some(
          (key) => Object.hasOwn(mock, key),
        ))
    ) {
      errors.push(
        "Response sequence must be nonempty and cannot mix single-response fields",
      );
      continue;
    }
    for (const step of responseSteps(mock)) {
      if (!step || typeof step !== "object") {
        errors.push("Invalid response sequence step");
        continue;
      }
      if (
        step.status !== undefined &&
        (!Number.isInteger(step.status) ||
          step.status < 200 ||
          step.status > 599)
      )
        errors.push("Invalid fixture HTTP status");
      if (
        step.expectedFailure !== undefined &&
        typeof step.expectedFailure !== "boolean"
      )
        errors.push("Invalid expected fixture failure");
      if (
        step.abort !== undefined &&
        (!["connectionreset", "timedout"].includes(step.abort) ||
          step.expectedFailure !== true)
      )
        errors.push("Invalid or unclassified fixture network failure");
      if (step.expectedFailure && !step.abort && (step.status ?? 200) < 400)
        errors.push("Expected fixture failure must have an error status");
      if (step.release !== undefined) {
        if (
          typeof step.release !== "string" ||
          !/^[a-zA-Z0-9_-]{1,80}$/.test(step.release) ||
          releases.has(step.release)
        )
          errors.push("Invalid or duplicate response release alias");
        releases.add(step.release);
      }
      if (step.alias !== undefined) {
        if (
          typeof step.alias !== "string" ||
          !/^[a-zA-Z0-9_-]{1,80}$/.test(step.alias) ||
          aliases.has(step.alias)
        )
          errors.push("Invalid or duplicate response alias");
        aliases.add(step.alias);
      }
    }
  }
  return errors;
}
export interface ResponseAliases {
  bind(request: Request, spec: ResponseFixture): void;
  waitFor(alias: string): Promise<void>;
  dispose(): void;
  observations: {
    alias: string;
    method: string;
    path: string;
    status: number;
    outcome?: string;
  }[];
}
export function createResponseAliases(
  page: Page,
  responses: ResponseFixture[],
  baseURL: string,
  timeoutMs: number,
): ResponseAliases {
  const errors = validateResponseFixtures(responses, baseURL);
  if (errors.length) throw new Error(errors.join("; "));
  const specs = responses.flatMap(responseSteps).filter((r) => r.alias),
    completed = new Map<string, (Error | null)[]>();
  const bindings = new WeakMap<Request, ResponseFixture>();
  const pending = new Map<
    string,
    Set<{
      resolve: () => void;
      reject: (error: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }>
  >();
  const observations: ResponseAliases["observations"] = [];
  let disposed = false;
  const deliver = (alias: string, error: Error | null) => {
    const waiters = pending.get(alias);
    const waiter = waiters?.values().next().value;
    if (waiter) {
      waiters!.delete(waiter);
      clearTimeout(waiter.timer);
      if (error) waiter.reject(error);
      else waiter.resolve();
    } else {
      const queue = completed.get(alias) ?? [];
      queue.push(error);
      completed.set(alias, queue);
    }
  };
  const receive = async (response: Response) => {
    const spec =
      bindings.get(response.request()) ??
      specs.find(
        (mock) =>
          matchesResponse(
            response.url(),
            response.request().method(),
            mock,
            baseURL,
          ) && response.status() === (mock.status ?? 200),
      );
    if (!spec?.alias) return;
    const failure = await response.finished();
    if (disposed) return;
    const alias = spec.alias!;
    if (!failure)
      observations.push({
        alias,
        method: response.request().method(),
        path: spec.url,
        status: response.status(),
      });
    const error = failure ? new Error("Response alias failed: " + alias) : null;
    // Each wait consumes one completed response. A previous request must never
    // satisfy a later action, and a single response cannot release two waiters.
    deliver(alias, error);
  };
  const listener = (response: Response) => {
    void receive(response).catch(() => {
      /* Timed wait remains explicit if the browser closes mid-response. */
    });
  };
  page.on("response", listener);
  const failedListener = (request: Request) => {
    const spec = bindings.get(request);
    if (disposed || !spec?.alias) return;
    if (spec.abort && spec.expectedFailure) {
      observations.push({
        alias: spec.alias,
        method: request.method(),
        path: spec.url,
        status: 0,
        outcome: "expected-network-failure",
      });
      deliver(spec.alias, null);
    } else
      deliver(
        spec.alias,
        new Error("Unexpected request failure: " + spec.alias),
      );
  };
  page.on("requestfailed", failedListener);
  return {
    bind: (request, spec) => bindings.set(request, spec),
    observations,
    waitFor: async (alias: string) => {
      if (disposed) throw new Error("Response observation session closed");
      if (!specs.some((s) => s.alias === alias))
        throw new Error("Unknown response alias: " + alias);
      const queue = completed.get(alias);
      if (queue?.length) {
        const error = queue.shift();
        if (error) throw error;
        return;
      }
      await new Promise<void>((resolve, reject) => {
        const waiters = pending.get(alias) ?? new Set();
        const waiter = {
          resolve,
          reject,
          timer: setTimeout(() => {
            waiters.delete(waiter);
            reject(new Error("Timed out waiting for response alias: " + alias));
          }, timeoutMs),
        };
        waiters.add(waiter);
        pending.set(alias, waiters);
      });
    },
    dispose: () => {
      disposed = true;
      page.off("response", listener);
      page.off("requestfailed", failedListener);
      for (const waiters of pending.values())
        for (const waiter of waiters) {
          clearTimeout(waiter.timer);
          waiter.reject(new Error("Response observation session closed"));
        }
      pending.clear();
      completed.clear();
    },
  };
}

/** Sanitization happens before every capture, including actions and failure evidence. */
export function validateSyntheticText(values: unknown): values is string[] {
  return (
    Array.isArray(values) &&
    values.length <= 100 &&
    values.every(
      (value) =>
        typeof value === "string" &&
        /^[A-Z0-9._%+-]+@(?:[A-Z0-9-]+\.)+(?:test|invalid)$/i.test(value),
    )
  );
}
export async function sanitizeCapture(
  page: Page,
  syntheticText: string[] = [],
): Promise<number> {
  if (!validateSyntheticText(syntheticText))
    throw Error(
      "Synthetic text exceptions require exact addresses in reserved test domains",
    );
  return page.evaluate((syntheticText) => {
    const allowed = new Set(syntheticText);
    const clean = (value: string) =>
      value
        .replace(
          /\b(?:gh[pousr]_[\w]{20,}|github_pat_[\w]+|sk-[\w-]{16,}|AKIA[A-Z0-9]{16})\b/g,
          "[REDACTED]",
        )
        .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, (value) =>
          allowed.has(value) ? value : "[EMAIL]",
        );
    let count = 0;
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
    );
    let node: Node | null;
    while ((node = walker.nextNode())) {
      if (node.parentElement?.matches("script,style")) continue;
      const before = node.textContent ?? "",
        after = clean(before);
      if (before !== after) {
        node.textContent = after;
        count++;
      }
    }
    document
      .querySelectorAll<HTMLInputElement>("input,textarea")
      .forEach((input) => {
        const before = input.value,
          after = clean(before);
        if (before !== after) {
          input.value = after;
          count++;
        }
      });
    document.querySelectorAll("*").forEach((element) => {
      for (const attribute of [
        "placeholder",
        "title",
        "alt",
        "aria-label",
        "value",
      ]) {
        const before = element.getAttribute(attribute);
        if (before === null) continue;
        const after = clean(before);
        if (before !== after) {
          element.setAttribute(attribute, after);
          count++;
        }
      }
    });
    return count;
  }, syntheticText);
}
