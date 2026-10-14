/**
 * Visual review protocol for teams using INTEIRO.
 * Static source analysis cannot establish how a rendered interface looks.
 */
export const VISUAL_REVIEW_GUIDE = {
  title: "Revisão visual INTEIRO",
  purpose: "Tornar verificável a revisão de hierarquia, alinhamento, escala, texto e responsividade com evidência renderizada.",
  scope: {
    staticAudit: "inteiro_audit encontra padrões e riscos no texto-fonte. Não mede hierarquia, alinhamento, quebra de texto, tamanho percebido nem comportamento responsivo renderizado.",
    screenshotInspection: false,
    humanReviewRequired: true,
    rule: "Não declare aprovação visual sem capturas renderizadas de todas as rotas críticas e revisão humana das diferenças. O MCP organiza a cobertura; ele não captura nem interpreta pixels."
  },
  inventory: [
    "Liste as rotas visíveis para cada perfil de acesso.",
    "Para cada rota, registre shell, densidade, tema, ação principal e estados que realmente existem.",
    "Inclua estados inicial, carregando, vazio, erro, sucesso, validação, foco, seleção e modal quando aplicáveis.",
    "Agrupe rotas pelo shell compartilhado para cobrir componentes comuns sem multiplicar capturas equivalentes."
  ],
  viewports: [
    { id: "mobile-narrow", width: 320, height: 800, coverage: "Reflow, overflow e controles estreitos em cada shell e formulário complexo." },
    { id: "mobile", width: 390, height: 844, coverage: "Todas as rotas críticas; navegação, formulários e ações principais." },
    { id: "tablet", width: 768, height: 1024, coverage: "Uma rota por shell; transição entre navegação móvel e desktop." },
    { id: "desktop", width: 1280, height: 800, coverage: "Todas as rotas críticas; alinhamento, hierarquia e densidade operacional." },
    { id: "desktop-wide", width: 1440, height: 900, coverage: "Uma rota por shell; limite de largura e excesso de espaço horizontal." }
  ],
  coverage: [
    "Desktop 1280 e mobile 390 em cada rota crítica.",
    "Mobile 320 e tablet 768 em pelo menos uma rota de cada shell compartilhado e em cada formulário/tabela complexos.",
    "Dark e light em uma rota por shell; temas de alto contraste em controles e estados críticos.",
    "Focus, erro, carregamento, vazio e sucesso nos componentes que oferecem esses estados.",
    "Calm em fluxos editoriais; focus em telas operacionais. Não combine todas as dimensões em uma matriz cartesiana."
  ],
  checklist: [
    { id: "hierarchy", check: "Título, contexto, conteúdo e ação principal têm ordem visual inequívoca?" },
    { id: "alignment", check: "Cabeçalhos, campos, cards e ações repetidas começam e terminam em eixos consistentes entre telas?" },
    { id: "scale", check: "Componentes equivalentes usam a mesma variante e compartilham altura, padding, tipografia e raio?" },
    { id: "text", check: "Títulos e frases quebram em limites naturais; a escala tipográfica se adapta sem fragmentar palavras?" },
    { id: "overflow", check: "Há texto, identificadores, pills ou indicadores cortados, sobrepostos ou escondidos por overflow?" },
    { id: "responsive", check: "Em 320px há reflow sem rolagem horizontal da página, controles comprimidos ou conteúdo encoberto?" },
    { id: "mobile-navigation", check: "A navegação estreita deixa espaço real para o conteúdo e mantém rótulos acessíveis e targets de 44px?" },
    { id: "density", check: "A densidade corresponde à tarefa e o agrupamento continua claro?" },
    { id: "identity", check: "Violeta marca escolha, laranja compromisso real e Costura uma mudança de interpretação?" },
    { id: "accessibility", check: "Foco, contraste, targets, texto de estado, zoom e movimento reduzido permanecem utilizáveis?" }
  ],
  layoutRisks: [
    { id: "anywhere", risk: "overflow-wrap:anywhere em texto comum pode dividir títulos e frases em pontos arbitrários.", prevention: "Use quebra natural; reserve quebra de emergência para identificadores e conteúdo sem pontos de quebra, dentro de um contêiner próprio." },
    { id: "nowrap", risk: "white-space:nowrap em texto variável pode comprimir ou cortar labels, pills e mensagens em telas estreitas.", prevention: "Permita quebra ou defina uma alternativa acessível e visível para valores que não cabem." },
    { id: "clipping", risk: "overflow:hidden em contêineres de conteúdo pode ocultar texto, status e foco.", prevention: "Limite recorte a mídia e decoração; em conteúdo, permita expansão, quebra ou rolagem local explícita." },
    { id: "screen-specific-sizing", risk: "Tamanhos e espaçamentos definidos isoladamente por tela fazem componentes equivalentes divergir.", prevention: "Reutilize recipes, variantes e tokens semânticos; exceções precisam de uma intenção documentada." }
  ],
  capture: [
    "Use dados fixos, fontes carregadas e o mesmo estado de sessão nas capturas comparadas.",
    "Aguarde a interface estabilizar; desative animações apenas na captura de comparação e respeite prefers-reduced-motion no produto.",
    "Armazene baseline aprovado com rota, viewport, tema, densidade, perfil, estado e commit.",
    "Use comparação de pixels para localizar diferenças. Revise a causa visualmente; o diff não aprova harmonia nem intenção.",
    "Não mascare texto, dimensões ou deslocamentos de layout. Mascare apenas valores dinâmicos documentados.",
    "Compare pares de componentes equivalentes entre rotas e estados; o mesmo nome de classe não prova que o tamanho renderizado é igual."
  ],
  prevention: [
    "Faça a equipe registrar um inventário de rotas e estados como entrada versionada da revisão.",
    "Execute a matriz de capturas nos gates de release e preserve baselines aprovadas por commit.",
    "Revise diffs visuais em pull requests; diferenças de dimensão, alinhamento e wrapping precisam de justificativa explícita.",
    "Prefira corrigir o contrato compartilhado do componente em vez de adicionar exceções CSS isoladas por rota.",
    "Use inteiro_audit para sinalizar riscos no fonte e a revisão humana para decidir se a interface renderizada falha."
  ],
  findingTemplate: {
    required: ["route", "viewport", "theme", "density", "profile", "state", "commit", "screenshot", "severity", "expected", "observed", "likelyCause", "correctiveAction", "validation", "rollback"],
    decision: ["DIRECT_CHANGE", "CLOSED_COLLECTION", "NO_CHANGE"],
    rule: "Toda falha aponta evidência, causa provável, ação, validação e reversão; toda diferença aceita tem justificativa."
  },
  acceptance: [
    "Nenhum overflow horizontal inesperado nem texto cortado em 320px; repita em zoom de 200% e 400%.",
    "Componentes equivalentes têm dimensões e alinhamentos consistentes entre rotas e estados.",
    "Nenhuma captura crítica deixa de ter comparação ou revisão humana registrada.",
    "Títulos, labels e mensagens não usam quebras arbitrárias para compensar falta de espaço.",
    "Toda diferença aceita tem motivo; toda falha aponta rota, viewport, estado e ação corretiva."
  ]
} as const;

