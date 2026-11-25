// Gera os temas INTEIRO para o Pi a partir dos tokens resolvidos (packages/tokens/dist/json/tokens.json).
//
// Fonte única: a tabela ROLES abaixo. Dela saem
//   - packages/pi-theme/themes/<nome>.json   (os temas)
//   - packages/terminal/src/pi-themes.ts     (os mesmos temas, instalados pelas extensões)
//   - packages/pi-theme/preview/<nome>.svg   (prévia de cada componente do Pi, como as capturas do Dracula)
//   - docs/terminal/pi-theme.md               (a especificação: papel, componente, token e regra)
//
// Os temas do Pi aceitam só os papéis do próprio host (schema estrito). O tema Dracula para Pi foi usado
// como referência de COMPONENTES (quais papéis existem e o que cada um diferencia), não de visual: cada
// papel recebe o token semântico do IDS que cumpre a mesma função. Nenhum hexadecimal é escrito à mão.
import { readFile, writeFile, mkdir } from "node:fs/promises";

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

/** Variáveis do arquivo de tema: nome curto → token semântico do IDS (por aparência quando difere). */
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
  selection: "color.selection.background",
  canvas: "color.background.canvas",
  surface: "color.background.surface",
  // Caixa que se afasta do canvas: mais clara no escuro, mais escura no claro.
  messageBox: { dark: "color.background.raised", light: "color.background.sunken" },
  toolBox: { dark: "color.background.surface", light: "color.background.sunken" },
  borderSubtle: "color.border.subtle",
  borderInteractive: "color.border.interactive",
  borderStrong: "color.border.strong",
  // Paleta categórica do IDS, na ordem; 02 (laranja) fica fora porque laranja significa efeito real.
  cat01: "color.dataviz.categorical.01",
  cat03: "color.dataviz.categorical.03",
  cat04: "color.dataviz.categorical.04",
  cat06: "color.dataviz.categorical.06",
  cat07: "color.dataviz.categorical.07",
};

/**
 * Cada papel do Pi 1.6, na ordem do schema: [papel, grupo, componente que pinta, variável, regra do IDS].
 * `componente` e `regra` vão para a especificação gerada.
 */
