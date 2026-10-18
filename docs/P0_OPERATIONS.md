# Contratos e gates

Quick-start em um consumidor instalado:

```sh
npx inteiro init --yes
npx inteiro agents install pi --yes
npx inteiro contract inspect --json
npx inteiro lint . --format json
npx inteiro visual test --json
```

Configure primeiro rotas, fixtures sintéticas e `browser.baseURL` em `inteiro.config.json`. Storybook não é requisito do consumidor. Use `--start` somente para autorizar o `browser.startCommand` local; o runner não executa shell recebido da página ou da DSL de ações. URLs não locais exigem allowlist explícita.

## Instalação e execução offline

`@inteiro/contracts` valida JSON Schema sem navegador, frameworks ou SDK de IA. `@inteiro/composition` fornece manifestos/HTML/CSS. `@inteiro/lint` agrega parsers TypeScript, PostCSS, HTML, Vue e Svelte. O pacote opcional `@inteiro/visual` é instalado no workspace de desenvolvimento com `@playwright/test`, Chromium e `axe-core`. Tokens não recebem dependência de browser. Após instalação e download dos browsers, os comandos determinísticos não precisam de rede externa.

```sh
npm install -D @inteiro/visual @playwright/test axe-core
npx playwright install chromium
npx inteiro gate run --profile pr --json
```

Perfis aceitos: `dev`, `pr`, `ci`, `main`, `nightly`, `release`. O runner amplia o escopo quando não há certeza sobre o conjunto alterado. Perfis protegidos sempre executam a matriz declarada; nenhum perfil transforma evidência ausente em sucesso. O workflow agendado amplia os viewports dos testes do catálogo.

## Contratos e políticas

Precedência: defaults < projeto < flags explícitas; restrições de `.inteiro/organization-policy.json` prevalecem para segurança. As origens são apresentadas por `contract inspect`. Raízes e paths são validados contra traversal e symlinks externos. Configurações inválidas, sintaxe não suportada e falhas de parser produzem erro/bloqueio tipificado.

O Context Gate distingue descoberta, acesso interno não observado e conformidade do resultado. Instalação idempotente preserva instruções existentes e registra integridade dos arquivos resolvidos. `context resolve --task "tabela" --harness pi --json` devolve seleção lexical, tokens, exemplos, proveniência e orçamento. A consulta não certifica que o modelo leu seu contexto.

Saídas: `0` aprovado; códigos legados `2–5` preservados; `6` reprovação de qualidade; `7` bloqueio/revisão pendente; `8` infraestrutura. `--json` imprime um documento JSON. Lint suporta JSON, SARIF e stylish. `--fix` não altera código quando não existe transformação inequivocamente segura. `--dry-run` não escreve relatórios nem imagens. Supressões em `.inteiro/exceptions.json` exigem regra, justificativa, owner, escopo, criação, expiração e aprovação.

## Baselines e identidade do revisor

`visual baseline propose --start --json` produz candidatos separados. A primeira captura não é aprovada. O registro conserva predecessor e aprovador e recusa hashes, commits, políticas ou ambientes divergentes.

O revisor mantém sua chave privada fora do repositório. O arquivo protegido `.inteiro/reviewers.json` mapeia identidade para chave pública Ed25519. Uma aprovação contém `reviewId`, `candidateId`, `candidateHash`, `imageSha256`, `sourceCommit`, `contractHash`, `policyHash`, `reviewer`, `reason`, `approvedAt`, `expiresAt` e assinatura Base64 do payload canônico (sem `signature`). `candidateHash` vem de `baselineMetadataHash()` de `@inteiro/visual/baseline` e vincula também rota, fixture, viewport, ambiente e predecessor. `canonical()` e `hash()` são APIs públicas de `@inteiro/contracts`. O agente de implementação não gera aprovações de produto.

```sh
npx inteiro visual baseline approve --review-id PR-123 --approval review-123.json --json
```

