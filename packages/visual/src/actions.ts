import type { Page, Response } from "@playwright/test";

export interface ResponseFixture {
  url: string;
  body: unknown;
  status?: number;
  alias?: string;
  method?: string;
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
    requests = new Set<string>();
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
    if (mock.alias !== undefined) {
      if (!/^[a-zA-Z0-9_-]{1,80}$/.test(mock.alias) || aliases.has(mock.alias))
        errors.push("Invalid or duplicate response alias");
      aliases.add(mock.alias);
    }
  }
  return errors;
}
export interface ResponseAliases {
  waitFor(alias: string): Promise<void>;
  dispose(): void;
  observations: {
    alias: string;
    method: string;
    path: string;
    status: number;
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
  const specs = responses.filter((r) => r.alias),
    seen = new Set<string>();
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
  const receive = async (response: Response) => {
    const spec = specs.find(
      (mock) =>
        matchesResponse(
          response.url(),
          response.request().method(),
          mock,
          baseURL,
        ) && response.status() === (mock.status ?? 200),
    );
    if (!spec) return;
    const failure = await response.finished();
    if (disposed) return;
    const alias = spec.alias!;
    if (failure) {
      for (const waiter of pending.get(alias) ?? []) {
        clearTimeout(waiter.timer);
        waiter.reject(new Error("Response alias failed: " + alias));
      }
      pending.delete(alias);
      return;
    }
    seen.add(alias);
    observations.push({
      alias,
      method: response.request().method(),
      path: spec.url,
      status: response.status(),
    });
    for (const waiter of pending.get(alias) ?? []) {
      clearTimeout(waiter.timer);
      waiter.resolve();
    }
    pending.delete(alias);
  };
  const listener = (response: Response) => {
    void receive(response).catch(() => {
      /* Timed wait remains explicit if the browser closes mid-response. */
    });
  };
  page.on("response", listener);
  return {
    observations,
    waitFor: async (alias: string) => {
      if (disposed) throw new Error("Response observation session closed");
      if (!specs.some((s) => s.alias === alias))
        throw new Error("Unknown response alias: " + alias);
      if (seen.has(alias)) return;
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
      for (const waiters of pending.values())
        for (const waiter of waiters) {
          clearTimeout(waiter.timer);
          waiter.reject(new Error("Response observation session closed"));
        }
      pending.clear();
    },
  };
}

/** Sanitization happens before every capture, including actions and failure evidence. */
export async function sanitizeCapture(page: Page): Promise<number> {
  return page.evaluate(() => {
    const clean = (value: string) =>
      value
        .replace(
          /\b(?:gh[pousr]_[\w]{20,}|github_pat_[\w]+|sk-[\w-]{16,}|AKIA[A-Z0-9]{16})\b/g,
          "[REDACTED]",
        )
        .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[EMAIL]");
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
  });
}