export const ROLES = [
  ["accent", "Interação", "logo, item selecionado, cursor, botões de escolha nos painéis", "choose", "Violeta = escolher (`color.identity.primary`)."],
  ["border", "Bordas", "bordas normais (editor, caixas)", "borderInteractive", "Borda de componente interativo: 3:1 com o canvas."],
  ["borderAccent", "Bordas", "borda em destaque", "choose", "Destaque é foco ou escolha, então violeta."],
  ["borderMuted", "Bordas", "divisórias discretas", "borderSubtle", "Estrutura silenciosa: `color.border.subtle`."],
  ["success", "Status", "estado de sucesso", "success", "Status mantém o papel: mint."],
  ["error", "Status", "estado de erro", "danger", "Status mantém o papel: vermelho."],
  ["warning", "Status", "estado de aviso", "warning", "Status mantém o papel: âmbar, nunca laranja."],
  ["muted", "Texto", "texto secundário, dicas", "textSecondary", "Hierarquia por token de texto, nunca por opacidade."],
  ["dim", "Texto", "texto mais apagado que `muted`", "textTertiary", "Texto terciário, ainda legível (4,5:1)."],
  ["text", "Texto", "texto padrão", "text", "Texto primário."],
  ["thinkingText", "Mensagens", "texto do bloco de raciocínio", "textSecondary", "Raciocínio é apoio, não resposta: secundário."],
  ["scrollbarTrack", "Seleção e tela cheia", "trilho da barra de rolagem", "borderSubtle", "Estrutura silenciosa."],
  ["scrollbarThumb", "Seleção e tela cheia", "cursor da barra de rolagem", "textTertiary", "Visível sem competir com o conteúdo."],
  ["selectedBg", "Seleção e tela cheia", "fundo do item selecionado em listas e painéis", "selection", "Foco = `>` + fundo de seleção, não só cor."],
  ["searchMatchBg", "Seleção e tela cheia", "fundo da ocorrência na busca do histórico", "warningSubtle", "Ocorrência pede atenção, não é escolha: fundo âmbar sutil."],
  ["searchMatchText", "Seleção e tela cheia", "texto da ocorrência", "text", "Texto primário sobre o fundo sutil."],
  ["userMessageBg", "Mensagens", "caixa da mensagem do usuário", "messageBox", "Superfície que se afasta do canvas: `raised` no escuro, `sunken` no claro."],
  ["userMessageText", "Mensagens", "texto da mensagem do usuário", "text", "Texto primário."],
  ["customMessageBg", "Mensagens", "caixa de mensagem injetada por extensão", "identitySubtle", "Mensagem do sistema ou de extensão: fundo de identidade sutil."],
  ["customMessageText", "Mensagens", "texto da mensagem injetada", "textSecondary", "Secundário: contexto, não conversa."],
  ["customMessageLabel", "Mensagens", "rótulo do tipo de mensagem", "choose", "Rótulo de identidade: violeta."],
  ["toolPendingBg", "Ferramentas", "caixa de ferramenta em execução", "toolBox", "Superfície neutra; o estado vem do texto e da cor final."],
  ["toolSuccessBg", "Ferramentas", "caixa de ferramenta concluída", "successSubtle", "Fundo sutil de status, nunca o status pleno."],
  ["toolErrorBg", "Ferramentas", "caixa de ferramenta com erro", "dangerSubtle", "Fundo sutil de status, nunca o status pleno."],
  ["toolTitle", "Ferramentas", "título da caixa de ferramenta", "text", "Texto primário."],
  ["toolOutput", "Ferramentas", "saída da ferramenta", "textSecondary", "Saída é evidência: secundário."],
  ["mdHeading", "Markdown", "títulos", "text", "Estrutura silenciosa: texto primário; o Pi já aplica negrito."],
  ["mdLink", "Markdown", "texto do link", "choose", "Como o IDS web (`a { color: identity.primary }`): seguir um link é escolher."],
  ["mdLinkUrl", "Markdown", "URL do link", "textTertiary", "Endereço é detalhe: terciário."],
  ["mdCode", "Markdown", "código inline", "cat03", "Voz `machine` sem fonte própria no terminal: o azul categórico separa código de prosa."],
  ["mdCodeBlock", "Markdown", "bloco de código sem linguagem", "text", "Como `.in-code-block`: texto primário; a borda separa o bloco."],
  ["mdCodeBlockBorder", "Markdown", "cercas do bloco de código", "borderInteractive", "Borda de estrutura."],
  ["mdQuote", "Markdown", "texto de citação", "textSecondary", "Reflexão editorial: secundário."],
  ["mdQuoteBorder", "Markdown", "borda da citação", "choose", "A Costura: borda de identidade na reflexão."],
  ["mdHr", "Markdown", "linha horizontal", "borderInteractive", "Estrutura."],
  ["mdListBullet", "Markdown", "marcadores de lista", "textTertiary", "Marcador é estrutura, não ênfase."],
  ["toolDiffAdded", "Diff", "linhas adicionadas", "success", "Status: mint."],
  ["toolDiffRemoved", "Diff", "linhas removidas", "danger", "Status: vermelho."],
  ["toolDiffContext", "Diff", "linhas de contexto", "textTertiary", "Contexto é estrutura."],
  ["syntaxComment", "Sintaxe", "comentários", "textTertiary", "Comentário é anotação: terciário."],
  ["syntaxKeyword", "Sintaxe", "palavras-chave", "cat01", "Categórica 01 (violeta): controle de fluxo é decisão."],
  ["syntaxFunction", "Sintaxe", "nomes de função", "cat03", "Categórica 03 (azul)."],
  ["syntaxVariable", "Sintaxe", "variáveis", "text", "A maior parte do código fica neutra (~80% neutros)."],
  ["syntaxString", "Sintaxe", "strings", "cat04", "Categórica 04 (mint)."],
  ["syntaxNumber", "Sintaxe", "números", "cat06", "Categórica 06 (âmbar). A 02 (laranja) fica fora: laranja é efeito real."],
  ["syntaxType", "Sintaxe", "tipos", "cat07", "Categórica 07 (rosa)."],
  ["syntaxOperator", "Sintaxe", "operadores", "textSecondary", "Estrutura: secundário."],
  ["syntaxPunctuation", "Sintaxe", "pontuação", "textTertiary", "Estrutura: terciário."],
  ["thinkingOff", "Modos do editor", "borda do editor sem raciocínio", "borderInteractive", "Escada de custo: neutro."],
  ["thinkingMinimal", "Modos do editor", "raciocínio mínimo", "textTertiary", "Escada de custo."],
  ["thinkingLow", "Modos do editor", "raciocínio baixo", "info", "Escada de custo: informação."],
  ["thinkingMedium", "Modos do editor", "raciocínio médio", "choose", "Escada de custo: escolha deliberada."],
  ["thinkingHigh", "Modos do editor", "raciocínio alto", "cat07", "Escada de custo."],
  ["thinkingXhigh", "Modos do editor", "raciocínio muito alto", "commitHover", "Aproxima-se do limite: laranja claro."],
  ["thinkingMax", "Modos do editor", "raciocínio máximo", "commit", "Atravessa o limite de custo: laranja."],
  ["bashMode", "Modos do editor", "editor em modo bash; nos painéis, o botão que grava", "commit", "Executar de verdade é efeito real: laranja (`color.identity.commit`)."],
];

