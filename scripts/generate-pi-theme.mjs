// Gera os temas INTEIRO para o Pi a partir dos tokens resolvidos (packages/tokens/dist/json/tokens.json).
// Os temas do Pi aceitam só os papéis do próprio host (schema estrito), então cada papel recebe o token
// semântico do IDS mais próximo. Nenhum hexadecimal é escrito à mão aqui.
import { readFile, writeFile, mkdir } from "node:fs/promises";

const OUT = "packages/pi-theme/themes";
const tokens = JSON.parse(
  await readFile("packages/tokens/dist/json/tokens.json", "utf8"),
);

const value = (node) =>
  node && typeof node === "object" && ("$value" in node || "value" in node)
    ? (node.$value ?? node.value)
    : node;
function token(mode, path) {
  // tokens.json guarda cada modo com chaves planas ("color.text.primary").
  const v = value(tokens[mode]?.[path]);
  if (typeof v !== "string" || !/^#[0-9a-f]{6}$/i.test(v))
    throw new Error(`Token ${mode}.${path} ausente ou não hexadecimal: ${v}`);
  return v.toLowerCase();
}

/** Papéis do IDS usados pelos temas, como variáveis do arquivo de tema. */
const VARS = {
  text: "color.text.primary",
  textSecondary: "color.text.secondary",
  textTertiary: "color.text.tertiary",
  choose: "color.identity.primary",
  chooseHover: "color.identity.primary-hover",
  commit: "color.identity.commit",
  commitHover: "color.identity.commit-hover",
  identitySubtle: "color.identity.subtle",
  success: "color.status.success",
  successSubtle: "color.status.success-subtle",
  warning: "color.status.warning",
  warningSubtle: "color.status.warning-subtle",
  danger: "color.status.danger",
  dangerSubtle: "color.status.danger-subtle",
  info: "color.status.info",
  infoSubtle: "color.status.info-subtle",
  selection: "color.selection.background",
  canvas: "color.background.canvas",
  surface: "color.background.surface",
  raised: "color.background.raised",
  borderSubtle: "color.border.subtle",
  borderInteractive: "color.border.interactive",
  borderStrong: "color.border.strong",
  categorical07: "color.dataviz.categorical.07",
};

/**
 * Papel do Pi → variável do IDS. Ordem e conjunto seguem o schema de tema do Pi 1.6.
 * Regras: violeta escolhe (accent, seleção, bordas de foco); laranja só onde algo se torna real
 * (bashMode: o editor executando comandos de verdade; o nível máximo de raciocínio); status mantêm
 * seus papéis; texto secundário e terciário no lugar de cinzas próprios.
 */
const COLORS = {
  accent: "choose",
  border: "borderInteractive",
  borderAccent: "choose",
  borderMuted: "borderSubtle",
  success: "success",
  error: "danger",
  warning: "warning",
  muted: "textSecondary",
  dim: "textTertiary",
  text: "text",
  thinkingText: "textSecondary",
  selectedBg: "selection",
  scrollbarTrack: "borderSubtle",
  scrollbarThumb: "textTertiary",
  searchMatchBg: "warningSubtle",
  searchMatchText: "text",
  userMessageBg: "raised",
  userMessageText: "text",
  customMessageBg: "identitySubtle",
  customMessageText: "textSecondary",
  customMessageLabel: "choose",
  toolPendingBg: "surface",
  toolSuccessBg: "successSubtle",
  toolErrorBg: "dangerSubtle",
  toolTitle: "text",
  toolOutput: "textSecondary",
  mdHeading: "text",
  mdLink: "info",
  mdLinkUrl: "textTertiary",
  mdCode: "chooseHover",
  mdCodeBlock: "text",
  mdCodeBlockBorder: "borderInteractive",
  mdQuote: "textSecondary",
  // A Costura: a citação é reflexão editorial, marcada pela borda de identidade.
  mdQuoteBorder: "choose",
  mdHr: "borderInteractive",
  mdListBullet: "textTertiary",
  toolDiffAdded: "success",
  toolDiffRemoved: "danger",
  toolDiffContext: "textTertiary",
  syntaxComment: "textTertiary",
  syntaxKeyword: "choose",
  syntaxFunction: "info",
  syntaxVariable: "text",
  syntaxString: "success",
  syntaxNumber: "warning",
  syntaxType: "chooseHover",
  syntaxOperator: "textSecondary",
  syntaxPunctuation: "textTertiary",
  thinkingOff: "borderInteractive",
  thinkingMinimal: "textTertiary",
  thinkingLow: "info",
  thinkingMedium: "choose",
  thinkingHigh: "categorical07",
  thinkingXhigh: "commitHover",
  thinkingMax: "commit",
  bashMode: "commit",
};

const MODES = [
  { mode: "dark", name: "inteiro-dark", appearance: "dark" },
  { mode: "light", name: "inteiro-light", appearance: "light" },
  { mode: "contrast-dark", name: "inteiro-contrast-dark", appearance: "dark" },
  {
    mode: "contrast-light",
    name: "inteiro-contrast-light",
    appearance: "light",
  },
];

export function buildTheme({ mode, name, appearance }) {
  const vars = Object.fromEntries(
    Object.entries(VARS).map(([k, path]) => [k, token(mode, path)]),
  );
  return {
    $schema: "https://pi.dev/schemas/theme.schema.json",
    name,
    appearance,
    vars,
    colors: { ...COLORS },
    export: { pageBg: "canvas", cardBg: "surface", infoBg: "identitySubtle" },
  };
}

export const themes = MODES.map(buildTheme);

if (import.meta.url === `file://${process.argv[1]?.replaceAll("\\", "/")}` ||
    process.argv[1]?.endsWith("generate-pi-theme.mjs")) {
  await mkdir(OUT, { recursive: true });
  for (const theme of themes)
    await writeFile(
      `${OUT}/${theme.name}.json`,
      JSON.stringify(theme, null, 2) + "\n",
    );
  const { version } = JSON.parse(
    await readFile("packages/pi-theme/package.json", "utf8"),
  );
  const header = [
    "// Gerado por scripts/generate-pi-theme.mjs a partir dos tokens. Não edite.",
    "// Instalado pelas extensões com registerInteiroPiThemes (pi-theme-install.ts).",
    `export const PI_THEMES_VERSION = ${JSON.stringify(version)};`,
    "export interface PiThemeFile {",
    "  $schema: string;",
    "  name: string;",
    '  appearance: "dark" | "light";',
    "  vars: Record<string, string>;",
    "  colors: Record<string, string>;",
    "  export: Record<string, string>;",
    "}",
  ];
  await writeFile(
    "packages/terminal/src/pi-themes.ts",
    [...header, `export const PI_THEMES: readonly PiThemeFile[] = ${JSON.stringify(themes, null, 2)};`, ""].join("\n"),
  );
  console.log(
    `Pi: ${themes.length} temas gerados em ${OUT} (${themes.map((t) => t.name).join(", ")}).`,
  );
}
