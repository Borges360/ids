import type { Route } from "@playwright/test";
import {
  matchesResponse,
  responseSteps,
  validateResponseFixtures,
  type ResponseFixture,
  type ResponseAliases,
} from "./actions.ts";

/** A finite response sequence fails closed on exhaustion; a single response remains repeatable. */
export function createFixtureResponder(
  specs: ResponseFixture[],
  baseURL: string,
  aliases: ResponseAliases,
  timeoutMs: number,
) {
  const errors = validateResponseFixtures(specs, baseURL);
  if (errors.length) throw Error(errors.join("; "));
  const indices = new Map<ResponseFixture, number>();
  const releases = new Set(
    specs
      .flatMap(responseSteps)
      .flatMap((step) => (step.release ? [step.release] : [])),
  );
  const released = new Set<string>();
  const waiting = new Map<string, (allowed: boolean) => void>();
  const expectedFailures: { url: string; status: number; abort?: string }[] =
    [];
  const observations: {
    type: string;
    alias?: string;
    url?: string;
    index?: number;
    status?: number;
    expectedFailure?: boolean;
  }[] = [];
  let disposed = false;
  return {
    observations,
    release(alias: string) {
      if (disposed || !releases.has(alias) || released.has(alias))
        throw Error("Unknown, duplicate or closed response release: " + alias);
      released.add(alias);
      waiting.get(alias)?.(true);
      observations.push({ type: "release", alias });
    },
    expectedConsoleError(url: string, text: string) {
      return expectedFailures.some(
        (f) =>
          f.url === url &&
          text.startsWith("Failed to load resource:") &&
          (f.abort
            ? text.includes(f.abort)
            : text.includes("status of " + f.status)),
      );
    },
    async handle(route: Route): Promise<boolean> {
      const request = route.request();
      const mock = specs.find((spec) =>
        matchesResponse(request.url(), request.method(), spec, baseURL),
      );
      if (!mock) return false;
      if (disposed) {
        await route.abort();
        return true;
      }
      const index = indices.get(mock) ?? 0;
      const step = mock.sequence ? responseSteps(mock)[index] : mock;
      if (!step)
        throw Error("Fixture response sequence exhausted: " + mock.url);
      indices.set(mock, index + 1);
      aliases.bind(request, step);
      observations.push({
        type: "request",
        url: mock.url,
        index,
        ...(step.alias ? { alias: step.alias } : {}),
      });
      if (step.release && !released.has(step.release)) {
        const allowed = await new Promise<boolean>((resolve) => {
          const timer = setTimeout(() => {
            waiting.delete(step.release!);
            resolve(false);
          }, timeoutMs);
          waiting.set(step.release!, (value) => {
            clearTimeout(timer);
            waiting.delete(step.release!);
            resolve(value);
          });
        });
        if (!allowed) {
          if (disposed) {
            await route.abort().catch(() => {});
            return true;
          }
          throw Error(
            "Timed out waiting for controlled response release: " +
              step.release,
          );
        }
      }
      const status = step.status ?? 200;
      if (step.abort) {
        expectedFailures.push({
          url: request.url(),
          status: 0,
          abort:
            step.abort === "connectionreset"
              ? "net::ERR_CONNECTION_RESET"
              : "net::ERR_TIMED_OUT",
        });
        await route.abort(step.abort);
        observations.push({
          type: "expected-network-failure",
          url: mock.url,
          index,
          ...(step.alias ? { alias: step.alias } : {}),
          status: 0,
          expectedFailure: true,
        });
        return true;
      }
      if (step.expectedFailure)
        expectedFailures.push({ url: request.url(), status });
      await route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(step.body ?? null),
      });
      observations.push({
        type: "response",
        url: mock.url,
        index,
        ...(step.alias ? { alias: step.alias } : {}),
        status,
        expectedFailure: step.expectedFailure === true,
      });
      return true;
    },
    dispose() {
      disposed = true;
      for (const resolve of [...waiting.values()]) resolve(false);
      waiting.clear();
    },
  };
}

export function validateFixtureActions(
  specs: ResponseFixture[],
  actions: { type: string; alias?: string }[],
): string[] {
  const steps = specs.flatMap(responseSteps);
  const aliases = new Set(
    steps.flatMap((step) => (step.alias ? [step.alias] : [])),
  );
  const releases = new Set(
    steps.flatMap((step) => (step.release ? [step.release] : [])),
  );
  const errors: string[] = [];
  for (const action of actions) {
    if (
      action.type === "waitForResponseAlias" &&
      !aliases.has(action.alias ?? "")
    )
      errors.push("Unknown response alias: " + action.alias);
    if (
      action.type === "releaseResponseAlias" &&
      !releases.has(action.alias ?? "")
    )
      errors.push("Unknown response release alias: " + action.alias);
  }
  return errors;
}
