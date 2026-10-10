import type { TokenDef, TypographyValue } from "../types.ts";
import { dim, token } from "./helpers.ts";

const SANS = '"Recursive", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';
const MACHINE = '"Recursive", "SFMono-Regular", Consolas, "Liberation Mono", monospace';

export function fontTokens(): TokenDef[] {
  return [
    token({
      path: ["font", "family", "sans"],
      type: "fontFamily",
      layer: "primitive",
      category: "typography",
      subcategory: "family",
      description: "Recursive como voz central. Fallback system-ui / Segoe UI.",
      sourceSection: "Identidade / Tipografia",
      consumerFacing: true,
      value: SANS,
      meta: {
        intent: "O lado racional e o lado expressivo deixam de ser fontes diferentes e viram estados da mesma fonte.",
        usage: ["Interface, editorial, controles."],
        avoid: ["Não voltar para Inter + JetBrains como personalidades desconectadas."],
        a11y: "Suporte latino incluindo português. Para árabe/CJK, permitir fallback configurável por locale.",
        examples: {
          good: 'font-family: var(--in-font-family-sans); font-variation-settings: "MONO" 0, "CASL" 0;',
          bad: "h1 { font-family: Inter } code { font-family: JetBrains Mono }"
        }
      }
    }),
    token({
      path: ["font", "family", "machine"],
      type: "fontFamily",
      layer: "primitive",
      category: "typography",
      subcategory: "family",
      description: "Recursive mono + fallbacks de código.",
      sourceSection: "Identidade / Tipografia",
      consumerFacing: true,
      value: MACHINE,
      meta: {
        intent: "Precisão. Código, IDs, métricas, timestamps.",
        usage: ["Hashes, IDs, code, métricas."],
        avoid: ["Não usar para corpo editorial."],
        a11y: "IDs e hashes podem usar dir=ltr dentro de contexto RTL.",
        examples: {
          good: 'font-variation-settings: "MONO" 1, "CASL" 0;',
          bad: "terminal fake como decoração"
        }
      }
    })
  ];
}

export function weightTokens(): TokenDef[] {
  const weights: Array<[string, number, string]> = [
    ["regular", 400, "Corpo"],
    ["medium", 500, "Ênfase leve"],
    ["semibold", 600, "Labels e títulos médios"],
    ["bold", 700, "Display e h1"],
    ["strong", 800, "Ênfase máxima rara"]
  ];
  return weights.map(([name, value, use]) =>
    token({
      path: ["font", "weight", name],
      type: "fontWeight",
      layer: "primitive",
      category: "typography",
      subcategory: "weight",
      description: `Peso ${value}. ${use}. Recursive wght 300–1000.`,
      sourceSection: "Arquitetura / Tipografia / Pesos",
      consumerFacing: true,
      value,
      meta: {
        intent: "Hierarquia por peso da mesma família, não por troca de fonte.",
        usage: [use],
        avoid: ["Não misturar famílias para simular peso."],
        a11y: "Peso não substitui tamanho adequado nem contraste.",
        examples: { good: "font-weight: var(--in-font-weight-semibold);", bad: "font-weight: 350;" }
      }
    })
  );
}

export function voiceTokens(): TokenDef[] {
  const voices: Array<[string, string, string, string]> = [
    ["rational", '"MONO" 0, "CASL" 0', "Interface, navegação, controles", "Pensamento estruturado"],
    ["human", '"MONO" 0, "CASL" 0.35', "Editorial, abertura, reflexão", "Interioridade"],
    ["signal", '"MONO" 0, "CASL" 0.10', "Headlines e decisões", "Convicção"],
    ["machine", '"MONO" 1, "CASL" 0', "Código, IDs, métricas, timestamps", "Precisão"]
  ];
  return voices.map(([name, settings, use, meaning]) =>
    token({
      path: ["font", "voice", name],
      type: "string",
      layer: "semantic",
      category: "typography",
      subcategory: "voice",
      description: `Voz ${name}: ${settings}. ${meaning}.`,
      sourceSection: "Identidade / Quatro vozes tipográficas",
      value: settings,
      meta: {
        intent: meaning,
        usage: [use, `font-variation-settings: ${settings};`],
        avoid: ["Não performar inteligência com hexadecimal decorativo.", "Não usar human em tabelas densas."],
        a11y: "Variação CASL não reduz legibilidade abaixo do corpo md 16/25.",
        examples: {
          good: `.in-voice-${name} { font-variation-settings: ${settings}; }`,
          bad: "Trocar para uma script font “expressiva” no editorial"
        }
      }
    })
  );
}

