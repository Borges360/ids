import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { allTokens, type TokenDef } from "@inteiro/tokens";
import { GUIDELINES, RECIPES } from "@inteiro/agent-core";

export interface SkillDoc {
  name: string;
  description: string;
  body: string;
}

export function skillNameFor(token: TokenDef): string {
  return token.id.replaceAll(".", "-").toLowerCase();
}

export function tokenSkill(token: TokenDef): SkillDoc {
  const name = skillNameFor(token);
  const description = `INTEIRO token ${token.id}. ${token.meta.intent}`.slice(0, 1024);
  const body = `# ${token.id}

${token.description}

## O que representa
${token.meta.intent}

## Quando usar
${token.meta.usage.map((u) => `- ${u}`).join("\n")}

## Quando evitar
${token.meta.avoid.map((u) => `- ${u}`).join("\n")}

## Valor e variantes
- CSS: \`var(${token.cssVar})\`
- Camada: ${token.layer}
- Tipo DTCG: ${token.type}
- Status: ${token.status}
- Consumo direto: ${token.consumerFacing ? "sim (se semântico/componente)" : "não — apenas via semântica"}

## Relações
${(token.meta.dependencies ?? []).map((d) => `- ${d}`).join("\n") || "- Ver aliases no catálogo DTCG."}

## Como consumir
\`\`\`css
.elemento { /* propriedade */ ${token.cssVar.startsWith("--in-color") ? "color" : "value"}: var(${token.cssVar}); }
\`\`\`
\`\`\`ts
import { tokens } from "@inteiro/tokens";
// ${token.id}
\`\`\`
\`\`\`bash
npx inteiro tokens explain ${token.id}
\`\`\`

## Exemplos
Correto: ${token.meta.examples.good}
Incorreto: ${token.meta.examples.bad}

## Acessibilidade
${token.meta.a11y}

## Fonte
${token.sourceSection}

## Documentação complementar
- docs/TOKENS.md
- docs/tokens/generated/${name}.md
- Skill de entrada: \`inteiro\`
`;
  return { name, description, body };
}

export function frontmatter(skill: SkillDoc): string {
  return `---
name: ${skill.name}
description: ${JSON.stringify(skill.description)}
license: MIT
metadata:
  inteiro: "1.1.0"
---

${skill.body}
`;
}

