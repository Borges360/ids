import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { gzipSync } from "node:zlib";
const files = {
  "packages/react/dist/index.js": 16000,
  "packages/design-system/src/components.css": 8000,
  "packages/tokens/dist/css/inteiro.css": 18000,
};
const report = Object.entries(files).map(([file, budget]) => ({
  file,
  bytes: readFileSync(file).length,
  gzip: gzipSync(readFileSync(file)).length,
  budget,
}));
mkdirSync("artifacts", { recursive: true });
writeFileSync("artifacts/bundle-report.json", JSON.stringify(report, null, 2));
console.table(report);
if (report.some((r) => r.gzip > r.budget)) process.exitCode = 1;