export const EXPORT = {
  pageBg: ["canvas", "página do HTML exportado"],
  cardBg: ["surface", "cartões do HTML exportado"],
  infoBg: ["identitySubtle", "caixas de informação do HTML exportado"],
};

const MODES = [
  { mode: "dark", name: "inteiro-dark", appearance: "dark" },
  { mode: "light", name: "inteiro-light", appearance: "light" },
  { mode: "contrast-dark", name: "inteiro-contrast-dark", appearance: "dark" },
  { mode: "contrast-light", name: "inteiro-contrast-light", appearance: "light" },
];

const varToken = (spec, appearance) =>
  typeof spec === "string" ? spec : spec[appearance];

export function buildTheme({ mode, name, appearance }) {
  const used = new Set([
    ...ROLES.map((r) => r[3]),
    ...Object.values(EXPORT).map(([v]) => v),
  ]);
  const vars = Object.fromEntries(
    Object.entries(VARS)
      .filter(([k]) => used.has(k))
      .map(([k, spec]) => [k, token(mode, varToken(spec, appearance))]),
  );
  return {
    $schema: "https://pi.dev/schemas/theme.schema.json",
    name,
    appearance,
    vars,
    colors: Object.fromEntries(ROLES.map(([role, , , v]) => [role, v])),
    export: Object.fromEntries(Object.entries(EXPORT).map(([k, [v]]) => [k, v])),
  };
}

export const themes = MODES.map(buildTheme);

/* ------------------------------------------------------------- prévia SVG */
const esc = (s) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
/**
 * Prévia de cada componente do Pi pintado pelo tema, como as capturas do pacote Dracula, mas gerada:
 * muda junto com os tokens. Cada linha é uma lista de [texto, papel, negrito?] e um fundo opcional.
 */
