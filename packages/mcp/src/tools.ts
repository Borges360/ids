import {
  auditSource,
  createVisualReviewPlan,
  explainToken,
  getComponentRecipe,
  getGuidelines,
  getTheme,
  getToken,
  getVisualReviewGuidance,
  searchTokens,
  suggestTokens,
  validateUsage
} from "@inteiro/agent-core";

export const MCP_TOOLS = [
  { name: "inteiro_get_token", description: "Obtém um token INTEIRO pelo id canônico.", inputSchema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] } },
  { name: "inteiro_search_tokens", description: "Busca tokens por intenção, categoria ou id.", inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } },
  { name: "inteiro_explain_token", description: "Explica um token: intenção, uso, a11y, valores por tema.", inputSchema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] } },
  { name: "inteiro_get_guidelines", description: "Guidelines de identidade, voz, a11y, marca.", inputSchema: { type: "object", properties: { topic: { type: "string" } } } },
  { name: "inteiro_get_component_recipe", description: "Recipe INTEIRO de componente, inclusive padrões para shells de aplicação, navegação mobile, perfil e fluxos por etapas.", inputSchema: { type: "object", properties: { name: { type: "string" } } } },
  { name: "inteiro_get_theme", description: "Inspeciona um tema.", inputSchema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] } },
  { name: "inteiro_suggest_tokens", description: "Sugere tokens a partir de um contexto em linguagem natural.", inputSchema: { type: "object", properties: { context: { type: "string" } }, required: ["context"] } },
  { name: "inteiro_validate_usage", description: "Valida um trecho de código contra regras INTEIRO.", inputSchema: { type: "object", properties: { code: { type: "string" }, token: { type: "string" } } } },
  { name: "inteiro_audit", description: "Auditoria estática do texto-fonte: encontra regras conhecidas e sinaliza riscos de quebra arbitrária e clipping. Não mede a interface renderizada; confirme o contexto nas capturas com inteiro_get_visual_review.", inputSchema: { type: "object", properties: { file: { type: "string" }, source: { type: "string" } }, required: ["file", "source"] } },
  {
    name: "inteiro_get_visual_review",
    description: "Entrega critérios de harmonia e prevenção visual. Passe routes[] com path, shell e estados para gerar uma matriz concreta por rota, viewport e tema. O MCP não captura nem interpreta pixels; a aprovação requer revisão humana.",
    inputSchema: {
      type: "object",
      properties: {
        routes: {
          type: "array",
          minItems: 1,
          maxItems: 100,
          items: {
            type: "object",
            properties: {
              path: { type: "string", maxLength: 240 },
              shell: { type: "string", maxLength: 120 },
              profile: { type: "string", maxLength: 120 },
              complexForm: { type: "boolean" },
              complexTable: { type: "boolean" },
              states: { type: "array", maxItems: 20, items: { type: "string", maxLength: 80 } }
            },
            required: ["path", "shell"],
            additionalProperties: false
          }
        }
      },
      additionalProperties: false
    }
  }
] as const;

export function callMcpTool(name: string, args: Record<string, unknown>): unknown {
  switch (name) {
    case "inteiro_get_token":
      return getToken(String(args.name));
    case "inteiro_search_tokens":
      return searchTokens(String(args.query)).slice(0, 50);
    case "inteiro_explain_token":
      return explainToken(String(args.name));
    case "inteiro_get_guidelines":
      return getGuidelines(args.topic ? String(args.topic) : undefined);
    case "inteiro_get_component_recipe":
      return getComponentRecipe(args.name ? String(args.name) : undefined);
    case "inteiro_get_theme":
      return getTheme(String(args.name));
    case "inteiro_suggest_tokens":
      return suggestTokens(String(args.context));
    case "inteiro_validate_usage":
      return validateUsage({
        ...(args.code ? { code: String(args.code) } : {}),
        ...(args.token ? { token: String(args.token) } : {})
      });
    case "inteiro_audit":
      return auditSource(String(args.file), String(args.source));
    case "inteiro_get_visual_review":
      return args.routes === undefined
        ? getVisualReviewGuidance()
        : { ...getVisualReviewGuidance(), plan: createVisualReviewPlan(args.routes) };
    default:
      throw new Error(`Ferramenta desconhecida: ${name}`);
  }
}
