import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
const current = JSON.parse(
  readFileSync("packages/tokens/source/catalog.json", "utf8"),
);
let baseline;
try {
  baseline = JSON.parse(
    execFileSync(
      "git",
      [
        "show",
        `${process.env.TOKEN_BASE_REF ?? "HEAD"}:packages/tokens/source/catalog.json`,
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ),
  );
} catch {
  baseline = JSON.parse(
    readFileSync("tests/fixtures/token-contract-1.0.json", "utf8"),
  );
}
const changes = baseline
  .filter((old) => {
    const token = current.find((t) => t.id === old.id);
    return !token || token.type !== old.type || token.cssVar !== old.cssVar;
  })
  .map((t) => t.id);
if (changes.length) {
  console.error(
    "Mudança incompatível exige release major e guia de migração:",
    changes.join(", "),
  );
  process.exitCode = 1;
} else
  console.log(
    `Contrato preservado: ${baseline.length} tokens anteriores; ${current.length - baseline.length} adições.`,
  );
