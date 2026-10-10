import { colorFromHex, parseRgba } from "../hex.ts";
import type { TokenDef } from "../types.ts";
import { token } from "./helpers.ts";

type ThemePair = { dark: string | `{${string}}`; light: string | `{${string}}`; contrastDark: string | `{${string}}`; contrastLight: string | `{${string}}` };

function pair(
  path: string[],
  description: string,
  intent: string,
  usage: string[],
  avoid: string[],
  a11y: string,
  values: ThemePair,
  extra?: { status?: TokenDef["status"]; subcategory?: string }
): TokenDef {
  const toVal = (v: string | `{${string}}`) =>
    typeof v === "string" && v.startsWith("{")
      ? (v as `{${string}}`)
      : typeof v === "string" && v.startsWith("rgba")
        ? parseRgba(v)
        : typeof v === "string"
          ? colorFromHex(v)
          : v;

  return token({
    path,
    type: "color",
    layer: "semantic",
    category: "color",
    subcategory: extra?.subcategory ?? path[1] ?? "semantic",
    description,
    sourceSection: "Arquitetura e especificação completa de tokens / Semântica de cores",
    status: extra?.status ?? "source",
    consumerFacing: true,
    themes: {
      dark: toVal(values.dark),
      light: toVal(values.light),
      "contrast-dark": toVal(values.contrastDark),
      "contrast-light": toVal(values.contrastLight)
    },
    meta: {
      intent,
      usage,
      avoid,
      a11y,
      examples: {
        good: `background: var(--in-${path.join("-")});`,
        bad: "background: #0C0D12;"
      }
    }
  });
}

