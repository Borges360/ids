import { readFileSync } from "node:fs";
import { allTokens } from "@inteiro/tokens";
import { finding } from "@inteiro/contracts";

export interface Pattern {
  schemaVersion: string;
  id: string;
  version: string;
  kind: string;
  description: string;
  slots: string[];
  variants: string[];
  states: string[];
  requiredTokens: string[];
  allowedDependencies: string[];
  accessibility: { semantics: string[]; keyboardSpec: string };
  responsive: { mobileStrategy: string };
  examples: string[];
  tests: string[];
  aliases: string[];
  markup: string;
}
export const patterns = JSON.parse(
  readFileSync(new URL("../catalog.index.json", import.meta.url), "utf8"),
) as Pattern[];
export function getPattern(id: string) {
  return patterns.find((p) => p.id === id);
}
export function findPatterns(query: string, k = 5) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return patterns
    .map((pattern) => ({
      pattern,
      score: words.reduce(
        (n, w) =>
          n +
          ([pattern.id, pattern.description, ...pattern.aliases]
            .join(" ")
            .toLowerCase()
            .includes(w)
            ? 1
            : 0),
        0,
      ),
    }))
    .filter((p) => p.score > 0)
    .sort(
      (a, b) => b.score - a.score || a.pattern.id.localeCompare(b.pattern.id),
    )
    .slice(0, Math.max(1, Math.min(k, 20)))
    .map((p) => ({ ...p, reason: "Lexical matches: " + p.score }));
}
export function validatePattern(pattern: Pattern) {
  const tokens = new Set(allTokens().map((t) => t.id));
  return [
    ...pattern.requiredTokens
      .filter((t) => !tokens.has(t))
      .map((t) =>
        finding("IN-TOKEN-003", "Unknown token " + t, {
          componentId: pattern.id,
        }),
      ),
    ...["default"]
      .filter((s) => !pattern.states.includes(s))
      .map((s) =>
        finding("IN-STATE-001", "Missing state " + s, {
          componentId: pattern.id,
        }),
      ),
  ];
}
export function validateComposition(input: {
  patternId: string;
  slots?: string[];
  states?: string[];
  variant?: string;
}) {
  const p = getPattern(input.patternId);
  if (!p)
    return {
      status: "blocked",
      findings: [
        finding("IN-COMP-002", "Pattern not found: " + input.patternId, {
          status: "blocked",
        }),
      ],
      suggestions: findPatterns(input.patternId).map((x) => x.pattern.id),
    };
  const findings = validatePattern(p);
  if (input.variant && !p.variants.includes(input.variant))
    findings.push(finding("IN-COMP-002", "Unknown variant " + input.variant));
  for (const slot of input.slots ?? [])
    if (!p.slots.includes(slot))
      findings.push(finding("IN-COMP-002", "Unknown slot " + slot));
  for (const state of p.states)
    if (input.states && !input.states.includes(state))
      findings.push(finding("IN-STATE-001", "Missing state " + state));
  return {
    status: findings.length ? "failed" : "passed",
    findings,
    patternId: p.id,
  };
}
