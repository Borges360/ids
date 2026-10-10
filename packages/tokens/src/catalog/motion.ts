import { colorFromHex } from "../hex.ts";
import type { TokenDef } from "../types.ts";
import { dim, dur, token } from "./helpers.ts";

export function radiusTokens(): TokenDef[] {
  const radii: Array<[string, number, string]> = [
    ["none", 0, "Tabelas/grids"],
    ["xs", 2, "Indicadores técnicos"],
    ["sm", 6, "Tags/controles pequenos"],
    ["md", 10, "Inputs/buttons"],
    ["lg", 16, "Cards"],
    ["xl", 24, "Hero/dialog especial"],
    ["full", 999, "Badge/avatar apenas"]
  ];
  return radii.map(([name, px, use]) =>
    token({
      path: ["radius", name],
      type: "dimension",
      layer: "primitive",
      category: "shape",
      subcategory: "radius",
      description: `${use}. ${px === 999 ? "999px" : px + "px"}.`,
      sourceSection: "Arquitetura / Radii",
      consumerFacing: true,
      value: dim(px),
      meta: {
        intent: "INTEIRO não deve virar uma coleção de cápsulas. Pill não é a forma padrão de um botão.",
        usage: [use],
        avoid: ["Não usar radius.full em botões.", "Não arredondar tabelas."],
        a11y: "Radius não afeta target size.",
        examples: {
          good: "button { border-radius: var(--in-radius-md); }",
          bad: "button { border-radius: 999px; }"
        }
      }
    })
  );
}

export function borderTokens(): TokenDef[] {
  const widths: Array<[string, number, string]> = [
    ["none", 0, "Sem borda"],
    ["hairline", 1, "Borda padrão"],
    ["emphasis", 2, "Ênfase"],
    ["focus", 2, "Focus ring"],
    ["seam", 2, "Costura"]
  ];
  const out = widths.map(([name, px, use]) =>
    token({
      path: ["border", name],
      type: "dimension",
      layer: "primitive",
      category: "shape",
      subcategory: "border",
      description: `${use}. ${px}px.`,
      sourceSection: "Arquitetura / Bordas",
      consumerFacing: true,
      value: dim(px),
      meta: {
        intent: name === "seam" ? "A Costura é assinatura, não decoração." : "Estrutura silenciosa.",
        usage: [use, name === "seam" ? "border-inline-start, sobrevive a RTL." : ""],
        avoid:
          name === "seam"
            ? [
                "Nunca como decoração em todo card.",
                "Só em reflexão editorial, informação que muda interpretação, conflito/contraste, transição de contexto."
              ]
            : ["Não usar 3px+ ad-hoc."],
        a11y: "Focus 2px + offset 2px. Costura não substitui texto.",
        examples: {
          good:
            name === "seam"
              ? "border-inline-start: var(--in-border-seam) solid var(--in-color-identity-primary);"
              : `border-width: var(--in-border-${name});`,
          bad: name === "seam" ? ".card { border-left: 2px solid violet }" : "border: 3px solid"
        }
      }
    })
  );
  out.push(
    token({
      path: ["border", "style"],
      type: "strokeStyle",
      layer: "primitive",
      category: "shape",
      subcategory: "border",
      description: "Estilo de borda sólido.",
      sourceSection: "Arquitetura / Bordas",
      consumerFacing: true,
      value: "solid",
      meta: {
        intent: "Sólido. Sem dashed como linguagem padrão.",
        usage: ["Todas as bordas estruturais."],
        avoid: ["Não usar dashed para parecer “tech”."],
        a11y: "Estilo não carrega significado sozinho.",
        examples: { good: "border-style: solid;", bad: "border-style: dashed;" }
      }
    })
  );
  return out;
}