export function previewSvg(theme) {
  const c = (role) => theme.vars[theme.colors[role]];
  const COLS = 76, CH = 8.4, LH = 20, PAD = 16;
  const rows = [
    { segs: [[`Pi · ${theme.name}`, "text", true]] },
    { segs: [["Mensagens", "muted"]] },
    { bg: "userMessageBg", segs: [["  refatore o parser e rode os testes", "userMessageText"]] },
    { bg: "customMessageBg", segs: [["  [hook] ", "customMessageLabel", true], ["contexto do projeto carregado", "customMessageText"]] },
    { segs: [["  pensando: o parser mistura leitura e validação", "thinkingText"]] },
    { segs: [["Ferramentas", "muted"]] },
    { bg: "toolPendingBg", segs: [["  read ", "toolTitle", true], ["src/parser.ts", "toolOutput"]] },
    { bg: "toolSuccessBg", segs: [["  edit ", "toolTitle", true], ["src/parser.ts ", "toolOutput"], ["concluído", "success"]] },
    { bg: "toolErrorBg", segs: [["  bash ", "toolTitle", true], ["npm test ", "toolOutput"], ["1 falha", "error"]] },
    { segs: [["  + const valid = check(input);", "toolDiffAdded"]] },
    { segs: [["  - validate(input, true);", "toolDiffRemoved"]] },
    { segs: [["    return parse(input);", "toolDiffContext"]] },
    { segs: [["Markdown", "muted"]] },
    { segs: [["  Resultado", "mdHeading", true]] },
    { segs: [["  • ", "mdListBullet"], ["use ", "text"], ["parse()", "mdCode"], [" e veja ", "text"], ["o guia", "mdLink"], [" (https://ids.lab)", "mdLinkUrl"]] },
    { segs: [["  │ ", "mdQuoteBorder"], ["a validação agora fica num só lugar", "mdQuote"]] },
    { segs: [["  ", "text"], ["─".repeat(30), "mdHr"]] },
    { segs: [["Código", "muted"]] },
    { segs: [["  // lê e valida a entrada", "syntaxComment"]] },
    { segs: [["  export function ", "syntaxKeyword"], ["parse", "syntaxFunction"], ["(", "syntaxPunctuation"], ["input", "syntaxVariable"], [": ", "syntaxPunctuation"], ["string", "syntaxType"], [") {", "syntaxPunctuation"]] },
    { segs: [["    return ", "syntaxKeyword"], ["input.length ", "syntaxVariable"], ["> ", "syntaxOperator"], ["42 ", "syntaxNumber"], ["? ", "syntaxOperator"], ['"longo"', "syntaxString"], [" : ", "syntaxOperator"], ['"curto"', "syntaxString"], [";", "syntaxPunctuation"]] },
    { segs: [["Painel", "muted"]] },
    { bg: "selectedBg", segs: [["  > Idioma            Português", "accent"]] },
    { segs: [["    Modelo            sonnet", "text"]] },
    { segs: [["  [Salvar alterações]", "bashMode", true], [" ", "text"], ["[Ajuda]", "accent"], [" ", "text"], ["[Fechar]", "accent"]] },
    { segs: [["  ↑↓ navegar · Enter editar · Ctrl+S salvar · Esc fechar", "muted"]] },
    { segs: [["Raciocínio  ", "muted"], ["off ", "thinkingOff"], ["min ", "thinkingMinimal"], ["low ", "thinkingLow"], ["med ", "thinkingMedium"], ["high ", "thinkingHigh"], ["xhigh ", "thinkingXhigh"], ["max", "thinkingMax"]] },
    { segs: [["Status      ", "muted"], ["sucesso ", "success"], ["aviso ", "warning"], ["erro ", "error"], ["secundário ", "muted"], ["apagado", "dim"]] },
  ];
  const width = Math.round(COLS * CH + PAD * 2),
    height = rows.length * LH + PAD * 2;
  const out = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Prévia do tema ${theme.name} no Pi">`,
    `<rect width="${width}" height="${height}" rx="8" fill="${theme.vars.canvas}"/>`,
    `<g font-family="'Recursive Mono','Cascadia Mono',Consolas,monospace" font-size="14">`,
  ];
  rows.forEach((row, i) => {
    const y = PAD + i * LH;
    if (row.bg)
      out.push(`<rect x="${PAD - 4}" y="${y}" width="${width - PAD * 2 + 8}" height="${LH}" fill="${c(row.bg)}"/>`);
    let x = PAD;
    for (const [text, role, bold] of row.segs) {
      out.push(
        `<text x="${x.toFixed(1)}" y="${y + 14}" fill="${c(role)}"${bold ? ' font-weight="700"' : ""} xml:space="preserve">${esc(text)}</text>`,
      );
      x += [...text].length * CH;
    }
  });
  out.push("</g>", "</svg>", "");
  return out.join("\n");
}

