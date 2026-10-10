import { allTokens, tokensById } from "./catalog/index.ts";
import { aliasId, isAlias, rawValue, resolveToken, THEMES } from "./resolve.ts";
import type { Appearance, TokenDef } from "./types.ts";

export interface ValidationIssue {
  severity: "error" | "warning";
  code: string;
  token?: string;
  message: string;
}

const COLOR_TYPES = new Set(["color"]);
const DIM_TYPES = new Set(["dimension", "duration"]);

export function validateCatalog(tokens: TokenDef[] = allTokens()): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const map = tokensById(tokens);
  const ids = new Set(tokens.map((t) => t.id));

  if (ids.size !== tokens.length) {
    issues.push({ severity: "error", code: "duplicate", message: "Há identificadores duplicados no catálogo." });
  }

  for (const token of tokens) {
    if (token.path.some((p) => p.includes("."))) {
      issues.push({
        severity: "error",
        code: "dtcg-name",
        token: token.id,
        message: "DTCG proíbe ponto no nome individual de token ou grupo."
      });
    }

    const values: Array<{ theme?: Appearance; value: unknown }> = [];
    if (token.value !== undefined) values.push({ value: token.value });
    if (token.themes) {
      for (const [theme, value] of Object.entries(token.themes)) {
        values.push({ theme: theme as Appearance, value });
      }
    }
    if (values.length === 0 && !token.density) {
      issues.push({ severity: "error", code: "missing-value", token: token.id, message: "Token sem valor." });
    }

    for (const entry of values) {
      if (isAlias(entry.value)) {
        const ref = aliasId(entry.value);
        if (!map.has(ref)) {
          issues.push({
            severity: "error",
            code: "missing-alias",
            token: token.id,
            message: `Alias ${entry.value} aponta para token inexistente.`
          });
        } else {
          try {
            resolveToken(token.id, entry.theme ?? "dark", [], map);
          } catch (error) {
            issues.push({
              severity: "error",
              code: "cycle-or-resolve",
              token: token.id,
              message: error instanceof Error ? error.message : String(error)
            });
          }
        }
      }
    }

    if (token.layer === "component") {
      const raw = token.value ?? token.themes?.dark;
      if (isAlias(raw)) {
        const target = map.get(aliasId(raw));
        if (target?.layer === "primitive" && target.category === "color") {
          issues.push({
            severity: "error",
            code: "component-primitive",
            token: token.id,
            message: "Componente não pode aliasar primitivo de cor diretamente."
          });
        }
      }
    }
  }

  for (const theme of THEMES) {
    for (const token of tokens) {
      try {
        const resolved = resolveToken(token.id, theme, [], map);
        if (COLOR_TYPES.has(token.type)) {
          const v = resolved.value;
          if (typeof v === "object" && v && "colorSpace" in v) {
            const comps = v.components;
            if (comps.some((c) => c < 0 || c > 1)) {
              issues.push({
                severity: "error",
                code: "color-range",
                token: token.id,
                message: `Componente sRGB fora de 0–1 no tema ${theme}.`
              });
            }
          }
        }
        if (DIM_TYPES.has(token.type)) {
          const v = resolved.value;
          if (typeof v === "object" && v && "unit" in v && typeof v.value === "number" && Number.isNaN(v.value)) {
            issues.push({ severity: "error", code: "nan", token: token.id, message: "Dimensão NaN." });
          }
        }
      } catch (error) {
        issues.push({
          severity: "error",
          code: "resolve",
          token: token.id,
          message: `${theme}: ${error instanceof Error ? error.message : String(error)}`
        });
      }
    }
  }

  const accent = tokens.find((t) => t.id === "color.accent");
  if (accent && isAlias(rawValue(accent))) {
    /* expected deprecated token */
  }

  return uniqueIssues(issues);
}

function uniqueIssues(issues: ValidationIssue[]): ValidationIssue[] {
  const seen = new Set<string>();
  const out: ValidationIssue[] = [];
  for (const issue of issues) {
    const key = `${issue.code}:${issue.token}:${issue.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(issue);
  }
  return out;
}

export function assertValid(): void {
  const issues = validateCatalog().filter((i) => i.severity === "error");
  if (issues.length > 0) {
    const text = issues.map((i) => `- [${i.code}] ${i.token ?? ""} ${i.message}`).join("\n");
    throw new Error(`Catálogo inválido:\n${text}`);
  }
}
