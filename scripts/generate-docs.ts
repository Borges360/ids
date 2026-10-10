import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { allTokens, catalogStats, contrastPairs, DTCG_SPEC, VERSION } from "@inteiro/tokens";
import { GUIDELINES, RECIPES } from "@inteiro/agent-core";
import { HARNESSES } from "../packages/cli/src/harnesses.ts";
import { skillNameFor, topLevelSkills } from "../packages/cli/src/skills-gen.ts";

const root = join(import.meta.dirname, "..");

async function write(rel: string, body: string) {
  const path = join(root, rel);
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, body, "utf8");
}

const tokens = allTokens();
const stats = catalogStats(tokens);

const tokenDocs = tokens.map((t) => {
  const name = skillNameFor(t);
  const md = `# ${t.id}

- **CSS:** \`var(${t.cssVar})\`
- **Camada:** ${t.layer}
- **Tipo:** ${t.type}
- **Categoria:** ${t.category} / ${t.subcategory}
- **Status:** ${t.status}
- **Fonte:** ${t.sourceSection}

## Intenção
${t.meta.intent}

## Quando usar
${t.meta.usage.map((u) => `- ${u}`).join("\n")}

## Quando evitar
${t.meta.avoid.map((u) => `- ${u}`).join("\n")}

## Acessibilidade
${t.meta.a11y}

## Exemplos
- Correto: ${t.meta.examples.good}
- Incorreto: ${t.meta.examples.bad}

Consultar: \`npx inteiro tokens explain ${t.id}\`
`;
  return { name, md, token: t };
});

await mkdir(join(root, "docs/tokens/generated"), { recursive: true });
for (const doc of tokenDocs) {
  await write(`docs/tokens/generated/${doc.name}.md`, doc.md);
}

await write("docs/TOKENS.md", `# Tokens INTEIRO

Especificação de intercâmbio: DTCG ${DTCG_SPEC}. Prefixo CSS: \`--in-\`. Versão ${VERSION}.

## Números

- Total: ${stats.total}
${Object.entries(stats.byCategory).map(([k, v]) => `- ${k}: ${v}`).join("\n")}

Camadas: primitive ${stats.byLayer.primitive}, semantic ${stats.byLayer.semantic}, component ${stats.byLayer.component}.
Status: source ${stats.byStatus.source}, derived ${stats.byStatus.derived}, extension ${stats.byStatus.extension}.

## Convenções

- Caminho de documentação: \`color.identity.primary\`
- JSON DTCG: grupos aninhados (ponto proibido no nome individual)
- CSS: \`--in-color-identity-primary\`
- Primitivos de cor: \`--in-ref-color-violet-400\` (não usar em componentes)
- Temas: dark, light, contrast-dark, contrast-light (os dois últimos são extensão proposta)
- Densidade: calm / focus

## Catálogo individual

Cada token tem página em \`docs/tokens/generated/\`.
`);

await write(
  "docs/SOURCE_TRACEABILITY.md",
  `# Rastreabilidade

Fonte: \`deep-research-report.md\` — INTEIRO — Identity Design System pessoal, completo e production-ready.

| Token | Seção de origem | Status |
|---|---|---|
${tokens.map((t) => `| \`${t.id}\` | ${t.sourceSection} | ${t.status} |`).join("\n")}

## Extensões propostas (não estavam com valores completos na fonte)

- Temas \`contrast-dark\` e \`contrast-light\`: o documento cita High Contrast na arquitetura e no Figma, sem tabela completa de pares. Valores derivados para maior contraste, documentados como extension no tema (não no id do token).
- Tokens de ação (\`color.action.*\`): derivados dos exemplos CSS/React da seção Contrato de tokens.
- Métricas tipográficas filhas (\`type.*.size\` etc.): derivadas da tabela composta para permitir CSS variables atômicas sem colidir com o composto DTCG.

## Não inventado

Primitivos, semântica dark/light, espaço, type styles, radii, motion, density, dataviz, botões, inputs e a Costura vêm da fonte. Onde o hex semântico não coincide com um primitivo, o valor cru da tabela foi preservado.
`
);

console.log(`docs: ${tokenDocs.length} páginas de token`);
void GUIDELINES;
void RECIPES;
void HARNESSES;
void topLevelSkills;
