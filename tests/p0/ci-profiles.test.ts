import { it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import { requiredGates } from "@inteiro/contracts";

/** Evaluates the workflow's profile expression for one trigger context. */
function profileFor(expression: string, event: string, ref: string): string {
  const body = expression
    .replace(/^\$\{\{\s*|\s*\}\}$/g, "")
    .replaceAll("github.event_name", JSON.stringify(event))
    .replaceAll("github.ref", JSON.stringify(ref))
    .replaceAll("==", "===");
  if (/[^\w\s'"=&|/.-]/.test(body)) throw Error("Unexpected expression");
  return new Function("return (" + body + ")")();
}

it("maps CI triggers to the strict P0 profiles without narrowing protected runs", async () => {
  const workflow = parse(
    await readFile(".github/workflows/inteiro-gates.yml", "utf8"),
  );
  expect(workflow.on.push.branches).toEqual(["main"]);
  expect(workflow.on).toHaveProperty("pull_request");
  expect(workflow.on.schedule).toEqual([{ cron: "0 4 * * *" }]);
  const job = workflow.jobs.gates;
  const expression = job.env.INTEIRO_GATE_PROFILE;
  expect(profileFor(expression, "pull_request", "refs/pull/1/merge")).toBe(
    "pr",
  );
  expect(profileFor(expression, "push", "refs/heads/main")).toBe("main");
  expect(profileFor(expression, "schedule", "refs/heads/main")).toBe("nightly");
  for (const profile of ["pr", "main", "nightly"])
    expect(requiredGates(profile)).toEqual(
      expect.arrayContaining(["context", "static", "browser", "review"]),
    );
  const commands: string[] = job.steps
    .map((step: { run?: string }) => step.run)
    .filter(Boolean);
  const gate = commands.findIndex((command) =>
    command.includes('gate run --profile "$INTEIRO_GATE_PROFILE" --start'),
  );
  const context = commands.findIndex((command) =>
    command.includes("context resolve --record"),
  );
  expect(gate).toBeGreaterThan(-1);
  expect(context).toBeGreaterThan(-1);
  expect(context).toBeLessThan(gate);
  // `--changed` must never reduce main/nightly coverage from the workflow.
  expect(commands.some((command) => command.includes("--changed"))).toBe(false);
  expect(commands).toEqual(
    expect.arrayContaining([
      "npm run test:browser-gate",
      "npm run test:stories",
    ]),
  );
});
