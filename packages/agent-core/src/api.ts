import {
  allTokens,
  catalogStats,
  contrastPairs,
  formatCssValue,
  resolveToken,
  tokensById,
  type Appearance,
  type TokenDef
} from "@inteiro/tokens";
import { getGuidelines, GUIDELINES, type Guideline } from "./guidelines.ts";
import { getComponentRecipe, RECIPES, type Recipe } from "./recipes.ts";

export interface TokenExplanation {
  id: string;
  cssVar: string;
  type: string;
  layer: string;
  category: string;
  subcategory: string;
  description: string;
  intent: string;
  usage: string[];
  avoid: string[];
  a11y: string;
  examples: { good: string; bad: string };
  sourceSection: string;
  status: string;
  consumerFacing: boolean;
  values: Record<string, string>;
  dependencies: string[];
}

export function getToken(name: string, theme: Appearance = "dark"): TokenDef {
  const map = tokensById();
  const direct = map.get(name);
  if (direct) return direct;
  const lowered = name.toLowerCase().replaceAll("/", ".").replaceAll("-", ".");
  for (const token of map.values()) {
    if (token.id === lowered || token.cssVar === name || token.cssVar === `--in-${name}`) return token;
    if (token.id.replaceAll(".", "-") === name) return token;
  }
  throw new Error(`Token não encontrado: ${name}`);
}

export function explainToken(name: string): TokenExplanation {
  const token = getToken(name);
  const values: Record<string, string> = {};
  for (const theme of ["dark", "light", "contrast-dark", "contrast-light"] as const) {
    try {
      values[theme] = formatCssValue(resolveToken(token.id, theme).value);
    } catch {
      /* token sem tema */
    }
  }
  if (token.value !== undefined && Object.keys(values).length === 0) {
    values.default = formatCssValue(resolveToken(token.id).value);
  }
  return {
    id: token.id,
    cssVar: token.cssVar,
    type: token.type,
    layer: token.layer,
    category: token.category,
    subcategory: token.subcategory,
    description: token.description,
    intent: token.meta.intent,
    usage: token.meta.usage,
    avoid: token.meta.avoid,
    a11y: token.meta.a11y,
    examples: token.meta.examples,
    sourceSection: token.sourceSection,
    status: token.status,
    consumerFacing: token.consumerFacing,
    values,
    dependencies: token.meta.dependencies ?? []
  };
}

export function searchTokens(query: string): TokenDef[] {
  const q = query.toLowerCase().trim();
  if (!q) return allTokens();
  return allTokens().filter((t) => {
    const hay = [
      t.id,
      t.cssVar,
      t.description,
      t.meta.intent,
      t.category,
      t.subcategory,
      t.meta.usage.join(" "),
      t.layer
    ]
      .join(" ")
      .toLowerCase();
    return q.split(/\s+/).every((part) => hay.includes(part));
  });
}

export function suggestTokens(context: string): TokenDef[] {
  const c = context.toLowerCase();
  const ids: string[] = [];
  if (/(deploy|publicar|aplicar|commit|release)/.test(c)) ids.push("color.identity.commit", "color.action.commit.background");
  if (/(salvar|selecionar|primary|escolher|foco|focus)/.test(c)) ids.push("color.identity.primary", "color.action.primary.background");
  if (/(excluir|apagar|erro|danger|falha)/.test(c)) ids.push("color.status.danger", "color.action.danger.background");
  if (/(sucesso|ok|resolv)/.test(c)) ids.push("color.status.success");
  if (/(aviso|warning|atenção|atencao)/.test(c)) ids.push("color.status.warning");
  if (/(espaço|espaco|padding|gap|rhythm)/.test(c)) ids.push("space.400", "space.200", "space.600");
  if (/(editorial|artigo|leitura)/.test(c)) ids.push("font.voice.human", "layout.content.reading", "density.card-padding");
  if (/(dashboard|tabela|métrica|metrica)/.test(c)) ids.push("font.voice.machine", "density.table-row");
  if (/(costura|seam|reflex)/.test(c)) ids.push("border.seam", "color.identity.primary");
  if (ids.length === 0) ids.push("color.background.canvas", "color.text.primary", "space.400");
  return [...new Set(ids)].map((id) => getToken(id));
}

export interface UsageValidation {
  ok: boolean;
  issues: string[];
}