/* --------------------------------------------------------- especificação */
export function specMarkdown() {
  const groups = [...new Set(ROLES.map((r) => r[1]))];
  const tokenOf = (v) => {
    const spec = VARS[v];
    return typeof spec === "string"
      ? `\`${spec}\``
      : `\`${spec.dark}\` (escuro) · \`${spec.light}\` (claro)`;
  };
  const lines = [
    "# Tema do Pi: especificação",
    "",
    "Gerado por `npm run generate:pi-theme` a partir de `scripts/generate-pi-theme.mjs`. Não edite à mão.",
    "",
    "Os temas `inteiro-dark`, `inteiro-light`, `inteiro-contrast-dark` e `inteiro-contrast-light` cobrem todos os papéis de cor do Pi 1.6. O schema de tema do Pi é estrito e só aceita os papéis do host, então cada papel recebe o token semântico do IDS que cumpre a mesma função.",
    "",
    "O tema Dracula para Pi serviu de referência de **componentes**: quais papéis existem e o que cada um precisa diferenciar (mensagens, ferramentas, markdown, diff, sintaxe, níveis de raciocínio, modo bash e exportação HTML). Não serviu de referência visual: as cores e as regras são as do IDS.",
    "",
    "## Regras",
    "",
    "1. **Neutros dominam.** Texto, títulos, variáveis, saídas e estrutura usam os tokens de texto e de borda (cerca de 80% da tela).",
    "2. **Violeta escolhe.** `accent`, links, palavras-chave, rótulos de identidade, a borda da citação (a Costura) e o fundo de seleção.",
    "3. **Laranja só para efeito real.** `bashMode` (executar comandos de verdade e, nos painéis, o botão que grava) e o topo da escada de raciocínio. Nunca em sintaxe nem como decoração.",
    "4. **Status mantém o papel.** Mint, âmbar e vermelho só para sucesso, aviso e erro; as caixas de ferramenta usam a versão sutil.",
    "5. **Sintaxe usa a paleta categórica, na ordem e sem a 02.** Categorias de código são dados categóricos (`color.dataviz.categorical.*`), não status.",
    "6. **Superfícies se afastam do canvas.** Caixas de mensagem e de ferramenta usam `raised`/`surface` no escuro e `sunken` no claro.",
    "7. **Foco não depende só de cor.** Item com foco = `>` + `selectedBg`.",
    "8. **Contraste.** Todo papel de texto tem pelo menos 4,5:1 sobre o canvas do IDS e sobre a própria caixa; o violeta tem 4,5:1 sobre `selectedBg`; `border` tem 3:1 com o canvas. `tests/terminal/pi-theme.test.ts` verifica.",
    "",
    "## Prévias",
    "",
    "Geradas junto com os temas, com o mesmo texto em cada um:",
    "",
    ...themes.map((t) => `- \`${t.name}\`: [preview/${t.name}.svg](../../packages/pi-theme/preview/${t.name}.svg)`),
    "",
    "## Papéis",
    "",
  ];
  for (const g of groups) {
    lines.push(`### ${g}`, "", "| Papel do Pi | Componente | Token do IDS | Regra |", "| --- | --- | --- | --- |");
    for (const [role, group, comp, v, rule] of ROLES)
      if (group === g) lines.push(`| \`${role}\` | ${comp} | ${tokenOf(v)} | ${rule} |`);
    lines.push("");
  }
  lines.push("### Exportação HTML", "", "| Campo | Uso | Token do IDS |", "| --- | --- | --- |");
  for (const [k, [v, use]] of Object.entries(EXPORT))
    lines.push(`| \`export.${k}\` | ${use} | ${tokenOf(v)} |`);
  lines.push(
    "",
    "## Instalação",
    "",
    "As extensões que usam `@inteiro/terminal/pi` chamam `registerInteiroPiThemes(pi)` ao carregar: os temas vão para `<agent-dir>/themes/` e aparecem em `/settings` já na primeira sessão, sem colisão entre extensões. A extensão nunca escolhe o tema e nunca sobrescreve um tema editado; `PI_DESIGN_THEMES=off` desliga. Sem extensão: `pi install ./packages/pi-theme`.",
    "",
    "## Limite",
    "",
    "O Pi não tem papel para o fundo do terminal, então o tema não o define. Os contrastes usam o canvas do IDS (`vars.canvas`). Num terminal com outro fundo, configure o fundo do terminal com esse valor para obter o resultado verificado.",
    "",
  );
  return lines.join("\n");
}

/* ------------------------------------------------------------------ escrita */
if (process.argv[1]?.endsWith("generate-pi-theme.mjs")) {
  await mkdir("packages/pi-theme/themes", { recursive: true });
  await mkdir("packages/pi-theme/preview", { recursive: true });
  for (const theme of themes) {
    await writeFile(`packages/pi-theme/themes/${theme.name}.json`, JSON.stringify(theme, null, 2) + "\n");
    await writeFile(`packages/pi-theme/preview/${theme.name}.svg`, previewSvg(theme));
  }
  const { version } = JSON.parse(await readFile("packages/pi-theme/package.json", "utf8"));
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
  await writeFile("docs/terminal/pi-theme.md", specMarkdown());
  console.log(
    `Pi: ${themes.length} temas, ${themes.length} prévias e a especificação gerados (${themes.map((t) => t.name).join(", ")}).`,
  );
}