export function elevationTokens(): TokenDef[] {
  const shadows: Array<[string, string | null, string]> = [
    ["0", null, "Card padrão. Superfície + borda."],
    ["1", "0 1px 2px rgb(0 0 0 / .18)", "Card sutil / sticky navigation"],
    ["2", "0 4px 12px rgb(0 0 0 / .20)", "Dropdown / popover"],
    ["3", "0 12px 32px rgb(0 0 0 / .24)", "Modal / command palette"],
    ["4", "0 24px 64px rgb(0 0 0 / .30)", "Apenas experiências imersivas"]
  ];
  return shadows.map(([level, css, use]) =>
    token({
      path: ["elevation", level],
      type: "shadow",
      layer: "semantic",
      category: "elevation",
      subcategory: "shadow",
      description: `Elevação ${level}. ${use}.`,
      sourceSection: "Arquitetura / Elevação e sombras",
      value:
        css === null
          ? "none"
          : {
              color: colorFromHex("#000000", level === "1" ? 0.18 : level === "2" ? 0.2 : level === "3" ? 0.24 : 0.3),
              offsetX: dim(0),
              offsetY: dim(level === "1" ? 1 : level === "2" ? 4 : level === "3" ? 12 : 24),
              blur: dim(level === "1" ? 2 : level === "2" ? 12 : level === "3" ? 32 : 64),
              spread: dim(0)
            },
      meta: {
        intent: "O dark mode usa sobretudo diferença de superfície + borda; não sombras enormes.",
        usage: [use],
        avoid: level === "4" ? ["Never elevation 4 salvo experiências imersivas."] : ["Não usar sombra para hierarquia de card padrão."],
        a11y: "Sombra não é o único indicador de modal; usar scrim + foco preso.",
        examples: {
          good: "box-shadow: var(--in-elevation-2);",
          bad: "box-shadow: 0 50px 100px black;"
        }
      }
    })
  );
}

export function opacityTokens(): TokenDef[] {
  const values: Array<[string, number, string]> = [
    ["000", 0, "Invisível"],
    ["008", 0.08, "Wash mínimo"],
    ["016", 0.16, "Wash"],
    ["024", 0.24, "Overlay leve"],
    ["040", 0.4, "Overlay"],
    ["056", 0.56, "Scrim parcial"],
    ["072", 0.72, "Scrim dark"],
    ["088", 0.88, "Quase opaco"],
    ["100", 1, "Opaco"]
  ];
  return values.map(([name, v, use]) =>
    token({
      path: ["opacity", name],
      type: "number",
      layer: "primitive",
      category: "opacity",
      subcategory: "scale",
      description: `${use}. ${v}.`,
      sourceSection: "Arquitetura / Opacidade",
      consumerFacing: true,
      value: v,
      meta: {
        intent: "Não se reduz opacidade de texto ativo para criar hierarquia; usa-se text.secondary/tertiary.",
        usage: ["Decoração, scrims, controles realmente desabilitados."],
        avoid: ["Não usar opacity em texto ativo."],
        a11y: "Texto ativo deve usar tokens de texto, não alpha.",
        examples: { good: "scrim { opacity: var(--in-opacity-072); }", bad: "p { opacity: .6; }" }
      }
    })
  );
}

export function zIndexTokens(): TokenDef[] {
  const layers: Array<[string, number]> = [
    ["base", 0],
    ["raised", 10],
    ["sticky", 20],
    ["dropdown", 30],
    ["overlay", 40],
    ["modal", 50],
    ["toast", 60],
    ["command", 70],
    ["debug", 100]
  ];
  return layers.map(([name, value]) =>
    token({
      path: ["z", name],
      type: "number",
      layer: "semantic",
      category: "z-index",
      subcategory: "layer",
      description: `Camada ${name} = ${value}.`,
      sourceSection: "Arquitetura / Z-index",
      value,
      meta: {
        intent: "Camadas previsíveis. Não existe z-index: 999999.",
        usage: [`position stacking para ${name}`],
        avoid: ["Não usar 999999.", "Não pular a escala."],
        a11y: "Foco deve seguir a camada visível (modal prende foco).",
        examples: { good: "z-index: var(--in-z-modal);", bad: "z-index: 999999;" }
      }
    })
  );
}

export function motionTokens(): TokenDef[] {
  const durations: Array<[string, number, string]> = [
    ["none", 0, "Sem movimento"],
    ["snap", 90, "Press/hover"],
    ["fast", 140, "Mudança pequena"],
    ["normal", 200, "UI padrão"],
    ["deliberate", 320, "Expandir/alterar contexto"],
    ["slow", 480, "Transição grande"],
    ["ambient", 700, "Apenas decorativo"]
  ];
  const easings: Array<[string, number[], string]> = [
    ["standard", [0.2, 0, 0, 1], "Padrão"],
    ["enter", [0, 0, 0.2, 1], "Entrada desacelera"],
    ["exit", [0.4, 0, 1, 1], "Saída mais rápida"],
    ["emphasis", [0.2, 0.8, 0.2, 1], "Commit deliberado"],
    ["linear", [0, 0, 1, 1], "Linear"]
  ];
  const out: TokenDef[] = durations.map(([name, ms, intent]) =>
    token({
      path: ["motion", name],
      type: "duration",
      layer: "primitive",
      category: "motion",
      subcategory: "duration",
      description: `${intent}. ${ms}ms.`,
      sourceSection: "Arquitetura / Motion",
      consumerFacing: true,
      value: dur(ms),
      meta: {
        intent: "Motion expressa causalidade. Não há bouncing como linguagem padrão.",
        usage: [intent],
        avoid: ["Não usar ambient em UI operacional.", "Respeitar prefers-reduced-motion."],
        a11y: "prefers-reduced-motion: reduce zera animações não essenciais (gate de release).",
        examples: {
          good: "transition-duration: var(--in-motion-fast);",
          bad: "animation: bounce 1s infinite;"
        }
      }
    })
  );
  for (const [name, bezier, intent] of easings) {
    out.push(
      token({
        path: ["ease", name],
        type: "cubicBezier",
        layer: "primitive",
        category: "motion",
        subcategory: "easing",
        description: `${intent}. cubic-bezier(${bezier.join(", ")}).`,
        sourceSection: "Arquitetura / Motion / Easing",
        consumerFacing: true,
        value: bezier,
        meta: {
          intent: "Entrada desacelera, saída é mais rápida, commit é deliberado.",
          usage: [intent],
          avoid: ["Não usar bounce/elastic como padrão."],
          a11y: "Reduced motion substitui, não só encurta, movimento não essencial.",
          examples: {
            good: `transition-timing-function: var(--in-ease-${name});`,
            bad: "cubic-bezier(.68,-0.6,.32,1.6)"
          }
        }
      })
    );
  }
  return out;
}

