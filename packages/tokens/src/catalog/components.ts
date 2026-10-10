import type { TokenDef } from "../types.ts";
import { dim, token } from "./helpers.ts";

export function buttonTokens(): TokenDef[] {
  const sizes: Array<[string, number, number, number]> = [
    ["sm", 36, 12, 13],
    ["md", 44, 16, 14],
    ["lg", 52, 20, 16]
  ];
  const out: TokenDef[] = [];
  for (const [size, height, pad, font] of sizes) {
    out.push(
      token({
        path: ["button", "size", size, "height"],
        type: "dimension",
        layer: "component",
        category: "component",
        subcategory: "button",
        description: `Altura do botão ${size}: ${height}px.`,
        sourceSection: "Componentes / Buttons / Tamanhos",
        value: dim(height),
        meta: {
          intent: "Primary/commit compartilham a escala. sm pode ficar abaixo de 44px; md é o padrão de target.",
          usage: [`Botão ${size}`],
          avoid: size === "sm" ? ["Não usar sm como único primary em touch."] : ["Não criar um tamanho ad-hoc."],
          a11y: "md e lg ≥ 44px. sm (36px) só em contextos compactos com espaçamento equivalente.",
          examples: { good: `min-block-size: var(--in-button-size-${size}-height);`, bad: "height: 40px" }
        }
      }),
      token({
        path: ["button", "size", size, "padding-inline"],
        type: "dimension",
        layer: "component",
        category: "component",
        subcategory: "button",
        description: `Padding inline do botão ${size}: ${pad}px.`,
        sourceSection: "Componentes / Buttons / Tamanhos",
        value: dim(pad),
        meta: {
          intent: "Respiração horizontal proporcional à altura.",
          usage: [`padding-inline botão ${size}`],
          avoid: ["Não usar padding físico left/right; usar inline."],
          a11y: "RTL-safe via padding-inline.",
          examples: { good: "padding-inline: var(--in-button-size-md-padding-inline);", bad: "padding-left: 16px" }
        }
      }),
      token({
        path: ["button", "size", size, "font-size"],
        type: "dimension",
        layer: "component",
        category: "component",
        subcategory: "button",
        description: `Font-size do botão ${size}: ${font}px.`,
        sourceSection: "Componentes / Buttons / Tamanhos",
        value: dim(font),
        meta: {
          intent: "Label semibold, voz rational.",
          usage: [`Fonte do botão ${size}`],
          avoid: ["Não usar display sizes em botão."],
          a11y: "Texto do botão deve contrastar com o fundo da variante.",
          examples: { good: "font-weight: 600;", bad: "text-transform: uppercase em todos" }
        }
      })
    );
  }
  return out;
}

export function inputTokens(): TokenDef[] {
  const defs: Array<[string[], number | string, string, string]> = [
    [["input", "height", "sm"], 36, "Altura input sm.", "dimension"],
    [["input", "height", "md"], 44, "Altura input md (padrão).", "dimension"],
    [["input", "height", "lg"], 52, "Altura input lg.", "dimension"],
    [["input", "padding", "inline"], 12, "Padding inline.", "dimension"],
    [["input", "padding", "block"], 10, "Padding block.", "dimension"],
    [["input", "radius"], "{radius.md}", "Radius de input = radius.md.", "dimension"],
    [["input", "border", "width"], "{border.hairline}", "Borda rest.", "dimension"],
    [["input", "focus", "width"], "{border.focus}", "Borda/ring de foco.", "dimension"],
    [["input", "label", "gap"], "{space.200}", "Gap label → campo = 8px.", "dimension"],
    [["input", "message", "gap"], "{space.150}", "Gap campo → helper/erro = 6px.", "dimension"]
  ];
  return defs.map(([path, value, description, type]) =>
    token({
      path,
      type: type as TokenDef["type"],
      layer: "component",
      category: "component",
      subcategory: "input",
      description,
      sourceSection: "Componentes / Inputs",
      value: typeof value === "number" ? dim(value) : (value as `{${string}}`),
      meta: {
        intent: "Erro nunca é “borda vermelha e só”. Label, campo, helper/erro.",
        usage: [
          "rest: border.interactive",
          "hover: border.strong",
          "focus: focus.ring + border identity",
          "invalid: danger + ícone + mensagem",
          "disabled: semantic disabled",
          "readonly: sunken; selecionável, não editável"
        ],
        avoid: ["Não omitir mensagem textual de erro.", "Não tratar disabled e readonly como iguais."],
        a11y: "Mensagem de erro textual obrigatória. Target md ≥ 44px.",
        examples: {
          good: "Informe um endereço completo, como nome@dominio.com",
          bad: "borda vermelha sem texto"
        }
      }
    })
  );
}

export function cardTokens(): TokenDef[] {
  return [
    token({
      path: ["card", "padding"],
      type: "dimension",
      layer: "component",
      category: "component",
      subcategory: "card",
      description: "Padding de card. Segue density: calm 24 / focus 16.",
      sourceSection: "Componentes / Cards",
      value: "{density.card-padding}",
      density: { calm: dim(24), focus: dim(16) },
      meta: {
        intent: "O card normal não precisa flutuar.",
        usage: ["background.surface + border.subtle + radius.lg"],
        avoid: ["Não aplicar Costura em todo card.", "Não usar elevation 4."],
        a11y: "Card reflexivo usa Costura como ênfase, não como único significado.",
        examples: {
          good: '.card[data-kind="reflection"] { border-inline-start: var(--in-border-seam) solid var(--in-color-identity-primary); }',
          bad: ".card { box-shadow: 0 30px 90px; border-left: 4px solid #A78BFA; }"
        }
      }
    }),
    token({
      path: ["card", "radius"],
      type: "dimension",
      layer: "component",
      category: "component",
      subcategory: "card",
      description: "Radius de card = radius.lg.",
      sourceSection: "Componentes / Cards",
      value: "{radius.lg}",
      meta: {
        intent: "Cards 16px. Não cápsulas.",
        usage: ["Todos os cards."],
        avoid: ["radius.full em card."],
        a11y: "Irrelevante para contraste.",
        examples: { good: "border-radius: var(--in-radius-lg);", bad: "border-radius: 32px em card de tabela" }
      }
    })
  ];
}

export function deprecatedTokens(): TokenDef[] {
  return [
    token({
      path: ["color", "accent"],
      type: "color",
      layer: "semantic",
      category: "color",
      subcategory: "deprecated",
      description: "Deprecated. Use color.identity.commit.",
      sourceSection: "Pacotes npm / $deprecated",
      status: "source",
      consumerFacing: false,
      value: "{color.identity.commit}",
      meta: {
        intent: "Exemplo de depreciação DTCG para o pipeline de migração.",
        usage: ["Apenas leitura de legado."],
        avoid: ["Não usar em código novo."],
        a11y: "N/A — token deprecated.",
        aliases: ["color.identity.commit"],
        examples: { good: "var(--in-color-identity-commit)", bad: "var(--in-color-accent)" }
      }
    })
  ];
}