export function semanticColors(): TokenDef[] {
  return [
    pair(
      ["color", "background", "canvas"],
      "Canvas da página. Dark: Obsidian. Light: off-white quente.",
      "Interior e silêncio. Fundo sobre o qual a hierarquia se revela.",
      ["Fundo da viewport e de páginas.", "Base para texto.primary e superfícies."],
      ["Não usar em cards elevados.", "Não substituir por #000000."],
      "Par com text.primary deve atingir ≥ 4.5:1 (contrato: dark 17.21:1, light 16.78:1).",
      {
        dark: "{color.neutral.950}",
        light: "#F7F5F1",
        contrastDark: "{color.neutral.950}",
        contrastLight: "#FFFDF8"
      }
    ),
    pair(
      ["color", "background", "surface"],
      "Superfície padrão de cards e painéis.",
      "Camada imediatamente acima do canvas, sem flutuação teatral.",
      ["Cards neutros, painéis, listas."],
      ["Não aplicar sombra pesada para “levantar” a superfície."],
      "Manter contraste de borda subtle ≥ 3:1 contra adjacências críticas.",
      {
        dark: "#13151D",
        light: "#FFFFFF",
        contrastDark: "#050508",
        contrastLight: "#FFFFFF"
      }
    ),
    pair(
      ["color", "background", "raised"],
      "Superfície elevada (dropdown, popover, sticky).",
      "Elevação por diferença de superfície + borda, não por sombra enorme.",
      ["Menus, dropdowns, navegação sticky."],
      ["Não usar elevation 4 como padrão."],
      "Distinguir de surface sem depender só de sombra.",
      {
        dark: "#1A1D28",
        light: "#FFFFFF",
        contrastDark: "{color.neutral.900}",
        contrastLight: "#FFFFFF"
      }
    ),
    pair(
      ["color", "background", "sunken"],
      "Superfície rebaixada. Campos readonly, wells, áreas de recuo.",
      "Recuo perceptivo para conteúdo não editável ou agrupado.",
      ["Inputs readonly, wells, fundos de código."],
      ["Não usar como canvas."],
      "Texto sobre sunken deve continuar ≥ 4.5:1.",
      {
        dark: "#090A0F",
        light: "#EEEAE4",
        contrastDark: "#050508",
        contrastLight: "{color.neutral.200}"
      }
    ),
    pair(
      ["color", "text", "primary"],
      "Texto principal. Dark: Warm Frost. Light: quase-preto quente.",
      "Voz racional da interface. Humano, não frio.",
      ["Títulos, corpo, labels de controles primários."],
      ["Não reduzir opacidade para criar hierarquia."],
      "≥ 4.5:1 contra canvas (contrato dark 17.21:1, light 16.78:1).",
      {
        dark: "{color.neutral.100}",
        light: "#16141A",
        contrastDark: "#FFFDF8",
        contrastLight: "#0C0D12"
      }
    ),
    pair(
      ["color", "text", "secondary"],
      "Texto secundário. Metadados e apoio.",
      "Hierarquia por cor semântica, não por opacity.",
      ["Helper text, timestamps interpretativos, descrições."],
      ["Não usar opacity.056 em texto ativo."],
      "≥ 4.5:1 contra canvas (contrato dark 9.61:1, light 6.48:1).",
      {
        dark: "#B9B4C5",
        light: "#5C5666",
        contrastDark: "#E7E2DA",
        contrastLight: "{color.neutral.700}"
      }
    ),
    pair(
      ["color", "text", "tertiary"],
      "Texto terciário. Menor prioridade perceptiva.",
      "Ainda deve ser legível. Densidade permitida; desordem não.",
      ["Captions, placeholders não essenciais, labels de eixo."],
      ["Não usar para informação necessária à tarefa."],
      "Preferir ≥ 4.5:1; se for texto grande, mínimo 3:1.",
      {
        dark: "#8B8792",
        light: "#6D6775",
        contrastDark: "{color.neutral.300}",
        contrastLight: "{color.neutral.700}"
      }
    ),
    pair(
      ["color", "text", "inverse"],
      "Texto sobre superfícies invertidas (botões filled, chips sólidos).",
      "Garante contraste sobre identity e commit.",
      ["Foreground de botões primary/commit no tema correspondente."],
      ["Não usar como texto de página."],
      "Botão violet dark/foreground escuro ≥ 6.89:1; light/branco ≥ 5.45:1.",
      {
        dark: "#16141A",
        light: "{color.neutral.100}",
        contrastDark: "#050508",
        contrastLight: "#FFFFFF"
      }
    ),
    pair(
      ["color", "border", "subtle"],
      "Borda silenciosa. Estrutura que não chama atenção.",
      "A estrutura deve ser silenciosa.",
      ["Cards, divisores, tables."],
      ["Não usar para foco ou estado interativo."],
      "Quando a borda identifica o componente, contraste ≥ 3:1.",
      {
        dark: "{color.neutral.800}",
        light: "{color.neutral.300}",
        contrastDark: "{color.neutral.500}",
        contrastLight: "{color.neutral.700}"
      }
    ),
    pair(
      ["color", "border", "interactive"],
      "Borda de controles em rest.",
      "Sinaliza que o objeto é acionável sem gritar.",
      ["Inputs, buttons secondary, chips outline."],
      ["Não usar como focus ring."],
      "Contraste de identificação do componente ≥ 3:1.",
      {
        dark: "#706B76",
        light: "#6D6775",
        contrastDark: "{color.neutral.400}",
        contrastLight: "{color.neutral.700}"
      }
    ),
    pair(
      ["color", "border", "strong"],
      "Borda enfática. Hover de input, ênfase estrutural.",
      "Aumento de contraste sob intenção, não decoração.",
      ["Hover de input, agrupamentos que precisam de borda visível."],
      ["Não usar em todos os cards."],
      "≥ 3:1 contra a superfície adjacente.",
      {
        dark: "{color.neutral.400}",
        light: "{color.neutral.700}",
        contrastDark: "{color.neutral.200}",
        contrastLight: "{color.neutral.900}"
      }
    ),
    pair(
      ["color", "identity", "primary"],
      "Violeta de identidade. Consciência deliberada.",
      "Violeta = estou escolhendo. Seleção, identidade, foco.",
      ["Ação primary, Costura, seleção, focus ring."],
      ["Não usar como glow, gradient ou decoração abundante."],
      "Dark violet/canvas 7.13:1. Light violet/canvas 5.00:1.",
      {
        dark: "{color.violet.400}",
        light: "{color.violet.600}",
        contrastDark: "{color.violet.300}",
        contrastLight: "{color.violet.700}"
      }
    ),
    pair(
      ["color", "identity", "primary-hover"],
      "Hover da identidade. Intenção ainda deliberada, um passo mais clara.",
      "Hover comunica affordance, não urgência.",
      ["Hover de botão primary, links de identidade."],
      ["Não usar como commit."],
      "Manter contraste do par botão/foreground.",
      {
        dark: "{color.violet.300}",
        light: "{color.violet.700}",
        contrastDark: "{color.violet.200}",
        contrastLight: "{color.violet.800}"
      }
    ),
    pair(
      ["color", "identity", "commit"],
      "Laranja de decisão. Atravessar o limite e tornar real.",
      "Laranja = estou tornando real. Deploy, publicar, aplicar.",
      ["Botão commit, card[data-kind=commit], ações que saem do sistema."],
      ["Não usar como accent genérico nem warning."],
      "Dark orange/foreground escuro 8.94:1. Light orange/branco 5.32:1.",
      {
        dark: "{color.orange.400}",
        light: "{color.orange.700}",
        contrastDark: "{color.orange.300}",
        contrastLight: "{color.orange.800}"
      }
    ),
    pair(
      ["color", "identity", "commit-hover"],
      "Hover do commit. A decisão fica mais próxima.",
      "Hover de commit, não de primary.",
      ["Hover do botão commit."],
      ["Não usar em gráficos só porque é marca."],
      "Preservar contraste do par botão/foreground.",
      {
        dark: "{color.orange.300}",
        light: "{color.orange.800}",
        contrastDark: "{color.orange.200}",
        contrastLight: "{color.orange.900}"
      }
    ),
    pair(
      ["color", "status", "success"],
      "Mint. Resolução. Sucesso real.",
      "Confirmação factual, não celebração.",
      ["Badges de sucesso, mensagens de conclusão, estados resolved."],
      ["Não usar como segunda cor de marca."],
      "Texto de status sobre canvas deve atingir ≥ 4.5:1 ou ir acompanhado de ícone+texto.",
      {
        dark: "{color.mint.400}",
        light: "{color.mint.700}",
        contrastDark: "{color.mint.300}",
        contrastLight: "{color.mint.800}"
      }
    ),
    pair(
      ["color", "status", "warning"],
      "Amber. Atenção.",
      "Cautela sem ruptura. Não é laranja de commit.",
      ["Warnings, avisos, estados que pedem atenção."],
      ["Não usar para deploy/publicar."],
      "Não depender só da cor: ícone + mensagem textual.",
      {
        dark: "{color.amber.300}",
        light: "{color.amber.700}",
        contrastDark: "{color.amber.200}",
        contrastLight: "{color.amber.800}"
      }
    ),
    pair(
      ["color", "status", "danger"],
      "Rupture. Quebra, risco, erro.",
      "Excluir, falha, invalid.",
      ["Erros, danger buttons, validação inválida."],
      ["Não usar para ênfase sem significado destrutivo."],
      "Erro nunca é “borda vermelha e só”. Mensagem textual obrigatória.",
      {
        dark: "{color.red.400}",
        light: "{color.red.700}",
        contrastDark: "{color.red.300}",
        contrastLight: "{color.red.800}"
      }
    ),
    pair(
      ["color", "status", "info"],
      "Blue. Informação externa.",
      "Dado que entra no sistema, não identidade.",
      ["Info banners, referências externas, metadata informativa."],
      ["Não usar como cor de marca."],
      "Acompanhar com ícone ou texto. Não só cor.",
      {
        dark: "{color.blue.400}",
        light: "{color.blue.700}",
        contrastDark: "{color.blue.300}",
        contrastLight: "{color.blue.800}"
      }
    ),
    pair(
      ["color", "focus", "ring"],
      "Anel de foco visível. 2px, offset 2px.",
      "Foco ≠ seleção. Navegação atual deve ser distinguível.",
      [":focus-visible em todos os controles.", "Nunca remover sem alternativa equivalente."],
      ["Não usar o mesmo tratamento visual de selected."],
      "Meta voluntária próxima ao AAA de aparência de foco: perímetro 2px e contraste ≥ 3:1.",
      {
        dark: "{color.violet.400}",
        light: "{color.violet.600}",
        contrastDark: "{color.violet.200}",
        contrastLight: "{color.violet.800}"
      }
    ),
    pair(
      ["color", "selection", "background"],
      "Fundo de seleção persistente.",
      "Seleção é estado persistente, distinto de foco.",
      ["Linhas selecionadas, ranges, chips selected."],
      ["Não usar como focus ring."],
      "Texto sobre selection deve permanecer ≥ 4.5:1.",
      {
        dark: "{color.violet.900}",
        light: "{color.violet.100}",
        contrastDark: "{color.violet.800}",
        contrastLight: "{color.violet.200}"
      }
    ),
    pair(
      ["color", "overlay", "scrim"],
      "Scrim de overlay. Permite opacidade; texto ativo não.",
      "Modal e command palette precisam de recuo do contexto.",
      ["Fundo de modal, drawer, command palette."],
      ["Não usar para hierarquia de texto."],
      "Conteúdo do modal deve manter contraste próprio; o scrim não é texto.",
      {
        dark: "rgba(4,5,8,.72)",
        light: "rgba(12,13,18,.54)",
        contrastDark: "rgba(4,5,8,.88)",
        contrastLight: "rgba(12,13,18,.72)"
      }
    ),
    pair(
      ["color", "status", "success-subtle"],
      "Fundo sutil de sucesso.",
      "Estado sem gritar. Resolução em segundo plano perceptivo.",
      ["Alertas inline de sucesso, rows confirmadas."],
      ["Não usar como botão."],
      "Texto over subtle deve atingir AA.",
      { dark: "#132A25", light: "{color.mint.050}", contrastDark: "{color.mint.950}", contrastLight: "{color.mint.100}" }
    ),
    pair(
      ["color", "status", "warning-subtle"],
      "Fundo sutil de warning.",
      "Atenção contida.",
      ["Banners warning, cells em atenção."],
      ["Não usar laranja de commit."],
      "Texto + ícone obrigatórios.",
      { dark: "#2A2515", light: "{color.amber.050}", contrastDark: "{color.amber.950}", contrastLight: "{color.amber.100}" }
    ),
    pair(
      ["color", "status", "danger-subtle"],
      "Fundo sutil de perigo.",
      "Ruptura visível sem inundar a tela de vermelho.",
      ["Erros de formulário, alertas destrutivos."],
      ["Não omitir a mensagem textual."],
      "Mensagem textual obrigatória.",
      { dark: "#30191D", light: "{color.red.050}", contrastDark: "{color.red.950}", contrastLight: "{color.red.100}" }
    ),
    pair(
      ["color", "status", "info-subtle"],
      "Fundo sutil de informação.",
      "Informação externa, silenciada.",
      ["Callouts informativos."],
      ["Não usar como identidade."],
      "Não depender só da cor.",
      { dark: "#162238", light: "{color.blue.050}", contrastDark: "{color.blue.950}", contrastLight: "{color.blue.100}" }
    ),
    pair(
      ["color", "identity", "subtle"],
      "Fundo sutil de identidade.",
      "Seleção/contexto INTEIRO sem Costura decorativa.",
      ["Chips de contexto, wells de identidade."],
      ["Não colocar Costura em todo card só porque este fundo existe."],
      "Texto over subtle ≥ 4.5:1.",
      { dark: "{color.violet.950}", light: "{color.violet.050}", contrastDark: "{color.violet.900}", contrastLight: "{color.violet.100}" }
    ),
    pair(
      ["color", "action", "primary", "background"],
      "Fundo do botão primary. Ação deliberada principal.",
      "Primary = escolher. Nunca quatro botões violet na mesma fileira.",
      ["Única ação deliberada principal por contexto."],
      ["Não usar em Cancelar/Continuar/Confirmar/Salvar simultaneamente."],
      "Dark button violet / foreground escuro 6.89:1. Light violet / branco 5.45:1.",
      {
        dark: "{color.identity.primary}",
        light: "{color.identity.primary}",
        contrastDark: "{color.identity.primary}",
        contrastLight: "{color.identity.primary}"
      },
      { status: "derived", subcategory: "action" }
    ),
    pair(
      ["color", "action", "primary", "hover"],
      "Hover do botão primary.",
      "Affordance, não urgência.",
      ["Hover/active de primary."],
      ["Não usar para commit."],
      "Preservar o par de contraste do botão.",
      {
        dark: "{color.identity.primary-hover}",
        light: "{color.identity.primary-hover}",
        contrastDark: "{color.identity.primary-hover}",
        contrastLight: "{color.identity.primary-hover}"
      },
      { status: "derived", subcategory: "action" }
    ),
    pair(
      ["color", "action", "primary", "foreground"],
      "Texto do botão primary.",
      "Foreground escuro no dark sobre violeta; claro no light.",
      ["Label do botão primary."],
      ["Não usar text.primary de página."],
      "Contrato: dark 6.89:1, light 5.45:1.",
      {
        dark: "{color.text.inverse}",
        light: "#FFFFFF",
        contrastDark: "#050508",
        contrastLight: "#FFFFFF"
      },
      { status: "derived", subcategory: "action" }
    ),
    pair(
      ["color", "action", "commit", "background"],
      "Fundo do botão commit. Fazer algo sair do sistema para o mundo.",
      "Publicar, deploy, aplicar mudança externa.",
      ["Uma ação commit por contexto, se houver."],
      ["Não usar como secondary accent."],
      "Dark 8.94:1, light 5.32:1.",
      {
        dark: "{color.identity.commit}",
        light: "{color.identity.commit}",
        contrastDark: "{color.identity.commit}",
        contrastLight: "{color.identity.commit}"
      },
      { status: "derived", subcategory: "action" }
    ),
    pair(
      ["color", "action", "commit", "hover"],
      "Hover do botão commit.",
      "A decisão se aproxima.",
      ["Hover de commit."],
      ["Não usar em gráficos."],
      "Preservar contraste.",
      {
        dark: "{color.identity.commit-hover}",
        light: "{color.identity.commit-hover}",
        contrastDark: "{color.identity.commit-hover}",
        contrastLight: "{color.identity.commit-hover}"
      },
      { status: "derived", subcategory: "action" }
    ),
    pair(
      ["color", "action", "commit", "foreground"],
      "Texto do botão commit.",
      "Foreground escuro no dark; branco no light.",
      ["Label do commit."],
      ["Não usar laranja no texto de página como “marca”."],
      "Contrato light 5.32:1.",
      {
        dark: "{color.text.inverse}",
        light: "#FFFFFF",
        contrastDark: "#050508",
        contrastLight: "#FFFFFF"
      },
      { status: "derived", subcategory: "action" }
    ),
    pair(
      ["color", "action", "danger", "background"],
      "Fundo da ação destrutiva.",
      "Excluir, ruptura.",
      ["Botão danger, confirmar exclusão."],
      ["Não usar para ênfase."],
      "Acompanhar de copy honesta: o que será removido.",
      {
        dark: "{color.status.danger}",
        light: "{color.status.danger}",
        contrastDark: "{color.status.danger}",
        contrastLight: "{color.status.danger}"
      },
      { status: "derived", subcategory: "action" }
    ),
    pair(
      ["color", "action", "danger", "foreground"],
      "Texto da ação destrutiva.",
      "Legível sobre rupture.",
      ["Label de danger."],
      ["Não usar só ícone vermelho."],
      "Contraste AA no par botão/texto.",
      {
        dark: "{color.text.inverse}",
        light: "#FFFFFF",
        contrastDark: "#050508",
        contrastLight: "#FFFFFF"
      },
      { status: "derived", subcategory: "action" }
    ),
    pair(
      ["color", "action", "disabled", "background"],
      "Fundo de controle desabilitado.",
      "Disabled é estado real, distinto de readonly.",
      ["Botões e inputs disabled."],
      ["Não reduzir só a opacity do texto ativo para fingir disabled."],
      "Estados disabled/readonly devem ser distintos.",
      {
        dark: "{color.neutral.800}",
        light: "{color.neutral.200}",
        contrastDark: "{color.neutral.700}",
        contrastLight: "{color.neutral.300}"
      },
      { status: "derived", subcategory: "action" }
    ),
    pair(
      ["color", "action", "disabled", "foreground"],
      "Texto de controle desabilitado.",
      "Ainda precisa ser perceptível como desabilitado, não invisível.",
      ["Labels disabled."],
      ["Não usar para hierarquia de texto ativo."],
      "Disabled não precisa atingir 4.5:1, mas não pode ser a única forma de informação.",
      {
        dark: "{color.neutral.500}",
        light: "{color.neutral.500}",
        contrastDark: "{color.neutral.400}",
        contrastLight: "{color.neutral.600}"
      },
      { status: "derived", subcategory: "action" }
    ),
    ...categorical()
  ];
}