export interface VisualReviewRoute {
  path: string;
  shell: string;
  profile?: string;
  complexForm?: boolean;
  complexTable?: boolean;
  states?: string[];
}

const REVIEW_VIEWPORTS = {
  narrow: { id: "mobile-narrow", width: 320, height: 800 },
  mobile: { id: "mobile", width: 390, height: 844 },
  tablet: { id: "tablet", width: 768, height: 1024 },
  desktop: { id: "desktop", width: 1280, height: 800 },
  wide: { id: "desktop-wide", width: 1440, height: 900 }
} as const;

function parseReviewRoutes(input: unknown): VisualReviewRoute[] {
  if (!Array.isArray(input) || input.length === 0) {
    throw new Error("Informe ao menos uma rota para gerar a matriz de revisão visual.");
  }
  if (input.length > 100) throw new Error("A revisão visual aceita até 100 rotas por plano.");

  const routes = input.map((entry, index): VisualReviewRoute => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
      throw new Error(`Rota ${index + 1} deve ser um objeto.`);
    }
    const route = entry as Record<string, unknown>;
    const path = typeof route.path === "string" ? route.path.trim() : "";
    const shell = typeof route.shell === "string" ? route.shell.trim() : "";
    if (!path || path.length > 240) throw new Error(`Rota ${index + 1} precisa de path com até 240 caracteres.`);
    if (!shell || shell.length > 120) throw new Error(`Rota ${index + 1} precisa de shell com até 120 caracteres.`);
    if (route.profile !== undefined && (typeof route.profile !== "string" || route.profile.length > 120)) {
      throw new Error(`Perfil da rota ${path} deve ter até 120 caracteres.`);
    }
    for (const key of ["complexForm", "complexTable"] as const) {
      if (route[key] !== undefined && typeof route[key] !== "boolean") {
        throw new Error(`${key} da rota ${path} deve ser booleano.`);
      }
    }
    const states = route.states ?? ["initial"];
    if (!Array.isArray(states) || states.length > 20 || states.some((state) => typeof state !== "string" || state.trim().length === 0 || state.length > 80)) {
      throw new Error(`Estados da rota ${path} devem ser até 20 nomes não vazios de, no máximo, 80 caracteres.`);
    }
    return {
      path,
      shell,
      ...(typeof route.profile === "string" ? { profile: route.profile } : {}),
      ...(route.complexForm === true ? { complexForm: true } : {}),
      ...(route.complexTable === true ? { complexTable: true } : {}),
      states: states.map((state: string) => state.trim())
    };
  });

  const paths = new Set<string>();
  for (const route of routes) {
    if (paths.has(route.path)) throw new Error(`Rota duplicada no plano de revisão: ${route.path}`);
    paths.add(route.path);
  }
  return routes;
}