export function topLevelSkills(): SkillDoc[] {
  return [
    {
      name: "inteiro",
      description: "Aplicar o Identity Design System INTEIRO a qualquer interface. Use sempre que for criar, auditar ou migrar UI neste ecossistema.",
      body: `Você está aplicando INTEIRO, não um tema genérico.

Tese: Inteiro não é não ter partes em conflito. É fazê-las pertencer ao mesmo sistema.
Violeta = estou escolhendo. Laranja = estou tornando real.

Procedimento:
1. Ler docs/BRAND.md e a skill de identidade se a tarefa for visual.
2. Preferir tokens semânticos. Nunca primitivos de cor em componentes.
3. Consultar tokens: \`npx inteiro tokens search <q>\` / \`explain <id>\` ou MCP inteiro_*.
4. Não instalar milhares de skills de token no contexto. Use o índice e a CLI.
5. Costura só em reflexão, conflito, mudança de interpretação ou transição de contexto.
6. Um primary por contexto. Commit separado. Pill não é botão padrão.
7. Microcopy direto, sem 😅 nem “Are you sure?”.
8. WCAG 2.2 AA + target 44px + focus visível + reduced-motion + RTL lógico.
9. Auditoria de código é estática. Use o MCP \`inteiro_get_visual_review\` e confira capturas renderizadas antes de declarar harmonia visual.

Skills relacionadas: inteiro-interface, inteiro-audit, inteiro-migrate, inteiro-choose-token, inteiro-identity, inteiro-a11y, inteiro-voice, inteiro-components, inteiro-validate.
`
    },
    {
      name: "inteiro-interface",
      description: "Criar uma interface nova seguindo INTEIRO (layout, densidade, vozes, ações).",
      body: `Crie a interface com:
- data-in-theme dark|light e data-in-density calm|focus
- Recursive nas quatro vozes
- Hierarquia tipográfica da escala type.*
- Espaço da escala space.*
- Botões: primary (violeta) vs commit (laranja)
- Propriedades lógicas CSS
Recipes: ${RECIPES.map((r) => r.id).join(", ")}
`
    },
    {
      name: "inteiro-audit",
      description: "Auditar uma interface existente contra INTEIRO e WCAG 2.2.",
      body: `Execute \`npx inteiro audit <path>\` e revise:
${GUIDELINES.find((g) => g.id === "accessibility")?.rules.map((r) => `- ${r}`).join("\n")}
Checklist identitário: a tela parece SaaS genérico? Purple decorativo? Orange é decisão real? Costura comunica algo?
Auditoria de fonte não avalia layout renderizado. Consulte o MCP \`inteiro_get_visual_review\`, percorra rotas e estados e compare capturas em desktop e mobile antes de aprovar alinhamento, hierarquia, escala ou harmonia.
`
    },
    {
      name: "inteiro-migrate",
      description: "Migrar estilos hardcoded para tokens INTEIRO sem search-and-replace cego.",
      body: `A migração é mudança de linguagem:
#8B5CF6 → color.identity.primary
#FF9138 → color.identity.commit
Inter → Recursive rational
JetBrains → voice.machine
Rode \`npx inteiro migrate <path>\` e mapeie semântica, não só hex.
`
    },
    {
      name: "inteiro-choose-token",
      description: "Escolher o token semântico correto a partir de uma intenção (ação, status, espaço, tipo).",
      body: `Pergunte a intenção, não a cor.
Escolher/selecionar → identity.primary
Tornar real → identity.commit
Erro → status.danger + mensagem
Use \`npx inteiro tokens search\` e \`suggest\`.
`
    },
    {
      name: "inteiro-identity",
      description: "Aplicar identidade visual e tipografia Recursive (vozes rational/human/signal/machine).",
      body: `Recursive. rational 0/0, human 0/0.35, signal 0/0.10, machine 1/0.
Warm Frost sobre Obsidian. Sem Inter, sem neon, sem glassmorphism.
`
    },
    {
      name: "inteiro-a11y",
      description: "Revisar acessibilidade INTEIRO / WCAG 2.2 AA, foco, target 44px, RTL, reduced motion.",
      body: getGuidelinesBody("accessibility")
    },
    {
      name: "inteiro-voice",
      description: "Aplicar tom de voz e microcopy INTEIRO.",
      body: getGuidelinesBody("voice")
    },
    {
      name: "inteiro-components",
      description: "Criar componentes e padrões de interação (botão, input, card, dashboard, dialog).",
      body: RECIPES.map((r) => `## ${r.title}\n${r.when}\nBom: ${r.good}\nRuim: ${r.bad}`).join("\n\n")
    },
    {
      name: "inteiro-validate",
      description: "Validar conformidade do projeto com o catálogo e as regras INTEIRO.",
      body: `npx inteiro doctor
npx inteiro tokens validate
npx inteiro audit .
npx inteiro agents doctor
`
    }
  ];
}

function getGuidelinesBody(id: string): string {
  const g = GUIDELINES.find((x) => x.id === id);
  if (!g) return "";
  return `${g.body}\n\n${g.rules.map((r) => `- ${r}`).join("\n")}\n\nEvitar:\n${g.avoid.map((r) => `- ${r}`).join("\n")}`;
}

export function skillIndex(): string[] {
  return allTokens().map(skillNameFor);
}

export async function generateSkills(outDir: string, opts: { dryRun: boolean }): Promise<{ count: number; dir: string }> {
  const tokens = allTokens();
  if (opts.dryRun) return { count: tokens.length + topLevelSkills().length, dir: outDir };
  await mkdir(outDir, { recursive: true });
  for (const skill of topLevelSkills()) {
    const dir = join(outDir, skill.name);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "SKILL.md"), frontmatter(skill), "utf8");
  }
  for (const token of tokens) {
    const skill = tokenSkill(token);
    const dir = join(outDir, skill.name);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "SKILL.md"), frontmatter(skill), "utf8");
  }
  const index = {
    generated: true,
    count: tokens.length,
    names: skillIndex(),
    progressiveDisclosure: "Carregue apenas a skill inteiro e consulte tokens sob demanda via CLI/MCP."
  };
  await writeFile(join(outDir, "index.json"), JSON.stringify(index, null, 2), "utf8");
  return { count: tokens.length + topLevelSkills().length, dir: outDir };
}