const TYPE_STYLES: Array<{
  path: string[];
  size: number;
  line: number;
  weight: number;
  tracking: number;
  description: string;
}> = [
  { path: ["type", "display", "xl"], size: 64, line: 68, weight: 700, tracking: -0.035, description: "Display extra. Hero." },
  { path: ["type", "display", "lg"], size: 52, line: 56, weight: 700, tracking: -0.032, description: "Display large." },
  { path: ["type", "heading", "h1"], size: 40, line: 44, weight: 700, tracking: -0.025, description: "Heading 1." },
  { path: ["type", "heading", "h2"], size: 32, line: 38, weight: 650, tracking: -0.02, description: "Heading 2." },
  { path: ["type", "heading", "h3"], size: 24, line: 30, weight: 650, tracking: -0.015, description: "Heading 3." },
  { path: ["type", "title"], size: 20, line: 26, weight: 600, tracking: -0.01, description: "Title de card/seção." },
  { path: ["type", "body", "lg"], size: 18, line: 29, weight: 400, tracking: 0, description: "Corpo editorial." },
  { path: ["type", "body", "md"], size: 16, line: 25, weight: 400, tracking: 0, description: "Corpo padrão de UI." },
  { path: ["type", "body", "sm"], size: 14, line: 21, weight: 400, tracking: 0.005, description: "Corpo compacto." },
  { path: ["type", "label"], size: 13, line: 17, weight: 600, tracking: 0.01, description: "Label de controle." },
  { path: ["type", "caption"], size: 12, line: 16, weight: 450, tracking: 0.015, description: "Caption e metadata." },
  { path: ["type", "code"], size: 13, line: 20, weight: 400, tracking: 0, description: "Código e IDs." },
  { path: ["type", "overline"], size: 11, line: 16, weight: 650, tracking: 0.08, description: "Overline / kicker." }
];

export function typeStyleTokens(): TokenDef[] {
  const out: TokenDef[] = [];
  for (const style of TYPE_STYLES) {
    const family = style.path.includes("code") ? "{font.family.machine}" : "{font.family.sans}";
    const composite: TypographyValue = {
      fontFamily: family,
      fontSize: dim(style.size),
      fontWeight: style.weight,
      lineHeight: dim(style.line),
      letterSpacing: dim(style.tracking, "em")
    };
    out.push(
      token({
        path: [...style.path, "typography"],
        type: "typography",
        layer: "semantic",
        category: "typography",
        subcategory: style.path[1] ?? "type",
        description: `${style.description} ${style.size}/${style.line}, weight ${style.weight}, tracking ${style.tracking}em. Composto DTCG (não compartilha o path com métricas filhas).`,
        sourceSection: "Arquitetura / Tipografia",
        value: composite,
        meta: {
          intent: "Hierarquia rigorosa. Densidade permitida; desordem não.",
          usage: [style.description],
          avoid: ["Não criar um tamanho ad-hoc.", "Não usar display em UI densa de dashboard."],
          a11y: "Conteúdo deve continuar funcional com line-height 1.5×, letter-spacing 0.12em, word-spacing 0.16em.",
          examples: {
            good: `font-size: var(--in-${style.path.join("-")}-size);`,
            bad: "font-size: 15px; line-height: 1;"
          }
        }
      })
    );
    out.push(
      token({
        path: [...style.path, "size"],
        type: "dimension",
        layer: "semantic",
        category: "typography",
        subcategory: "metric",
        description: `Tamanho de ${style.path.join(".")}.`,
        sourceSection: "Arquitetura / Tipografia",
        status: "derived",
        value: dim(style.size),
        meta: {
          intent: "Métrica extraída do composto tipográfico.",
          usage: ["CSS font-size."],
          avoid: ["Não usar isolada sem line-height correspondente."],
          a11y: "Texto normal ≥ 16px preferível em body.md.",
          examples: { good: "var(--in-type-body-md-size)", bad: "font-size: 13.5px" }
        }
      })
    );
    out.push(
      token({
        path: [...style.path, "line-height"],
        type: "dimension",
        layer: "semantic",
        category: "typography",
        subcategory: "metric",
        description: `Line-height de ${style.path.join(".")}.`,
        sourceSection: "Arquitetura / Tipografia",
        status: "derived",
        value: dim(style.line),
        meta: {
          intent: "Ritmo vertical do tipo.",
          usage: ["CSS line-height."],
          avoid: ["Não comprimir abaixo do valor."],
          a11y: "Deve tolerar override 1.5×.",
          examples: { good: "var(--in-type-body-md-line-height)", bad: "line-height: 1" }
        }
      })
    );
    out.push(
      token({
        path: [...style.path, "weight"],
        type: "fontWeight",
        layer: "semantic",
        category: "typography",
        subcategory: "metric",
        description: `Peso de ${style.path.join(".")}.`,
        sourceSection: "Arquitetura / Tipografia",
        status: "derived",
        value: style.weight,
        meta: {
          intent: "Peso do estilo.",
          usage: ["CSS font-weight."],
          avoid: ["Não arredondar 650 para 700 sem necessidade."],
          a11y: "Peso não substitui contraste.",
          examples: { good: "var(--in-type-heading-h2-weight)", bad: "font-weight: bolder" }
        }
      })
    );
    out.push(
      token({
        path: [...style.path, "tracking"],
        type: "dimension",
        layer: "semantic",
        category: "typography",
        subcategory: "metric",
        description: `Letter-spacing de ${style.path.join(".")}.`,
        sourceSection: "Arquitetura / Tipografia",
        status: "derived",
        value: dim(style.tracking, "em"),
        meta: {
          intent: "Tracking óptico da hierarquia.",
          usage: ["CSS letter-spacing."],
          avoid: ["Não aplicar tracking de display em body."],
          a11y: "Deve tolerar letter-spacing 0.12em de override.",
          examples: { good: "var(--in-type-overline-tracking)", bad: "letter-spacing: 4px" }
        }
      })
    );
  }
  return out;
}