export function validateUsage(input: { token?: string; code?: string; layer?: string }): UsageValidation {
  const issues: string[] = [];
  if (input.token) {
    const token = getToken(input.token);
    if (token.layer === "primitive" && token.category === "color" && input.layer === "component") {
      issues.push("Componentes não devem consumir primitivos de cor. Use o semântico correspondente.");
    }
    if (token.id === "color.accent") {
      issues.push("color.accent está deprecated. Use color.identity.commit.");
    }
    if (token.id === "radius.full" && /button/i.test(input.code ?? "")) {
      issues.push("Pill não é a forma padrão de um botão.");
    }
  }
  if (input.code) {
    if (/#000000|#000\b/i.test(input.code)) issues.push("Preto absoluto não é canvas INTEIRO. Use color.background.canvas.");
    if (/#ffffff|#fff\b/i.test(input.code) && /background/i.test(input.code)) {
      issues.push("Branco absoluto só é superfície light, não canvas. Prefira tokens semânticos.");
    }
    if (/z-index:\s*999/.test(input.code)) issues.push("Não existe z-index: 999999. Use a escala z.*.");
    if (/outline:\s*none/.test(input.code)) issues.push("Não remover o foco visível.");
    if (/border-left/.test(input.code)) issues.push("Use border-inline-start para a Costura (RTL).");
    if (/Inter|JetBrains Mono/.test(input.code)) issues.push("Tipografia canônica é Recursive com vozes, não Inter + JetBrains.");
    if (/Oops!|🎉|😅|Are you sure\?/i.test(input.code)) issues.push("Microcopy viola o tom INTEIRO.");
  }
  return { ok: issues.length === 0, issues };
}

export interface AuditFinding {
  file: string;
  line: number;
  kind: string;
  message: string;
  suggestion?: string;
}

const HEX = /#([0-9a-fA-F]{3,8})\b/g;
const HEX_MAP: Record<string, string> = {
  "#8B5CF6": "color.identity.primary",
  "#FF9138": "color.identity.commit",
  "#A78BFA": "color.identity.primary (não o primitivo violet.400 em componente)",
  "#FF9A56": "color.identity.commit",
  "#0C0D12": "color.background.canvas",
  "#F4F1EA": "color.text.primary (dark)"
};

export function auditSource(file: string, source: string): AuditFinding[] {
  const findings: AuditFinding[] = [];
  const lines = source.split(/\r?\n/);
  lines.forEach((line, index) => {
    if (/outline\s*:\s*none/.test(line)) {
      findings.push({ file, line: index + 1, kind: "a11y", message: "outline:none remove o foco visível.", suggestion: "Usar :focus-visible com color.focus.ring" });
    }
    if (/z-index\s*:\s*9{3,}/.test(line)) {
      findings.push({ file, line: index + 1, kind: "z", message: "z-index fora da escala.", suggestion: "z.modal / z.command / ..." });
    }
    if (/border-left\s*:/.test(line)) {
      findings.push({ file, line: index + 1, kind: "rtl", message: "border-left quebra RTL.", suggestion: "border-inline-start" });
    }
    for (const match of line.matchAll(HEX)) {
      const hex = match[0]!.toUpperCase();
      const full = hex.length === 4 ? "#" + hex.slice(1).split("").map((c) => c + c).join("") : hex;
      const suggestion = HEX_MAP[full];
      if (suggestion) {
        findings.push({
          file,
          line: index + 1,
          kind: "hardcoded-hex",
          message: `${full} hardcoded.`,
          suggestion
        });
      }
    }
    if (/Inter|JetBrains/.test(line)) {
      findings.push({ file, line: index + 1, kind: "type", message: "Família fora da identidade.", suggestion: "font.family.sans / font.voice.*" });
    }
    if (/overflow-wrap\s*:\s*anywhere/i.test(line)) {
      findings.push({
        file,
        line: index + 1,
        kind: "layout-risk",
        message: "overflow-wrap:anywhere pode dividir títulos e frases em pontos arbitrários; a auditoria estática não sabe o escopo visual da regra.",
        suggestion: "Prefira quebra natural. Reserve a quebra de emergência para identificadores e conteúdo sem pontos de quebra, e confira a captura em 320px."
      });
    }
    if (/white-space\s*:\s*nowrap/i.test(line)) {
      findings.push({
        file,
        line: index + 1,
        kind: "layout-risk",
        message: "white-space:nowrap pode comprimir ou cortar conteúdo variável em larguras estreitas.",
        suggestion: "Permita a quebra ou documente um tratamento local acessível; confira labels, pills e mensagens em 320px."
      });
    }
    if (/(?:^|[;{]\s*)overflow(?:-[xy])?\s*:\s*hidden\b/i.test(line)) {
      findings.push({
        file,
        line: index + 1,
        kind: "layout-risk",
        message: "overflow:hidden pode esconder texto, status ou foco; a auditoria estática não consegue determinar se o recorte é intencional.",
        suggestion: "Restrinja recorte a mídia ou decoração; em conteúdo, permita expansão, quebra ou rolagem local explícita e revise a captura."
      });
    }
  });
  return findings;
}

export function getTheme(name: string): { name: string; tokens: Record<string, string> } {
  const theme = name as Appearance;
  const allowed: Appearance[] = ["dark", "light", "contrast-dark", "contrast-light"];
  if (!allowed.includes(theme)) throw new Error(`Tema desconhecido: ${name}`);
  const entries: Record<string, string> = {};
  for (const token of allTokens().filter((t) => t.themes)) {
    entries[token.id] = formatCssValue(resolveToken(token.id, theme).value);
  }
  return { name: theme, tokens: entries };
}

export function coreInfo(): {
  stats: ReturnType<typeof catalogStats>;
  themes: string[];
  densities: string[];
  guidelineCount: number;
  recipeCount: number;
  contrast: ReturnType<typeof contrastPairs>;
} {
  return {
    stats: catalogStats(),
    themes: ["dark", "light", "contrast-dark", "contrast-light"],
    densities: ["calm", "focus"],
    guidelineCount: GUIDELINES.length,
    recipeCount: RECIPES.length,
    contrast: contrastPairs()
  };
}

export { getGuidelines, getComponentRecipe, GUIDELINES, RECIPES };
export type { Guideline, Recipe };
