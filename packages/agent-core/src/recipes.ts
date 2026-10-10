export interface Recipe {
  id: string;
  title: string;
  sourceSection: string;
  when: string;
  tokens: string[];
  steps: string[];
  good: string;
  bad: string;
}

export const RECIPES: Recipe[] = [
  {
    id: "button-primary",
    title: "Botão primary",
    sourceSection: "Componentes / Buttons",
    when: "Ação deliberada principal do contexto (salvar rascunho, revisar, editar).",
    tokens: ["color.action.primary.background", "color.action.primary.foreground", "button.size.md.height", "radius.md", "motion.fast"],
    steps: [
      "Um primary por contexto.",
      "min-block-size 44px no md.",
      "radius.md, não pill.",
      "focus-visible: outline 2px identity offset 2px.",
      "Voz rational, weight 600."
    ],
    good: "[ Salvar rascunho ] primary   [ Publicar ] commit",
    bad: "[ Cancelar ] [ Continuar ] [ Confirmar ] [ Salvar ] — quatro violet"
  },
  {
    id: "button-commit",
    title: "Botão commit",
    sourceSection: "Componentes / Buttons",
    when: "A ação sai do sistema para o mundo: publicar, deploy, aplicar.",
    tokens: ["color.action.commit.background", "color.action.commit.foreground", "color.identity.commit"],
    steps: ["Usar laranja semântico, não primitivos.", "Copy factual do que será tornado real.", "Não repetir commit em cada card."],
    good: "[ Deploy ▸ ] commit",
    bad: "Gráfico inteiro laranja “porque é marca”"
  },
  {
    id: "button-danger",
    title: "Botão danger",
    sourceSection: "Componentes / Buttons",
    when: "Ação destrutiva. Excluir, romper.",
    tokens: ["color.action.danger.background", "color.status.danger"],
    steps: ["Nomear o objeto.", "Listar consequências.", "Cancelar + Excluir concreto."],
    good: "Excluir “projeto-x”? Remove também os três ambientes. [Cancelar] [Excluir projeto]",
    bad: "Are you sure?"
  },
  {
    id: "button-secondary",
    title: "Botão secondary",
    sourceSection: "Componentes / Buttons",
    when: "Ação relevante concorrente, não a deliberação principal.",
    tokens: ["color.background.surface", "color.border.interactive", "radius.md"],
    steps: ["Surface + border.", "Não competir em saturação com primary."],
    good: "[ Revisar mudanças ] secondary ao lado de [ Deploy ] commit",
    bad: "Secondary filled violet"
  },
  {
    id: "button-ghost",
    title: "Botão ghost",
    sourceSection: "Componentes / Buttons",
    when: "Ação contextual.",
    tokens: ["color.text.primary", "motion.fast"],
    steps: ["Fundo transparente.", "Hover com identity subtle, não glow."],
    good: "ghost em toolbar",
    bad: "ghost com gradient"
  },
  {
    id: "button-quiet",
    title: "Botão quiet",
    sourceSection: "Componentes / Buttons",
    when: "Baixa prioridade.",
    tokens: ["color.text.secondary"],
    steps: ["Não roubar foco do primary/commit."],
    good: "quiet “ver histórico”",
    bad: "quiet com laranja"
  },
  {
    id: "input",
    title: "Campo de formulário",
    sourceSection: "Componentes / Inputs",
    when: "Qualquer entrada de dado.",
    tokens: ["input.height.md", "input.radius", "color.border.interactive", "color.focus.ring", "space.200", "space.150"],
    steps: [
      "Label acima, gap 8.",
      "Helper/erro abaixo, gap 6.",
      "rest/hover/focus/invalid/disabled/readonly distintos.",
      "Erro: borda danger + ícone + mensagem textual completa."
    ],
    good: "Informe um endereço completo, como nome@dominio.com",
    bad: "borda vermelha e só"
  },
  {
    id: "card",
    title: "Card neutro",
    sourceSection: "Componentes / Cards",
    when: "Agrupar conteúdo sem interpretação especial.",
    tokens: ["color.background.surface", "color.border.subtle", "radius.lg", "density.card-padding"],
    steps: ["Sem flutuação teatral.", "Elevation 0–1.", "Sem Costura."],
    good: "surface + hairline + radius.lg",
    bad: "glassmorphism + glow violet"
  },
  {
    id: "card-reflection",
    title: "Card reflexivo",
    sourceSection: "Componentes / Cards",
    when: "Reflexão editorial ou informação que muda interpretação.",
    tokens: ["border.seam", "color.identity.primary", "font.voice.human"],
    steps: ["border-inline-start seam + identity.primary.", "Não repetir em todos os cards."],
    good: "data-kind=reflection",
    bad: "Costura em cada card do dashboard"
  },
  {
    id: "card-commit",
    title: "Card de decisão",
    sourceSection: "Componentes / Cards",
    when: "O bloco pede atravessar o limite.",
    tokens: ["border.seam", "color.identity.commit"],
    steps: ["Costura commit, não primary.", "Ação commit correspondente."],
    good: "data-kind=commit + botão commit",
    bad: "Costura laranja decorativa"
  },
  {
    id: "badge",
    title: "Badge",
    sourceSection: "Componentes / Badges",
    when: "Metadado descritivo, não acionável.",
    tokens: ["radius.full", "color.status.success", "type.caption.size"],
    steps: ["Se clica, não é badge: é chip/toggle/button.", "Variantes: neutral, identity, success, warning, danger, info, outline."],
    good: "badge “PROD”",
    bad: "badge clicável sem role de botão"
  },
  {
    id: "dashboard",
    title: "Dashboard",
    sourceSection: "Componentes / Dashboard",
    when: "Visão operacional densa.",
    tokens: ["density.section-gap", "font.voice.machine", "font.voice.rational", "color.dataviz.categorical.01"],
    steps: [
      "density=focus.",
      "Neutros ~80%. Identity ~14%. Signal ~4%. Status ~2%.",
      "Métricas em voice.machine; interpretação em voice.rational.",
      "Costura só na anomalia que muda leitura.",
      "Primary investigar + commit deploy se houver fronteira."
    ],
    good: "Sistema estável / As últimas 24h não mostram degradação relevante.",
    bad: "Todos os KPI cards com Costura e laranja"
  },
  {
    id: "editorial",
    title: "Editorial",
    sourceSection: "Componentes / Editorial",
    when: "Texto longo, reflexão, abertura.",
    tokens: ["font.voice.editorial-title", "font.voice.editorial-body", "font.voice.editorial-reflection", "layout.content.reading"],
    steps: ["density=calm.", "Título CASL 0.28. Corpo 70ch CASL 0.06. Reflexão CASL 0.40 + Costura."],
    good: "max-inline-size: 70ch",
    bad: "Inter no editorial e Recursive só no código"
  },
  {
    id: "dialog",
    title: "Dialog / modal",
    sourceSection: "Elevação + overlay + a11y",
    when: "Interromper para uma decisão.",
    tokens: ["elevation.3", "color.overlay.scrim", "z.modal", "radius.lg"],
    steps: ["Scrim + foco preso.", "Escape fecha.", "Primary/commit/danger conforme a decisão.", "Copy honesta."],
    good: "modal elevation 3 + scrim 0.72",
    bad: "modal sem scrim e sem trap de foco"
  },
  {
    id: "table",
    title: "Tabela",
    sourceSection: "Densidade + radii",
    when: "Dados tabulares.",
    tokens: ["density.table-row", "radius.none", "font.voice.machine"],
    steps: ["radius.none.", "Linha 52 calm / 40 focus.", "IDs em machine.", "Selected ≠ focus."],
    good: "row 40px em focus, seleção com selection.background",
    bad: "tabela com radius.full e hover glow"
  },
  {
    id: "navigation",
    title: "Navegação",
    sourceSection: "Elevação + vozes",
    when: "Orientar o produto.",
    tokens: ["elevation.1", "z.sticky", "font.voice.rational", "color.identity.primary"],
    steps: ["Sticky elevation 1.", "Item ativo: identity, não laranja.", "Target 44px."],
    good: "nav sticky + item ativo violet",
    bad: "nav glassmorphism neon"
  },
  {
    id: "feedback-error",
    title: "Feedback de erro",
    sourceSection: "Voz + inputs + status",
    when: "Algo falhou.",
    tokens: ["color.status.danger", "color.status.danger-subtle"],
    steps: ["O que aconteceu. Por quê, se souber. O que fazer.", "Não 😅."],
    good: "Não foi possível salvar. A conexão foi interrompida antes da confirmação. Tentar novamente",
    bad: "Oops! Algo deu errado 😅"
  },
  {
    id: "feedback-success",
    title: "Feedback de sucesso",
    sourceSection: "Voz + mint",
    when: "Resolução real.",
    tokens: ["color.status.success", "font.voice.machine"],
    steps: ["Fato + contexto machine (hash, ambiente, tempo)."],
    good: "Deploy concluído  production · 2f41c9a · agora",
    bad: "Success! 🎉"
  },
  {
    id: "empty-state",
    title: "Estado vazio",
    sourceSection: "Voz + composição",
    when: "Ainda não há dados.",
    tokens: ["color.text.secondary", "font.voice.human"],
    steps: ["Dizer o que falta e a próxima ação, sem teatro."],
    good: "Nenhum ambiente ainda. Criar o primeiro ambiente.",
    bad: "Nada por aqui... ✨"
  },
  {
    id: "loading",
    title: "Loading e skeleton",
    sourceSection: "Estados globais + motion",
    when: "Espera previsível.",
    tokens: ["motion.deliberate", "color.identity.subtle", "opacity.016"],
    steps: ["Skeleton com wash, não spinner arco-íris.", "Reduced motion: estático."],
    good: "skeleton surface + subtle identity",
    bad: "spinner neon bounce infinito"
  },
  {
    id: "focus",
    title: "Foco visível",
    sourceSection: "Estados globais",
    when: "Sempre que houver controle.",
    tokens: ["color.focus.ring", "border.focus"],
    steps: [":focus-visible outline 2px offset 2px.", "Foco ≠ selected."],
    good: "outline: 2px solid var(--in-color-focus-ring); outline-offset: 2px;",
    bad: "outline: none;"
  }
];

export function getComponentRecipe(name?: string): Recipe[] {
  if (!name) return RECIPES;
  const q = name.toLowerCase();
  return RECIPES.filter((r) => r.id.includes(q) || r.title.toLowerCase().includes(q));
}
