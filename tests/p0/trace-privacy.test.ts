import { describe, it, expect } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:http";
import { chromium } from "@playwright/test";
import { inspectTracePrivacy } from "@inteiro/visual";

it("rejects corrupt trace archives instead of treating uninspected contents as safe", () => {
  for (const bytes of [
    Buffer.alloc(0),
    Buffer.from("not a trace ZIP"),
    Buffer.alloc(100),
  ])
    expect(() => inspectTracePrivacy(bytes)).toThrow();
});
describe.skipIf(process.env.INTEIRO_BROWSER_UNIT !== "1")(
  "Real browser trace privacy",
  () => {
    it("inspects compressed network resources and rejects credentials and session headers even when never rendered", async () => {
      const root = await mkdtemp(join(tmpdir(), "inteiro-trace-privacy-"));
      let sensitive = false;
      const server = createServer((request, response) => {
        if (request.url === "/api") {
          response.setHeader("Content-Type", "application/json");
          if (sensitive)
            response.setHeader(
              "Set-Cookie",
              "session=synthetic-session-secret; HttpOnly",
            );
          response.end(
            JSON.stringify(
              sensitive
                ? { password: "synthetic-unrendered-secret" }
                : { ok: true },
            ),
          );
          return;
        }
        response.setHeader("Content-Type", "text/html");
        response.end(
          "<!doctype html><title>Trace fixture</title><main><h1>Fixture</h1></main>",
        );
      });
      await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
      const browser = await chromium.launch({ headless: true });
      try {
        const capture = async (name: string) => {
          const context = await browser.newContext();
          await context.tracing.start({ screenshots: false, snapshots: true });
          const page = await context.newPage();
          await page.goto(
            "http://127.0.0.1:" + (server.address() as { port: number }).port,
          );
          await page.evaluate(async () => {
            await (await fetch("/api")).json();
          });
          const path = join(root, name + ".zip");
          await context.tracing.stop({ path });
          await context.close();
          return inspectTracePrivacy(await readFile(path));
        };
        expect(await capture("benign")).toMatchObject({
          status: "passed",
          violations: [],
        });
        sensitive = true;
        const unsafe = await capture("unsafe");
        expect(unsafe.status).toBe("blocked");
        expect(
          unsafe.violations.some((v) => v.reason === "sensitive-text"),
        ).toBe(true);
        expect(
          unsafe.violations.some(
            (v) => v.reason === "session-or-authorization-data",
          ),
        ).toBe(true);
        expect(JSON.stringify(unsafe)).not.toContain(
          "synthetic-unrendered-secret",
        );
        expect(JSON.stringify(unsafe)).not.toContain(
          "synthetic-session-secret",
        );
      } finally {
        await browser.close();
        await new Promise<void>((done) => server.close(() => done()));
        await rm(root, { recursive: true, force: true });
      }
    });
  },
);
