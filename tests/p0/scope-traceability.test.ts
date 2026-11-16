import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("autonomous work-package traceability", () => {
  it("binds every WP destination to the original deliverable and exit criteria", async () => {
    const matrix = JSON.parse(
      await readFile("docs/P0_AUTONOMOUS_MATRIX.json", "utf8"),
    );
    const specification = await readFile(
      matrix.historicalSpecification.path,
      "utf8",
    );
    const originals = specification
      .split(/\r?\n/)
      .filter((line) => /^\| WP-\d{2} \|/.test(line))
      .map((line) =>
        line
          .split("|")
          .slice(1, -1)
          .map((cell) => cell.trim()),
      );
    expect(originals).toHaveLength(23);
    expect(
      matrix.requirements.filter((row: { id: string }) => /^WP-/.test(row.id)),
    ).toHaveLength(23);
    for (const [id, dependencies, deliverable, exitCriteria] of originals) {
      const destination = matrix.requirements.find(
        (row: { id: string }) => row.id === id,
      );
      expect(destination, id).toBeDefined();
      expect(destination.title, id).toBe(deliverable);
      expect(destination.sourceRequirement, id).toEqual({
        dependencies,
        deliverable,
        exitCriteria,
      });
    }
  });
});