/** Build a concrete, bounded route/viewport matrix without multiplying every visual dimension. */
export function createVisualReviewPlan(input: unknown) {
  const routes = parseReviewRoutes(input);
  const firstRouteByShell = new Map<string, string>();
  for (const route of routes) {
    if (!firstRouteByShell.has(route.shell)) firstRouteByShell.set(route.shell, route.path);
  }

  const matrix = routes.map((route) => {
    const coversShell = firstRouteByShell.get(route.shell) === route.path;
    const viewportReasons = new Map<string, { viewport: (typeof REVIEW_VIEWPORTS)[keyof typeof REVIEW_VIEWPORTS]; reasons: string[] }>();
    const add = (key: keyof typeof REVIEW_VIEWPORTS, reason: string) => {
      const viewport = REVIEW_VIEWPORTS[key];
      const current = viewportReasons.get(viewport.id) ?? { viewport, reasons: [] };
      if (!current.reasons.includes(reason)) current.reasons.push(reason);
      viewportReasons.set(viewport.id, current);
    };

    add("mobile", "Toda rota crítica em largura mobile de referência.");
    add("desktop", "Toda rota crítica em largura desktop de referência.");
    if (coversShell || route.complexForm || route.complexTable) {
      add("narrow", coversShell ? "Reflow do shell a 320px." : "Reflow do formulário/tabela complexo a 320px.");
      add("tablet", coversShell ? "Transição responsiva do shell a 768px." : "Reflow do formulário/tabela complexo a 768px.");
    }
    if (coversShell) add("wide", "Conferir limite de largura e espaço horizontal do shell.");

    return {
      path: route.path,
      shell: route.shell,
      ...(route.profile ? { profile: route.profile } : {}),
      viewports: [...viewportReasons.values()].map(({ viewport, reasons }) => ({ ...viewport, reasons })),
      themes: coversShell ? ["dark", "light"] : ["project-default"],
      states: route.states
    };
  });

  return {
    routeCount: routes.length,
    shellCount: firstRouteByShell.size,
    requiredRouteViewportPairs: matrix.reduce((count, route) => count + route.viewports.length, 0),
    matrix,
    note: "O plano define cobertura; ele não captura a interface nem declara conformidade visual. Registre evidência e revisão humana para cada par rota/viewport."
  };
}

export function getVisualReviewGuidance() {
  return VISUAL_REVIEW_GUIDE;
}