export function iconTokens(): TokenDef[] {
  return [
    token({
      path: ["icon", "size", "compact"],
      type: "dimension",
      layer: "component",
      category: "icon",
      subcategory: "size",
      description: "Grid compacta 16×16.",
      sourceSection: "Componentes / Iconografia",
      value: dim(16),
      meta: {
        intent: "Ícones em densidade focus / inline.",
        usage: ["Ícones ao lado de labels."],
        avoid: ["Não usar 16px sem label se o significado não for inequívoco."],
        a11y: "Ícone sem label só quando universalmente inequívoco. Decorative: aria-hidden=true.",
        examples: { good: "svg 16 + texto", bad: "ícone 16 sozinho para “settings avançado”" }
      }
    }),
    token({
      path: ["icon", "size", "default"],
      type: "dimension",
      layer: "component",
      category: "icon",
      subcategory: "size",
      description: "Base grid 24×24.",
      sourceSection: "Componentes / Iconografia",
      value: dim(24),
      meta: {
        intent: "Tamanho padrão.",
        usage: ["Toolbar, navegação."],
        avoid: ["Não misturar outline, filled e duotone na mesma hierarquia."],
        a11y: "Ícone semântico não depende apenas de cor. Direcional espelha em RTL.",
        examples: { good: "24×24 outline round caps", bad: "misturar filled e duotone no mesmo nav" }
      }
    }),
    token({
      path: ["icon", "stroke", "default"],
      type: "dimension",
      layer: "component",
      category: "icon",
      subcategory: "stroke",
      description: "Stroke padrão 1.75px.",
      sourceSection: "Componentes / Iconografia",
      value: dim(1.75),
      meta: {
        intent: "Gramática de traço única.",
        usage: ["Ícones outline."],
        avoid: ["Não variar stroke ad-hoc."],
        a11y: "Stroke deve permanecer visível em 200% zoom.",
        examples: { good: "stroke-width: 1.75;", bad: "stroke-width: 3.5 em um ícone e 1 no outro" }
      }
    }),
    token({
      path: ["icon", "stroke", "emphasis"],
      type: "dimension",
      layer: "component",
      category: "icon",
      subcategory: "stroke",
      description: "Stroke destaque 2px.",
      sourceSection: "Componentes / Iconografia",
      value: dim(2),
      meta: {
        intent: "Destaque raro.",
        usage: ["Ícone da ação corrente."],
        avoid: ["Não usar em todos."],
        a11y: "Ênfase também por posição/label.",
        examples: { good: "stroke-width: 2 no ícone ativo", bad: "todos os ícones 2px" }
      }
    }),
    token({
      path: ["touch", "target", "min"],
      type: "dimension",
      layer: "semantic",
      category: "density",
      subcategory: "touch",
      description: "Target mínimo interno para controles primários: 44×44 CSS px.",
      sourceSection: "Componentes / Estados / Target",
      value: dim(44),
      meta: {
        intent: "Mais conservador que o mínimo AA da WCAG 2.2 (24×24).",
        usage: ["Botões, inputs, hits de navegação primária."],
        avoid: ["Não reduzir abaixo de 44px em controles primários."],
        a11y: "Gate INTEIRO. WCAG AA mínimo é 24px; INTEIRO exige 44px.",
        examples: { good: "min-block-size: var(--in-touch-target-min);", bad: "height: 28px no botão primary" }
      }
    })
  ];
}