Proteja política de revisão, configuração, registro e imagens com CODEOWNERS e regras da branch. A assinatura é verificada novamente no runner. Chaves criadas pelos testes são temporárias e aceitas apenas nas fixtures isoladas; não constituem aprovação do produto.

## Review e repair

`.inteiro/task.json` declara o tipo de alteração. `new-page`, `new-pattern` e `significant-layout-change` exigem revisão qualitativa. `review request --run-id <id>` produz uma solicitação com sete eixos de rubrica. Uma decisão assinada em `.inteiro/reviews/decision.json` deve vincular run, hash de evidência, commit de origem, `sourceHash`, config, tarefa, hashes de imagens e expiração. `reviewSourceHash()` de `@inteiro/contracts` calcula o hash dos arquivos avaliados, excluindo a própria decisão e o registro de baselines; assim a decisão pode ser versionada sem referência circular ao seu commit. Uma média alta nunca anula falhas determinísticas. Revisores externos permanecem desabilitados por padrão.

`repair context` gera envelope sem chamar IA. Erros de infraestrutura e bloqueios não iniciam correção de CSS. Há no máximo duas tentativas, interrupção por erro repetido e limites de arquivos/linhas. Alterações em política ou baseline interrompem o ciclo. O harness deve aplicar o patch e reexecutar o gate total.

## Evidências e benchmark

Cada execução gera summary JSON, SARIF, JUnit, HTML, ambiente e cobertura em `.inteiro/reports/<runId>`. Capturas e traces ficam referenciados por paths locais e hashes. Logs de texto são sanitizados; fixtures restritas não são capturadas nem enviadas externamente.

`benchmark run --suite p0-smoke --json` executa o corpus determinístico. Os 30 casos públicos e dez reservados ao avaliador ficam em `benchmarks/`. O contexto do agente não recebe respostas do benchmark. Para importar observações reais de um harness:

```sh
npx inteiro benchmark run --observations experiment.json --json
```

O import valida commit/dataset/config/ambiente, deduplica modelo/tarefa/amostra e exporta JSON, CSV e HTML com medianas, P90 e intervalos de Wilson. Custo desconhecido permanece `null`. O experimento real de dois modelos e o smoke com agentes reais foram retirados do escopo por orientação do solicitante nesta entrega.

## Migração e rollback

`init` preserva configurações existentes. `audit` legado continua disponível. Use `migrate --dry-run` para inspecionar sugestões antes de alterar a aplicação. Comece observando findings; corrija o corpus existente antes de impor o gate inteiro na branch protegida. Não publique uma release declarada P0 completa enquanto faltarem baselines aprovadas, revisão exigida ou evidências de aceite. Rollback restaura versões, configuração e registro anteriores, preservando histórico de evidências.

O deploy Jenkins foi retirado do escopo pelo solicitante; nenhuma execução de deploy integra a evidência desta entrega.

Os modos de adoção são `static.adoption=observe|enforce-new|enforce-all`. Observe mantém o status real do relatório, mas permite saída não bloqueante do lint isolado. Enforce-new exige um baseline de diagnósticos com owner, justificativa, aprovação e expiração; findings novos continuam bloqueantes. Main, nightly e release recusam modos diferentes de enforce-all. O gate estrito do workflow permanece bloqueado enquanto faltarem referências ou revisões aprovadas.

## Tarballs com runtime JavaScript

Use `npm run pack:p0` para gerar a distribuição instalável em `artifacts/tarballs`. O staging transpila fontes para JavaScript e ajusta os exports dos tarballs, preservando os exports de fonte no workspace. Isso evita a restrição de type stripping do Node dentro de `node_modules`. `npm run smoke:offline -- --seed-cache` prepara o cache uma vez e comprova reinstalação offline, consulta de tokens/padrões, instalação/verificação do contexto Pi e ferramentas MCP no consumidor isolado. `npm run smoke:offline` reutiliza o cache preparado.
