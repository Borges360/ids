import { readFile } from "node:fs/promises";
import { hash } from "../packages/contracts/src/index.ts";
import { RELEASE_REQUIREMENTS } from "../packages/agent-core/src/release.ts";
const matrix = JSON.parse(
  await readFile("docs/P0_AUTONOMOUS_MATRIX.json", "utf8"),
);
const errors = [];
if (
  hash(await readFile(matrix.historicalSpecification.path)) !==
  matrix.historicalSpecification.sha256
)
  errors.push("Historical specification changed");
const specification = await readFile(
  matrix.historicalSpecification.path,
  "utf8",
);
const workPackages = specification
  .split(/\r?\n/)
  .filter((line) => /^\| WP-\d{2} \|/.test(line))
  .map((line) =>
    line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim()),
  );
if (workPackages.length !== 23)
  errors.push("Incomplete original work-package inventory");
for (const [id, dependencies, deliverable, exitCriteria] of workPackages) {
  const row = matrix.requirements.find((row) => row.id === id);
  if (
    row?.title !== deliverable ||
    row.sourceRequirement?.dependencies !== dependencies ||
    row.sourceRequirement?.deliverable !== deliverable ||
    row.sourceRequirement?.exitCriteria !== exitCriteria
  )
    errors.push("Original work-package destination changed: " + id);
}
const ids = matrix.requirements.map((row) => row.id);
if (
  new Set(ids).size !== 58 ||
  ids.length !== 58 ||
  RELEASE_REQUIREMENTS.some((id) => !ids.includes(id))
)
  errors.push("Incomplete requirement inventory");
for (const row of matrix.requirements) {
  if (
    !["mandatory", "technical-substitution"].includes(row.applicability) ||
    !row.remaining ||
    !row.requiredEvidence ||
    !row.verification.length ||
    !row.implementation.length
  )
    errors.push("Incomplete destination: " + row.id);
  // Acceptance resolves each row to its own executed cases, checks or gates.
  if (
    ![row.proof?.tests, row.proof?.checks, row.proof?.gates].some(
      (list) => Array.isArray(list) && list.length,
    )
  )
    errors.push("Missing executable proof binding: " + row.id);
  // Checks and gates are shared aggregates; a row needs a case of its own.
  if (!Array.isArray(row.proof?.tests) || !row.proof.tests.length)
    errors.push("Missing executed-case binding: " + row.id);
  if (row.status === "passed" && !row.evidence.length)
    errors.push("Unproven acceptance: " + row.id);
}
const result = {
  kind: "autonomous-scope-integrity",
  status: errors.length ? "failed" : "passed",
  requirements: ids.length,
  accepted: matrix.requirements.filter((row) => row.status === "passed").length,
  errors,
};
console.log(JSON.stringify(result, null, 2));
process.exitCode = errors.length ? 6 : 0;
