# INTEIRO-RFC-001 — implementação e rastreabilidade

## Escopo confirmado

O arquivo `docs/INTEIRO_ESPECIFICACAO_P0.md` foi copiado da especificação fornecida pelo solicitante. Depois do pedido inicial, o solicitante retirou o deploy Jenkins, a comparação real entre perfis de modelo e o smoke com agentes reais. Essas frentes não devem constar como executadas nem aprovadas.

## Inventário e decisões

A base local já era 1.2.0, com tokens, agent-core, CLI, MCP, React, integrações Vue/Svelte/Tailwind, Storybook e Jenkinsfile. A premissa documental 1.1.0 foi tratada como referência histórica. Os componentes React e o CSS existentes foram preservados. O catálogo agnóstico adiciona markup e contratos compartilháveis, sem importar React no núcleo.

| ADR | Decisão implementada |
|---|---|
| 001 | Contratos JSON e composição HTML/CSS independem de React |
| 002 | CLI executa gates; MCP consulta contratos e relatórios por ferramentas finas |
| 003 | Playwright executa navegador real com fixtures, ações allowlisted e axe |
| 004 | Primeira imagem é evidência/candidato; golden exige assinatura de revisor |
| 005 | Catálogo Storybook é ferramenta do repositório; HTML funciona sem ele |
| 006 | TS AST, PostCSS, parse5, compiladores Vue/Svelte validam fontes |
| 007 | Rubrica qualitativa é independente dos gates determinísticos |
| 008 | Custo desconhecido é null; observações reais podem ser importadas e comparadas |
| 009 | Repair envelope limita tentativas, escopo e repetição de falhas |
| 010 | Fixtures sintéticas, rede allowlisted e sanitização precedem artefatos |

## Mapa de implementação

| Épico | Implementação | Verificação principal |
|---|---|---|
| E00 | `packages/contracts`: schemas, precedência, paths, estados, hashes e quatro formatos de relatório | `tests/p0/contracts.test.ts`, `tests/p0/cli.test.ts` |
| E01 | `agent-core/context.ts`, instalação idempotente e integridade por harness | `tests/p0/context.test.ts`; observação interna do modelo continua indisponível |
| E02 | `packages/composition`: 41 manifestos, HTML/CSS, comportamento progressivo e render de estados | `tests/p0/composition.test.ts`, `tests/browser/composition.spec.ts` |
| E03 | `packages/lint`: parsers, IDs de regra, exceções e relatórios unificados | `tests/p0/static.test.ts`, corpus de frameworks e CLI |
| E04 | `packages/visual`: lifecycle, fixtures, DSL, layout, a11y, runtime e comparador | `tests/p0/visual.test.ts`, `tests/p0/browser-runner.test.ts` |
| E05 | `visual/baseline.ts`: candidatos, assinatura Ed25519, cadeia e integridade | testes de governança e lifecycle com revisor sintético isolado |
| E06 | 82 stories de padrão/estado, índice JSON, exemplos HTML e catálogo estático | `test:stories`, `check:p0`, testes Playwright |
| E07 | `agent-core/repair.ts` e `repair-controller.ts`: envelope, tentativas limitadas, edição delimitada, validação e rollback; adapter Pi de referência via CLI JSON | `tests/p0/governance.test.ts`, `tests/p0/repair-controller.test.ts` |
| E08 | `agent-core/review.ts`: sete eixos, decisão assinada e vínculo a artefatos | validação de rubrica; revisão estética de produto continua externa |
| E09 | `packages/evaluation`, 30 tarefas públicas, 10 reservadas e smoke de regras | benchmark determinístico, importação e métricas; experimento real excluído pelo solicitante |
| E10 | workflow CI/nightly, tarballs JS, smoke offline, CODEOWNERS e guias | `npm run ci`, smoke instalado, navegador e testes de segurança |

## Distribuição

`npm run pack:p0` gera tarballs em `artifacts/tarballs` a partir de staging isolado e transpila o runtime TypeScript para JavaScript, com declarações TypeScript públicas. Os fontes do workspace continuam disponíveis para desenvolvimento. `npm run smoke:offline -- --seed-cache` prepara o cache e verifica uma reinstalação com `npm ci --offline`, seguida de oito comandos CLI, verificação de tipos e descoberta de ferramentas MCP. Depois de preparado o consumidor, `npm run smoke:offline` não precisa de acesso à rede.

## Evidências e condição de conclusão

Logs e artefatos locais ficam em `artifacts/` e `.inteiro/reports/`; essas pastas não devem ser publicadas automaticamente. O registro `release-evidence.json` indica os comandos e os estados de aceite. Os testes de aprovação usam chaves e candidatos temporários em diretórios de teste: eles não aprovam nenhuma imagem da biblioteca.

A execução técnica de uma captura e a aprovação de uma imagem são eventos diferentes. Uma release não pode ser declarada 100% P0 enquanto faltarem baseline de produto aprovada, revisão qualitativa requerida e matriz de aceite do mantenedor. O status de release permanece pendente nesses casos, mesmo quando os testes técnicos passam.

As medições de desempenho locais usam fixtures sintéticas e não comprovam SLO geral nem ROI de modelos. As verificações automatizadas de acessibilidade cobrem um subconjunto da WCAG. O estudo com dois perfis de modelo e o smoke ao vivo dos harnesses foram excluídos por solicitação explícita.