export function editorialVoiceTokens(): TokenDef[] {
  return [
    token({
      path: ["font", "voice", "editorial-title"],
      type: "string",
      layer: "component",
      category: "typography",
      subcategory: "editorial",
      description: "Título editorial. CASL 0.28.",
      sourceSection: "Componentes / Editorial",
      status: "source",
      value: '"MONO" 0, "CASL" 0.28',
      meta: {
        intent: "A mesma voz que escreve código consegue pensar em voz alta.",
        usage: [".article__title", "density=calm"],
        avoid: ["Não usar em navegação."],
        a11y: "clamp de tamanho deve reflow em 320px.",
        examples: { good: "font-variation-settings: \"MONO\" 0, \"CASL\" 0.28;", bad: "font-family: Playfair Display" }
      }
    }),
    token({
      path: ["font", "voice", "editorial-body"],
      type: "string",
      layer: "component",
      category: "typography",
      subcategory: "editorial",
      description: "Corpo editorial. CASL 0.06, 70ch, 1.125rem / 1.65.",
      sourceSection: "Componentes / Editorial",
      value: '"MONO" 0, "CASL" 0.06',
      meta: {
        intent: "Leitura humana com a mesma família.",
        usage: [".article__body"],
        avoid: ["Não usar CASL 0.40 no corpo inteiro."],
        a11y: "max-inline-size 70ch.",
        examples: { good: "max-inline-size: 70ch;", bad: "max-width: 100% em editorial longo" }
      }
    }),
    token({
      path: ["font", "voice", "editorial-reflection"],
      type: "string",
      layer: "component",
      category: "typography",
      subcategory: "editorial",
      description: "Reflexão editorial. CASL 0.40 + Costura.",
      sourceSection: "Componentes / Editorial",
      value: '"MONO" 0, "CASL" 0.40',
      meta: {
        intent: "Costura marca interpretação, não todos os cards.",
        usage: [".article__reflection"],
        avoid: ["Não aplicar Costura em cada parágrafo."],
        a11y: "A Costura não substitui heading semântico.",
        examples: { good: "border-inline-start: 2px solid var(--in-color-identity-primary);", bad: "border-left em todos os blockquotes" }
      }
    })
  ];
}
