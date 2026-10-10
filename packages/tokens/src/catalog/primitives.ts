import { colorFromHex } from "../hex.ts";
import type { TokenDef } from "../types.ts";
import { token } from "./helpers.ts";

const SHADES = ["050", "100", "200", "300", "400", "500", "600", "700", "800", "900", "950"] as const;

const SCALES: Record<string, Record<(typeof SHADES)[number], string>> = {
  neutral: {
    "050": "#FAF8F4",
    "100": "#F4F1EA",
    "200": "#E7E2DA",
    "300": "#D0C9C2",
    "400": "#AAA3A6",
    "500": "#827C86",
    "600": "#625D68",
    "700": "#45414C",
    "800": "#2C2A33",
    "900": "#1A1920",
    "950": "#0C0D12"
  },
  violet: {
    "050": "#F7F4FF",
    "100": "#EDE7FF",
    "200": "#DDD2FF",
    "300": "#C5B4FF",
    "400": "#A78BFA",
    "500": "#8B6CF2",
    "600": "#704EE0",
    "700": "#593BC2",
    "800": "#452F99",
    "900": "#352472",
    "950": "#21184A"
  },
  orange: {
    "050": "#FFF5EC",
    "100": "#FFE7D4",
    "200": "#FFCDAA",
    "300": "#FFB27F",
    "400": "#FF9A56",
    "500": "#F47E2C",
    "600": "#D96212",
    "700": "#B54A05",
    "800": "#8E3904",
    "900": "#692B08",
    "950": "#3D1806"
  },
  mint: {
    "050": "#EDFFF9",
    "100": "#CDF9EC",
    "200": "#9DECD7",
    "300": "#6EDFC4",
    "400": "#4FD1B5",
    "500": "#2BB99D",
    "600": "#198E79",
    "700": "#126C5C",
    "800": "#105246",
    "900": "#0C3A32",
    "950": "#08251F"
  },
  red: {
    "050": "#FFF0F2",
    "100": "#FFD9DF",
    "200": "#FFB4BF",
    "300": "#FF8C9A",
    "400": "#FF6B7A",
    "500": "#EB4D61",
    "600": "#C9364C",
    "700": "#A1293C",
    "800": "#7D2331",
    "900": "#5C1D27",
    "950": "#370F16"
  },
  amber: {
    "050": "#FFF8E8",
    "100": "#FDECC0",
    "200": "#F8D98E",
    "300": "#F2C66D",
    "400": "#E6B44A",
    "500": "#CE9627",
    "600": "#A97312",
    "700": "#83570D",
    "800": "#63410D",
    "900": "#462F0D",
    "950": "#2B1D07"
  },
  blue: {
    "050": "#EFF6FF",
    "100": "#DCEAFF",
    "200": "#B8D5FF",
    "300": "#92BBFF",
    "400": "#72A7FF",
    "500": "#4E8BED",
    "600": "#326BCB",
    "700": "#2853A0",
    "800": "#23417C",
    "900": "#1D315A",
    "950": "#101D36"
  }
};

const FAMILY_INTENT: Record<string, { intent: string; role: string; avoid: string }> = {
  neutral: {
    intent: "Matéria cromática quente. O branco é levemente quente e o preto nunca é preto absoluto.",
    role: "Canvas, texto, bordas e superfícies. Neutros não são frios.",
    avoid: "Não usar preto #000000 nem branco #FFFFFF como substitutos."
  },
  violet: {
    intent: "Consciência deliberada. Violeta = estou escolhendo.",
    role: "Seleção, identidade, foco, ação primária deliberada.",
    avoid: "Não usar como decoração, glow ou “cor de tecnologia”."
  },
  orange: {
    intent: "Decisão que atravessa o limite. Laranja = estou tornando real.",
    role: "Commit, deploy, publicar, aplicar mudança externa.",
    avoid: "Não usar como accent genérico nem em todos os gráficos."
  },
  mint: {
    intent: "Resolução. Sucesso real, não celebração decorativa.",
    role: "Status de sucesso e confirmação factual.",
    avoid: "Não usar como segunda cor de marca."
  },
  red: {
    intent: "Ruptura, risco, quebra.",
    role: "Erro, perigo, exclusão, falha.",
    avoid: "Não usar para ênfase visual sem significado destrutivo."
  },
  amber: {
    intent: "Atenção sem ruptura.",
    role: "Warning e cautela.",
    avoid: "Não confundir com laranja de commit."
  },
  blue: {
    intent: "Informação externa ao sistema.",
    role: "Info, dados vindos de fora, referência neutra.",
    avoid: "Não usar como identidade da marca."
  }
};

const KEY_SHADES: Record<string, string> = {
  "neutral.050": "Near-white quente de referência.",
  "neutral.100": "Warm Frost. Texto principal no dark.",
  "neutral.800": "Borda sutil no dark.",
  "neutral.950": "Obsidian. Canvas dark. Interior, silêncio.",
  "violet.400": "Identidade dark. Consciência, intenção.",
  "violet.600": "Identidade light.",
  "orange.400": "Commit dark. Atravessar o limite.",
  "orange.700": "Commit light.",
  "mint.400": "Sucesso dark.",
  "mint.700": "Sucesso light.",
  "red.400": "Rupture dark.",
  "red.700": "Danger light.",
  "amber.300": "Warning dark (status.warning).",
  "amber.700": "Warning light.",
  "blue.400": "Info dark.",
  "blue.700": "Info light."
};

export function primitiveColors(): TokenDef[] {
  const tokens: TokenDef[] = [];
  for (const [family, scale] of Object.entries(SCALES)) {
    const familyMeta = FAMILY_INTENT[family]!;
    for (const shade of SHADES) {
      const hex = scale[shade]!;
      const id = `${family}.${shade}`;
      tokens.push(
        token({
          path: ["color", family, shade],
          type: "color",
          layer: "primitive",
          category: "color",
          subcategory: `primitive.${family}`,
          description: KEY_SHADES[id] ?? `Primitivo ${family} ${shade}. ${familyMeta.role}`,
          sourceSection: "Arquitetura e especificação completa de tokens / Primitivos cromáticos",
          status: "source",
          consumerFacing: false,
          value: colorFromHex(hex),
          meta: {
            intent: familyMeta.intent,
            usage: [
              "Apenas como matéria para tokens semânticos.",
              "Aliases de tema devem apontar para este primitivo quando o valor coincidir."
            ],
            avoid: [
              "Componentes não devem consumir primitivos diretamente.",
              familyMeta.avoid
            ],
            a11y: "Contraste deve ser validado no par semântico, não no primitivo isolado.",
            examples: {
              good: `color.identity.primary → {color.${family}.${shade}}`,
              bad: `button { background: ${hex}; }`
            }
          }
        })
      );
    }
  }
  return tokens;
}

export const PRIMITIVE_SCALES = SCALES;
