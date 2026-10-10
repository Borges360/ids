import type { TokenDef } from "../types.ts";
import { dim, token } from "./helpers.ts";

export function spaceTokens(): TokenDef[] {
  const spaces: Array<[string, number, string]> = [
    ["000", 0, "Reset"],
    ["050", 2, "Ajuste óptico"],
    ["100", 4, "Micro gap"],
    ["150", 6, "Ícone/texto pequeno"],
    ["200", 8, "Unidade básica"],
    ["300", 12, "Elementos internos"],
    ["400", 16, "Padding padrão"],
    ["500", 20, "Agrupamento"],
    ["600", 24, "Card/input amplo"],
    ["800", 32, "Seção curta"],
    ["1000", 40, "Seção"],
    ["1200", 48, "Separação estrutural"],
    ["1600", 64, "Blocos"],
    ["2000", 80, "Seções editoriais"],
    ["2400", 96, "Hero"],
    ["3200", 128, "Macro rhythm"]
  ];
  return spaces.map(([name, px, use]) =>
    token({
      path: ["space", name],
      type: "dimension",
      layer: "primitive",
      category: "space",
      subcategory: "scale",
      description: `${use}. Micrograde 4px com passo 2px óptico.`,
      sourceSection: "Arquitetura e especificação completa de tokens / Espaçamento",
      consumerFacing: true,
      value: dim(px, "px"),
      meta: {
        intent: "Espaço entre coisas semanticamente relacionadas nunca maior que o espaço entre o grupo e o próximo grupo.",
        usage: [use, "Ritmo visual silencioso."],
        avoid: ["Não inventar valores fora da escala.", "Não usar espaço maior dentro do grupo do que entre grupos."],
        a11y: "Espaçamento deve sobreviver a text-spacing override (line-height 1.5, letter-spacing 0.12em, word-spacing 0.16em).",
        examples: {
          good: "Label ↕8 Input ↕8 Helper  ↕24  Próximo campo",
          bad: "Label ↕24 Input ↕8 Helper"
        }
      }
    })
  );
}

export function layoutTokens(): TokenDef[] {
  const items: Array<Partial<TokenDef> & { path: string[]; value: TokenDef["value"]; description: string }> = [
    { path: ["layout", "grid", "unit"], value: dim(4), description: "Unidade de grid. 4px." },
    { path: ["layout", "grid", "rhythm"], value: dim(8), description: "Ritmo de 8px." },
    { path: ["layout", "columns", "compact"], value: 4, description: "Colunas em capacidade compacta." },
    { path: ["layout", "columns", "medium"], value: 8, description: "Colunas em capacidade média." },
    { path: ["layout", "columns", "wide"], value: 12, description: "Colunas em capacidade ampla." },
    { path: ["layout", "gutter", "compact"], value: dim(16), description: "Gutter compacto." },
    { path: ["layout", "gutter", "medium"], value: dim(24), description: "Gutter médio." },
    { path: ["layout", "gutter", "wide"], value: dim(32), description: "Gutter amplo." },
    { path: ["layout", "content", "narrow"], value: dim(640), description: "Largura de conteúdo estreita." },
    { path: ["layout", "content", "reading"], value: dim(70, "ch"), description: "Medida de leitura editorial." },
    { path: ["layout", "content", "standard"], value: dim(1120), description: "Conteúdo padrão." },
    { path: ["layout", "content", "wide"], value: dim(1440), description: "Conteúdo amplo." },
    { path: ["layout", "content", "dashboard"], value: dim(1600), description: "Canvas de dashboard." }
  ];
  return items.map((item) =>
    token({
      path: item.path,
      type: typeof item.value === "number" ? "number" : "dimension",
      layer: "semantic",
      category: "layout",
      subcategory: item.path[1] ?? "layout",
      description: item.description,
      sourceSection: "Arquitetura e especificação completa de tokens / Grid e layout",
      value: item.value,
      meta: {
        intent: "Breakpoints e colunas descrevem capacidade espacial, não um dispositivo.",
        usage: [item.description],
        avoid: ["Não nomear layouts como mobile/tablet/desktop."],
        a11y: "Reflow até 320 CSS px sem perda indevida de conteúdo ou funcionalidade.",
        examples: {
          good: "grid-template-columns: repeat(var(--in-layout-columns-wide), 1fr);",
          bad: "@media (tablet) { ... }"
        }
      }
    })
  );
}

export function breakpointTokens(): TokenDef[] {
  const bps: Array<[string, number]> = [
    ["xs", 0],
    ["sm", 480],
    ["md", 768],
    ["lg", 1024],
    ["xl", 1280],
    ["2xl", 1536]
  ];
  return bps.map(([name, px]) =>
    token({
      path: ["breakpoint", name],
      type: "dimension",
      layer: "semantic",
      category: "layout",
      subcategory: "breakpoint",
      description: `Min-width ${px}px. Capacidade espacial, não dispositivo.`,
      sourceSection: "Arquitetura e especificação completa de tokens / Breakpoints",
      value: dim(px),
      meta: {
        intent: "Breakpoints descrevem capacidade espacial.",
        usage: [`@media (min-width: ${px}px)`],
        avoid: ["Não chamar de mobile/tablet/desktop."],
        a11y: "320px reflow é gate de release, independente do breakpoint xs.",
        examples: {
          good: "@media (min-width: 768px)",
          bad: "@media (max-width: tablet)"
        }
      }
    })
  );
}

export function densityTokens(): TokenDef[] {
  const rows: Array<[string, string, number, number, string]> = [
    ["card-padding", "Padding de card", 24, 16, "Card padding"],
    ["table-row", "Altura de linha de tabela", 52, 40, "Table row"],
    ["input-default", "Altura padrão de input", 48, 44, "Input default"],
    ["section-gap", "Gap de seção", 48, 32, "Section gap"],
    ["list-gap", "Gap de lista", 12, 8, "List gap"]
  ];
  return rows.map(([id, desc, calm, focus, use]) =>
    token({
      path: ["density", id],
      type: "dimension",
      layer: "semantic",
      category: "density",
      subcategory: "mode",
      description: `${desc}. calm = respiração. focus = densidade útil.`,
      sourceSection: "Arquitetura e especificação completa de tokens / Densidade",
      density: { calm: dim(calm), focus: dim(focus) },
      meta: {
        intent: "Uma página de pensamento e um dashboard operacional pertencem à mesma pessoa sem fingir o mesmo objetivo.",
        usage: [use, "data-in-density=calm | focus"],
        avoid: ["calm não significa “grande”.", "focus não significa “apertado”."],
        a11y: "Target primário permanece ≥ 44px mesmo em focus. Input focus = 44px.",
        examples: {
          good: '<main data-in-density="calm">',
          bad: "font-size: 10px para caber mais dados"
        }
      }
    })
  );
}
