/**
 * Visual review protocol for teams using INTEIRO.
 * Static source analysis cannot establish how a rendered interface looks.
 */
export const VISUAL_REVIEW_GUIDE = {
  title: "Revisão visual INTEIRO",
  purpose: "Tornar verificável a revisão de hierarquia, alinhamento, escala e responsividade com evidência renderizada.",
  scope: {
    staticAudit: "inteiro_audit encontra padrões no texto-fonte. Não mede hierarquia, alinhamento, quebra de texto, tamanho percebido nem comportamento responsivo renderizado.",
    humanReviewRequired: true,
    rule: "Não declare aprovação visual sem capturas renderizadas de todas as rotas críticas e revisão humana das diferenças."
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
    { id: "alignment", check: "Cabeçalhos, campos, cards e ações repetidas começam e terminam em eixos consistentes?" },
    { id: "scale", check: "Componentes equivalentes compartilham altura, padding, tipografia e raio?" },
    { id: "text", check: "Rótulos e mensagens quebram em linhas legíveis sem colisão, reticências indevidas ou altura instável?" },
    { id: "responsive", check: "Em 320px há reflow sem rolagem horizontal da página, controles comprimidos ou conteúdo encoberto?" },
    { id: "density", check: "A densidade corresponde à tarefa e o agrupamento continua claro?" },
    { id: "identity", check: "Violeta marca escolha, laranja compromisso real e Costura uma mudança de interpretação?" },
    { id: "accessibility", check: "Foco, contraste, targets, texto de estado, zoom e movimento reduzido permanecem utilizáveis?" }
  ],
  capture: [
    "Use dados fixos, fontes carregadas e o mesmo estado de sessão nas capturas comparadas.",
    "Aguarde a interface estabilizar; desative animações apenas na captura de comparação e respeite prefers-reduced-motion no produto.",
    "Armazene baseline aprovado com rota, viewport, tema, densidade, perfil, estado e commit.",
    "Use comparação de pixels para localizar diferenças. Revise a causa visualmente; o diff não aprova harmonia nem intenção.",
    "Não mascare texto, dimensões ou deslocamentos de layout. Mascare apenas valores dinâmicos documentados."
  ],
  acceptance: [
    "Nenhum overflow horizontal inesperado em 320px.",
    "Componentes equivalentes têm dimensões e alinhamentos consistentes entre rotas.",
    "Nenhuma captura crítica deixa de ter comparação ou revisão humana registrada.",
    "Toda diferença aceita tem motivo; toda falha aponta rota, viewport, estado e ação corretiva."
  ]
} as const;

export function getVisualReviewGuidance() {
  return VISUAL_REVIEW_GUIDE;
}