function categorical(): TokenDef[] {
  const series: Array<{ id: string; dark: `{${string}}` | string; light: `{${string}}` | string; note: string }> = [
    { id: "01", dark: "{color.violet.400}", light: "{color.violet.700}", note: "Identidade. Primeira série, não decoração." },
    { id: "02", dark: "{color.orange.400}", light: "{color.orange.700}", note: "Commit/decisão. Só quando a série significa atravessar." },
    { id: "03", dark: "{color.blue.400}", light: "{color.blue.700}", note: "Informação externa." },
    { id: "04", dark: "{color.mint.400}", light: "{color.mint.700}", note: "Resolução." },
    { id: "05", dark: "{color.red.400}", light: "{color.red.700}", note: "Ruptura." },
    { id: "06", dark: "{color.amber.300}", light: "{color.amber.700}", note: "Atenção." },
    { id: "07", dark: "#E58CE8", light: "#873B8C", note: "Série extra especificada na fonte. Não é identidade." },
    { id: "08", dark: "#B9B4C5", light: "{color.neutral.600}", note: "Neutro de apoio. Fecha a escala." }
  ];
  return series.map((s) =>
    pair(
      ["color", "dataviz", "categorical", s.id],
      `Série categórica ${s.id}. ${s.note}`,
      "Cores não carregam significado sozinhas. Séries críticas precisam de label, posição, marker, pattern ou forma.",
      ["Charts categóricos, legendas com texto."],
      ["Não pintar todos os gráficos de laranja porque é marca.", "Não depender só da cor."],
      "Objetos gráficos necessários à compreensão: contraste ≥ 3:1 contra adjacências.",
      {
        dark: s.dark,
        light: s.light,
        contrastDark: s.dark,
        contrastLight: s.light
      },
      { subcategory: "dataviz" }
    )
  );
}
