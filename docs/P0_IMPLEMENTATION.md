# INTEIRO-RFC-001 — implementação e rastreabilidade

## Escopo confirmado

O [adendo de escopo autônomo](P0_AUTONOMOUS_SCOPE.md) e a [matriz canônica](P0_AUTONOMOUS_MATRIX.json) formalizam a conclusão técnica sem aprovação humana. As assinaturas descritas abaixo pertencem ao modo compatível `human-approval`; não são condições de encerramento do modo `technical-autonomous`. O estado da implementação e da qualificação autônomas é determinado pela matriz e pelas evidências da versão correspondente.

O arquivo `docs/INTEIRO_ESPECIFICACAO_P0.md` foi copiado da especificação fornecida pelo solicitante. Depois do pedido inicial, o solicitante retirou o deploy Jenkins, a comparação real entre perfis de modelo e o smoke com agentes reais. Essas frentes não devem constar como executadas nem aprovadas.

## Inventário e decisões

A base local já era 1.2.0, com tokens, agent-core, CLI, MCP, React, integrações Vue/Svelte/Tailwind, Storybook e Jenkinsfile. A premissa documental 1.1.0 foi tratada como referência histórica. Os componentes React e o CSS existentes foram preservados. O catálogo agnóstico adiciona markup e contratos compartilháveis, sem importar React no núcleo.

A comparação histórica usa o commit `c8c945e10b509c3b2057abca86ac5b6dd10c8717`, cujo pacote declara 1.1.0. `check:compat` reextrai essa fonte do Git, verifica os 316 contratos de token nos quatro temas, exports públicos e de tipos, nomes MCP, seletores CSS, seis casos SSR do provider e seis comandos CLI legados. O snapshot em `tests/fixtures/inteiro-1.1.0-contract.json` é um contrato histórico, sem aprovação de baseline visual. A versão histórica tinha uma constante de tokens desatualizada (1.0.0); a identificação vem do commit e do manifesto. Na versão atual, `VERSION` corresponde ao pacote 1.2.0 e o modo `auto` do provider preserva a herança de tema do consumidor.

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
| E01 | `agent-core/context.ts` e `task-context.ts`, instalação idempotente, integridade e recibo vinculado ao plano/contrato/configuração | `tests/p0/context.test.ts`, `tests/p0/task-context.test.ts`; observação interna do modelo continua indisponível |
| E02 | `packages/composition`: 41 manifestos, HTML/CSS, comportamento progressivo e render de estados | `tests/p0/composition.test.ts`, `tests/browser/composition.spec.ts` |
| E03 | `packages/lint`: parsers, IDs de regra, exceções e relatórios unificados | `tests/p0/static.test.ts`, corpus de frameworks e CLI |
| E04 | `packages/visual`: lifecycle, fixtures, DSL, layout, a11y, runtime e comparador | `tests/p0/visual.test.ts`, `tests/p0/browser-runner.test.ts` |
| E05 | `visual/baseline.ts`: candidatos, assinatura Ed25519, cadeia e integridade | testes de governança e lifecycle com revisor sintético isolado |
| E06 | 82 stories de padrão/estado, índice JSON, exemplos HTML e catálogo estático | `test:stories`, `check:p0`, testes Playwright |
| E07 | `agent-core/repair.ts` e `repair-controller.ts`: envelope, tentativas limitadas, edição delimitada, validação e rollback; adapter Pi de referência via CLI JSON | `tests/p0/governance.test.ts`, `tests/p0/repair-controller.test.ts` |
| E08 | `agent-core/review.ts`: sete eixos, decisão assinada e vínculo a artefatos | validação de rubrica; revisão estética de produto continua externa |
| E09 | `packages/evaluation`, 30 tarefas públicas, 10 reservadas e smoke de regras | benchmark determinístico, importação e métricas; experimento real excluído pelo solicitante |
| E10 | workflow CI/nightly, tarballs JS, smoke offline, CODEOWNERS, init preservando CSS e migração por declaração com preview/backup/checksums | `npm run ci`, smoke instalado, `tests/p0/migration.test.ts`, navegador e testes de segurança |

## Distribuição

`npm run pack:p0` reconstrói tokens, CSS e React, usa staging temporário isolado e transpila o runtime TypeScript para JavaScript, com declarações públicas. `artifacts/p0-package-manifest.json` registra SHA-512 dos tarballs e o hash da fonte. `npm run smoke:offline -- --seed-cache` prepara o cache e comprova `npm ci --offline` em consumidor identificado pelo conjunto de pacotes, integridade do lock, comandos CLI/contexto, verificação de tipos, SSR do provider instalado e ferramentas MCP. Depois de preparado o consumidor, `npm run smoke:offline` não precisa de acesso à rede. O teste recusa tarballs ou checkout divergentes do manifesto.

## Evidências e condição de conclusão

O endurecimento dos contratos cobre ordenação lexical UTF-16 independente do locale para hashes, resolução explícita de `design.contract=@inteiro/design-system` e redaction estruturada de JSON, inclusive valores com espaços/aspas e segredos aninhados. JSON público preserva a formatação original. Os testes de relatório verificam ausência dos valores sensíveis nos quatro formatos; isso não certifica, por si só, o conteúdo de traces de rede.

As esperas por alias de resposta consomem uma resposta por ação, inclusive quando a resposta chegou antes da espera ou quando há esperas simultâneas. Aliases de tipos inválidos são recusados antes da execução. O cenário de composição inexistente permanece `blocked`, com sugestões que apontam apenas para IDs publicados; proximidade ortográfica não comprova adequação semântica.

Logs e artefatos locais ficam em `artifacts/` e `.inteiro/reports/`; essas pastas não devem ser publicadas automaticamente. O registro `release-evidence.json` indica os comandos e os estados de aceite. Os testes de aprovação usam chaves e candidatos temporários em diretórios de teste: eles não aprovam nenhuma imagem da biblioteca.

A execução técnica de uma captura e a promoção de uma referência são eventos diferentes. No modo `human-approval`, permanecem obrigatórias as assinaturas configuradas. No escopo autônomo, a condição de conclusão é a auditoria técnica completa da matriz e das evidências atuais, incluindo referências promovidas por autoridade técnica independente do implementador. Julgamento estético e assinatura humana não bloqueiam a meta; lacunas técnicas continuam bloqueantes.

As medições de desempenho locais usam fixtures sintéticas e não comprovam SLO geral nem ROI de modelos. As verificações automatizadas de acessibilidade cobrem um subconjunto da WCAG. O estudo com dois perfis de modelo e o smoke ao vivo dos harnesses foram excluídos por solicitação explícita.
