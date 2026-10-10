import { catalogStats } from "./catalog/index.ts";
import { contrastPairs, failingContrast } from "./contrast.ts";
import { validateCatalog } from "./validate.ts";

const issues = validateCatalog();
const errors = issues.filter((i) => i.severity === "error");
const warnings = issues.filter((i) => i.severity === "warning");
const stats = catalogStats();
const fails = failingContrast();

console.log(JSON.stringify({ stats, errors: errors.length, warnings: warnings.length, contrastFails: fails.length }, null, 2));
if (errors.length) {
  for (const error of errors) console.error(`[error] ${error.code} ${error.token ?? ""} ${error.message}`);
  process.exitCode = 1;
}
if (fails.length) {
  for (const fail of fails) {
    console.error(`[contrast] ${fail.theme} ${fail.id} ${fail.ratio}:1 < ${fail.minimum}:1`);
  }
}
for (const pair of contrastPairs()) {
  if (pair.documented !== undefined) {
    const delta = Math.abs(pair.ratio - pair.documented);
    if (delta > 0.35) {
      console.warn(`[contrast-doc] ${pair.theme} ${pair.id} medido ${pair.ratio} documentado ${pair.documented}`);
    }
  }
}
