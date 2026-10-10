export interface Guideline {
  id: string;
  title: string;
  sourceSection: string;
  body: string;
  rules: string[];
  avoid: string[];
}

export const GUIDELINES: Guideline[] = [
  {
    id: "identity",
    title: "Tese central",
    sourceSection: "Resumo executivo",
    body: "Inteiro não é não ter partes em conflito. É conseguir fazê-las pertencer ao mesmo sistema. INTEIRO não é uma estética; é uma tensão organizada. Ao esconder o nome, a interface ainda deve ser reconhecível.",
    rules: [
      "Razão e expressão vivem na mesma família tipográfica (Recursive).",
      "Violeta = consciência deliberada. Laranja = decisão que atravessa o limite.",
      "Mint = resolução. Vermelho = ruptura. Off-white = humanidade na estrutura escura.",
      "Calm = reflexão. Focus = operação. A mesma identidade, objetivos diferentes.",
      "A Costura aparece onde duas partes precisam coexistir."
    ],
    avoid: [
      "Não descrever o sistema como “engenheiro sofisticado” ou “SaaS template”.",
      "Não eliminar um lado da tensão para fingir coerência."
    ]
  },
  {
    id: "principles",
    title: "Cinco leis visuais",
    sourceSection: "Identidade, linguagem visual e personalidade",
    body: "INTEIRO não tenta resolver tensão eliminando um dos lados. Ele cria estrutura suficiente para que os dois existam.",
    rules: [
      "A estrutura deve ser silenciosa.",
      "A personalidade deve aparecer em pontos de decisão — não em gradients, glow, glassmorphism ou vinte microinterações.",
      "Densidade é permitida; desordem não.",
      "A assimetria só existe quando comunica tensão.",
      "O sistema nunca deve performar inteligência."
    ],
    avoid: [
      "Frases rebuscadas só para parecer profundo.",
      "Terminal fake.",
      "Hexadecimal como decoração.",
      "Jargão técnico onde uma palavra simples serve."
    ]
  },
  {
    id: "seam",
    title: "A Costura",
    sourceSection: "Identidade / Assinatura gráfica",
    body: "A Costura é a assinatura gráfica. Implementar com border-inline-start para sobreviver a RTL. 2px identity. Não é decoração de card.",
    rules: [
      "Usar em reflexão editorial.",
      "Usar em informação que muda interpretação.",
      "Usar em conflito/contraste entre alternativas.",
      "Usar em transição de contexto.",
      "Card reflexivo: identity.primary. Card de decisão: identity.commit."
    ],
    avoid: ["Nunca como decoração em todo card.", "Não usar border-left físico."]
  },
  {
    id: "color",
    title: "Semântica cromática",
    sourceSection: "Personalidade cromática e regra violeta/laranja",
    body: "Violeta = estou escolhendo. Laranja = estou tornando real. Neutros ~80%, identity ~14%, signal ~4%, status ~2% num dashboard típico.",
    rules: [
      "Selecionar, configurar, abrir: violet ou neutro.",
      "Deploy, publicar, aplicar mudança externa: orange.",
      "Excluir/falha: red. Aviso: amber. Info: blue. Sucesso: mint.",
      "Componentes consomem tokens semânticos, nunca primitivos de cor.",
      "Não reduzir opacidade de texto ativo para hierarquia."
    ],
    avoid: [
      "Laranja como accent genérico.",
      "Roxo como decoração.",
      "Preto absoluto e branco absoluto como canvas.",
      "Quatro botões violet na mesma fileira."
    ]
  },
  {
    id: "typography",
    title: "Vozes Recursive",
    sourceSection: "Identidade / Tipografia",
    body: "Recursive é a assinatura tipográfica. MONO transita sans↔mono. CASL transita linear↔casual.",
    rules: [
      "rational: MONO 0 CASL 0 — interface.",
      "human: MONO 0 CASL 0.35 — editorial.",
      "signal: MONO 0 CASL 0.10 — headlines e decisões.",
      "machine: MONO 1 CASL 0 — código, IDs, métricas, timestamps.",
      "Pill não é a forma padrão de um botão."
    ],
    avoid: ["Inter + JetBrains como duas personalidades.", "Script fonts no editorial."]
  },
  {
    id: "voice",
    title: "Tom de voz e microcopy",
    sourceSection: "Modo de voz",
    body: "Direto, preciso, reflexivo, técnico quando necessário, honesto sobre incerteza, convicto sobre decisões, humano. Manifesto: não eliminar a tensão. Dar forma a ela.",
    rules: [
      "Nomear o que aconteceu e o que fazer em seguida.",
      "Confirmar destruição com o objeto concreto e as consequências.",
      "Sucesso factual: o que foi feito, onde, quando."
    ],
    avoid: [
      "Oops! Algo deu errado 😅",
      "Are you sure?",
      "Success! 🎉",
      "Quirky startup",
      "Pedante, místico, jargon-heavy, arrogante, indeciso"
    ]
  },
  {
    id: "accessibility",
    title: "Checklist de acessibilidade",
    sourceSection: "Checklist obrigatório de acessibilidade",
    body: "Baseline WCAG 2.2 AA. Target primário INTEIRO 44×44. Focus ring 2px offset 2px. Estados são linguagem global.",
    rules: [
      "Texto normal ≥ 4.5:1. Texto grande ≥ 3:1. Componente ≥ 3:1.",
      "Focus visível e distinto de selected.",
      "Navegação completa por teclado.",
      "Não depender só de cor.",
      "prefers-reduced-motion.",
      "320px reflow. 200%/400% zoom. Text-spacing override.",
      "Disabled ≠ readonly. Erro com mensagem textual.",
      "LTR + RTL. Name/role/state para leitor de tela.",
      "Propriedades lógicas: margin-inline, border-inline-start, text-align: start."
    ],
    avoid: ["Remover outline.", "Erro só com borda vermelha.", "z-index: 999999."]
  },
  {
    id: "density",
    title: "Calm e Focus",
    sourceSection: "Densidade",
    body: "calm não significa grande; significa respiração. focus não significa apertado; significa densidade útil.",
    rules: [
      "Editorial e reflexão: data-in-density=calm.",
      "Dashboard operacional: data-in-density=focus.",
      "Card padding 24/16. Table row 52/40. Input 48/44. Section 48/32. List 12/8."
    ],
    avoid: ["Encolher fonte abaixo da escala para caber dados."]
  },
  {
    id: "motion",
    title: "Movimento",
    sourceSection: "Motion",
    body: "Motion expressa causalidade: entrada desacelera, saída é mais rápida, commit é deliberado.",
    rules: ["Snap 90, fast 140, normal 200, deliberate 320.", "ease-enter, ease-exit, ease-emphasis.", "Respeitar prefers-reduced-motion."],
    avoid: ["Bouncing como linguagem padrão.", "Ambient em UI operacional."]
  },
  {
    id: "dataviz",
    title: "Visualização de dados",
    sourceSection: "Data visualization",
    body: "Cores não carregam significado sozinhas. Séries críticas precisam de label, posição, marker, pattern ou forma.",
    rules: ["Usar categorical.01–08 na ordem.", "Laranja só quando a série significa atravessar/commit.", "Contraste gráfico ≥ 3:1."],
    avoid: ["Pintar todos os gráficos de laranja porque é marca."]
  },
  {
    id: "brand",
    title: "O que a marca é e não é",
    sourceSection: "Regras de marca",
    body: "Estrutura + tensão + silêncio + precisão + humanidade + decisão. Proporção: estrutura pesa mais que expressão. Deve parecer mais interessante com o tempo, não mais impressionante nos primeiros cinco segundos.",
    rules: [
      "Costura = assinatura visual.",
      "Recursive = assinatura tipográfica.",
      "Violeta → laranja = assinatura comportamental.",
      "Calm ↔ focus = densidade.",
      "Warm neutral sobre dark = atmosfera."
    ],
    avoid: [
      "cyberpunk, neon, glassmorphism, purple gradient em tudo",
      "terminal cosplay, dashboard enterprise genérico, brutalismo performático",
      "minimalismo vazio, “AI startup”"
    ]
  },
  {
    id: "composition",
    title: "Composição",
    sourceSection: "Espaçamento e dashboard",
    body: "Espaço entre coisas relacionadas nunca maior que o espaço entre o grupo e o próximo grupo. Um primary por contexto. Commit separado de primary.",
    rules: [
      "Label 8 input 8 helper, depois 24 para o próximo campo.",
      "Propriedades lógicas por padrão.",
      "Assimetria só quando comunica tensão.",
      "Grid 4px, rhythm 8px."
    ],
    avoid: ["Layout-base instável.", "Dois primaries concorrendo."]
  },
  {
    id: "governance",
    title: "Governança pessoal",
    sourceSection: "Governança",
    body: "Identity Owner decide quando uma alteração continua sendo INTEIRO. Token existe porque há uma decisão que merece ser lembrada, não porque existe uma propriedade CSS.",
    rules: [
      "Mudança entra no core se resolve problema recorrente, expressa ideia central, reduz arbitrariedade, melhora a11y ou esclarece semântica.",
      "SemVer + visual contract: mudar primary de violeta para laranja é MAJOR.",
      "DTCG versionado é o contrato. Figma não é a fonte da verdade."
    ],
    avoid: ["“Ficou bonito nessa tela” como justificativa.", "Search-and-replace de hex como migração."]
  }
];

export function getGuidelines(topic?: string): Guideline[] {
  if (!topic) return GUIDELINES;
  const q = topic.toLowerCase();
  return GUIDELINES.filter(
    (g) => g.id.includes(q) || g.title.toLowerCase().includes(q) || g.body.toLowerCase().includes(q)
  );
}
